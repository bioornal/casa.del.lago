# Dominio 2B — Aviso al administrador (y retiro del shim, 2C)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el dueño se entere por email de que entró una reserva —y sobre todo de que hay un comprobante esperando revisión, o de que Mercado Pago cobró un pago que se quedó sin fechas— en vez de tener que mirar el panel o leer los logs del servidor.

**Architecture:** Un módulo nuevo `lib/reservation/email/admin.ts` con dos funciones, portado de Aruma. El cableado **no** copia el de Aruma: allá se llama a `notifyAdminNewReservation` en tres rutas, cada una rearmando el input a mano. Acá el aviso de reserva confirmada viaja dentro de `sendConfirmationEmailOnce`, que ya tiene la fila completa y ya tiene el candado de deduplicación (`markConfirmationEmailSent`, flip atómico). Un solo punto de cableado en vez de tres, y sin riesgo de mail duplicado cuando el checkout y el webhook confirman la misma reserva. Quedan aparte los dos casos que ese camino no cubre: la transferencia pendiente (nunca pasa por la confirmación) y el pago sin fechas (nunca llega a haber reserva).

**Tech Stack:** TypeScript, Resend, Next.js App Router (route handlers), Vitest.

## Global Constraints

- Portado desde `bioornal/arumalodgeweb` @ `9a7d332`, archivo `lib/reservation/email/admin.ts`. Los repos **no comparten historia git**: todo a mano.
- **El front no se toca.** Este dominio es backend puro: no hay ningún componente ni página en la lista de archivos.
- Prefijo de env propio: `CDL_`, nunca `ARUMA_`.
- Comentarios en español, explicando el *porqué*. Es la convención del repo.
- Los mails al dueño van **siempre en español, sin i18n y sin branding**: se leen desde el teléfono para decidir si hay que hacer algo, no para admirarlos. No usan `renderShell` ni la paleta del lago.
- **Fail-soft, sin excepciones.** `sendEmail` de `email/client.ts` nunca lanza y devuelve `boolean`. Ningún aviso al dueño puede romper un cobro ni una reserva.
- `pnpm`, nunca `npm` ni `npx`.

## Contexto que condiciona el plan

Dos cosas encontradas al inspeccionar, que no estaban en el spec:

**1. `ADMIN_EMAILS` ya existe** y es la allowlist de acceso al panel (`lib/admin/auth.ts:4`, `middleware.ts:29`), separada por comas. El destinatario del aviso es otra cosa —podés querer avisarle a alguien que no entra al panel, o al revés— así que la variable nueva es `CDL_ADMIN_EMAIL`. Pero si no está, se cae a la primera entrada de `ADMIN_EMAILS` en lugar de no avisar: un deploy ya configurado no puede quedarse sin la alerta crítica por una variable que nadie sabía que había que agregar.

**2. El pago sin fechas hoy solo escribe en el log.** `app/api/webhooks/mercadopago/route.ts:81-83` atrapa `OverlapError`, hace `console.error("...requiere reembolso manual")` y devuelve 200. Plata cobrada, sin reserva, y el único registro es una línea de log que nadie lee. Es el caso más caro de los tres y el que más justifica el dominio.

Nota sobre `alertAdminPaymentWithoutSlot` en `app/api/payments/route.ts`: **no va**. A diferencia de Aruma, acá la retención ocurre *antes* de cobrar (`payments/route.ts:96-108`: inserta `pending`, y si las fechas están tomadas devuelve 409 sin cobrar). El escenario "cobró sin fechas" solo existe en el webhook, donde el pago llega asincrónico sobre una reserva que pudo haberse liberado mientras tanto.

## Archivos

| Archivo | Qué hace |
|---|---|
| `lib/reservation/email/admin.ts` (nuevo) | Las dos funciones y la resolución del destinatario |
| `tests/reservation/email-admin.test.ts` (nuevo) | Cobertura del módulo |
| `lib/reservation/email/guest.ts` | Cablea el aviso de reserva confirmada |
| `app/api/reservations/transfer/route.ts` | Cablea el aviso de comprobante a revisar |
| `app/api/webhooks/mercadopago/route.ts` | Cablea la alerta crítica |
| `lib/reservation/email.server.ts` | Se borra (2C) |
| `lib/reservation/email-template.ts` | Se borra (2C): duplicado muerto de 126 líneas |
| `.env.example` | Documenta `CDL_ADMIN_EMAIL` y `CDL_EMAIL_REPLY_TO` |

