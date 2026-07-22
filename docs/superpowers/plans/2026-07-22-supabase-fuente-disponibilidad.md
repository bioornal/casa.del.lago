# Supabase como fuente única de disponibilidad — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar Google Calendar y derivar toda la disponibilidad de la tabla `reservations` de Supabase, con un candado anti-doble-booking a nivel DB y reservas manuales cargables por el admin.

**Architecture:** La tabla `reservations` es la única fuente de verdad. Una constraint de exclusión de Postgres (`btree_gist`) impide filas activas superpuestas por unidad. La lectura de disponibilidad consulta Supabase con la misma firma que hoy, así sus consumidores no cambian. Las 4 rutas de escritura dejan de tocar Google; la inserción de la fila es el candado.

**Tech Stack:** Next.js (App Router), TypeScript, Supabase (`@supabase/supabase-js`, service role), Vitest, `react-day-picker` + `date-fns` (ya instalados).

## Global Constraints

- Vitest siempre con `--maxWorkers=2` (convención del proyecto; el navegador headless tiene reduced-motion activo, los screenshots dan timeout).
- Las unidades son exactamente dos: `aratiri` y `aguaribay` (tipo `UnitId`).
- Rango de reserva semiabierto `[check_in, check_out)`: el día de checkout queda libre.
- Cliente Supabase server-only: `getServiceClient()` de `@/lib/supabase/server` (bypassa RLS).
- No agregar dependencias nuevas.
- No commitear/pushear sin OK del usuario (los pasos "Commit" quedan listos, pero confirmá antes de ejecutarlos si así lo preferís).
- Español en copy visible.

---

### Task 1: Migración de base de datos (constraint de exclusión + `manual` + drop `calendar_event_id`)

**Files:**
- Modify: `supabase/setup.sql` (agregar al final, idempotente)
- DB: aplicar migración al proyecto Supabase `aqknzqtxhgsrhfaskoeo` vía MCP `apply_migration`

**Interfaces:**
- Produces: constraint `reservations_no_overlap`; `payment_method` acepta `'manual'`; la columna `calendar_event_id` deja de existir.

- [ ] **Step 1: Verificar que no haya solapamientos preexistentes (precondición)**

Vía MCP `execute_sql` sobre el proyecto:

```sql
select a.id, b.id, a.unit_id, a.check_in, a.check_out
from public.reservations a
join public.reservations b
  on a.unit_id = b.unit_id and a.id < b.id
 and a.status <> 'released' and b.status <> 'released'
 and daterange(a.check_in, a.check_out, '[)') && daterange(b.check_in, b.check_out, '[)');
```

Expected: 0 filas. Si devuelve filas, resolver manualmente (liberar una) antes de seguir.

- [ ] **Step 2: Aplicar la migración**

Vía MCP `apply_migration` con name `supabase_fuente_disponibilidad`:

```sql
create extension if not exists btree_gist;

alter table public.reservations
  add constraint reservations_no_overlap
  exclude using gist (
    unit_id with =,
    daterange(check_in, check_out, '[)') with &&
  ) where (status <> 'released');

alter table public.reservations
  drop constraint if exists reservations_payment_method_check,
  add constraint reservations_payment_method_check
    check (payment_method in ('card', 'transfer', 'manual'));

alter table public.reservations drop column if exists calendar_event_id;
```

- [ ] **Step 3: Verificar la constraint**

Vía MCP `execute_sql`:

```sql
select conname from pg_constraint where conrelid = 'public.reservations'::regclass and conname = 'reservations_no_overlap';
```

Expected: 1 fila con `reservations_no_overlap`.

Prueba de humo (debe FALLAR con SQLSTATE 23P01 en el segundo insert):

```sql
begin;
insert into public.reservations (code,unit_id,unit_name,check_in,check_out,nights,guests,first_name,last_name,email,total,payment_method,status)
values ('SMOKE-A','aratiri','x','2099-01-10','2099-01-15',5,2,'a','b','a@b.com',1,'manual','confirmed');
insert into public.reservations (code,unit_id,unit_name,check_in,check_out,nights,guests,first_name,last_name,email,total,payment_method,status)
values ('SMOKE-B','aratiri','x','2099-01-12','2099-01-14',2,2,'a','b','a@b.com',1,'manual','confirmed');
rollback;
```

Expected: el segundo insert lanza `ERROR: 23P01 conflicting key value violates exclusion constraint`.

- [ ] **Step 4: Reflejar en `setup.sql`**

Agregar al final de `supabase/setup.sql`:

```sql
-- =============================================================
-- 2026-07-22 — Supabase como fuente única de disponibilidad.
-- Candado anti-doble-booking + reservas manuales. Google Calendar retirado.
-- =============================================================
create extension if not exists btree_gist;

alter table public.reservations
  drop constraint if exists reservations_no_overlap;
alter table public.reservations
  add constraint reservations_no_overlap
  exclude using gist (
    unit_id with =,
    daterange(check_in, check_out, '[)') with &&
  ) where (status <> 'released');

alter table public.reservations
  drop constraint if exists reservations_payment_method_check,
  add constraint reservations_payment_method_check
    check (payment_method in ('card', 'transfer', 'manual'));

alter table public.reservations drop column if exists calendar_event_id;
```

- [ ] **Step 5: Commit**

```bash
git add supabase/setup.sql
git commit -m "feat(db): constraint de exclusion anti-doble-booking y payment_method manual"
```

---

### Task 2: `reservations.server.ts` — `OverlapError`, quitar `calendar_event_id`, helper por `code`

**Files:**
- Modify: `lib/reservation/reservations.server.ts`
- Test: `tests/reservation/reservations-server.test.ts`

**Interfaces:**
- Produces:
  - `class OverlapError extends Error` (con `name === "OverlapError"`).
  - `insertReservation(input)` lanza `OverlapError` cuando `error.code === "23P01"`.
  - `upsertConfirmedByCode(input)` lanza `OverlapError` cuando `error.code === "23P01"`.
  - `setReservationStatusByCode(code: string, status: ReservationStatus): Promise<void>`.
  - `ReservationRow` / `InsertReservationInput` sin `calendar_event_id` / `calendarEventId`.

- [ ] **Step 1: Escribir tests que fallan**

Agregar a `tests/reservation/reservations-server.test.ts`, dentro del `describe("reservations.server", ...)`:

