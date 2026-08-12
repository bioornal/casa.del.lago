# Dominio 5 — La unidad de prueba: probar la cadena completa sin cobrarle a nadie

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poder correr una reserva pagada de punta a punta —cobro real con tarjeta, fila en Supabase, email al huésped con el `.ics`, aviso al dueño, lookup por código— contra una unidad de alojamiento que no existe y por $2.500, en vez de descubrir que algo de esa cadena falla con la reserva de un huésped real.

**Architecture:** Un módulo nuevo, `lib/reservation/test-unit.ts`, es el dueño único del ID (`"prueba"`) y del monto. `UnitId` —el tipo del estado del checkout— se amplía para incluirlo, y ese ensanche hace que TypeScript marque cada consumidor que quedó incompleto: es el mecanismo por el que la unidad de prueba se propaga sin que nadie se olvide de un lugar. El acceso está cerrado por defecto y se abre desde `/admin/configuracion` con un flag en `site_settings`, que el server consulta en cada borde: el deep-link, la disponibilidad y el cobro. **El flag global no alcanza en ningún punto**: siempre se exige además que la unidad pedida sea la de prueba, porque si no, prender el toggle abriría el checkout de las unidades reales a cualquiera con un link.

**Tech Stack:** TypeScript, Next.js 16 App Router (server components, route handlers, server actions), React 19, Vitest + @testing-library/react, Supabase, Mercado Pago.

## Global Constraints

- Portado desde `bioornal/arumalodgeweb` @ `15031c5`. Los repos **no comparten historia git**: todo a mano.
- **La Casa del Lago tiene dos unidades**, `aratiri` y `aguaribay`. Aruma tiene tres (`yvyra`, `amambay`, `irupe`). No copiar slugs ni precios.
- **No existe Google Calendar en este repo.** El origen menciona "evento en el calendario de prueba" en el copy del toggle y llama a `createBookingEvent` en las rutas: **nada de eso se porta**. Acá la cadena es cobro → Supabase → emails → lookup.
- **El front no se toca**, con una excepción autorizada por el spec para este dominio: `TestUnitToggle.tsx`, componente nuevo del panel de admin. Aparte de eso, los cambios en los cuatro componentes del checkout son de dos clases y **ninguna altera lo que ve un huésped real**: (a) cambiar qué función calcula el total, que para una unidad real devuelve el mismo número, y (b) ramas nuevas detrás de `isTestUnit(...)`, que solo se renderizan con la unidad falsa.
- **Cerrado por defecto, en todos lados.** El flag arranca en `false`, la columna se crea con `default false`, y cualquier valor que no sea el booleano `true` no habilita nada. La dirección segura del error es no dejar cobrable lo que nadie pidió habilitar.
- Comentarios en español, explicando el *porqué*, no el *qué*.
- `pnpm`, nunca `npm` ni `npx`.

## Lo que la inspección encontró

**No se pisa con `/admin/pago-prueba`, que ya existe.** Esa página cobra $1.000 reales para validar tokenización, cobro y webhook, y su propio copy aclara que *"no genera ninguna reserva ni toca el calendario"*. Una reserva manual desde el panel, por el otro lado, prueba la base y el email pero no el pago. **Lo único que hoy nadie prueba es la costura entre las dos cosas**, que es lo que este dominio cubre. Por eso el monto de la unidad de prueba es $2.500 y no $1.000: distinto del de la otra herramienta, para poder distinguirlos de un vistazo en la actividad de Mercado Pago.

**La base no necesita nada más que una columna.** `reservations.unit_id` es `text` sin `CHECK`, así que `"prueba"` entra sin tocar el esquema, y la constraint de exclusión GiST incluye `unit_id with =`: una reserva de prueba **no puede bloquear** fechas de una unidad real. Lo único que hace falta es `site_settings.test_unit_enabled`.

**`parseGuests` acepta 1 a 6**, igual que en el origen, así que la ficha de la unidad de prueba declara `guests: 6`: con más quedaría inalcanzable desde la URL.

**Hay un hermano local para el toggle.** `app/admin/configuracion/ModeToggle.tsx` ya existe y usa `useActionState` contra una server action del mismo directorio. `TestUnitToggle` sigue ese patrón, no inventa uno.

## Archivos

