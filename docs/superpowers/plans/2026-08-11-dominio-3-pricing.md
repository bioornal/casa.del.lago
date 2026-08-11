# Dominio 3 — Pricing: la limpieza deja de cambiar de precio según el método

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el huésped que compara las dos pestañas del checkout vea un solo precio por cada concepto, y que la diferencia entre pagar con tarjeta o por transferencia sea una línea de descuento explícita en vez de dos juegos de importes sin explicación.

**Architecture:** Dos cambios encadenados sobre `lib/reservation/method-pricing.ts` y un consumidor. Primero el módulo: `methodRates()` deja de aplicarle el gross-up de la comisión a la limpieza, y aparece `priceBreakdown()`, que arma el desglose para mostrar —precio de lista en ambos métodos, más un descuento cuando corresponde. Después `OrderSummary.tsx` pasa a leer ese desglose en vez de calcular sus propias líneas. El total que se muestra sigue siendo exactamente el que recalculan las rutas de cobro; hay un test que lo exige.

**Tech Stack:** TypeScript, Vitest, React 19 + next-intl (el componente es de servidor, sin estado).

## Global Constraints

- Portado desde `bioornal/arumalodgeweb` @ `aaeabd2`. Los repos **no comparten historia git**: todo a mano.
- **La Casa del Lago tiene dos unidades**, `aratiri` y `aguaribay`. Aruma tiene tres (`yvyra`, `amambay`, `irupe`). Ni los slugs ni los precios del origen se copian.
- **No se porta nada de `test-unit.ts`.** El `OrderSummary` de Aruma importa `resolveUnit`, `checkoutTotal`, `checkoutSavings` e `isTestUnit` de ese módulo, que en la réplica **no existe**: es del dominio 5. Acá se sigue usando `getUnit` de `@/lib/units` y las funciones de `method-pricing`.
- **Excepción visual autorizada el 2026-08-11**, acotada: una fila condicional nueva en el bloque de precios de `OrderSummary.tsx`, con las clases y los colores que el componente ya usa. No se toca el layout de la tarjeta, ni su tipografía, ni el resto de sus filas. Ver la sección "Excepción del dominio 3" del spec.
- Comentarios en español, explicando el *porqué*, no el *qué*.
- `pnpm`, nunca `npm` ni `npx`.

## La decisión de negocio que este dominio ejecuta

Sacarle el gross-up a la limpieza significa que el lodge **deja de recuperar la comisión de esa línea**: con los valores de hoy (limpieza $30.000, `cardFeePct` 7,7, `transferFeePct` 5) son **$2.600 por reserva con tarjeta** y $1.600 con transferencia. Está aprobado. Si se quiere recuperar, se sube la tarifa neta por noche en `/admin/tarifas`, sin tocar código. Esto va documentado en la cabecera del módulo para que el próximo que lo lea no lo "arregle" de vuelta.

Lo que el huésped ve hoy y deja de ver, para Aratirí a $130.000 la noche:

| | tarjeta | transferencia |
|---|---|---|
| **hoy** noche | $140.900 | $136.900 |
| **hoy** limpieza | $32.600 | $31.600 |
| **después** noche | $140.900 | $140.900 (y una línea de descuento) |
| **después** limpieza | $30.000 | $30.000 |

## Archivos

| Archivo | Qué pasa |
|---|---|
| `lib/reservation/method-pricing.ts` | La limpieza deja de grossearse; entra `priceBreakdown` |
| `tests/reservation/method-pricing.test.ts` | Dos casos existentes cambian de número; entran los de `priceBreakdown` |
| `messages/{es,en,pt}.json` | Clave nueva `reservas.transferDiscount` |
| `components/reservas/OrderSummary.tsx` | Lee `priceBreakdown`; fila de descuento condicional |
| `tests/reservation/order-summary.test.tsx` (nuevo) | Guarda de la conducta visible |

---

### Task 1: `method-pricing.ts` — la limpieza al neto y `priceBreakdown`

**Files:**
- Modify: `lib/reservation/method-pricing.ts`
- Test: `tests/reservation/method-pricing.test.ts`

