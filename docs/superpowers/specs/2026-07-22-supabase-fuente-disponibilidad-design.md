# Supabase como fuente única de disponibilidad — Diseño

**Fecha:** 2026-07-22
**Estado:** aprobado, pendiente de plan de implementación
**Reemplaza:** el subsistema de Google Calendar (`lib/reservation/calendar.server.ts` + iCal)

## Problema

Hoy la disponibilidad de las cabañas depende de **Google Calendar**, que cumple dos
roles, ambos redundantes:

1. **Lectura:** `availability.server.ts` hace `fetch` a la URL iCal secreta de cada
   unidad y parsea las fechas ocupadas.
2. **Candado:** cada reserva crea un evento (`[PENDIENTE]`/`[CONFIRMADA]`) que bloquea
   las fechas; antes de crear el evento se re-chequea la disponibilidad contra Google
   (`isRangeAvailable`, fail-closed).

Pero la tabla `reservations` de Supabase **ya guarda** `unit_id`, `check_in`,
`check_out` y `status` de cada reserva. Google es una copia paralela de datos que ya
existen.

Esta arquitectura además impone fricción operativa inaceptable para el modelo de
negocio (vender la web a clientes): requiere, **por cada cliente**, una cuenta de
Google, un proyecto de Google Cloud, un service account con clave JSON y compartir los
calendarios. La consola de Google Cloud pide un método de pago para habilitarse.

## Objetivo

Eliminar Google Calendar por completo y derivar toda la disponibilidad de Supabase,
que ya se provisiona por cada cliente. Sin cuentas de Google, sin service accounts, sin
tarjeta, sin servicios de terceros. Patrón replicable: **una web + su Supabase**.

Además, habilitar que el manager cargue **reservas manuales** (las que cierra en
privado por Meta Ads/WhatsApp) para que ocupen fechas y no se sobrevendan online.

## No-objetivos

- Publicación en Airbnb/Booking ni importación de canales externos (la web es el único
  canal; se atraen clientes por Meta Ads pero la reserva se registra siempre acá).
- Feed iCal de solo lectura para el manager (diferido; el manager gestiona desde
  `/admin`). El diseño no lo impide a futuro.
- Rediseño del almanaque visual (se reutiliza lo existente).

## Regla de ocupación

Una fila de `reservations` ocupa sus fechas si `status ∈ {pending, confirmed}`.
`released` libera las fechas. El rango es semiabierto `[check_in, check_out)`: el día de
checkout queda libre para un nuevo check-in (mismo criterio que hoy con los eventos
all-day de Google, cuyo `DTEND` es exclusivo).

## Arquitectura

### 1. Cambios en la base de datos (migración + `setup.sql`)

```sql
-- Candado anti-doble-booking a nivel DB (reemplaza isRangeAvailable).
create extension if not exists btree_gist;

alter table public.reservations
  add constraint reservations_no_overlap
  exclude using gist (
    unit_id with =,
    daterange(check_in, check_out, '[)') with &&
  ) where (status <> 'released');

-- Reservas manuales del manager (Meta Ads/WhatsApp).
alter table public.reservations
  drop constraint reservations_payment_method_check,
  add constraint reservations_payment_method_check
    check (payment_method in ('card', 'transfer', 'manual'));

-- Columna vestigial del viejo Google Calendar.
alter table public.reservations drop column if exists calendar_event_id;
```

La constraint de exclusión hace **físicamente imposible** insertar dos reservas activas
superpuestas en la misma cabaña. Una inserción que la viole falla con SQLSTATE `23P01`
(`exclusion_violation`). Es atómico y sin ventana de carrera — estrictamente más fuerte
que el `check-then-act` actual contra Google.

**Precondición de la migración:** la constraint solo se crea si no hay filas activas
superpuestas preexistentes. Antes de aplicar en producción se corre un `SELECT` de
verificación de solapamientos; si hubiera, se resuelven manualmente primero.

### 2. Lectura de disponibilidad

`lib/reservation/availability.server.ts` deja de hacer `fetch` al iCal y consulta
Supabase, **manteniendo la misma firma y forma de retorno** (`getAvailabilityServer(unitId,
{from,to}) → { disabledDates: Date[]; source }`), para no tocar a sus dos consumidores:
`app/api/availability/[unitId]/route.ts` y `lib/reservation/rates.server.ts`.

```sql
select check_in, check_out from public.reservations
where unit_id = $1 and status <> 'released'
  and check_in < $to and check_out > $from;
```