| Archivo | Task |
|---|---|
| `lib/reservation/test-unit.ts` (nuevo) | 1 |
| `lib/site-settings.ts`, `lib/site-settings.server.ts` | 1 |
| `supabase/setup.sql` | 1 |
| `tests/reservation/test-unit.test.ts` (nuevo), `tests/site-settings.test.ts` | 1 |
| `lib/reservation/reducer.ts` | 2 |
| `components/reservas/{OrderSummary,StepPago,StepTransferencia,Confirmacion}.tsx` | 2 |
| `lib/reservation/search.ts` | 3 |
| `app/api/availability/[unitId]/route.ts` | 3 |
| `app/[locale]/reservas/page.tsx`, `components/reservas/ReservaFlow.tsx` | 3 |
| `app/api/payments/route.ts`, `app/api/webhooks/mercadopago/route.ts` | 4 |
| `app/admin/configuracion/{TestUnitToggle.tsx,actions.ts,page.tsx}` | 5 |

---

### Task 1: El módulo, el flag y la columna

**Files:**
- Create: `lib/reservation/test-unit.ts`, `tests/reservation/test-unit.test.ts`
- Modify: `lib/site-settings.ts`, `lib/site-settings.server.ts`, `supabase/setup.sql`, `tests/site-settings.test.ts`

**Interfaces:**
- Consumes: `getUnit`, `Unit`, `UnitSlug` de `@/lib/units`; `RateSettings` de `./rate-settings`; `methodTotal`, `transferSavings`, `PaymentMethod` de `./method-pricing`.
- Produces, desde `@/lib/reservation/test-unit`:
  - `TEST_UNIT_ID = "prueba"`, `TEST_UNIT_TOTAL = 2500`
  - `type BookableUnitId = UnitSlug | typeof TEST_UNIT_ID`
  - `type BookableUnit = Omit<Unit, "slug"> & { slug: BookableUnitId }`
  - `TEST_UNIT: BookableUnit`
  - `isTestUnit(id: string): id is typeof TEST_UNIT_ID`
  - `allowsTestUnit(requestedUnit: unknown, flagEnabled: boolean): boolean`
  - `resolveUnit(id: BookableUnitId): BookableUnit`
  - `checkoutTotal(s: RateSettings, method: PaymentMethod, unitId: BookableUnitId, nights: number): number`
  - `checkoutSavings(s: RateSettings, unitId: BookableUnitId, nights: number): number`
- Produces, desde site-settings: `SiteSettings.testUnitEnabled: boolean`, `saveTestUnitEnabled(enabled: boolean): Promise<void>`, `isTestUnitEnabled(): Promise<boolean>`.

- [ ] **Step 1: Escribir el test del módulo, y que falle**

Crear `tests/reservation/test-unit.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  TEST_UNIT_ID, TEST_UNIT_TOTAL, TEST_UNIT,
  isTestUnit, allowsTestUnit, resolveUnit, checkoutTotal, checkoutSavings,
} from "@/lib/reservation/test-unit";
import { DEFAULT_RATE_SETTINGS } from "@/lib/reservation/rate-settings";
import { methodTotal, transferSavings } from "@/lib/reservation/method-pricing";
import { getUnit } from "@/lib/units";

describe("la unidad de prueba", () => {
  it("no es ninguna de las unidades reales", () => {
    expect(isTestUnit(TEST_UNIT_ID)).toBe(true);
    expect(isTestUnit("aratiri")).toBe(false);
    expect(isTestUnit("aguaribay")).toBe(false);
    expect(getUnit(TEST_UNIT_ID as never)).toBeUndefined();
  });

  it("declara 6 huéspedes: con más quedaría inalcanzable desde la URL", () => {
    // parseGuests (search.ts) rechaza > 6.
    expect(TEST_UNIT.specs.guests).toBe(6);
  });

  it("el nombre le avisa al huésped que no es una reserva real", () => {
    expect(TEST_UNIT.name.toLowerCase()).toContain("prueba");
  });
});

describe("allowsTestUnit", () => {
  it("el flag solo no alcanza: hay que pedir la unidad de prueba", () => {
    // Si bastara el flag, prender el toggle abriría el checkout de las
    // unidades reales a cualquiera con un deep-link.
    expect(allowsTestUnit("aratiri", true)).toBe(false);
    expect(allowsTestUnit(undefined, true)).toBe(false);
    expect(allowsTestUnit(TEST_UNIT_ID, true)).toBe(true);
  });

  it("con el flag apagado no pasa ni pidiéndola", () => {
    expect(allowsTestUnit(TEST_UNIT_ID, false)).toBe(false);
  });
});

describe("checkoutTotal y checkoutSavings", () => {
  it("para una unidad real devuelven exactamente lo de siempre", () => {
    // Es lo que hace que cambiar methodTotal por checkoutTotal en el checkout
    // no altere un solo importe de un huésped real.
    for (const method of ["card", "transfer"] as const) {
      for (const nights of [1, 3, 7]) {
        expect(checkoutTotal(DEFAULT_RATE_SETTINGS, method, "aratiri", nights))
          .toBe(methodTotal(DEFAULT_RATE_SETTINGS, method, "aratiri", nights));
      }
    }
    expect(checkoutSavings(DEFAULT_RATE_SETTINGS, "aguaribay", 3))
      .toBe(transferSavings(DEFAULT_RATE_SETTINGS, "aguaribay", 3));
  });

  it("la de prueba es un precio plano que no depende de las noches", () => {
    for (const nights of [1, 3, 30]) {
      expect(checkoutTotal(DEFAULT_RATE_SETTINGS, "card", TEST_UNIT_ID, nights)).toBe(TEST_UNIT_TOTAL);
    }
  });

  it("la de prueba no ofrece ahorro por transferencia: es solo tarjeta", () => {
    expect(checkoutSavings(DEFAULT_RATE_SETTINGS, TEST_UNIT_ID, 3)).toBe(0);
  });

  it("resolveUnit devuelve la ficha correcta según el id", () => {
    expect(resolveUnit(TEST_UNIT_ID).slug).toBe(TEST_UNIT_ID);
    expect(resolveUnit("aratiri").name).toBe(getUnit("aratiri")!.name);
  });
});
```