**Interfaces:**
- Consumes: `RateSettings` de `./rate-settings`, `computeTotal` de `./pricing`, `UnitSlug` de `@/lib/units`.
- Produces:
  - `methodRates(s, method)` — misma firma, pero `cleaningFee` pasa a ser `s.cleaningFee` sin grossear.
  - `type PriceBreakdown = { nightly: number; nights: number; lodging: number; cleaningFee: number; listTotal: number; discount: number; total: number }`
  - `priceBreakdown(s: RateSettings, method: PaymentMethod, slug: UnitSlug, nights: number): PriceBreakdown`

- [ ] **Step 1: Ajustar los tests que van a cambiar de número, y que fallen**

Dos casos existentes afirman la conducta vieja y **tienen que cambiar**: no es que se rompan, es que hoy documentan el bug.

En `tests/reservation/method-pricing.test.ts`, el `describe("methodRates")` tiene dos `it` que verifican que la limpieza se grossea. Reemplazá esos dos por estos tres:

```ts
  it("card grossea la noche con cardFeePct", () => {
    const r = methodRates(SETTINGS, "card");
    expect(r.nightly.aratiri).toBe(grossUp(SETTINGS.nightly.aratiri, SETTINGS.cardFeePct));
  });

  it("transfer grossea la noche con transferFeePct", () => {
    const r = methodRates(SETTINGS, "transfer");
    expect(r.nightly.aratiri).toBe(grossUp(SETTINGS.nightly.aratiri, SETTINGS.transferFeePct));
  });

  it("la limpieza NO se grossea: vale lo mismo en los dos métodos", () => {
    // El bug que este dominio arregla: la MISMA tasa aparecía a dos precios
    // según la pestaña, sin nada en pantalla que lo explicara.
    expect(methodRates(SETTINGS, "card").cleaningFee).toBe(SETTINGS.cleaningFee);
    expect(methodRates(SETTINGS, "transfer").cleaningFee).toBe(SETTINGS.cleaningFee);
  });
```

En `describe("methodTotal")`, el caso "total = nightly grosseada × noches + limpieza grosseada" tiene dos números hardcodeados (`455300` y `442300`) que ya no van a dar. Reescribilo derivando el esperado en vez de hardcodearlo, que además explica la fórmula:

```ts
  it("total = noche grosseada × noches + limpieza al neto", () => {
    const cardNight = grossUp(SETTINGS.nightly.aratiri, SETTINGS.cardFeePct);
    const trNight = grossUp(SETTINGS.nightly.aratiri, SETTINGS.transferFeePct);
    expect(methodTotal(SETTINGS, "card", "aratiri", 3)).toBe(cardNight * 3 + SETTINGS.cleaningFee);
    expect(methodTotal(SETTINGS, "transfer", "aratiri", 3)).toBe(trNight * 3 + SETTINGS.cleaningFee);
  });
```

Y el de `transferSavings` que compara contra `455300 - 442300` pasa a:

```ts
  it("ahorro = totalCard − totalTransfer, positivo con card > transfer", () => {
    expect(transferSavings(SETTINGS, "aratiri", 3)).toBe(
      methodTotal(SETTINGS, "card", "aratiri", 3) - methodTotal(SETTINGS, "transfer", "aratiri", 3),
    );
  });
```

- [ ] **Step 2: Correr y ver el rojo**

Run: `pnpm vitest run tests/reservation/method-pricing.test.ts`
Expected: FAIL. El de la limpieza falla porque hoy devuelve el valor grosseado; los dos de totales fallan por los importes.

- [ ] **Step 3: Sacar el gross-up de la limpieza**

En `lib/reservation/method-pricing.ts`, dentro de `methodRates`, cambiar `cleaningFee: grossUp(s.cleaningFee, pct)` por:

```ts
    // Sin gross-up, a propósito: ver el comentario de cabecera.
    cleaningFee: s.cleaningFee,
```

Y ampliar el comentario de cabecera del módulo, después del párrafo que ya está, con el porqué y su costo:

```
// LA LIMPIEZA NO SE GROSSEA. Es un importe que el huésped reconoce como fijo
// ($30.000), y aplicarle el gross-up hacía que la MISMA tasa apareciera en
// $32.600 con tarjeta y $31.600 con transferencia, sin nada en pantalla que lo
// explicara: comparando las dos pestañas parecía un error. Ahora la comisión se
// recupera solo sobre la noche y la limpieza se muestra siempre al valor
// configurado. Costo de la decisión: el lodge absorbe la comisión de esa línea
// (con 7,7% son ~$2.310 por reserva). Si se quiere recuperar, se sube la tarifa
// neta por noche en /admin/tarifas.
```

