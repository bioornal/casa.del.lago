import { NextResponse } from "next/server";
import {
  createCardPayment,
  mockPayment,
  isMockMode,
  type PaymentOutcome,
} from "@/lib/reservation/payments.server";
import { computeNights } from "@/lib/reservation/pricing";
import { meetsStayMinimum } from "@/lib/reservation/stay-rules";
import { parseDateOnly, validBookingRange } from "@/lib/reservation/booking";
import { getRateSettings } from "@/lib/reservation/rate-settings.server";
import { isValidEmail } from "@/lib/reservation/validation";
import {
  insertReservation,
  generateUniqueBookingCode,
  upsertConfirmedByCode,
  setReservationStatusByCode,
  releaseExpiredPendingReservations,
  OverlapError,
} from "@/lib/reservation/reservations.server";
import { isWhatsAppBookingMode } from "@/lib/booking-mode";
import { getBookingMode, isTestUnitEnabled } from "@/lib/site-settings.server";
import { isTestUnit, allowsTestUnit, resolveUnit, checkoutTotal } from "@/lib/reservation/test-unit";
import { sendConfirmationEmailOnce } from "@/lib/reservation/email/guest";
import { clientIp, rateLimited } from "@/lib/rate-limit";
import type { UnitId } from "@/lib/reservation/reducer";

