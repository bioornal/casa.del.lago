import { NextResponse } from "next/server";
import { uploadComprobante, removeComprobante, isAllowedMime, MAX_BYTES } from "@/lib/reservation/comprobante.server";
import { insertReservation, OverlapError } from "@/lib/reservation/reservations.server";
import { generateBookingCode } from "@/lib/reservation/code";
import { getUnit } from "@/lib/units";
import { computeNights } from "@/lib/reservation/pricing";
import { methodTotal } from "@/lib/reservation/method-pricing";
import { getRateSettings } from "@/lib/reservation/rate-settings.server";
import { isValidEmail } from "@/lib/reservation/validation";
import { isWhatsAppBookingMode } from "@/lib/booking-mode";
import { getBookingMode } from "@/lib/site-settings.server";
import type { UnitId } from "@/lib/reservation/reducer";

const VALID_UNITS: UnitId[] = ["aratiri", "aguaribay"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isUnitId(v: unknown): v is UnitId {
  return typeof v === "string" && (VALID_UNITS as string[]).includes(v);
}
function bad() {
  return NextResponse.json({ error: "validation" }, { status: 400 });
}

// `instanceof File` puede fallar entre realms (jsdom en tests vs. undici en runtime),
// así que se valida por forma: lo que necesita uploadComprobante (type + arrayBuffer) y size.
function isFileLike(v: unknown): v is File {
  if (typeof v !== "object" || v === null) return false;
  const f = v as { type?: unknown; size?: unknown; arrayBuffer?: unknown };
  return typeof f.type === "string" && typeof f.size === "number" && typeof f.arrayBuffer === "function";
}

export async function POST(req: Request) {
  // Reservas online pausadas (modo WhatsApp): no se aceptan reservas por transferencia.
  if (isWhatsAppBookingMode(await getBookingMode())) {
    return NextResponse.json({ error: "bookings_paused" }, { status: 503 });
  }

  let fd: FormData;
  try {
    fd = await req.formData();
  } catch {
    return bad();
  }

  const unitId = fd.get("unitId");
  const checkIn = fd.get("checkIn");
  const checkOut = fd.get("checkOut");
  const guestsRaw = fd.get("guests");
  const firstName = fd.get("firstName");
  const lastName = fd.get("lastName");
  const email = fd.get("email");
  const phoneRaw = fd.get("phone");
  const file = fd.get("comprobante");
  const localeRaw = fd.get("locale");
  const locale = localeRaw === "en" || localeRaw === "pt" ? localeRaw : "es";

  const guests = typeof guestsRaw === "string" ? Number(guestsRaw) : NaN;

  if (
    !isUnitId(unitId) ||
    typeof checkIn !== "string" || !DATE_RE.test(checkIn) ||
    typeof checkOut !== "string" || !DATE_RE.test(checkOut) ||
    checkOut <= checkIn ||
    !Number.isInteger(guests) || guests < 1 ||
    typeof firstName !== "string" || !firstName.trim() ||
    typeof lastName !== "string" || !lastName.trim() ||
    typeof email !== "string" || !isValidEmail(email)
  ) {
    return bad();
  }

  if (!isFileLike(file) || file.size === 0) return bad();
  if (!isAllowedMime(file.type)) return bad();
  if (file.size > MAX_BYTES) return bad();

  const phone = typeof phoneRaw === "string" ? phoneRaw : "";
  const unit = getUnit(unitId)!;
  if (guests > unit.specs.guests) return bad();
  const nights = computeNights(new Date(checkIn), new Date(checkOut));
  const settings = await getRateSettings();
  // Total del método TRANSFERENCIA (menor al precio de lista; ver method-pricing.ts)
  const total = methodTotal(settings, "transfer", unit.slug, nights);

  const code = generateBookingCode();

  // 1. Subir comprobante.
  let comprobantePath: string;
  try {
    comprobantePath = await uploadComprobante(code, file);
  } catch (err) {
    console.error("[transfer] upload fallo:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "storage" }, { status: 502 });
  }

  // 2. Insertar PENDIENTE. La constraint de exclusión es el candado: si las
  //    fechas están tomadas, insertReservation lanza OverlapError → 409.
  try {
    await insertReservation({
      code, unitId, unitName: unit.name, checkIn, checkOut, nights, guests,
      firstName, lastName, email, phone, total,
      paymentMethod: "transfer", status: "pending",
      comprobantePath, locale,
    });
  } catch (err) {
    await removeComprobante(comprobantePath);
    if (err instanceof OverlapError) {
      return NextResponse.json({ error: "conflict" }, { status: 409 });
    }
    console.error("[transfer] insert fallo:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "db" }, { status: 502 });
  }

  return NextResponse.json({ status: "pending", code });
}