- [ ] **Step 4: Correr y ver el verde**

Run: `pnpm vitest run tests/reservation/method-pricing.test.ts`
Expected: PASS.

- [ ] **Step 5: Escribir los tests de `priceBreakdown`, y que fallen**

Agregar al final del archivo de test:

```ts
describe("priceBreakdown", () => {
  it("los dos métodos muestran el MISMO precio de lista", () => {
    // Es el corazón del arreglo: la única diferencia visible entre las dos
    // pestañas pasa a ser el descuento, no dos juegos de importes.
    const card = priceBreakdown(SETTINGS, "card", "aratiri", 3);
    const tr = priceBreakdown(SETTINGS, "transfer", "aratiri", 3);
    expect(tr.nightly).toBe(card.nightly);
    expect(tr.cleaningFee).toBe(card.cleaningFee);
    expect(tr.listTotal).toBe(card.listTotal);
  });

  it("con tarjeta no hay descuento; con transferencia es el ahorro", () => {
    const card = priceBreakdown(SETTINGS, "card", "aratiri", 3);
    const tr = priceBreakdown(SETTINGS, "transfer", "aratiri", 3);
    expect(card.discount).toBe(0);
    expect(tr.discount).toBe(transferSavings(SETTINGS, "aratiri", 3));
  });

  it("el desglose es lineal: lodging + limpieza − descuento = total", () => {
    for (const method of ["card", "transfer"] as const) {
      for (const nights of [1, 2, 3, 7]) {
        const bd = priceBreakdown(SETTINGS, method, "aratiri", nights);
        expect(bd.lodging).toBe(bd.nightly * nights);
        expect(bd.listTotal).toBe(bd.lodging + bd.cleaningFee);
        expect(bd.listTotal - bd.discount).toBe(bd.total);
      }
    }
  });

  it("el total mostrado es el que recalculan las rutas de cobro", () => {
    // Si estos dos divergieran, el huésped vería un precio y se le cobraría
    // otro. /api/payments y /api/reservations/transfer usan methodTotal.
    for (const method of ["card", "transfer"] as const) {
      for (const nights of [1, 2, 3, 7]) {
        expect(priceBreakdown(SETTINGS, method, "aratiri", nights).total).toBe(
          methodTotal(SETTINGS, method, "aratiri", nights),
        );
      }
    }
  });

  it("0 noches → todo en cero, sin descuento", () => {
    const bd = priceBreakdown(SETTINGS, "transfer", "aratiri", 0);
    expect(bd.lodging).toBe(0);
    expect(bd.total).toBe(0);
    expect(bd.discount).toBe(0);
  });
});
```

Agregá `priceBreakdown` al import del principio del archivo.

- [ ] **Step 6: Correr y ver el rojo**

Run: `pnpm vitest run tests/reservation/method-pricing.test.ts`
Expected: FAIL — `priceBreakdown is not a function`.

- [ ] **Step 7: Escribir `priceBreakdown`**

Al final de `lib/reservation/method-pricing.ts`:

```ts
/**
 * Desglose para MOSTRAR. Las dos pestañas del checkout muestran el mismo precio
 * de lista (el de tarjeta) y la transferencia agrega una línea de descuento; así
 * la única diferencia visible entre métodos es el beneficio, y no hay dos
 * precios distintos para los mismos conceptos.
 *
 * `total` es lo que se cobra de verdad y coincide con methodTotal(method), que
 * es lo que recalculan /api/payments y /api/reservations/transfer.
 */
export type PriceBreakdown = {
  nightly: number;      // precio de lista por noche (tarjeta), igual en ambos métodos
  nights: number;
  lodging: number;      // nightly × nights
  cleaningFee: number;  // el neto configurado, sin gross-up
  listTotal: number;    // lodging + cleaningFee (precio de lista)
  discount: number;     // 0 con tarjeta; el ahorro con transferencia
  total: number;        // listTotal − discount = lo que se cobra
};

export function priceBreakdown(
  s: RateSettings,
  method: PaymentMethod,
  slug: UnitSlug,
  nights: number,
): PriceBreakdown {
  const list = methodRates(s, "card");
  const nightly = list.nightly[slug];
  const lodging = nightly * Math.max(0, nights);
  const listTotal = computeTotal(nightly, nights, list.cleaningFee);
  const total = methodTotal(s, method, slug, nights);
  return {
    nightly,
    nights,
    lodging,
    cleaningFee: list.cleaningFee,
    listTotal,
    discount: Math.max(0, listTotal - total),
    total,
  };
}
```