---

### Task 1: El módulo `email/admin.ts`

**Files:**
- Create: `lib/reservation/email/admin.ts`
- Test: `tests/reservation/email-admin.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `sendEmail` de `./client` (firma `(input: SendEmailInput) => Promise<boolean>`), `esc` y `money` de `./format`.
- Produces:
  - `type AdminNewReservationInput = { code, unitName, firstName, lastName, email, phone, checkIn, checkOut, nights, guests, total: number, paymentMethod: PaymentMethod }` — todos `string` salvo `nights`, `guests` y `total`, que son `number`. `PaymentMethod` se importa de `@/lib/reservation/reservations.server` y vale `"card" | "transfer" | "manual"`: **no** es el de `method-pricing.ts`, que solo tiene dos. Ver la nota de `manual` en el Step 3.
  - `notifyAdminNewReservation(i: AdminNewReservationInput): Promise<void>`
  - `type AdminCriticalAlertInput = { code, paymentId, unitName, checkIn, checkOut, firstName, lastName, email, phone, total: number }`
  - `alertAdminPaymentWithoutSlot(i: AdminCriticalAlertInput): Promise<void>`

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/reservation/email-admin.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const send = vi.fn();
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(function () { return { emails: { send } }; }),
}));

import {
  notifyAdminNewReservation,
  alertAdminPaymentWithoutSlot,
} from "@/lib/reservation/email/admin";

const NUEVA = {
  code: "CDL-2026-AB12",
  unitName: "Cabaña Aratirí",
  firstName: "Juan",
  lastName: "Pérez",
  email: "juan@test.com",
  phone: "+54 9 376 000000",
  checkIn: "2026-07-02",
  checkOut: "2026-07-05",
  nights: 3,
  guests: 4,
  total: 480000,
  paymentMethod: "card" as const,
};

const CRITICA = {
  code: "CDL-2026-AB12",
  paymentId: "pay-9",
  unitName: "Cabaña Aratirí",
  checkIn: "2026-07-02",
  checkOut: "2026-07-05",
  firstName: "Juan",
  lastName: "Pérez",
  email: "juan@test.com",
  phone: "+54 9 376 000000",
  total: 480000,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.stubEnv("CDL_ADMIN_EMAIL", "dueño@lago.test");
  vi.stubEnv("ADMIN_EMAILS", "");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://lacasadellago.test");
  send.mockResolvedValue({ data: { id: "email-1" }, error: null });
});

describe("destinatario", () => {
  it("usa CDL_ADMIN_EMAIL cuando está", async () => {
    await notifyAdminNewReservation(NUEVA);
    expect(send.mock.calls[0][0].to).toBe("dueño@lago.test");
  });

  it("sin CDL_ADMIN_EMAIL cae a la primera entrada de ADMIN_EMAILS", async () => {
    // Un deploy ya configurado no puede quedarse sin la alerta crítica por una
    // variable nueva que nadie sabía que había que agregar.
    vi.stubEnv("CDL_ADMIN_EMAIL", "");
    vi.stubEnv("ADMIN_EMAILS", " panel@lago.test , otro@lago.test ");
    await notifyAdminNewReservation(NUEVA);
    expect(send.mock.calls[0][0].to).toBe("panel@lago.test");
  });

  it("sin ninguna de las dos, no envía y no lanza", async () => {
    vi.stubEnv("CDL_ADMIN_EMAIL", "");
    vi.stubEnv("ADMIN_EMAILS", "");
    await expect(notifyAdminNewReservation(NUEVA)).resolves.toBeUndefined();
    expect(send).not.toHaveBeenCalled();
  });
});

describe("notifyAdminNewReservation", () => {
  it("tarjeta: asunto de reserva confirmada", async () => {
    await notifyAdminNewReservation(NUEVA);
    const arg = send.mock.calls[0][0];
    expect(arg.subject).toContain("CDL-2026-AB12");
    expect(arg.subject).not.toContain("Revisar comprobante");
  });

  it("transferencia: el asunto pide revisar el comprobante", async () => {
    // Es la diferencia que importa: la transferencia necesita una acción humana.
    await notifyAdminNewReservation({ ...NUEVA, paymentMethod: "transfer" });
    expect(send.mock.calls[0][0].subject).toContain("Revisar comprobante");
  });

  it("manual: no avisa, el dueño acaba de cargarla él mismo", async () => {
    // ReservationRow.payment_method incluye "manual" (reservas cargadas a mano
    // desde el panel). Avisarle al dueño de su propia acción es ruido, y el
    // ruido en este buzón hace que deje de mirarlo.
    await notifyAdminNewReservation({ ...NUEVA, paymentMethod: "manual" });
    expect(send).not.toHaveBeenCalled();
  });

  it("lleva los datos de contacto del huésped y el link al panel", async () => {
    await notifyAdminNewReservation(NUEVA);
    const arg = send.mock.calls[0][0];
    expect(arg.html).toContain("juan@test.com");
    expect(arg.html).toContain("Juan Pérez");
    expect(arg.html).toContain("https://lacasadellago.test/admin/reservas");
    expect(arg.text).toContain("480.000");
  });

  it("escapa HTML en campos del huésped (anti-inyección)", async () => {
    await notifyAdminNewReservation({ ...NUEVA, lastName: "<script>x</script>" });
    expect(send.mock.calls[0][0].html).not.toContain("<script>x</script>");
  });

  it("fail-soft: si Resend rechaza, no lanza", async () => {
    send.mockResolvedValue({ data: null, error: { message: "nope" } });
    await expect(notifyAdminNewReservation(NUEVA)).resolves.toBeUndefined();
  });
});

describe("alertAdminPaymentWithoutSlot", () => {
  it("marca urgencia y nombra el pago de Mercado Pago", async () => {
    await alertAdminPaymentWithoutSlot(CRITICA);
    const arg = send.mock.calls[0][0];
    expect(arg.subject).toContain("URGENTE");
    expect(arg.html).toContain("pay-9");
  });

  it("dice las dos salidas: reembolsar o reubicar", async () => {
    await alertAdminPaymentWithoutSlot(CRITICA);
    const arg = send.mock.calls[0][0];
    expect(arg.html.toLowerCase()).toContain("reembolsar");
    expect(arg.html.toLowerCase()).toContain("reubicar");
    expect(arg.text.toLowerCase()).toContain("reembolsar");
  });
});
```