Cada rango `[check_in, check_out)` se expande a sus días ocupados (incluye check_in,
excluye check_out) y se devuelve en `disabledDates`. El tipo `AvailabilitySource` cambia
`"google-calendar"` → `"supabase"` (en `availability.ts` y `availability.server.ts`).

Fail-open se mantiene: ante error de DB, `{ disabledDates: [], source: "stub" }`.

### 3. Caminos de escritura

Se elimina todo import de `calendar.server` (`app/api/payments`,
`app/api/reservations/transfer`, `app/api/webhooks/mercadopago`,
`app/api/admin/reservations/[id]`). El candado pasa a ser la inserción en Supabase.

`insertReservation` (`reservations.server.ts`) detecta la violación de exclusión: si
`error.code === '23P01'`, lanza un error tipado (`OverlapError`) que las rutas mapean a
`409 conflict`.

#### 3a. Transferencia (`/api/reservations/transfer`)

Antes: `isRangeAvailable` → subir comprobante → `createPendingEvent` → `insertReservation`
→ (rollback de evento/comprobante si algo falla).

Después: subir comprobante → `insertReservation(status:'pending', payment_method:'transfer')`.
Si la inserción lanza `OverlapError` → borrar el comprobante y responder `409 conflict`.
Otros fallos de inserción → borrar comprobante y `502`. Se elimina el rollback de evento.

#### 3b. Pago con tarjeta (`/api/payments`) — camino del dinero

**Punto crítico:** hoy se chequea disponibilidad *antes* de cobrar y se crea el evento
*después*. Sin el candado de Google, el orden debe garantizar que **nunca se cobre sin
lugar**. Diseño con fila de retención (hold):

1. `insertReservation(status:'pending', payment_method:'card')` **antes de cobrar** — la
   constraint es el candado atómico. Si lanza `OverlapError` → `409 conflict`, sin cobro.
2. Cobrar (`createCardPayment` / `mockPayment`).
3. Según resultado:
   - **approved:** `upsertConfirmedByCode` (o update por `code`) → `status:'confirmed'` +
     `payment_id`; enviar email. (El webhook posterior es idempotente por `code`.)
   - **pending/in_process:** dejar la fila en `pending` con `payment_id` (el webhook la
     confirmará).
   - **rejected:** liberar la retención (marcar la fila `released` por `code` — puede
     requerir un helper `setReservationStatusByCode`) y responder `rejected`.
4. Si el cobro (paso 2) tira excepción antes de resolverse: liberar la retención y `502`.

Esto elimina por completo el riesgo de "cobrado pero sin lugar" del check-then-act
actual. Ventana de huérfano: solo si el server crashea entre el paso 1 y el 3, dejando
una retención `pending` de milisegundos; se cubre con el "release" manual del admin (ver
Consideraciones).

#### 3c. Webhook Mercado Pago (`/api/webhooks/mercadopago`)

Se quitan `findBookingEventByCode` / `isRangeAvailable` / `createBookingEvent`. Queda
`upsertConfirmedByCode` (idempotente por `onConflict: code`). Un re-run sobre la misma
fila no reintroduce solapamiento (la exclusión no compara una fila consigo misma en un
UPDATE que no cambia el rango). Si el upsert insertara una fila nueva que solapa (las
fechas se ocuparon entre checkout y webhook) → capturar `23P01`, loguear "pagado pero
ocupado, requiere reembolso manual" y responder `ok` (mismo criterio que el actual
`if (!available)`), sin devolver error a MP.

#### 3d. Admin confirmar/liberar (`/api/admin/reservations/[id]`)

Se quitan `confirmEvent` / `deleteEvent` y la exigencia de `calendar_event_id`.
- **confirm:** `setReservationStatus(id,'confirmed')` + email.
- **release:** `setReservationStatus(id,'released')` — al quedar fuera de la constraint,
  las fechas se liberan solas.

### 4. Reservas manuales del manager (NUEVO)

Formulario en `/admin/reservas` para cargar reservas cerradas en privado:

- **Campos:** cabaña (aratiri/aguaribay), rango de fechas, huéspedes, nombre, apellido,
  contacto (email y/o teléfono), total (opcional), estado (por defecto `confirmed`).
- **Persistencia:** `insertReservation` con `payment_method:'manual'`, `code` generado,
  `paymentId` nulo. Ocupa fechas y aparece en el listado y en la disponibilidad pública.
- **Selección de fechas:** se reutiliza `components/reservas/RangeCalendar.tsx` (que
  envuelve `react-day-picker`, ya instalado). Para esto se extiende `RangeCalendar` con
  una prop opcional `disabledDates: Date[]` que se pasa a `DayPicker` (`disabled`),
  mostrando tachados los días ya ocupados de esa cabaña. **No se agrega ninguna
  dependencia.**