- [ ] **Step 8: Correr toda la suite**

Run: `pnpm test`
Expected: verde, sin tocar ningún otro archivo de test. Ya verifiqué el resto de la suite: `rates.server.test.ts` deriva sus esperados de `methodTotal` en vez de hardcodearlos, así que sigue el cambio solo; `rate-settings.test.ts` solo compara `DEFAULT_RATE_SETTINGS.cleaningFee` contra `CLEANING_FEE`, que no se toca; y los tests de las rutas de cobro no assertean importes. Los únicos números hardcodeados que dependían de la limpieza grosseada estaban en `method-pricing.test.ts`, y son los que reescribiste en el Step 1.

Si igual falla algo, **el número viejo es el que estaba mal**: recalculalo con la fórmula nueva, no revertás el cambio del módulo, y anotá en el reporte qué archivo tocaste y por qué.

- [ ] **Step 9: Commit**

```bash
git add lib/reservation/method-pricing.ts tests/reservation/method-pricing.test.ts
git commit -m "fix(pricing): la limpieza deja de cambiar de precio según el método"
```

Si el Step 8 obligó a tocar otros tests, incluilos en este commit.

---

### Task 2: El desglose visible en `OrderSummary`

**Files:**
- Modify: `messages/es.json`, `messages/en.json`, `messages/pt.json`
- Modify: `components/reservas/OrderSummary.tsx`
- Test: `tests/reservation/order-summary.test.tsx` (nuevo)

**Interfaces:**
- Consumes: `priceBreakdown` y `PriceBreakdown` de la Task 1, con la firma declarada allí.
- Produces: nada que otro código consuma. Las props del componente no cambian.

- [ ] **Step 1: La clave i18n en los tres idiomas**

`OrderSummary` ya usa el namespace `reservas`, donde vive `transferSaves`. Agregá al lado, en cada archivo:

- `messages/es.json`: `"transferDiscount": "Descuento por transferencia"`
- `messages/en.json`: `"transferDiscount": "Bank transfer discount"`
- `messages/pt.json`: `"transferDiscount": "Desconto por transferência"`

Ojo: los tres archivos tienen **dos** bloques con clave `cleaning` (líneas ~50 y ~338). El que corresponde es el namespace `reservas`, el mismo que contiene `transferSaves`. Ubicá la clave por ahí, no por la primera coincidencia de `cleaning`.

- [ ] **Step 2: Escribir el test del componente, y que falle**

El repo ya tiene tests de componente con `@testing-library/react` (`tests/reservation/range-calendar.test.tsx` es el más parecido: mirá cómo envuelve en `NextIntlClientProvider` y copiá ese andamiaje, con los mensajes reales de `messages/es.json`).

Crear `tests/reservation/order-summary.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/es.json";
import { OrderSummary } from "@/components/reservas/OrderSummary";
import { DEFAULT_RATE_SETTINGS } from "@/lib/reservation/rate-settings";
import type { State } from "@/lib/reservation/reducer";

// State completo, sin casts: son los nueve campos que declara el reducer.
const STATE: State = {
  step: 2,
  checkIn: new Date(2026, 6, 2),
  checkOut: new Date(2026, 6, 5),
  guests: 2,
  unitId: "aratiri",
  firstName: "Juan",
  lastName: "Pérez",
  email: "juan@test.com",
  phone: "+54 9 376 000000",
};

function renderCon(method: "card" | "transfer") {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <OrderSummary state={STATE} settings={DEFAULT_RATE_SETTINGS} method={method} />
    </NextIntlClientProvider>,
  );
}

describe("OrderSummary", () => {
  it("la limpieza vale lo mismo en las dos pestañas", () => {
    // Era el bug: la MISMA tasa aparecía a dos precios según el método.
    const { unmount } = renderCon("card");
    expect(screen.getByText("$30.000")).toBeInTheDocument();
    unmount();
    renderCon("transfer");
    expect(screen.getByText("$30.000")).toBeInTheDocument();
  });

  it("con transferencia aparece la línea de descuento; con tarjeta no", () => {
    const { unmount } = renderCon("card");
    expect(screen.queryByText(/Descuento por transferencia/)).not.toBeInTheDocument();
    unmount();
    renderCon("transfer");
    expect(screen.getByText(/Descuento por transferencia/)).toBeInTheDocument();
  });
});
```