- [ ] **Step 2: Correr y ver el rojo**

Run: `pnpm vitest run tests/reservation/test-unit.test.ts`
Expected: FAIL — no existe el módulo.

- [ ] **Step 3: Escribir el módulo**

Crear `lib/reservation/test-unit.ts`. Encabezalo explicando qué es y por qué el monto vive ahí:

```ts
// Unidad de alojamiento que NO existe, para probar la cadena completa de una
// reserva pagada (cobro → Supabase → emails → lookup) sin cobrarle una estadía
// real a nadie. Se habilita con el toggle de /admin/configuracion.
//
// Este módulo es el dueño único del ID y del monto. Igual que el TEST_AMOUNT de
// app/api/admin/test-payment/route.ts, el monto vive ACÁ y en ningún otro lado:
// nunca viaja desde el cliente, el server siempre lo recalcula con checkoutTotal.
//
// $2.500 y no $1.000 como el pago de prueba de /admin/pago-prueba: son dos
// herramientas distintas y conviene distinguirlas de un vistazo en la actividad
// de Mercado Pago.
```

El contenido es el de la sección "Interfaces" de arriba. Puntos que no son negociables y van con su comentario:

- `TEST_UNIT.specs.guests = 6`, porque `parseGuests` rechaza más.
- El nombre: `"UNIDAD DE PRUEBA — no es una reserva real"`. Si alguien llega por accidente al checkout, tiene que verlo.
- `allowsTestUnit` exige **las dos** condiciones. El comentario tiene que decir por qué el flag global no alcanza.
- `checkoutTotal` es el único lugar que decide cuánto sale una reserva: lo usan el checkout para mostrar y `/api/payments` para cobrar. Si divergieran, se tokeniza un importe y se captura otro.

- [ ] **Step 4: Correr y ver el verde**

Run: `pnpm vitest run tests/reservation/test-unit.test.ts`
Expected: PASS.

- [ ] **Step 5: El flag en `lib/site-settings.ts`**

Agregar `testUnitEnabled: boolean` al tipo `SiteSettings`, con `false` en el default. En el tipo de la fila, `test_unit_enabled?: boolean | null` (puede faltar si todavía no se corrió el SQL). Al mapear:

```ts
    // Estrictamente `=== true`: un string, un null o un 1 no habilitan cobros.
    testUnitEnabled: row.test_unit_enabled === true,
```

**`siteSettingsToRow` NO emite `test_unit_enabled`**, a propósito, y lleva su comentario: el upsert de Supabase toca solo las columnas provistas, así que guardar el modo de reserva no puede apagar la unidad de prueba de rebote. El toggle se persiste aparte.

Si hay una función que valida y arma un `SiteSettings` desde un form (en el origen es la que devuelve `{ ok: true, value: { bookingMode: mode } }`), completá `testUnitEnabled: false` ahí con el comentario de que ese valor nunca llega a la base porque `siteSettingsToRow` no lo emite.

- [ ] **Step 6: Las dos funciones en `lib/site-settings.server.ts`**