- [ ] **Step 2: Correr el test y verlo fallar**

Run: `pnpm vitest run tests/reservation/email-admin.test.ts`
Expected: FAIL — no existe `@/lib/reservation/email/admin`.

- [ ] **Step 3: Escribir el módulo**

Crear `lib/reservation/email/admin.ts`:

```ts
import { sendEmail } from "./client";
import { esc, money } from "./format";
import type { PaymentMethod } from "@/lib/reservation/reservations.server";

/**
 * Emails operativos al dueño. Español siempre, sin i18n y sin branding: se
 * leen desde el teléfono para decidir si hay que hacer algo, no para admirarlos.
 */

/**
 * Destinatario del aviso. CDL_ADMIN_EMAIL es la variable propia; ADMIN_EMAILS
 * es la allowlist de acceso al panel y sirve de red: sin ese fallback, un
 * deploy que ya andaba se queda sin la alerta crítica por una variable nueva
 * que nadie sabía que había que agregar.
 */
function adminTo(): string | null {
  const propia = (process.env.CDL_ADMIN_EMAIL ?? "").trim();
  if (propia) return propia;

  const delPanel = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean)[0];
  if (delPanel) return delPanel;

  console.warn("[email] CDL_ADMIN_EMAIL y ADMIN_EMAILS ausentes; no se avisa al dueño");
  return null;
}

function rowsToHtml(rows: [string, string][]): string {
  return rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#666">${k}</td>` +
        `<td style="padding:4px 0"><strong>${esc(v)}</strong></td></tr>`,
    )
    .join("");
}

function panelUrl(): string {
  return `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/admin/reservas`;
}