`State.unitId` es de tipo `UnitId` (`"aratiri" | "aguaribay"` en `lib/reservation/reducer.ts:5`), idéntico a `UnitSlug` de `lib/units.ts:1`, así que **no hace falta ningún cast** al pasarlo a `priceBreakdown`. Aruma castea porque allá el estado admite además la unidad de prueba; acá no existe.

- [ ] **Step 3: Correr y ver el rojo**

Run: `pnpm vitest run tests/reservation/order-summary.test.tsx`
Expected: FAIL. El de la limpieza falla en la pestaña de transferencia (hoy muestra $31.600), y el del descuento falla porque la línea no existe.

- [ ] **Step 4: Cablear el desglose**

En `components/reservas/OrderSummary.tsx`:

Cambiar el import de `method-pricing` por:

```ts
import { priceBreakdown, transferSavings, type PaymentMethod } from "@/lib/reservation/method-pricing";
```

Y el de `pricing` a solo lo que quede en uso (`computeNights`): `computeSubtotal` y `computeTotal` dejan de usarse acá.

Reemplazar el bloque de cálculo:

```ts
  const nights = computeNights(state.checkIn, state.checkOut);
  const bd = priceBreakdown(settings, method, state.unitId, nights);
  const savings = transferSavings(settings, state.unitId, nights);
```

En el bloque `{/* Price breakdown */}`, las dos filas pasan a leer del desglose —`money(bd.nightly)`, `money(bd.lodging)`, `money(bd.cleaningFee)`— y **después de la fila de limpieza**, dentro del mismo contenedor, se agrega la fila condicional:

```tsx
        {nights > 0 && bd.discount > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
            <span style={{ color: "#2f6b46" }}>{t("transferDiscount")}</span>
            <span style={{ color: "#2f6b46" }}>−{money(bd.discount)}</span>
          </div>
        )}
```

El verde `#2f6b46` es el que el propio componente ya usa para la nota de ahorro. El signo es el menos tipográfico `−` (U+2212), no un guion.

En el Total, `money(total)` pasa a `money(bd.total)`.

La nota de ahorro del final (`method === "card" && savings > 0`) **se queda como está**: es la que invita a cambiar de método desde la pestaña de tarjeta, y no se pisa con la fila nueva, que solo aparece en la de transferencia.

No toques nada más del archivo: ni el contenedor, ni los kickers, ni los separadores, ni las clases.

- [ ] **Step 5: Correr y ver el verde**

Run: `pnpm vitest run tests/reservation/order-summary.test.tsx`
Expected: PASS.

- [ ] **Step 6: Suite completa y build**

Run: `pnpm test && pnpm build`
Expected: verde y sin errores. Revisá que no haya quedado ningún import sin usar en `OrderSummary.tsx` — `pnpm lint` lo marca.

- [ ] **Step 7: Commit**

```bash
git add messages/ components/reservas/OrderSummary.tsx tests/reservation/order-summary.test.tsx
git commit -m "feat(pricing): las dos pestañas muestran el mismo precio de lista"
```

---

## Gate de verificación del dominio

- [ ] `pnpm test` en verde, con la salida a la vista
- [ ] `pnpm build` sin errores
- [ ] `pnpm lint` sin errores nuevos (hay preexistentes; que no aumenten)
- [ ] En `pnpm dev`, recorrer el checkout hasta el paso de pago y comparar las dos pestañas: mismo precio por noche, misma limpieza, y en transferencia una línea de descuento. El Total de cada pestaña tiene que ser el que ya se cobraba con ese método.

## Fuera de alcance

- **`rate-settings.ts` y `rates.server.ts`**: la inspección los sacó del dominio. Ver "Corrección de alcance del dominio 3" en el spec.
- **`RateForm.tsx`**: categoría conservar, la réplica está adelante (258 líneas contra 218). Su línea de preview —`Público: … tarjeta · … transferencia`— usa `grossUp` directo sobre la tarifa por noche, así que el cambio de la limpieza no la afecta.
- **Subir la tarifa neta para recuperar los $2.600**: es una decisión del dueño y se hace desde `/admin/tarifas`, sin código.
- **Dominios 4 (checkout/pagos) y 5 (admin)**: planes aparte.