```ts
it("insertReservation lanza OverlapError si la DB devuelve 23P01", async () => {
  insert.mockResolvedValueOnce({ error: { code: "23P01", message: "exclusion" } });
  await expect(insertReservation({
    code: "CDL-2026-OV01", unitId: "aratiri", unitName: "x",
    checkIn: "2026-07-02", checkOut: "2026-07-05", nights: 3, guests: 2,
    firstName: "A", lastName: "B", email: "a@b.com", phone: "",
    total: 1, paymentMethod: "manual", status: "confirmed",
  })).rejects.toBeInstanceOf(OverlapError);
});

it("setReservationStatusByCode actualiza por code", async () => {
  const eqByCode = vi.fn().mockResolvedValue({ error: null });
  const updateFn = vi.fn().mockReturnValue({ eq: eqByCode });
  from.mockReturnValue({ update: updateFn });
  await setReservationStatusByCode("CDL-2026-OV01", "released");
  expect(updateFn.mock.calls[0][0].status).toBe("released");
  expect(eqByCode).toHaveBeenCalledWith("code", "CDL-2026-OV01");
});
```

Y actualizar el import del archivo de test:

```ts
import {
  insertReservation,
  upsertConfirmedByCode,
  listReservations,
  setReservationStatus,
  setReservationStatusByCode,
  markConfirmationEmailSent,
  OverlapError,
} from "@/lib/reservation/reservations.server";
```

Además quitar `calendarEventId: "evt-1"` / `calendarEventId: "evt-1"` de los dos objetos de test que lo pasan (en `insertReservation` y `upsertConfirmedByCode`), ya que el campo desaparece del tipo.

- [ ] **Step 2: Correr y ver que fallan**

Run: `npx vitest run tests/reservation/reservations-server.test.ts --maxWorkers=2`
Expected: FAIL (`OverlapError` / `setReservationStatusByCode` no existen).

- [ ] **Step 3: Implementar los cambios**

En `lib/reservation/reservations.server.ts`:

1. Agregar arriba (después de los imports):

```ts
/** Se lanza cuando la constraint de exclusión rechaza fechas superpuestas (SQLSTATE 23P01). */
export class OverlapError extends Error {
  constructor() {
    super("date range overlaps an existing active reservation");
    this.name = "OverlapError";
  }
}
```

2. Quitar `calendar_event_id: string | null;` de `ReservationRow`, `calendarEventId?: string;` de `InsertReservationInput`, y la línea `calendar_event_id: i.calendarEventId ?? null,` de `toRow`. Quitar también `calendarEventId: string;` del objeto inline de `upsertConfirmedByCode` y su spread.

3. Reemplazar `insertReservation`:

```ts
export async function insertReservation(input: InsertReservationInput): Promise<void> {
  const { error } = await getServiceClient().from("reservations").insert(toRow(input));
  if (error) {
    if (error.code === "23P01") throw new OverlapError();
    throw new Error(`insertReservation: ${error.message}`);
  }
}
```

4. En `upsertConfirmedByCode`, reemplazar el manejo de error:

```ts
  if (error) {
    if (error.code === "23P01") throw new OverlapError();
    throw new Error(`upsertConfirmedByCode: ${error.message}`);
  }
```

5. Agregar el helper por code (después de `setReservationStatus`):

```ts
export async function setReservationStatusByCode(
  code: string, status: ReservationStatus,
): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (status === "confirmed") patch.confirmed_at = new Date().toISOString();
  const { error } = await getServiceClient()
    .from("reservations").update(patch).eq("code", code);
  if (error) throw new Error(`setReservationStatusByCode: ${error.message}`);
}
```

- [ ] **Step 4: Correr y ver que pasan**

Run: `npx vitest run tests/reservation/reservations-server.test.ts --maxWorkers=2`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/reservation/reservations.server.ts tests/reservation/reservations-server.test.ts
git commit -m "feat(reservas): OverlapError, setReservationStatusByCode y baja de calendar_event_id"
```

---

### Task 3: `availability.ts` (cliente) — cambiar el tipo `source`

**Files:**
- Modify: `lib/reservation/availability.ts`
- Test: `tests/reservation/availability.test.ts`

**Interfaces:**
- Produces: `type AvailabilitySource = "stub" | "supabase"`.

- [ ] **Step 1: Actualizar el test**

En `tests/reservation/availability.test.ts`, reemplazar cada literal `"google-calendar"` por `"supabase"` (aparece en el JSON mockeado y en los `expect`, líneas ~16, 44, 61, 68).

- [ ] **Step 2: Correr y ver que falla**

Run: `npx vitest run tests/reservation/availability.test.ts --maxWorkers=2`
Expected: FAIL (el tipo aún no acepta `"supabase"` / desajuste de igualdad).

- [ ] **Step 3: Cambiar el tipo**

En `lib/reservation/availability.ts` línea 4:

```ts
export type AvailabilitySource = "stub" | "supabase";
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `npx vitest run tests/reservation/availability.test.ts --maxWorkers=2`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/reservation/availability.ts tests/reservation/availability.test.ts
git commit -m "refactor(reservas): source de disponibilidad pasa a 'supabase'"
```

---

### Task 4: `availability.server.ts` — leer disponibilidad desde Supabase

**Files:**
- Modify: `lib/reservation/availability.server.ts` (reescritura)
- Test: `tests/reservation/availability.server.test.ts` (reescritura)
- Modify: `tests/reservation/rates.server.test.ts` (literales de source)

**Interfaces:**
- Consumes: `getServiceClient()` de `@/lib/supabase/server`.
- Produces: `getAvailabilityServer(unitId: UnitId, range: DateRange): Promise<Availability>` con `source: "supabase"` en éxito, `"stub"` en fallo. `resolveIcsUrl` y `ENV_BY_UNIT` dejan de existir.

- [ ] **Step 1: Reescribir el test**

Reemplazar TODO el contenido de `tests/reservation/availability.server.test.ts` por:

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";

// Cadena de supabase-js: from().select().eq().neq().lt().gt() → { data, error }
const gt = vi.fn();
const lt = vi.fn(() => ({ gt }));
const neq = vi.fn(() => ({ lt }));
const eq = vi.fn(() => ({ neq }));
const select = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ select }));
vi.mock("@/lib/supabase/server", () => ({ getServiceClient: () => ({ from }) }));

import { getAvailabilityServer } from "@/lib/reservation/availability.server";
import { GET } from "@/app/api/availability/[unitId]/route";

const RANGE = { from: new Date(2026, 5, 1), to: new Date(2026, 11, 1) };

beforeEach(() => {
  vi.clearAllMocks();
  from.mockReturnValue({ select });
  select.mockReturnValue({ eq });
  eq.mockReturnValue({ neq });
  neq.mockReturnValue({ lt });
  lt.mockReturnValue({ gt });
  gt.mockResolvedValue({ data: [], error: null });
});

describe("getAvailabilityServer", () => {
  it("expande cada reserva a sus noches ocupadas (checkout es turnover)", async () => {
    gt.mockResolvedValueOnce({
      data: [{ check_in: "2026-06-10", check_out: "2026-06-12" }],
      error: null,
    });
    const res = await getAvailabilityServer("aratiri", RANGE);
    expect(res.source).toBe("supabase");
    expect(res.disabledDates).toHaveLength(2); // 10 y 11; 12 libre
    expect(res.disabledDates[0].getFullYear()).toBe(2026);
    expect(res.disabledDates[0].getMonth()).toBe(5); // junio
    expect(res.disabledDates[0].getDate()).toBe(10);
  });

  it("filtra por unidad y exclue liberadas", async () => {
    await getAvailabilityServer("aguaribay", RANGE);
    expect(from).toHaveBeenCalledWith("reservations");
    expect(eq).toHaveBeenCalledWith("unit_id", "aguaribay");
    expect(neq).toHaveBeenCalledWith("status", "released");
  });

  it("fail-open (stub) si la query devuelve error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    gt.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    const res = await getAvailabilityServer("aratiri", RANGE);
    expect(res).toEqual({ disabledDates: [], source: "stub" });
  });

  it("fail-open (stub) si la query lanza", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    gt.mockRejectedValueOnce(new Error("network"));
    const res = await getAvailabilityServer("aratiri", RANGE);
    expect(res).toEqual({ disabledDates: [], source: "stub" });
  });
});

describe("GET /api/availability/[unitId]", () => {
  function ctx(unitId: string) {
    return { params: Promise.resolve({ unitId }) };
  }

  it("serializa las noches ocupadas como YYYY-MM-DD", async () => {
    gt.mockResolvedValueOnce({
      data: [{ check_in: "2026-06-10", check_out: "2026-06-12" }],
      error: null,
    });
    const req = new Request("http://t/api/availability/aratiri?from=2026-06-01&to=2026-12-01");
    const res = await GET(req, ctx("aratiri"));
    const body = await res.json();
    expect(body.source).toBe("supabase");
    expect(body.disabledDates).toEqual(["2026-06-10", "2026-06-11"]);
  });

  it("devuelve 400 + stub para una unidad inválida", async () => {
    const req = new Request("http://t/api/availability/nope");
    const res = await GET(req, ctx("nope"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ disabledDates: [], source: "stub" });
  });

  it("devuelve 400 + stub si from/to son inválidas", async () => {
    const req = new Request("http://t/api/availability/aratiri?from=garbage&to=2026-12-01");
    const res = await GET(req, ctx("aratiri"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ disabledDates: [], source: "stub" });
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `npx vitest run tests/reservation/availability.server.test.ts --maxWorkers=2`
Expected: FAIL (aún hace `fetch` a iCal, `source` es `"google-calendar"`).

- [ ] **Step 3: Reescribir `availability.server.ts`**

Reemplazar TODO el contenido por:

```ts
import { getServiceClient } from "@/lib/supabase/server";
import type { Availability, DateRange } from "./availability";
import type { UnitId } from "./reducer";