export type AdminNewReservationInput = {
  code: string;
  unitName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  total: number;
  paymentMethod: PaymentMethod;
};

export async function notifyAdminNewReservation(i: AdminNewReservationInput): Promise<void> {
  // "manual" es una reserva que el dueño cargó a mano desde el panel: avisarle
  // de su propia acción es ruido, y el ruido acá hace que deje de mirar el buzón
  // justo cuando llegue la alerta que importa.
  if (i.paymentMethod === "manual") return;

  const to = adminTo();
  if (!to) return;

  const isTransfer = i.paymentMethod === "transfer";
  const subject = isTransfer
    ? `[Revisar comprobante] ${i.code} — ${i.unitName}`
    : `Reserva confirmada ${i.code} — ${i.unitName}`;

  const headline = isTransfer
    ? "Reserva por transferencia, pendiente de revisión del comprobante."
    : "Reserva pagada con tarjeta. Ya está confirmada y agendada.";

  const rows: [string, string][] = [
    ["Código", i.code],
    ["Alojamiento", i.unitName],
    ["Check-in", i.checkIn],
    ["Check-out", i.checkOut],
    ["Noches", String(i.nights)],
    ["Huéspedes", String(i.guests)],
    ["Total", money(i.total)],
    ["Huésped", `${i.firstName} ${i.lastName}`],
    ["Email", i.email],
    ["Teléfono", i.phone || "—"],
  ];

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222">
  <p>${headline}</p>
  <table style="border-collapse:collapse">${rowsToHtml(rows)}</table>
  <p style="margin-top:18px"><a href="${panelUrl()}">Abrir el panel de reservas</a></p>
</div>`;

  const text = `${headline}\n\n${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\nPanel: ${panelUrl()}`;

  await sendEmail({ to, subject, html, text });
}

export type AdminCriticalAlertInput = {
  code: string;
  paymentId: string;
  unitName: string;
  checkIn: string;
  checkOut: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  total: number;
};

/**
 * Pago aprobado sobre fechas que ya estaban ocupadas: plata cobrada sin
 * reserva. Deliberadamente SIN deduplicación — que llegue dos veces es
 * molesto, que no llegue cuesta dinero.
 */
export async function alertAdminPaymentWithoutSlot(i: AdminCriticalAlertInput): Promise<void> {
  const to = adminTo();
  if (!to) return;

  const rows: [string, string][] = [
    ["Pago (MP)", i.paymentId],
    ["Código", i.code],
    ["Alojamiento", i.unitName],
    ["Check-in", i.checkIn],
    ["Check-out", i.checkOut],
    ["Total cobrado", money(i.total)],
    ["Huésped", `${i.firstName} ${i.lastName}`],
    ["Email", i.email],
    ["Teléfono", i.phone || "—"],
  ];

  const headline =
    "Mercado Pago aprobó un pago, pero las fechas ya estaban ocupadas: " +
    "el cobro se hizo y NO hay reserva.";
  const salidas =
    "Hay dos salidas: <strong>reembolsar</strong> el pago desde el panel de " +
    "Mercado Pago, o <strong>reubicar</strong> al huésped en otra unidad o " +
    "fecha y cargar la reserva a mano. Contactalo cuanto antes.";

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222">
  <p style="font-size:16px"><strong>${headline}</strong></p>
  <table style="border-collapse:collapse">${rowsToHtml(rows)}</table>
  <p style="margin-top:18px">${salidas}</p>
</div>`;

  const text =
    `${headline}\n\n${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n` +
    "Hay dos salidas: reembolsar el pago desde el panel de Mercado Pago, o " +
    "reubicar al huésped en otra unidad o fecha y cargar la reserva a mano.";

  await sendEmail({ to, subject: `[URGENTE] Pago aprobado sin fechas disponibles — ${i.code}`, html, text });
}
```

- [ ] **Step 4: Correr el test y verlo pasar**

Run: `pnpm vitest run tests/reservation/email-admin.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Documentar las env vars**

En `.env.example`, debajo de la línea `CDL_EMAIL_FROM=...`:

```
# Destinatario de los avisos operativos al dueño (reserva nueva, comprobante a
# revisar, pago sin fechas). Si falta, se usa la primera entrada de ADMIN_EMAILS.
CDL_ADMIN_EMAIL=

# A dónde contesta el huésped si responde el mail. Opcional: sin ella, la
# respuesta va al remitente de CDL_EMAIL_FROM.
CDL_EMAIL_REPLY_TO=
```

`CDL_EMAIL_REPLY_TO` ya la lee `email/client.ts:35` y nunca estuvo documentada.

- [ ] **Step 6: Commit**

```bash
git add lib/reservation/email/admin.ts tests/reservation/email-admin.test.ts .env.example
git commit -m "feat(email): avisos operativos al dueño"
```

---

### Task 2: Cablear el aviso de reserva confirmada

Va dentro de `sendConfirmationEmailOnce`, no en las rutas. El flip atómico de `markConfirmationEmailSent` ya garantiza que el bloque corra una sola vez por reserva, y la fila que devuelve trae los diez campos que el aviso necesita. Cablearlo en `payments/route.ts` y en el webhook por separado, como hace Aruma, mandaría dos mails cuando el checkout confirma y el webhook llega después.

**Files:**
- Modify: `lib/reservation/email/guest.ts`
- Test: `tests/reservation/email-guest.test.ts`

**Interfaces:**
- Consumes: `notifyAdminNewReservation` de Task 1.
- Produces: nada nuevo. `sendConfirmationEmailOnce(code: string): Promise<void>` mantiene su firma.

- [ ] **Step 1: Escribir el test que falla**

En `tests/reservation/email-guest.test.ts`, agregar el mock arriba, junto a los otros:

```ts
const notifyAdminNewReservation = vi.fn();
vi.mock("@/lib/reservation/email/admin", () => ({
  notifyAdminNewReservation: (...a: unknown[]) => notifyAdminNewReservation(...a),
}));
```

Extender la fixture `ROW` con los tres campos que el aviso necesita y que hoy no tiene:

```ts
const ROW = {
  code: "CDL-2026-AB12", unit_name: "Cabaña Aratiri", first_name: "Juan",
  last_name: "Pérez", phone: "+54 9 376 000000", payment_method: "card",
  email: "juan@test.com",
  check_in: "2026-07-02", check_out: "2026-07-05", nights: 3, guests: 4,
  total: 480000, locale: "es",
};
```

Y agregar al `describe("sendConfirmationEmailOnce")`:

```ts
  it("avisa al dueño con los datos de la fila", async () => {
    markConfirmationEmailSent.mockResolvedValue(ROW);
    await sendConfirmationEmailOnce("CDL-2026-AB12");
    expect(notifyAdminNewReservation).toHaveBeenCalledOnce();
    expect(notifyAdminNewReservation.mock.calls[0][0]).toMatchObject({
      code: "CDL-2026-AB12",
      lastName: "Pérez",
      paymentMethod: "card",
      total: 480000,
    });
  });

  it("flip no ganado → tampoco avisa al dueño (dedup compartida)", async () => {
    // El checkout y el webhook confirman la misma reserva: sin esta guarda
    // llegan dos avisos.
    markConfirmationEmailSent.mockResolvedValue(null);
    await sendConfirmationEmailOnce("CDL-2026-AB12");
    expect(notifyAdminNewReservation).not.toHaveBeenCalled();
  });

  it("si el mail al huésped falla, el dueño se entera igual", async () => {
    markConfirmationEmailSent.mockResolvedValue(ROW);
    send.mockResolvedValue({ data: null, error: { message: "nope" } });
    await sendConfirmationEmailOnce("CDL-2026-AB12");
    expect(notifyAdminNewReservation).toHaveBeenCalledOnce();
  });
```

- [ ] **Step 2: Correr el test y verlo fallar**

Run: `pnpm vitest run tests/reservation/email-guest.test.ts`
Expected: FAIL — `notifyAdminNewReservation` no fue llamada (0 veces).

- [ ] **Step 3: Cablear**

En `lib/reservation/email/guest.ts`, agregar el import arriba:

```ts
import { notifyAdminNewReservation } from "./admin";
```

Y dentro de `sendConfirmationEmailOnce`, justo después del `await sendEmail({...})` que manda la confirmación al huésped y **antes** del cierre del `try`:

```ts
    // El aviso al dueño va acá y no en las rutas: este bloque ya corre una sola
    // vez por reserva (flip atómico de markConfirmationEmailSent) y la fila ya
    // tiene todo. Cablearlo en el checkout y en el webhook mandaría dos.
    await notifyAdminNewReservation({
      code: row.code,
      unitName: row.unit_name,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone ?? "",
      checkIn: row.check_in,
      checkOut: row.check_out,
      nights: row.nights,
      guests: row.guests,
      total: row.total,
      paymentMethod: row.payment_method,
    });
```

- [ ] **Step 4: Correr el test y verlo pasar**

Run: `pnpm vitest run tests/reservation/email-guest.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/reservation/email/guest.ts tests/reservation/email-guest.test.ts
git commit -m "feat(email): el dueño se entera de cada reserva confirmada"
```

---

### Task 3: Cablear el aviso de comprobante a revisar

Es el que más falta hace: una transferencia entra como `pending` con el comprobante ya subido y **nadie se entera**. El dueño tiene que descubrirlo mirando el panel. Y no pasa por `sendConfirmationEmailOnce`, porque la reserva todavía no está confirmada.

**Files:**
- Modify: `app/api/reservations/transfer/route.ts`
- Test: `tests/reservation/transfer-route.test.ts`

**Interfaces:**
- Consumes: `notifyAdminNewReservation` de Task 1.
- Produces: nada. La respuesta del endpoint no cambia: sigue siendo `{ status: "pending", code }`.

- [ ] **Step 1: Escribir el test que falla**

En `tests/reservation/transfer-route.test.ts`, agregar el mock junto a los que ya existen:

```ts
const notifyAdminNewReservation = vi.fn();
vi.mock("@/lib/reservation/email/admin", () => ({
  notifyAdminNewReservation: (...a: unknown[]) => notifyAdminNewReservation(...a),
}));
```

Y el caso, dentro del `describe` que ya cubre el camino feliz:

```ts
  it("avisa al dueño que hay un comprobante para revisar", async () => {
    // Sin esto la transferencia entra en silencio: el comprobante queda
    // esperando a que alguien mire el panel por casualidad.
    const res = await POST(form(VALID, goodFile()));
    expect(res.status).toBe(200);
    expect(notifyAdminNewReservation).toHaveBeenCalledOnce();
    expect(notifyAdminNewReservation.mock.calls[0][0]).toMatchObject({
      paymentMethod: "transfer",
      lastName: "Pérez",
    });
  });

  it("si el aviso falla, la reserva igual queda tomada", async () => {
    notifyAdminNewReservation.mockRejectedValueOnce(new Error("resend caído"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(form(VALID, goodFile()));
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("pending");
    errSpy.mockRestore();
  });
```

`form(VALID, goodFile())` y la constante `VALID` ya existen en el archivo (líneas 45-58): son las del camino feliz. Reusarlas, no escribir otras.

- [ ] **Step 2: Correr el test y verlo fallar**

Run: `pnpm vitest run tests/reservation/transfer-route.test.ts`
Expected: FAIL — `notifyAdminNewReservation` no fue llamada.

- [ ] **Step 3: Cablear**

En `app/api/reservations/transfer/route.ts`, agregar el import:

```ts
import { notifyAdminNewReservation } from "@/lib/reservation/email/admin";
```

Y reemplazar el `return NextResponse.json({ status: "pending", code });` del final por:

```ts
  // El comprobante necesita ojo humano: sin este aviso la transferencia entra
  // en silencio. En try/catch porque un aviso caído no puede desarmar una
  // reserva que ya quedó tomada y con el archivo subido.
  try {
    await notifyAdminNewReservation({
      code, unitName: unit.name, firstName, lastName, email, phone,
      checkIn, checkOut, nights, guests, total,
      paymentMethod: "transfer",
    });
  } catch (err) {
    console.error("[transfer] aviso al dueño falló:", err instanceof Error ? err.message : err);
  }

  return NextResponse.json({ status: "pending", code });
```

- [ ] **Step 4: Correr el test y verlo pasar**

Run: `pnpm vitest run tests/reservation/transfer-route.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/reservations/transfer/route.ts tests/reservation/transfer-route.test.ts
git commit -m "feat(email): avisar que hay un comprobante esperando revisión"
```

---

### Task 4: La alerta crítica de pago sin fechas

**Files:**
- Modify: `app/api/webhooks/mercadopago/route.ts:79-86`
- Test: `tests/reservation/webhook-route.test.ts`

**Interfaces:**
- Consumes: `alertAdminPaymentWithoutSlot` de Task 1.
- Produces: nada. El webhook sigue devolviendo `{ ok: true }` con 200 en todos los caminos — Mercado Pago reintenta si no.

- [ ] **Step 1: Escribir el test que falla**

En `tests/reservation/webhook-route.test.ts`, agregar el mock:

```ts
const alertAdminPaymentWithoutSlot = vi.fn();
vi.mock("@/lib/reservation/email/admin", () => ({
  alertAdminPaymentWithoutSlot: (...a: unknown[]) => alertAdminPaymentWithoutSlot(...a),
}));
```

El archivo ya tiene un test para este camino, en la línea 98: *"fechas tomadas al confirmar: loguea y responde ok (sin error a MP)"*. **Extenderlo, no duplicarlo** — el nombre ya no dice la verdad completa. Queda así:

```ts
  it("fechas tomadas al confirmar: alerta al dueño, loguea y responde ok a MP", async () => {
    // Plata cobrada sin reserva. Hasta hoy el único registro era un
    // console.error que nadie lee.
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    upsertConfirmedByCode.mockRejectedValueOnce(new OverlapError());
    const res = await POST(approvedReq());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(alertAdminPaymentWithoutSlot).toHaveBeenCalledOnce();
    expect(alertAdminPaymentWithoutSlot.mock.calls[0][0]).toMatchObject({
      code: "CDL-2026-AB12",
      paymentId: "pay-1",
    });
    errSpy.mockRestore();
  });
```

`approvedReq()` es el helper que ya arma y firma el payload aprobado (línea 63). Agregar además `alertAdminPaymentWithoutSlot.mockReset();` al `beforeEach`, junto a los otros resets.

- [ ] **Step 2: Correr el test y verlo fallar**

Run: `pnpm vitest run tests/reservation/webhook-route.test.ts`
Expected: FAIL — `alertAdminPaymentWithoutSlot` no fue llamada.

- [ ] **Step 3: Cablear**

En `app/api/webhooks/mercadopago/route.ts`, agregar el import:

```ts
import { alertAdminPaymentWithoutSlot } from "@/lib/reservation/email/admin";
```

Y reemplazar el bloque del `catch` que hoy solo loguea:

```ts
    if (err instanceof OverlapError) {
      console.error(`[webhook] pago ${payment.id} aprobado pero fechas ocupadas (code ${code}); requiere reembolso manual`);
      await alertAdminPaymentWithoutSlot({
        code,
        paymentId: String(payment.id),
        unitName: upsertInput.unitName,
        checkIn: upsertInput.checkIn,
        checkOut: upsertInput.checkOut,
        firstName: upsertInput.firstName,
        lastName: upsertInput.lastName,
        email: upsertInput.email,
        phone: upsertInput.phone,
        total: upsertInput.total,
      });
      return NextResponse.json({ ok: true });
    }
```

El `console.error` se conserva: el mail puede no salir (sin `RESEND_API_KEY`, sin destinatario, Resend caído) y el log es la última red.

- [ ] **Step 4: Correr el test y verlo pasar**

Run: `pnpm vitest run tests/reservation/webhook-route.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/webhooks/mercadopago/route.ts tests/reservation/webhook-route.test.ts
git commit -m "fix(pagos): avisar cuando MP cobró un pago que se quedó sin fechas"
```

---

### Task 5 (2C): Retirar el shim y el duplicado muerto

Dos restos de la arquitectura anterior de emails. El spec del 2A los dejó plegados acá.

**Files:**
- Delete: `lib/reservation/email.server.ts` (re-export de una línea)
- Delete: `lib/reservation/email-template.ts` (126 líneas que nadie importa fuera de su test)
- Modify: `app/api/payments/route.ts:22`, `app/api/webhooks/mercadopago/route.ts:4`, `app/api/admin/reservations/[id]/route.ts:4`
- Modify: `tests/reservation/email-template.test.ts`
- Modify: `tests/reservation/email-server.test.ts`
- Modify: `tests/reservation/payments-route.test.ts`, `tests/reservation/webhook-route.test.ts` (los `vi.mock("@/lib/reservation/email.server")`)

**Interfaces:**
- Consumes: nada.
- Produces: nada. `sendConfirmationEmailOnce` y `sendReleaseEmail` pasan a importarse de `@/lib/reservation/email/guest`, su origen real.

- [ ] **Step 1: Repuntar los tres imports de producción**

En los tres route handlers, cambiar `from "@/lib/reservation/email.server"` por `from "@/lib/reservation/email/guest"`. Las funciones importadas no cambian de nombre.

- [ ] **Step 2: Repuntar los mocks de los tests**

En `tests/reservation/payments-route.test.ts` y `tests/reservation/webhook-route.test.ts`, cambiar el path del `vi.mock("@/lib/reservation/email.server", ...)` por `vi.mock("@/lib/reservation/email/guest", ...)`. Un mock que apunta a un módulo que ya nadie importa no mockea nada y el test empieza a pegarle a Resend de verdad.

Ojo: `email/guest.ts` exporta las dos funciones, así que el factory del mock tiene que devolver las dos aunque el test use una — si no, el import de la otra revienta.

- [ ] **Step 3: Correr toda la suite**

Run: `pnpm test`
Expected: verde. Si algo falla acá es un mock que quedó apuntando al módulo viejo.

- [ ] **Step 4: Borrar el shim**

```bash
git rm lib/reservation/email.server.ts
```

- [ ] **Step 5: Borrar el duplicado muerto y su cobertura**

`lib/reservation/email-template.ts` es un `buildConfirmationEmail` viejo de 126 líneas. El único que lo importa es `tests/reservation/email-template.test.ts`, que ya tiene el import del template vivo bajo el alias `buildReal`.

En `tests/reservation/email-template.test.ts`: borrar el import de `@/lib/reservation/email-template` y el `describe("buildConfirmationEmail")` que lo ejercita (los cinco `it` que usan `buildConfirmationEmail` a secas). Quedan los describes que usan `buildReal` y `buildReleaseEmail`, que son los del template vivo. Renombrar el import `buildConfirmationEmail as buildReal` a `buildConfirmationEmail` a secas y actualizar sus usos, que ya no hay con qué confundirlo.

Revisar también `tests/reservation/email-server.test.ts`: si testea el shim, se borra con él; si testea `email/guest`, repuntar el import.

```bash
git rm lib/reservation/email-template.ts
```

- [ ] **Step 6: Correr toda la suite y el build**

Run: `pnpm test && pnpm build`
Expected: verde y sin errores. El conteo de tests baja: los cinco del duplicado se van.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(email): retira el shim email.server y el template duplicado"
```

---

## Gate de verificación del dominio

- [ ] `pnpm test` en verde, con la salida a la vista
- [ ] `pnpm build` sin errores
- [ ] `pnpm email:preview` sigue corriendo (no lo toca este dominio, pero comparte módulo)
- [ ] Un envío real por Resend con `CDL_ADMIN_EMAIL` puesta: llega el aviso de reserva nueva y se lee bien en el teléfono
- [ ] `grep -rn "email.server" app/ lib/ tests/` no devuelve nada

## Fuera de alcance

- **Dominio 3 — pricing/tarifas.** Plan aparte, se escribe cuando este cierre.
- **`comprobante.ts` en `email/`.** El spec del portado lo lista como archivo nuevo del dominio 2, pero **no existe en Aruma**: `lib/reservation/email/` de allá tiene `admin.ts`, `client.ts`, `format.ts`, `guest-templates.ts` y `guest.ts`, nada más. O el spec se equivocó de nombre o pensaba en algo a inventar. Queda registrado para resolverlo antes del dominio 4, que es el que toca comprobantes.
- **El número de WhatsApp.** `lib/contact.ts` sigue en `549XXXXXXXXXX`. No es de este dominio, pero mientras siga así el link de los mails al huésped no lleva a ningún lado.