- **Bloqueo duro:** si el rango pisa otra reserva activa, la constraint lo frena
  (`OverlapError` → aviso claro en el form). No hay override (decisión: seguridad ante
  sobreventa por encima de flexibilidad manual).

### 5. Almanaque visual: sin librería nueva

La UI de calendario ya existe y no se reemplaza:
- `react-day-picker@^10` + `date-fns@^4` ya en `package.json`.
- El SearchWidget del home usa `DayPicker` inline; `RangeCalendar.tsx` lo envuelve para
  el flujo de reserva y el nuevo form admin.

La lógica de disponibilidad y el candado se escriben a mano (query + constraint): es
lógica de negocio, no hay librería que la reemplace. Decisión: **librería para lo
visual, código propio para la lógica.**

## Limpieza / borrado

- Borrar `lib/reservation/calendar.server.ts`.
- Borrar `lib/reservation/ics.ts` y `tests/reservation/ics.test.ts` (ya no se lee iCal).
- Quitar de `.env.example` y `.env.local`: `GOOGLE_SERVICE_ACCOUNT_JSON`,
  `GOOGLE_CALENDAR_TIMEZONE`, `CDL_CAL_ARATIRI`, `CDL_CAL_AGUARIBAY`, `CDL_ICS_ARATIRI`,
  `CDL_ICS_AGUARIBAY`.
- Dropear la columna `calendar_event_id` (migración) y quitar el campo de
  `ReservationRow` / `InsertReservationInput` / `toRow` en `reservations.server.ts`.

## Testing (TDD)

- **Reescribir** `availability.server.test.ts`: ahora contra el cliente Supabase
  mockeado (no `fetch` a iCal). Verificar expansión de rangos y el turnover en checkout.
- **Reescribir** `transfer-route.test.ts` y `webhook-route.test.ts`: sin mock de
  `calendar.server`; agregar caso de `OverlapError` → 409 / log de reembolso manual.
- **Reescribir** `payments-route.test.ts`: nuevo orden hold→cobro→confirmar/liberar;
  casos approved / pending / rejected / conflicto pre-cobro.
- **Actualizar** `admin/actions.test.ts` y `rates.server.test.ts` (source `"supabase"`).
- **Borrar** `calendar.server.test.ts`, `calendar-pending.test.ts`, `ics.test.ts`.
- **Agregar** test del path de reserva manual (inserción `manual` + conflicto).
- Vitest con `--maxWorkers=2` (convención del proyecto).

## Consideraciones y decisiones tomadas

- **Reserva manual: bloqueo duro** ante solapamiento (sin override).
- **Migración de la constraint:** verificar ausencia de solapamientos preexistentes en
  prod antes de crearla.
- **Retenciones `pending` huérfanas** (card): ventana de milisegundos por crash entre
  hold y confirmación; se limpian con el "Liberar" manual del admin. Una expiración
  automática de holds viejos queda como mejora futura, fuera de alcance.
- **Código muerto preexistente:** `RangeCalendar.tsx` y el `getAvailability` cliente hoy
  no tienen consumidor. Este diseño le da uso a `RangeCalendar` (form admin). El
  `getAvailability` cliente se mantiene (lo usa `availability.test.ts`) actualizando su
  `source`.

## Archivos afectados (resumen)

| Archivo | Cambio |
|---|---|
| `supabase/setup.sql` + nueva migración | extensión + constraint + `manual` + drop `calendar_event_id` |
| `lib/reservation/availability.server.ts` | query a Supabase en vez de iCal |
| `lib/reservation/availability.ts` | `source: "supabase"` |
| `lib/reservation/reservations.server.ts` | `OverlapError`, quitar `calendar_event_id` |
| `lib/reservation/calendar.server.ts` | **borrar** |
| `lib/reservation/ics.ts` | **borrar** |
| `app/api/payments/route.ts` | hold→cobro→confirmar/liberar |
| `app/api/reservations/transfer/route.ts` | insertar pending como candado |
| `app/api/webhooks/mercadopago/route.ts` | solo upsert, manejar 23P01 |
| `app/api/admin/reservations/[id]/route.ts` | confirm/release sin eventos |
| `app/admin/reservas/*` | form de reserva manual |
| `components/reservas/RangeCalendar.tsx` | prop `disabledDates` |
| `.env.example`, `.env.local` | quitar vars de Google |
| `tests/**` | reescribir/borrar según lo anterior |