// Solo debe importarse desde código server. No agregar "server-only" para
// mantener el módulo testeable en Vitest.

const STUB: Availability = { disabledDates: [], source: "stub" };

function toDateOnly(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

// Expande [checkIn, checkOut) a Dates a medianoche LOCAL, una por noche ocupada
// (incluye checkIn, excluye checkOut → el día de salida queda libre).
function expandRange(checkIn: string, checkOut: string): Date[] {
  const [ys, ms, ds] = checkIn.split("-").map(Number);
  const [ye, me, de] = checkOut.split("-").map(Number);
  const cur = new Date(ys, ms - 1, ds);
  const end = new Date(ye, me - 1, de);
  const out: Date[] = [];
  while (cur < end) {
    out.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/**
 * Disponibilidad real desde Supabase: las reservas activas (status != released)
 * de la unidad que solapan la ventana [from, to). Fail-open: ante cualquier error
 * devuelve el stub (sin fechas deshabilitadas) para no romper la UI.
 */
export async function getAvailabilityServer(
  unitId: UnitId,
  range: DateRange,
): Promise<Availability> {
  try {
    const fromYmd = toDateOnly(range.from);
    const toYmd = toDateOnly(range.to);
    const { data, error } = await getServiceClient()
      .from("reservations")
      .select("check_in, check_out")
      .eq("unit_id", unitId)
      .neq("status", "released")
      .lt("check_in", toYmd)
      .gt("check_out", fromYmd);
    if (error) {
      console.error(`[availability] query error para ${unitId}: ${error.message}`);
      return STUB;
    }
    const rows = (data ?? []) as Array<{ check_in: string; check_out: string }>;
    const disabledDates: Date[] = [];
    for (const r of rows) {
      for (const d of expandRange(r.check_in, r.check_out)) disabledDates.push(d);
    }
    return { disabledDates, source: "supabase" };
  } catch (err) {
    console.error(
      `[availability] error para ${unitId}: ${err instanceof Error ? err.message : String(err)}`,
    );
    return STUB;
  }
}
```

- [ ] **Step 4: Actualizar `rates.server.test.ts`**

En `tests/reservation/rates.server.test.ts`, reemplazar cada literal `source: "google-calendar"` por `source: "supabase"` (5 ocurrencias, líneas ~28, 43, 52, 60, 66).

- [ ] **Step 5: Correr y ver que pasan**

Run: `npx vitest run tests/reservation/availability.server.test.ts tests/reservation/rates.server.test.ts --maxWorkers=2`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/reservation/availability.server.ts tests/reservation/availability.server.test.ts tests/reservation/rates.server.test.ts
git commit -m "feat(reservas): disponibilidad leida desde Supabase en vez de iCal"
```

---

### Task 5: Ruta transferencia — insertar `pending` como candado, sin Google

**Files:**
- Modify: `app/api/reservations/transfer/route.ts`
- Test: `tests/reservation/transfer-route.test.ts`

**Interfaces:**
- Consumes: `insertReservation`, `OverlapError` (Task 2); `uploadComprobante`, `removeComprobante`.
- Produces: POST responde `409 {error:"conflict"}` ante `OverlapError`; `200 {status:"pending", code}` en éxito.

- [ ] **Step 1: Reescribir el test para el nuevo flujo**

En `tests/reservation/transfer-route.test.ts`:

1. Borrar el bloque `vi.mock("@/lib/reservation/calendar.server", ...)` y las `const isRangeAvailable/createPendingEvent/deleteEvent`.
2. Cambiar el mock de `reservations.server` para exponer también `OverlapError`:

```ts
class OverlapError extends Error { constructor() { super("overlap"); this.name = "OverlapError"; } }
const insertReservation = vi.fn();
vi.mock("@/lib/reservation/reservations.server", () => ({
  insertReservation: (...a: unknown[]) => insertReservation(...a),
  OverlapError,
}));
```

3. En `beforeEach`, setear `insertReservation.mockResolvedValue(undefined)` y `uploadComprobante.mockResolvedValue("comprobantes/x.jpg")`, `removeComprobante.mockResolvedValue(undefined)`.
4. Ajustar/agregar casos:

```ts
it("inserta pending y responde 200 con code", async () => {
  const res = await POST(form(VALID, goodFile()));
  const body = await res.json();
  expect(res.status).toBe(200);
  expect(body.status).toBe("pending");
  expect(insertReservation).toHaveBeenCalledOnce();
  expect(insertReservation.mock.calls[0][0].status).toBe("pending");
  expect(insertReservation.mock.calls[0][0].paymentMethod).toBe("transfer");
});

it("responde 409 y borra el comprobante si las fechas se solapan", async () => {
  insertReservation.mockRejectedValueOnce(new OverlapError());
  const res = await POST(form(VALID, goodFile()));
  expect(res.status).toBe(409);
  expect((await res.json()).error).toBe("conflict");
  expect(removeComprobante).toHaveBeenCalledWith("comprobantes/x.jpg");
});
```

(Conservar los casos de validación de FormData / archivo que ya existen.)

- [ ] **Step 2: Correr y ver que falla**

Run: `npx vitest run tests/reservation/transfer-route.test.ts --maxWorkers=2`
Expected: FAIL (la ruta aún importa `calendar.server`).

- [ ] **Step 3: Reescribir la ruta**

En `app/api/reservations/transfer/route.ts`:

1. Cambiar el import de la línea 2 por:

```ts
import { insertReservation, OverlapError } from "@/lib/reservation/reservations.server";
```

(y borrar el import viejo de `reservations.server` más abajo si quedara duplicado).

2. Reemplazar los bloques `// 1.` a `// 4.` (desde el re-chequeo hasta el insert) por:

```ts
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
```

- [ ] **Step 4: Correr y ver que pasan**

Run: `npx vitest run tests/reservation/transfer-route.test.ts --maxWorkers=2`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/reservations/transfer/route.ts tests/reservation/transfer-route.test.ts
git commit -m "feat(transfer): insert pending como candado, sin Google Calendar"
```

---

### Task 6: Ruta pagos (tarjeta) — retención antes de cobrar

**Files:**
- Modify: `app/api/payments/route.ts`
- Test: `tests/reservation/payments-route.test.ts`

**Interfaces:**
- Consumes: `insertReservation`, `upsertConfirmedByCode`, `setReservationStatusByCode`, `OverlapError` (Task 2).
- Produces: POST responde `409 {error:"conflict"}` si las fechas están tomadas ANTES de cobrar; `{status:"approved"|"pending"|"rejected", ...}` según el cobro.

- [ ] **Step 1: Reescribir el test**

En `tests/reservation/payments-route.test.ts`:

1. Borrar `vi.mock("@/lib/reservation/calendar.server", ...)`.
2. Mockear `reservations.server` con los cuatro símbolos:

```ts
class OverlapError extends Error { constructor() { super("overlap"); this.name = "OverlapError"; } }
const insertReservation = vi.fn();
const upsertConfirmedByCode = vi.fn();
const setReservationStatusByCode = vi.fn();
vi.mock("@/lib/reservation/reservations.server", () => ({
  insertReservation: (...a: unknown[]) => insertReservation(...a),
  upsertConfirmedByCode: (...a: unknown[]) => upsertConfirmedByCode(...a),
  setReservationStatusByCode: (...a: unknown[]) => setReservationStatusByCode(...a),
  OverlapError,
}));
```

3. Mantener el mock de `payments.server` en modo mock (`isMockMode` → true) para poder disparar outcomes con `mockOutcome`. En `beforeEach`: `insertReservation.mockResolvedValue(undefined)`, `upsertConfirmedByCode.mockResolvedValue(undefined)`, `setReservationStatusByCode.mockResolvedValue(undefined)`.
4. Casos:

```ts
it("409 sin cobrar si las fechas están tomadas (OverlapError antes del cobro)", async () => {
  insertReservation.mockRejectedValueOnce(new OverlapError());
  const res = await POST(bodyReq({ ...VALID, payment: { mockOutcome: "approved" } }));
  expect(res.status).toBe(409);
  expect((await res.json()).error).toBe("conflict");
  // no se confirmó nada
  expect(upsertConfirmedByCode).not.toHaveBeenCalled();
});

it("approved: retiene, cobra y confirma por code", async () => {
  const res = await POST(bodyReq({ ...VALID, payment: { mockOutcome: "approved" } }));
  const body = await res.json();
  expect(body.status).toBe("approved");
  expect(insertReservation.mock.calls[0][0].status).toBe("pending");
  expect(upsertConfirmedByCode).toHaveBeenCalledOnce();
});

it("rejected: libera la retención por code", async () => {
  const res = await POST(bodyReq({ ...VALID, payment: { mockOutcome: "rejected" } }));
  expect((await res.json()).status).toBe("rejected");
  expect(setReservationStatusByCode).toHaveBeenCalledWith(expect.any(String), "released");
});

it("pending: deja la fila en pending", async () => {
  const res = await POST(bodyReq({ ...VALID, payment: { mockOutcome: "pending" } }));
  expect((await res.json()).status).toBe("pending");
  expect(upsertConfirmedByCode).not.toHaveBeenCalled();
  expect(setReservationStatusByCode).not.toHaveBeenCalled();
});
```

Donde `bodyReq(obj)` arma `new Request("http://t/api/payments", { method:"POST", body: JSON.stringify(obj), headers:{"Content-Type":"application/json"} })` y `VALID` trae `unitId/checkIn/checkOut/guests/firstName/lastName/email` válidos (reusar el helper ya presente en el archivo; ajustar nombres si difieren).

- [ ] **Step 2: Correr y ver que falla**

Run: `npx vitest run tests/reservation/payments-route.test.ts --maxWorkers=2`
Expected: FAIL (la ruta aún importa `calendar.server`).

- [ ] **Step 3: Reescribir la ruta**

En `app/api/payments/route.ts`:

1. Cambiar imports: borrar el de `calendar.server` (línea 2) y ampliar el de reservas:

```ts
import {
  insertReservation,
  upsertConfirmedByCode,
  setReservationStatusByCode,
  OverlapError,
} from "@/lib/reservation/reservations.server";
```

2. Reemplazar el bloque de re-chequeo (`// Re-chequeo en tiempo real (fail-closed)` … el `if (!available) { … 409 }`) por la retención antes de cobrar:

```ts
  const code = generateBookingCode();

  // Retención ANTES de cobrar: la constraint de exclusión es el candado atómico.
  // Si las fechas están tomadas, nunca se cobra.
  try {
    await insertReservation({
      code, unitId, unitName: unit.name, checkIn, checkOut, nights,
      guests, firstName, lastName, email: email as string, phone: phoneStr, total,
      paymentMethod: "card", status: "pending", locale,
    });
  } catch (err) {
    if (err instanceof OverlapError) {
      return NextResponse.json({ error: "conflict" }, { status: 409 });
    }
    console.error("[payments] retencion fallo:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "db" }, { status: 502 });
  }
```

Nota: mover la construcción de `code` y el `metadata` (que usa `code`) para que queden después de esta retención; el `metadata` no cambia.

3. Envolver el cobro para liberar la retención si el cobro lanza:

```ts
  let outcome: PaymentOutcome;
  try {
    if (useMock) {
      outcome = mockPayment((payment as MockPay).mockOutcome, code);
    } else {
      // … createCardPayment(...) idéntico al actual …
    }
  } catch (err) {
    console.error("[payments] cobro fallo:", err instanceof Error ? err.message : err);
    await setReservationStatusByCode(code, "released");
    return NextResponse.json({ error: "payment" }, { status: 502 });
  }
```

4. Reemplazar la rama `approved` (que hacía `createBookingEvent` + `insertReservation`) por una confirmación de la fila ya retenida:

```ts
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
    }
    try { await sendConfirmationEmailOnce(code); }
    catch (err) { console.error("[payments] email fallo:", err instanceof Error ? err.message : err); }
    return NextResponse.json({ status: "approved", code, unitId, checkIn, checkOut, guests, total });
  }
```

5. La rama `pending/in_process` ya no inserta (la fila existe como retención): dejar solo el return:

```ts
  if (outcome.status === "pending" || outcome.status === "in_process") {
    return NextResponse.json({ status: "pending", code });
  }
```

6. La rama final `rejected` libera la retención:

```ts
  await setReservationStatusByCode(code, "released");
  return NextResponse.json({ status: "rejected", detail: outcome.statusDetail ?? null });
```

- [ ] **Step 4: Correr y ver que pasan**

Run: `npx vitest run tests/reservation/payments-route.test.ts --maxWorkers=2`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/payments/route.ts tests/reservation/payments-route.test.ts
git commit -m "feat(pagos): retencion en Supabase antes de cobrar, sin Google Calendar"
```

---

### Task 7: Webhook Mercado Pago — solo upsert, manejar 23P01

**Files:**
- Modify: `app/api/webhooks/mercadopago/route.ts`
- Test: `tests/reservation/webhook-route.test.ts`

**Interfaces:**
- Consumes: `upsertConfirmedByCode`, `OverlapError` (Task 2).
- Produces: siempre `200 {ok:true}` en el camino feliz e idempotente; ante `OverlapError` loguea y responde `200 {ok:true}` (no error a MP).

- [ ] **Step 1: Reescribir el test**

En `tests/reservation/webhook-route.test.ts`:

1. Borrar `vi.mock("@/lib/reservation/calendar.server", ...)` y sus consts.
2. Mockear `reservations.server`:

```ts
class OverlapError extends Error { constructor() { super("overlap"); this.name = "OverlapError"; } }
const upsertConfirmedByCode = vi.fn();
vi.mock("@/lib/reservation/reservations.server", () => ({
  upsertConfirmedByCode: (...a: unknown[]) => upsertConfirmedByCode(...a),
  OverlapError,
}));
```

3. `beforeEach`: `upsertConfirmedByCode.mockResolvedValue(undefined)`.
4. Casos (conservar los de firma inválida / no-payment que ya existan):

```ts
it("pago aprobado: confirma por code y responde ok", async () => {
  const res = await POST(approvedReq());
  expect(res.status).toBe(200);
  expect(upsertConfirmedByCode).toHaveBeenCalledOnce();
});

it("fechas tomadas al confirmar: loguea y responde ok (sin error a MP)", async () => {
  const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  upsertConfirmedByCode.mockRejectedValueOnce(new OverlapError());
  const res = await POST(approvedReq());
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
  errSpy.mockRestore();
});
```

Donde `approvedReq()` reutiliza el helper del archivo que arma el Request con firma válida y `getPayment` mockeado devolviendo `status:"approved"` + metadata completa (reusar lo ya presente; hoy el test mockea `payments.server`).

- [ ] **Step 2: Correr y ver que falla**

Run: `npx vitest run tests/reservation/webhook-route.test.ts --maxWorkers=2`
Expected: FAIL (aún importa `calendar.server`).

- [ ] **Step 3: Reescribir la ruta**

En `app/api/webhooks/mercadopago/route.ts`:

1. Borrar el import de `calendar.server` (líneas 3-7) y ampliar el de reservas:

```ts
import { upsertConfirmedByCode, OverlapError, type Locale } from "@/lib/reservation/reservations.server";
```

2. Reemplazar todo el bloque `try { const existing = await findBookingEventByCode(...) … }` (la lógica de eventos) por:

```ts
  const upsertInput = {
    code,
    unitId: unitId as UnitId,
    unitName: String(m.unit_name),
    checkIn: String(m.check_in),
    checkOut: String(m.check_out),
    nights: Number(m.nights),
    guests: Number(m.guests),
    firstName: String(m.first_name),
    lastName: String(m.last_name),
    email: String(m.email),
    phone: String(m.phone ?? ""),
    total: Number(m.total),
    paymentId: String(payment.id),
    locale: (m.locale === "en" || m.locale === "pt" ? m.locale : "es") as Locale,
  };

  try {
    await upsertConfirmedByCode(upsertInput);
  } catch (err) {
    if (err instanceof OverlapError) {
      console.error(`[webhook] pago ${payment.id} aprobado pero fechas ocupadas (code ${code}); requiere reembolso manual`);
      return NextResponse.json({ ok: true });
    }
    console.error("[webhook] persist supabase fallo:", err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: true });
  }

  try { await sendConfirmationEmailOnce(code); }
  catch (err) { console.error("[webhook] email fallo:", err instanceof Error ? err.message : err); }

  return NextResponse.json({ ok: true });
```

(Se elimina la idempotencia vía `findBookingEventByCode`: `upsertConfirmedByCode` ya es idempotente por `onConflict: code`, y `sendConfirmationEmailOnce` por su flip atómico.)

- [ ] **Step 4: Correr y ver que pasan**

Run: `npx vitest run tests/reservation/webhook-route.test.ts --maxWorkers=2`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/webhooks/mercadopago/route.ts tests/reservation/webhook-route.test.ts
git commit -m "feat(webhook): confirmar solo en Supabase, manejar solapamiento (23P01)"
```

---

### Task 8: Admin confirmar/liberar — sin eventos de calendario

**Files:**
- Modify: `app/api/admin/reservations/[id]/route.ts`
- Test: `tests/admin/actions.test.ts`

**Interfaces:**
- Consumes: `getReservationById`, `setReservationStatus`.
- Produces: `confirm` → status `confirmed` + email; `release` → status `released`. Ya no exige `calendar_event_id`.

- [ ] **Step 1: Actualizar el test**

En `tests/admin/actions.test.ts`:

1. Borrar `vi.mock("@/lib/reservation/calendar.server", ...)` (línea 12) y sus consts.
2. Ajustar los casos para que ya no esperen llamadas a `confirmEvent`/`deleteEvent` ni requieran `calendar_event_id` en la fila mockeada. Un caso mínimo:

```ts
it("confirm setea confirmed y manda email", async () => {
  getReservationById.mockResolvedValueOnce({
    id: "id-1", code: "CDL-1", unit_id: "aratiri",
    payment_method: "transfer", status: "pending",
  });
  const res = await POST(jsonReq({ action: "confirm" }), ctx("id-1"));
  expect(res.status).toBe(200);
  expect(setReservationStatus).toHaveBeenCalledWith("id-1", "confirmed");
});

it("release setea released", async () => {
  getReservationById.mockResolvedValueOnce({
    id: "id-2", code: "CDL-2", unit_id: "aratiri",
    payment_method: "transfer", status: "pending",
  });
  const res = await POST(jsonReq({ action: "release" }), ctx("id-2"));
  expect(setReservationStatus).toHaveBeenCalledWith("id-2", "released");
});
```

(Reutilizar los helpers `jsonReq`/`ctx` y los mocks de `getAdminUser`, `getReservationById`, `setReservationStatus`, `sendConfirmationEmailOnce` ya presentes en el archivo.)

- [ ] **Step 2: Correr y ver que falla**

Run: `npx vitest run tests/admin/actions.test.ts --maxWorkers=2`
Expected: FAIL (la ruta aún importa `calendar.server` y exige `calendar_event_id`).

- [ ] **Step 3: Reescribir la ruta**

En `app/api/admin/reservations/[id]/route.ts`:

1. Borrar el import de `calendar.server` (línea 4) y el de `UnitId` si queda sin uso.
2. Cambiar la guarda de estado para no exigir `calendar_event_id`:

```ts
  if (r.payment_method !== "transfer" || r.status !== "pending") {
    return NextResponse.json({ error: "invalid_state" }, { status: 400 });
  }
```

3. Reemplazar el `try { … confirmEvent/deleteEvent … }` por:

```ts
  try {
    if (action === "confirm") {
      await setReservationStatus(id, "confirmed");
      try { await sendConfirmationEmailOnce(r.code); }
      catch (err) { console.error("[admin] email fallo:", err instanceof Error ? err.message : err); }
    } else {
      await setReservationStatus(id, "released");
    }
  } catch (err) {
    console.error("[admin] acción fallo:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "server" }, { status: 502 });
  }
```

- [ ] **Step 4: Correr y ver que pasan**

Run: `npx vitest run tests/admin/actions.test.ts --maxWorkers=2`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/reservations/[id]/route.ts tests/admin/actions.test.ts
git commit -m "feat(admin): confirmar/liberar solo en Supabase, sin eventos de calendario"
```

---

### Task 9: Borrar `calendar.server.ts`, `ics.ts` y sus tests

**Files:**
- Delete: `lib/reservation/calendar.server.ts`
- Delete: `lib/reservation/ics.ts`
- Delete: `tests/reservation/calendar.server.test.ts`
- Delete: `tests/reservation/calendar-pending.test.ts`
- Delete: `tests/reservation/ics.test.ts`

**Interfaces:**
- Consumes: nada. Precondición: ninguna ruta importa ya `calendar.server` (Tasks 5-8) ni `ics` (Task 4).

- [ ] **Step 1: Verificar que no quedan referencias**

Run: `grep -rn "calendar.server\|reservation/ics" app lib tests --include=*.ts --include=*.tsx`
Expected: sin resultados.

- [ ] **Step 2: Borrar los archivos**

```bash
git rm lib/reservation/calendar.server.ts lib/reservation/ics.ts \
  tests/reservation/calendar.server.test.ts tests/reservation/calendar-pending.test.ts \
  tests/reservation/ics.test.ts
```

- [ ] **Step 3: Correr toda la suite**

Run: `npx vitest run --maxWorkers=2`
Expected: PASS (sin referencias colgadas).

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(reservas): eliminar Google Calendar (calendar.server e ics)"
```

---

### Task 10: `RangeCalendar` acepta `disabledDates`

**Files:**
- Modify: `components/reservas/RangeCalendar.tsx`
- Test: `tests/reservation/range-calendar.test.tsx` (nuevo)

**Interfaces:**
- Produces: `RangeCalendar` acepta prop opcional `disabledDates?: Date[]` y las pasa a `DayPicker` (además de `{ before: new Date() }`).

- [ ] **Step 1: Escribir el test**

Crear `tests/reservation/range-calendar.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { RangeCalendar } from "@/components/reservas/RangeCalendar";

vi.mock("next-intl", () => ({ useLocale: () => "es" }));

describe("RangeCalendar", () => {
  it("marca como deshabilitado un día ocupado provisto en disabledDates", () => {
    const busy = new Date(2026, 6, 10); // 10 jul 2026
    const { container } = render(
      <RangeCalendar
        value={{ checkIn: null, checkOut: null }}
        onChange={() => {}}
        disabledDates={[busy]}
      />,
    );
    // react-day-picker marca los días deshabilitados con aria-disabled o data-disabled.
    const disabled = container.querySelectorAll('[aria-disabled="true"], .rdp-disabled');
    expect(disabled.length).toBeGreaterThan(0);
  });
});
```

(Si el proyecto no tuviera `@testing-library/react`, verificarlo con `grep -r "@testing-library/react" package.json`; ya se usa en otros tests de componentes. Si no estuviera, este Task se reduce a la implementación + verificación de tipos con `npx tsc --noEmit`.)

- [ ] **Step 2: Correr y ver que falla**

Run: `npx vitest run tests/reservation/range-calendar.test.tsx --maxWorkers=2`
Expected: FAIL (la prop `disabledDates` no existe / no se aplica).

- [ ] **Step 3: Implementar la prop**

En `components/reservas/RangeCalendar.tsx`:

```tsx
interface RangeCalendarProps {
  value: RangeValue;
  onChange: (next: RangeValue) => void;
  disabledDates?: Date[];
}

export function RangeCalendar({ value, onChange, disabledDates = [] }: RangeCalendarProps) {
```

Y en el `<DayPicker>`, cambiar `disabled`:

```tsx
      disabled={[{ before: new Date() }, ...disabledDates]}
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `npx vitest run tests/reservation/range-calendar.test.tsx --maxWorkers=2`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/reservas/RangeCalendar.tsx tests/reservation/range-calendar.test.tsx
git commit -m "feat(ui): RangeCalendar acepta disabledDates"
```

---

### Task 11: Reserva manual del admin (form + server action)

**Files:**
- Create: `app/admin/reservas/actions.ts` (server action `createManualReservation`)
- Create: `app/admin/reservas/ManualReservationForm.tsx` (client component)
- Modify: `app/admin/reservas/page.tsx` (montar el form + cargar `disabledDates` por unidad)
- Test: `tests/admin/manual-reservation.test.ts` (nuevo)

**Interfaces:**
- Consumes: `insertReservation`, `OverlapError` (Task 2); `getAvailabilityServer` (Task 4); `generateBookingCode`; `getUnit`; `computeNights`; `getAdminUser`.
- Produces: `createManualReservation(input): Promise<{ ok: true } | { ok: false; error: "conflict" | "validation" | "server" }>`.

- [ ] **Step 1: Escribir el test de la server action**

Crear `tests/admin/manual-reservation.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/admin/auth", () => ({ getAdminUser: vi.fn(() => Promise.resolve({ email: "a@a.com" })) }));

class OverlapError extends Error { constructor() { super("overlap"); this.name = "OverlapError"; } }
const insertReservation = vi.fn();
vi.mock("@/lib/reservation/reservations.server", () => ({
  insertReservation: (...a: unknown[]) => insertReservation(...a),
  OverlapError,
}));

import { createManualReservation } from "@/app/admin/reservas/actions";

const VALID = {
  unitId: "aratiri", checkIn: "2026-08-01", checkOut: "2026-08-04",
  guests: 2, firstName: "Ana", lastName: "Gómez", email: "ana@t.com", phone: "+54",
};

beforeEach(() => {
  vi.clearAllMocks();
  insertReservation.mockResolvedValue(undefined);
});

describe("createManualReservation", () => {
  it("inserta con payment_method manual y status confirmed", async () => {
    const res = await createManualReservation(VALID);
    expect(res).toEqual({ ok: true });
    const row = insertReservation.mock.calls[0][0];
    expect(row.paymentMethod).toBe("manual");
    expect(row.status).toBe("confirmed");
    expect(row.nights).toBe(3);
  });

  it("devuelve conflict ante OverlapError", async () => {
    insertReservation.mockRejectedValueOnce(new OverlapError());
    const res = await createManualReservation(VALID);
    expect(res).toEqual({ ok: false, error: "conflict" });
  });

  it("valida fechas invertidas", async () => {
    const res = await createManualReservation({ ...VALID, checkOut: "2026-07-30" });
    expect(res).toEqual({ ok: false, error: "validation" });
    expect(insertReservation).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `npx vitest run tests/admin/manual-reservation.test.ts --maxWorkers=2`
Expected: FAIL (`createManualReservation` no existe).

- [ ] **Step 3: Implementar la server action**

Crear `app/admin/reservas/actions.ts`:

```ts
"use server";

import { getAdminUser } from "@/lib/admin/auth";
import { insertReservation, OverlapError } from "@/lib/reservation/reservations.server";
import { generateBookingCode } from "@/lib/reservation/code";
import { computeNights } from "@/lib/reservation/pricing";
import { getUnit } from "@/lib/units";
import { isValidEmail } from "@/lib/reservation/validation";
import type { UnitId } from "@/lib/reservation/reducer";

const VALID_UNITS: UnitId[] = ["aratiri", "aguaribay"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type ManualReservationInput = {
  unitId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  total?: number;
};

export type ManualReservationResult =
  | { ok: true }
  | { ok: false; error: "conflict" | "validation" | "server" };

export async function createManualReservation(
  input: ManualReservationInput,
): Promise<ManualReservationResult> {
  const admin = await getAdminUser();
  if (!admin) return { ok: false, error: "validation" };

  const { unitId, checkIn, checkOut, guests, firstName, lastName, email } = input;
  if (
    !(VALID_UNITS as string[]).includes(unitId) ||
    !DATE_RE.test(checkIn) || !DATE_RE.test(checkOut) || checkOut <= checkIn ||
    !Number.isInteger(guests) || guests < 1 ||
    !firstName?.trim() || !lastName?.trim() || !isValidEmail(email)
  ) {
    return { ok: false, error: "validation" };
  }

  const unit = getUnit(unitId as UnitId)!;
  if (guests > unit.specs.guests) return { ok: false, error: "validation" };

  const nights = computeNights(new Date(checkIn), new Date(checkOut));

  try {
    await insertReservation({
      code: generateBookingCode(),
      unitId: unitId as UnitId,
      unitName: unit.name,
      checkIn, checkOut, nights, guests,
      firstName, lastName, email,
      phone: input.phone ?? "",
      total: input.total ?? 0,
      paymentMethod: "manual",
      status: "confirmed",
    });
  } catch (err) {
    if (err instanceof OverlapError) return { ok: false, error: "conflict" };
    console.error("[admin] reserva manual fallo:", err instanceof Error ? err.message : err);
    return { ok: false, error: "server" };
  }

  return { ok: true };
}
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `npx vitest run tests/admin/manual-reservation.test.ts --maxWorkers=2`
Expected: PASS.

- [ ] **Step 5: Crear el form cliente**

Crear `app/admin/reservas/ManualReservationForm.tsx`. Componente `"use client"` con estado local (unidad, `RangeValue` para fechas usando `RangeCalendar` con `disabledDates` de la unidad elegida, huéspedes, nombre, apellido, email, teléfono, total opcional). Al enviar, llama a `createManualReservation` (importada como server action) y ante `{ok:false, error:"conflict"}` muestra "Esas fechas ya están ocupadas"; ante éxito, `router.refresh()`. Seguir el estilo inline del resto de `/admin` (mismos colores `#23362B` / `#E7E0D4`). `disabledDates` por unidad se pasan como prop desde la page (Step 6).

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RangeCalendar } from "@/components/reservas/RangeCalendar";
import type { RangeValue } from "@/lib/reservation/range";
import { createManualReservation } from "./actions";

type Props = { disabledByUnit: { aratiri: Date[]; aguaribay: Date[] } };

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function ManualReservationForm({ disabledByUnit }: Props) {
  const router = useRouter();
  const [unitId, setUnitId] = useState<"aratiri" | "aguaribay">("aratiri");
  const [range, setRange] = useState<RangeValue>({ checkIn: null, checkOut: null });
  const [guests, setGuests] = useState(2);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [total, setTotal] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!range.checkIn || !range.checkOut) { setMsg("Elegí las fechas."); return; }
    setBusy(true); setMsg(null);
    const res = await createManualReservation({
      unitId, checkIn: fmt(range.checkIn), checkOut: fmt(range.checkOut),
      guests, firstName, lastName, email, phone,
      total: total ? Number(total) : undefined,
    });
    setBusy(false);
    if (res.ok) { setRange({ checkIn: null, checkOut: null }); router.refresh(); }
    else setMsg(res.error === "conflict" ? "Esas fechas ya están ocupadas." : "Revisá los datos.");
  };

  return (
    <div style={{ background: "#fff", border: "1px solid #E7E0D4", borderRadius: 8, padding: 18, marginBottom: 20 }}>
      <h2 style={{ fontSize: 16, marginTop: 0 }}>Cargar reserva manual</h2>
      <select value={unitId} onChange={(e) => setUnitId(e.target.value as "aratiri" | "aguaribay")}>
        <option value="aratiri">Aratirí</option>
        <option value="aguaribay">Aguaribay</option>
      </select>
      <RangeCalendar value={range} onChange={setRange} disabledDates={disabledByUnit[unitId]} />
      <input type="number" min={1} value={guests} onChange={(e) => setGuests(Number(e.target.value))} placeholder="Huéspedes" />
      <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Nombre" />
      <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Apellido" />
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Teléfono (opcional)" />
      <input type="number" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="Total (opcional)" />
      {msg && <p role="alert" style={{ color: "#8a3b1d" }}>{msg}</p>}
      <button type="button" disabled={busy} onClick={submit}
        style={{ padding: "9px 16px", background: "#23362B", color: "#F8F5F0", border: "none", borderRadius: 3, cursor: "pointer" }}>
        Guardar reserva
      </button>
    </div>
  );
}
```

- [ ] **Step 6: Montar el form en la page**

En `app/admin/reservas/page.tsx`, antes del listado, calcular `disabledDates` de cada unidad (ventana hoy → +12 meses) y renderizar el form:

```tsx
import { getAvailabilityServer } from "@/lib/reservation/availability.server";
import { ManualReservationForm } from "./ManualReservationForm";
// … dentro del componente, tras resolver el filtro:
const winFrom = new Date();
const winTo = new Date(winFrom.getFullYear() + 1, winFrom.getMonth(), 1);
const [avAra, avAgu] = await Promise.all([
  getAvailabilityServer("aratiri", { from: winFrom, to: winTo }),
  getAvailabilityServer("aguaribay", { from: winFrom, to: winTo }),
]);
// … en el JSX, antes del <div> de tabs o del listado:
<ManualReservationForm disabledByUnit={{ aratiri: avAra.disabledDates, aguaribay: avAgu.disabledDates }} />
```

- [ ] **Step 7: Verificar tipos y suite**

Run: `npx tsc --noEmit && npx vitest run --maxWorkers=2`
Expected: sin errores de tipo; PASS.

- [ ] **Step 8: Commit**

```bash
git add app/admin/reservas/actions.ts app/admin/reservas/ManualReservationForm.tsx app/admin/reservas/page.tsx tests/admin/manual-reservation.test.ts
git commit -m "feat(admin): carga de reservas manuales (Meta Ads/WhatsApp)"
```

---

### Task 12: Limpieza de variables de entorno de Google

**Files:**
- Modify: `.env.example`
- Modify: `.env.local` (local, no versionado)

**Interfaces:** ninguna (solo documentación/config).

- [ ] **Step 1: Quitar las vars de Google de `.env.example`**

Borrar de `.env.example` las líneas de: `CDL_ICS_ARATIRI`, `CDL_ICS_AGUARIBAY`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_CALENDAR_TIMEZONE`, `CDL_CAL_ARATIRI`, `CDL_CAL_AGUARIBAY` y sus comentarios asociados.