```ts
/**
 * Persiste SOLO la columna del toggle de prueba, con un update dirigido.
 *
 * No reusa saveSiteSettings a propósito: ese hace upsert de un SiteSettings
 * completo, y armarlo exigiría leer el estado actual con getSiteSettings() —
 * que ante un error de Supabase devuelve el default CERRADO. Un blip de red en
 * medio de ese merge escribiría booking_mode='whatsapp' pisando un 'online'
 * legítimo y pausaría las reservas sin que nadie lo pidiera.
 */
export async function saveTestUnitEnabled(enabled: boolean): Promise<void> {
  const { error } = await getServiceClient()
    .from("site_settings")
    .update({ test_unit_enabled: enabled })
    .eq("id", 1);
  if (error) throw new Error(`saveTestUnitEnabled: ${error.message}`);
  invalidateSiteSettingsCache();
}

/**
 * Punto de entrada único para preguntar si la unidad de prueba está habilitada.
 * Igual que getBookingMode: no llamar a getSiteSettings() directo para decidir
 * si se puede cobrar.
 */
export async function isTestUnitEnabled(): Promise<boolean> {
  return (await getSiteSettings()).testUnitEnabled;
}
```

Los nombres `getServiceClient` e `invalidateSiteSettingsCache` son los que ya use el archivo; si difieren, usá los locales.

- [ ] **Step 7: Tests del flag**

En `tests/site-settings.test.ts`, agregá casos para el mapeo: que `test_unit_enabled: true` dé `testUnitEnabled: true`; que `null`, `undefined`, `"true"` y `1` den `false`; y que `siteSettingsToRow` **no** incluya la clave `test_unit_enabled` en su salida.

- [ ] **Step 8: La columna en `supabase/setup.sql`**

Al final del archivo, con el mismo estilo de bloque fechado que ya usa:

```sql
-- =============================================================
-- 2026-08-11 — Unidad de prueba (ver lib/reservation/test-unit.ts).
-- Arranca en false: habilitar un cobro es siempre una acción explícita.
-- =============================================================
alter table public.site_settings
  add column if not exists test_unit_enabled boolean not null default false;
```

`reservations.unit_id` es `text` sin `CHECK`, así que no hace falta tocarla.

- [ ] **Step 9: Suite, build y commit**

Run: `pnpm test && pnpm build`

```bash
git add lib/reservation/test-unit.ts lib/site-settings.ts lib/site-settings.server.ts supabase/setup.sql tests/reservation/test-unit.test.ts tests/site-settings.test.ts
git commit -m "feat(admin): unidad de prueba — módulo, flag y columna"
```

---

### Task 2: Ampliar `UnitId` y adaptar el checkout

Al ampliar el tipo, TypeScript marca cada consumidor que quedó incompleto. **Ese es el mecanismo**: no busques los lugares a mano, dejá que el compilador te los diga y arreglá lo que marque. Al terminar esta task el árbol compila, nada cambia para una unidad real, y la unidad de prueba sigue siendo inalcanzable porque ningún borde la deja pasar todavía.

**Files:**
- Modify: `lib/reservation/reducer.ts`
- Modify: `components/reservas/OrderSummary.tsx`, `StepPago.tsx`, `StepTransferencia.tsx`, `Confirmacion.tsx`
- Test: `tests/reservation/order-summary.test.tsx`

**Interfaces:**
- Consumes: todo lo de la Task 1.
- Produces: `UnitId` (de `@/lib/reservation/reducer`) pasa a ser `BookableUnitId`. Es el tipo que importan varios módulos.

- [ ] **Step 1: Ampliar el tipo**

En `lib/reservation/reducer.ts`, reemplazar la declaración de `UnitId` por el alias, con el comentario que explica el mecanismo:

```ts
import type { BookableUnitId } from "./test-unit";

// El conjunto reservable = catálogo público + unidad de prueba. El alias se
// mantiene porque `UnitId` es el nombre que importan varios módulos; ampliar
// acá hace que TypeScript marque cada lugar que quedó incompleto.
export type UnitId = BookableUnitId;
```

El `unitId` inicial del estado **no cambia**: sigue siendo `"aratiri"`.

- [ ] **Step 2: Ver qué se rompe**

Run: `pnpm exec tsc --noEmit`
Expected: errores en los consumidores que indexan por `UnitId` o pasan `state.unitId` a algo que espera `UnitSlug`. Anotá la lista: es tu mapa de trabajo para el step siguiente.

- [ ] **Step 3: Adaptar los cuatro componentes**

El arreglo es mecánico y en todos los casos es el mismo: cambiar la función que calcula por su equivalente que sabe de la unidad de prueba. Para una unidad real devuelven **el mismo número**, así que ningún importe cambia.

- `Confirmacion.tsx`: `getUnit(state.unitId)!` → `resolveUnit(state.unitId)`, y `methodTotal(...)` → `checkoutTotal(...)`.
- `StepTransferencia.tsx`: `methodTotal(settings, "transfer", ...)` → `checkoutTotal(...)`, y `transferSavings(...)` → `checkoutSavings(...)`.
- `StepPago.tsx`: `methodTotal(settings, "card", ...)` → `checkoutTotal(...)`.
- `OrderSummary.tsx`: `priceBreakdown` sigue siendo para unidades reales. Con la de prueba no hay desglose por noche que mostrar, así que el bloque de precios se parte en dos:

```tsx
  const bd = isTestUnit(state.unitId) ? null : priceBreakdown(settings, method, state.unitId, nights);
  const total = checkoutTotal(settings, method, state.unitId, nights);
```

y en el render, donde hoy están las filas del desglose:

```tsx
        {bd ? (
          <>{/* las filas que ya existen, sin tocar */}</>
        ) : (
          // Precio plano: no depende de las noches, no hay limpieza que prorratear.
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
            <span className="text-muted">Estadía de prueba</span>
            <span style={{ color: "var(--color-carbon)" }}>{money(total)}</span>
          </div>
        )}
```

El Total pasa a `money(total)`. **La fila nueva usa las mismas clases y estilos que sus hermanas** y solo se renderiza con la unidad de prueba: para un huésped real el componente queda idéntico.

- `StepPago.tsx` además esconde lo que no aplica: la unidad de prueba es **solo tarjeta**, así que el selector de método y la pestaña de transferencia van detrás de `!isTestUnit(state.unitId)`.

- [ ] **Step 4: Que el árbol vuelva a compilar**

Run: `pnpm exec tsc --noEmit`
Expected: sin errores. Si queda alguno fuera de estos cuatro archivos, arreglalo con el mismo criterio —función equivalente, sin cambiar conducta para unidades reales— y anotalo en el reporte.

- [ ] **Step 5: El test de que nada cambió para el huésped real**

En `tests/reservation/order-summary.test.tsx`, que ya existe, agregá:

```tsx
  it("con una unidad real el desglose es el mismo de siempre", () => {
    // La unidad de prueba no puede alterar lo que ve un huésped real: es la
    // condición de toda esta task.
    renderCon("card");
    expect(screen.getByText("$30.000")).toBeInTheDocument();
    expect(screen.queryByText(/Estadía de prueba/)).not.toBeInTheDocument();
  });

  it("con la unidad de prueba muestra el precio plano y ningún desglose", () => {
    render(
      <NextIntlClientProvider locale="es" messages={messages}>
        <OrderSummary state={{ ...STATE, unitId: TEST_UNIT_ID }} settings={DEFAULT_RATE_SETTINGS} method="card" />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText(/Estadía de prueba/)).toBeInTheDocument();
    expect(screen.getByText("$2.500")).toBeInTheDocument();
    expect(screen.queryByText("$30.000")).not.toBeInTheDocument();
  });
```

Importá `TEST_UNIT_ID` de `@/lib/reservation/test-unit`.

- [ ] **Step 6: Suite, build y commit**

Run: `pnpm test && pnpm build`

```bash
git add lib/reservation/reducer.ts components/reservas/ tests/reservation/order-summary.test.tsx
git commit -m "feat(checkout): el checkout entiende la unidad de prueba"
```

---

### Task 3: El borde deja pasar el deep-link, solo con el flag

Hasta acá la unidad de prueba existe en los tipos pero no se puede llegar. Esta task abre los tres bordes que el huésped toca: el parseo de la URL, la disponibilidad y la página de reservas.

**Files:**
- Modify: `lib/reservation/search.ts`, `app/api/availability/[unitId]/route.ts`, `app/[locale]/reservas/page.tsx`, `components/reservas/ReservaFlow.tsx`
- Test: `tests/reservation/search.test.ts`, `tests/reservation/availability.test.ts` (o el archivo que cubra esa ruta)

**Interfaces:**
- Consumes: `isTestUnit`, `allowsTestUnit`, `TEST_UNIT_ID` de la Task 1; `isTestUnitEnabled` de site-settings.
- Produces: `parseCheckoutQuery(sp, opts?: { allowTestUnit?: boolean })`, con `allowTestUnit` **default `false`**. `ReservaFlow` suma la prop `allowTestUnit: boolean`.

- [ ] **Step 1: Los tests que fallan**

En `tests/reservation/search.test.ts`:

```ts
  it("sin opts, la unidad de prueba se rechaza", () => {
    // El default es false a propósito: quien no opta explícitamente sigue
    // rechazándola. El único que puede optar es el server.
    expect(parseCheckoutQuery({ unit: "prueba", checkIn: "2027-01-01", checkOut: "2027-01-02", guests: "2" })).toBeNull();
  });

  it("con allowTestUnit la acepta, y sigue rechazando basura", () => {
    const opts = { allowTestUnit: true };
    expect(parseCheckoutQuery({ unit: "prueba", checkIn: "2027-01-01", checkOut: "2027-01-02", guests: "2" }, opts)).not.toBeNull();
    expect(parseCheckoutQuery({ unit: "inventada", checkIn: "2027-01-01", checkOut: "2027-01-02", guests: "2" }, opts)).toBeNull();
  });
```