const VALID_UNITS: UnitId[] = ["aratiri", "aguaribay"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// La unidad de prueba solo es un UnitId válido cuando el flag global la
// habilita: las dos condiciones, no una (mismo criterio que en la ruta de
// disponibilidad) — si bastara con el flag, prenderlo abriría el checkout de
// las unidades reales a cualquiera con un deep-link.
function isUnitId(v: unknown, allowTestUnit: boolean): v is UnitId {
  if (typeof v !== "string") return false;
  if (isTestUnit(v)) return allowTestUnit;
  return (VALID_UNITS as string[]).includes(v);
}

type CardPayment = { token: string; paymentMethodId: string; issuerId?: string; installments: number; deviceId?: string };
type MockPay = { mockOutcome: "approved" | "pending" | "rejected" };

function isCardPayment(v: unknown): v is CardPayment {
  if (typeof v !== "object" || v === null) return false;
  const p = v as Record<string, unknown>;
  return typeof p.token === "string" && typeof p.paymentMethodId === "string" && typeof p.installments === "number";
}
function isMockPay(v: unknown): v is MockPay {
  if (typeof v !== "object" || v === null) return false;
  const p = v as Record<string, unknown>;
  return p.mockOutcome === "approved" || p.mockOutcome === "pending" || p.mockOutcome === "rejected";
}

export async function POST(req: Request) {
  // Primera línea del handler: cortar antes de leer el body, no después.
  if (rateLimited("payments", clientIp(req), 10, 60_000)) {
    return NextResponse.json({ error: "rate" }, { status: 429 });
  }

  // Reservas online pausadas (modo WhatsApp): no se aceptan pagos. Las DOS
  // condiciones habilitan la excepción de la unidad de prueba —flag Y unitId
  // pedido explícitamente, nunca el flag solo (mismo criterio que
  // lib/reservation/test-unit.ts)—. Con el flag apagado no hay ningún pedido
  // que pueda prosperar estando pausado, así que se corta ACÁ, antes de leer
  // el body: ni "prueba" ni cualquier otro id se distinguen por status code.
  const paused = isWhatsAppBookingMode(await getBookingMode());
  const testUnitOn = await isTestUnitEnabled();
  if (paused && !testUnitOn) {
    return NextResponse.json({ error: "bookings_paused" }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "validation" }, { status: 400 });
  }

  const { unitId, checkIn, checkOut, guests, firstName, lastName, email, phone, payment, locale: localeRaw } = body;
  const locale = localeRaw === "en" || localeRaw === "pt" ? localeRaw : "es";

  // Con el flag prendido, el corte de arriba se saltea SOLO si además piden
  // la unidad de prueba por id explícito: allowsTestUnit es el dueño único de
  // esa regla, no la reescribimos a mano acá.
  if (paused && !allowsTestUnit(unitId, testUnitOn)) {
    return NextResponse.json({ error: "bookings_paused" }, { status: 503 });
  }

  if (
    !isUnitId(unitId, testUnitOn) ||
    typeof checkIn !== "string" || !DATE_RE.test(checkIn) ||
    typeof checkOut !== "string" || !DATE_RE.test(checkOut) ||
    typeof guests !== "number" || !Number.isInteger(guests) || guests < 1 ||
    typeof firstName !== "string" || !firstName.trim() ||
    typeof lastName !== "string" || !lastName.trim() ||
    typeof email !== "string" || !isValidEmail(email)
  ) {
    return NextResponse.json({ error: "validation" }, { status: 400 });
  }
  if (!validBookingRange(checkIn, checkOut)) {
    return NextResponse.json({ error: "validation" }, { status: 400 });
  }

  const unit = resolveUnit(unitId);
  const checkInDate = parseDateOnly(checkIn);
  const checkOutDate = parseDateOnly(checkOut);
  const settings = await getRateSettings();
  if (!isTestUnit(unitId) && !meetsStayMinimum(checkInDate, checkOutDate, settings)) {
    return NextResponse.json({ error: "minimum_nights" }, { status: 400 });
  }
  if (guests > unit.specs.guests) {
    return NextResponse.json({ error: "validation" }, { status: 400 });
  }
  const phoneStr = typeof phone === "string" ? phone : "";

  // El método de pago: tarjeta, o mock (solo si el server está en modo test).
  const useMock = isMockMode() && isMockPay(payment);
  if (!useMock && !isCardPayment(payment)) {
    return NextResponse.json({ error: "validation" }, { status: 400 });
  }

  const nights = computeNights(new Date(checkIn), new Date(checkOut));
  // Precio de lista = método tarjeta (comisión MP incluida; ver method-pricing.ts).
  // checkoutTotal recalcula acá server-side, igual que el checkout muestra: la
  // unidad de prueba cobra el monto plano de TEST_UNIT_TOTAL, no un precio real.
  const total = checkoutTotal(settings, "card", unit.slug, nights, guests, checkInDate);
  try {
    await releaseExpiredPendingReservations();
  } catch (err) {
    console.error("[payments] cleanup de holds falló:", err instanceof Error ? err.message : err);
  }

  // Contra la base, no a ciegas: generateBookingCode() sortea sobre 32^4 sin
  // mirar si el código ya existe, y el código es la clave del lookup, del email
  // y del flip de deduplicación.
  let code: string;
  try {
    code = await generateUniqueBookingCode();
  } catch (err) {
    console.error("[payments] código único falló:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "code" }, { status: 502 });
  }

  // Retención ANTES de cobrar: la constraint de exclusión es el candado atómico.
  // Si las fechas están tomadas, nunca se cobra.
  try {
    await insertReservation({
      code, unitId, unitName: unit.name, checkIn, checkOut, nights,
      guests, firstName, lastName, email: email as string, phone: phoneStr, total,
      paymentMethod: "card", status: "pending", locale,
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    });
  } catch (err) {
    if (err instanceof OverlapError) {
      return NextResponse.json({ error: "conflict" }, { status: 409 });
    }
    console.error("[payments] retencion fallo:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "db" }, { status: 502 });
  }

  const metadata = {
    unit_id: unitId,
    unit_name: unit.name,
    first_name: firstName,
    last_name: lastName,
    email,
    phone: phoneStr,
    guests,
    check_in: checkIn,
    check_out: checkOut,
    nights,
    total,
    locale,
  };

  // Cobro (real o emulado)
  let outcome: PaymentOutcome;
  try {
    if (useMock) {
      outcome = mockPayment((payment as MockPay).mockOutcome, code);
    } else {
      const card = payment as CardPayment;
      const base = process.env.NEXT_PUBLIC_SITE_URL;
      outcome = await createCardPayment({
        amount: total,
        token: card.token,
        paymentMethodId: card.paymentMethodId,
        issuerId: card.issuerId,
        installments: card.installments,
        payerEmail: email as string,
        payerFirstName: firstName as string,
        payerLastName: lastName as string,
        description: `Reserva ${unit.name} ${checkIn}→${checkOut}`,
        code,
        metadata,
        notificationUrl: base ? `${base}/api/webhooks/mercadopago` : undefined,
        statementDescriptor: "CASADELLAGO",
        deviceId: card.deviceId,
        items: [
          {
            id: unitId,
            title: `Reserva ${unit.name}`,
            description: `${nights} noche(s), ${checkIn} → ${checkOut}, ${guests} huésped(es)`,
            categoryId: "travels",
            quantity: 1,
            unitPrice: total,
          },
        ],
      });
    }
  } catch (err) {
    console.error("[payments] cobro fallo:", err instanceof Error ? err.message : err);
    try { await setReservationStatusByCode(code, "released"); }
    catch (relErr) { console.error("[payments] release tras fallo de cobro:", relErr instanceof Error ? relErr.message : relErr); }
    return NextResponse.json({ error: "payment" }, { status: 502 });
  }

  if (outcome.status === "approved") {
    try {
      await upsertConfirmedByCode({
        code, unitId, unitName: unit.name, checkIn, checkOut, nights,
        guests, firstName: firstName as string, lastName: lastName as string,
        email: email as string, phone: phoneStr, total,
        paymentId: outcome.id, locale,
      });
    } catch (err) {
      console.error("[payments] confirmar supabase fallo:", err instanceof Error ? err.message : err);
      // El cobro ya ocurrió. No fingir éxito al navegador: el webhook debe
      // poder reintentar la persistencia y el hold queda visible para operar.
      return NextResponse.json({ error: "persistence", code }, { status: 502 });
    }
    try { await sendConfirmationEmailOnce(code); }
    catch (err) { console.error("[payments] email fallo:", err instanceof Error ? err.message : err); }
    return NextResponse.json({ status: "approved", code, unitId, checkIn, checkOut, guests, total });
  }

  if (outcome.status === "pending" || outcome.status === "in_process") {
    return NextResponse.json({ status: "pending", code });
  }

  try { await setReservationStatusByCode(code, "released"); }
  catch (relErr) { console.error("[payments] release tras rejected:", relErr instanceof Error ? relErr.message : relErr); }
  return NextResponse.json({ status: "rejected", detail: outcome.statusDetail ?? null });
}