- [ ] **Step 2: Quitar las mismas de `.env.local`**

Editar `.env.local` y borrar esas 6 claves (ya estaban vacías, salvo el timezone).

- [ ] **Step 3: Verificar que no se referencian en código**

Run: `grep -rn "CDL_ICS_\|CDL_CAL_\|GOOGLE_SERVICE_ACCOUNT_JSON\|GOOGLE_CALENDAR_TIMEZONE" app lib tests`
Expected: sin resultados.

- [ ] **Step 4: Suite completa final**

Run: `npx vitest run --maxWorkers=2`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add .env.example
git commit -m "chore(env): retirar variables de Google Calendar"
```

---

## Self-Review

**Cobertura del spec:**
- Constraint de exclusión + `manual` + drop `calendar_event_id` → Task 1. ✓
- Lectura desde Supabase (misma firma) → Task 4. ✓
- `OverlapError` / helper por code → Task 2. ✓
- Transfer / payments / webhook / admin sin Google → Tasks 5,6,7,8. ✓
- Reserva manual → Task 11. ✓
- `RangeCalendar` con `disabledDates` → Task 10. ✓
- Borrado de `calendar.server.ts`, `ics.ts`, tests → Task 9. ✓
- Limpieza de env → Task 12. ✓
- Cambio de tipo `source` → Task 3. ✓

**Orden de dependencias:** Task 9 (borrado) va después de que Tasks 5-8 dejan de importar `calendar.server` y Task 4 deja de importar `ics`. ✓

**Consistencia de tipos:** `OverlapError`, `setReservationStatusByCode`, `getAvailabilityServer`, `createManualReservation` se definen antes de consumirse. `AvailabilitySource` se estrecha en Task 3 antes de que Task 4 lo emita. ✓

**Riesgo señalado:** Task 1 Step 1 verifica solapamientos preexistentes antes de crear la constraint (si la DB de prod ya tuviera datos sucios, la creación fallaría).