Y un caso para la ruta de disponibilidad. **Ojo: `tests/reservation/availability.test.ts` prueba el helper del cliente (`getAvailability`), no el route handler — no hay test de esa ruta.** Creá `tests/reservation/availability-route.test.ts` siguiendo la forma de `tests/reservation/lookup-route.test.ts`, que es el test de ruta más simple del repo: importa el `GET`/`POST` del handler y arma el `Request` a mano.

Dos casos: con el flag apagado, `GET /api/availability/prueba` responde lo mismo que para una unidad inexistente; con el flag prendido, responde normal. El mock de `@/lib/site-settings.server` tiene que exportar `isTestUnitEnabled` —**la trampa de siempre**: un factory incompleto la deja en `undefined`— y también `getAvailabilityServer` de su módulo, para no pegarle a Supabase.

- [ ] **Step 2: Correr y ver el rojo**

Run: `pnpm vitest run tests/reservation/search.test.ts`

- [ ] **Step 3: `search.ts`**

Agregar el tipo de opciones y usarlo:

```ts
export type CheckoutOptions = {
  /**
   * Habilita la unidad de prueba. El default es false a propósito: quien no
   * opte explícitamente sigue rechazándola. El único que puede optar es el
   * server, que lo decide leyendo el flag de site_settings.
   */
  allowTestUnit?: boolean;
};

export function parseCheckoutQuery(sp: Raw, opts: CheckoutOptions = {}): CheckoutQuery | null {
```

y dentro, en vez de chequear contra `VALID_UNITS` a secas:

```ts
  if (!sp.unit) return null;
  const allowed = opts.allowTestUnit ? [...VALID_UNITS, TEST_UNIT_ID] : VALID_UNITS;
  if (!(allowed as string[]).includes(sp.unit)) return null;
```

- [ ] **Step 4: La ruta de disponibilidad**

`isUnitId` pasa a recibir el permiso y la ruta lo resuelve consultando el flag:

```ts
function isUnitId(v: string, allowTestUnit: boolean): v is UnitId {
  if (isTestUnit(v)) return allowTestUnit;
  return (VALID_UNITS as string[]).includes(v);
}
```

y en el handler, `if (!isUnitId(unitId, await isTestUnitEnabled()))`.

- [ ] **Step 5: La página de reservas y `ReservaFlow`**

En `app/[locale]/reservas/page.tsx`:

```ts
  const allowTestUnit = allowsTestUnit(sp.unit, await isTestUnitEnabled());
```

Ese valor hace dos cosas: se le pasa a `ReservaFlow` como prop, y **saltea el corte de modo WhatsApp** — la condición que hoy redirige cuando el sitio está en modo WhatsApp pasa a `if (!allowTestUnit && isWhatsAppBookingMode(...))`. Es lo que permite probar el cobro con el sitio todavía cerrado al público, que es el escenario de uso.

En `ReservaFlow.tsx`, sumar la prop `allowTestUnit: boolean` y pasarla al `parseCheckoutQuery` que ya llama, incluyéndola en las dependencias del `useMemo`.

- [ ] **Step 6: Verde, suite, build y commit**

Run: `pnpm test && pnpm build`

```bash
git add lib/reservation/search.ts "app/api/availability/[unitId]/route.ts" "app/[locale]/reservas/page.tsx" components/reservas/ReservaFlow.tsx tests/
git commit -m "feat(checkout): el deep-link de la unidad de prueba, solo con el flag"
```

---

### Task 4: Las rutas de cobro

**Files:**
- Modify: `app/api/payments/route.ts`, `app/api/webhooks/mercadopago/route.ts`
- Test: `tests/reservation/payments-route.test.ts`, `tests/reservation/webhook-route.test.ts`

**Interfaces:**
- Consumes: `isTestUnit`, `resolveUnit`, `checkoutTotal`, `TEST_UNIT_ID` de la Task 1; `isTestUnitEnabled` de site-settings.
- Produces: nada nuevo hacia afuera.

- [ ] **Step 1: Los tests que fallan**

En `tests/reservation/payments-route.test.ts` —agregando `isTestUnitEnabled` al factory del mock de `site-settings.server` **primero**—:

```ts
  it("con el flag apagado, la unidad de prueba se rechaza como cualquier basura", async () => {
    isTestUnitEnabled.mockResolvedValue(false);
    const res = await POST(post({ ...VALID, unitId: "prueba" }));
    expect(res.status).toBe(400);
    expect(createCardPayment).not.toHaveBeenCalled();
  });

  it("con el flag prendido cobra el monto plano, no el de una unidad real", async () => {
    // El monto lo recalcula el server con checkoutTotal: nunca viaja del cliente.
    isTestUnitEnabled.mockResolvedValue(true);
    await POST(post({ ...VALID, unitId: "prueba" }));
    expect(createCardPayment.mock.calls[0][0].amount).toBe(2500);
  });

  it("la unidad de prueba saltea el corte de modo WhatsApp", async () => {
    // Es el escenario de uso: probar el cobro con el sitio cerrado al público.
    isTestUnitEnabled.mockResolvedValue(true);
    getBookingMode.mockResolvedValue("whatsapp");
    const res = await POST(post({ ...VALID, unitId: "prueba" }));
    expect(res.status).not.toBe(503);
  });

  it("con el flag prendido, una unidad real NO saltea el corte", async () => {
    // Si el flag global alcanzara, prenderlo abriría el checkout de las
    // unidades reales a cualquiera con un deep-link.
    isTestUnitEnabled.mockResolvedValue(true);
    getBookingMode.mockResolvedValue("whatsapp");
    const res = await POST(post(VALID));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("bookings_paused");
  });
```

El corte devuelve **503 con `{ error: "bookings_paused" }`** (`app/api/payments/route.ts:54-56`), no 403. El mock de `getBookingMode` ya existe en ese archivo de test (línea 48, `vi.fn(async () => "online" as const)`): reusalo, no declares otro.

En `tests/reservation/webhook-route.test.ts`, un caso que confirme que un pago aprobado con `unit_id: "prueba"` en la metadata **se confirma** en vez de descartarse por unidad inválida.

- [ ] **Step 2: Correr y ver el rojo**

- [ ] **Step 3: `payments/route.ts`**

Tres cambios, todos con su porqué:

1. El validador de unidad recibe el permiso, igual que en la ruta de disponibilidad: `if (isTestUnit(v)) return allowTestUnit;`. El permiso sale de `const testUnitOn = await isTestUnitEnabled();` cerca del principio del handler.
2. El corte de modo WhatsApp pasa a `if (!isTestUnit(unitId) && isWhatsAppBookingMode(await getBookingMode()))`.
3. `getUnit(unitId)!` → `resolveUnit(unitId)`, y `methodTotal(settings, "card", ...)` → `checkoutTotal(settings, "card", unit.slug, nights)`.

**No** se toca el rate limit ni la generación del código: la reserva de prueba pasa por lo mismo que una real, que es justamente lo que se quiere probar.

- [ ] **Step 4: El webhook**

Sumar `TEST_UNIT_ID` a `VALID_UNITS`, con el comentario del origen adaptado: se incluye **sin consultar el flag**, a propósito, porque Mercado Pago puede entregar la notificación minutos después del cobro, cuando el toggle ya se apagó. Consultarlo mataría el segundo camino de confirmación, que es uno de los efectos que la prueba viene a verificar. No agrega riesgo: para llegar acá el cobro ya ocurrió.

- [ ] **Step 5: Verde, suite, build y commit**

```bash
git add app/api/payments/route.ts app/api/webhooks/mercadopago/route.ts tests/
git commit -m "feat(pagos): cobrar la unidad de prueba, con el flag y solo ella"
```

---

### Task 5: El toggle en el panel

Es la excepción visual autorizada del dominio: un componente nuevo en `/admin/configuracion`, hermano del `ModeToggle` que ya está.

**Files:**
- Create: `app/admin/configuracion/TestUnitToggle.tsx`
- Modify: `app/admin/configuracion/actions.ts`, `app/admin/configuracion/page.tsx`

**Interfaces:**
- Consumes: `TEST_UNIT_ID`, `TEST_UNIT_TOTAL` de la Task 1; `saveTestUnitEnabled` de site-settings.
- Produces: server action `saveTestUnit(prev, formData)`, con la misma forma de retorno que la `saveBookingMode` que ya existe.

- [ ] **Step 1: La server action**

En `app/admin/configuracion/actions.ts`, junto a la que ya está:

```ts
export async function saveTestUnit(
  _prev: SaveModeState,
  formData: FormData,
): Promise<SaveModeState> {
  // Se prende solo con el "1" exacto. Cualquier otra cosa —campo ausente, string
  // vacía, basura— apaga: la dirección segura del error es no dejar cobrable una
  // unidad que nadie pidió habilitar.
  const enabled = formData.get("test_unit_enabled") === "1";

  try {
    await saveTestUnitEnabled(enabled);
  } catch {
    return {
      error:
        "No se pudo guardar en Supabase. ¿Corriste el ALTER de test_unit_enabled del setup.sql en el SQL Editor?",
    };
  }

  // /reservas decide server-side si deja pasar el deep-link de la unidad de
  // prueba; sin revalidar seguiría sirviendo la decisión anterior.
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/reservas`);
  }

  return { ok: true };
}
```

`SaveModeState`, `routing` y `revalidatePath` son los que el archivo ya usa; si los nombres difieren, usá los locales.

- [ ] **Step 2: El componente**

Crear `app/admin/configuracion/TestUnitToggle.tsx`, `"use client"`, con `useActionState(saveTestUnit, undefined)`. **Copiá la estructura, los estilos y los helpers de `ModeToggle.tsx`**, que es su hermano: mismo tipo de tarjeta, mismo botón, mismo tratamiento del estado de error. No inventes un diseño nuevo.

Contenido propio:

- Un indicador de estado: punto de color y la palabra `HABILITADA` / `Deshabilitada`.
- Un párrafo que explique qué es, adaptado a este repo —**sin mencionar Google Calendar, que acá no existe**—: una unidad de alojamiento que no existe, para probar la cadena completa de una reserva pagada (cobro con tarjeta, fila en reservas, email al huésped con el `.ics`, aviso al dueño). No aparece en el sitio, no está en el buscador ni en tarifas, y no bloquea disponibilidad de ninguna unidad real. Solo se llega por el link.
- El monto, tomado de `TEST_UNIT_TOTAL`, **no escrito a mano**: es un cobro real y quien prende el toggle tiene que saber cuánto va a salir.
- Cuando está habilitada, el link del test en un `<code>` copiable, con fechas a un año vista para no colisionar con nada real:

```ts
/** Fechas del link de prueba: bien lejos, para no colisionar con nada real. */
function testLink(): string {
  const day = 24 * 60 * 60 * 1000;
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const checkIn = new Date(Date.now() + 365 * day);
  const checkOut = new Date(Date.now() + 366 * day);
  return `/es/reservas?unit=${TEST_UNIT_ID}&checkIn=${fmt(checkIn)}&checkOut=${fmt(checkOut)}&guests=2`;
}
```

- El `<form action={action}>` con `<input type="hidden" name="test_unit_enabled" value={current ? "0" : "1"} />` y el botón que dice qué va a hacer.

- [ ] **Step 3: Enchufarlo en la página**

En `app/admin/configuracion/page.tsx`, importar el componente y renderizarlo debajo del `ModeToggle`, envolviendo a los dos en un contenedor con `gap`. **No toques la navegación**: este repo usa `Link` de `next/link` y tiene una entrada de Opiniones que el origen no tiene.

- [ ] **Step 4: Suite, build, lint**

Run: `pnpm test && pnpm build && pnpm lint`

- [ ] **Step 5: Commit**

```bash
git add app/admin/configuracion/
git commit -m "feat(admin): toggle de la unidad de prueba en configuración"
```

---

## Gate de verificación del dominio

- [ ] `pnpm test` en verde, con la salida a la vista
- [ ] `pnpm build` sin errores
- [ ] `pnpm lint` sin errores nuevos
- [ ] Con el flag **apagado**: `/es/reservas?unit=prueba&…` no deja entrar, y `GET /api/availability/prueba` rechaza
- [ ] Correr el `ALTER` de `setup.sql` en el SQL Editor de Supabase
- [ ] Con el flag **prendido**, la prueba de verdad: entrar por el link, pagar los $2.500 con una tarjeta real, y verificar que aparece la fila en `/admin/reservas`, que llega el email al huésped con el `.ics` adjunto, que llega el aviso al dueño, y que el código funciona en el lookup. Después reembolsar desde Mercado Pago y **apagar el toggle**.
- [ ] Con el toggle prendido, confirmar que una unidad **real** sigue cortada por el modo WhatsApp

## Fuera de alcance

- **Google Calendar.** El origen crea eventos en las rutas de cobro; este repo lo eliminó a propósito y usa Supabase como fuente de disponibilidad.
- **La pasada de branding** que se viene acumulando: los `#23362B`/`#F8F5F0` de Aruma en el botón del checkout, el mensaje del 429, el `"6 MB"` hardcodeado en seis strings, y el `role="alert"` del error de archivo mal ubicado.
- **`lib/contact.ts`**: el WhatsApp sigue en `549XXXXXXXXXX`. Bloquea la salida a producción, no este dominio.
