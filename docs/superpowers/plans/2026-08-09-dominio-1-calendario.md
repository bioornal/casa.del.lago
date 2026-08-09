# Dominio 1 — Calendario: impedir armar rangos que pisan fechas ocupadas

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el huésped no pueda armar una estadía que salte por encima de un bloque de noches ocupadas en el buscador del home y el wizard de reservas.

**Architecture:** Dos funciones puras nuevas en `lib/reservation/range.ts` (`rangeHasBlocked`, `firstBlockedAfter`) más un helper privado `dayKey`, consumidas por `components/reservas/RangeCalendar.tsx`. El calendario, en fase de salida, deshabilita todo lo posterior a la primera noche ocupada y valida el rango al hacer clic como última red. Sin cambios de esquema, sin nuevas dependencias, sin tocar el servidor.

**Tech Stack:** TypeScript, React, Next.js, `react-day-picker`, Vitest, `@testing-library/react`, jsdom.

## Global Constraints

- Portado desde `bioornal/arumalodgeweb` @ `0e2a7d3`. Los repos **no comparten historia git**: nada de `cherry-pick`, todo a mano.
- Las unidades de La Casa del Lago son `aratiri` y `aguaribay`. **Nunca** introducir `yvyra`, `amambay` ni `irupe` (unidades de Aruma).
- Las clases CSS del calendario son `rdp-lago-end` y `rdp-lago-middle`. **Nunca** usar las de Aruma (`rdp-aruma-*`).
- No introducir nada de Google Calendar: fue eliminado deliberadamente (ver `2026-07-22-supabase-fuente-disponibilidad-design.md`).
- Se porta código que lee variables de entorno, **nunca valores**.
- Las fechas ocupadas que llegan de la API son **NOCHES**, y el check-out es **exclusivo**: salir el día que entra el próximo huésped es válido (turnover).
- Comparar fechas por clave `YYYYMMDD`, nunca con `<` entre objetos `Date`: comparar `Date` arrastra la hora, y los días ocupados vienen a medianoche local mientras que `new Date()` de la sesión no.

## Alcance: qué quedó afuera y por qué

El spec listaba `ics.ts` y `search.ts` en este dominio. La inspección los sacó:

- **`ics.ts` — no se porta.** Es código muerto en La Casa del Lago: solo lo importa su propio test, nadie en `app/`, `lib/` ni `components/`. Es residuo del lector de iCal de Google Calendar, que la réplica eliminó. Las mejoras de Aruma ahí (manejo de `TRANSP:TRANSPARENT`, semántica de `DTEND`) son específicas del iCal de Google. El archivo que sí se usa es `ics-build.ts`, que genera el adjunto del email al huésped y no está en el diff.
- **`search.ts` — pasa al dominio 5.** Su diff contra Aruma son dos cosas: los nombres de unidades (divergencia deliberada, no se toca) y el parámetro `allowTestUnit`, que importa `TEST_UNIT_ID` desde `lib/reservation/test-unit.ts`, archivo que no existe en la réplica. Pertenece a la unidad de prueba, dominio 5.
- **`StickyBookingCard.tsx` — no se porta el fix.** El componente de La Casa del Lago tiene 86 líneas contra ~350 en Aruma y es una **maqueta estática**: muestra `— / — / —` como llegada y salida, no importa `DayPicker` ni `getAvailability`, y su CTA linkea a `/reservas`. No hay bug que corregir porque no hay selección de fechas. Traer el fix exigiría antes portar el selector completo de Aruma, que es una feature nueva, no una corrección.
- **`messages/*.json` — sin cambios.** La clave `departamento.rangeUnavailable` que agregó `0e2a7d3` solo la consume el aviso de `StickyBookingCard`. `RangeCalendar` no renderiza texto.

Queda: `range.ts`, sus tests y `RangeCalendar.tsx`.

## File Structure

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `lib/reservation/range.ts` | Modificar | Lógica pura de rangos: transición por clic y validación contra fechas ocupadas |
| `tests/reservation/range.test.ts` | Modificar | Cobertura de las funciones puras |
| `components/reservas/RangeCalendar.tsx` | Modificar | Calendario de rango: aplica el tope y la guarda |
| `tests/reservation/range-calendar.test.tsx` | Modificar | Cobertura del tope en el DOM |

---

### Task 1: Funciones puras de validación de rango

**Files:**
- Modify: `lib/reservation/range.ts` (hoy 9 líneas, solo `pickDay`)
- Test: `tests/reservation/range.test.ts` (hoy solo cubre `pickDay`)

**Interfaces:**
- Consumes: `RangeValue` y `pickDay`, ya existentes en el archivo. No se modifican.
- Produces:
  - `rangeHasBlocked(checkIn: Date, checkOut: Date, blocked: Date[]): boolean`
  - `firstBlockedAfter(from: Date, blocked: Date[]): Date | null`

- [ ] **Step 1: Escribir los tests que fallan**

Reemplazar el bloque de imports al inicio de `tests/reservation/range.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  pickDay,
  rangeHasBlocked,
  firstBlockedAfter,
  type RangeValue,
} from "@/lib/reservation/range";
```

Y agregar al final del archivo, después del `describe("pickDay", ...)` existente:

```ts
// Fixture: una unidad con las noches del 21/07 al 01/08 ocupadas. El hueco que
// se corrige es elegir llegada el 20/07 y salida el 02/08: las dos puntas están
// libres, así que deshabilitar solo los días ocupados no alcanza y el bloque se
// salta por encima. La constraint de exclusión de Postgres igual lo rechaza,
// pero recién después de que el huésped cargó datos y tarjeta.
const OCUPADAS = [
  "2026-07-21", "2026-07-22", "2026-07-23", "2026-07-24", "2026-07-25", "2026-07-26",
  "2026-07-27", "2026-07-28", "2026-07-29", "2026-07-30", "2026-07-31", "2026-08-01",
].map(d);

describe("rangeHasBlocked", () => {
  it("detecta el salto por encima del bloque ocupado", () => {
    expect(rangeHasBlocked(d("2026-07-20"), d("2026-08-02"), OCUPADAS)).toBe(true);
  });

  it("un rango enteramente libre pasa", () => {
    expect(rangeHasBlocked(d("2026-08-05"), d("2026-08-08"), OCUPADAS)).toBe(false);
  });

  it("salir el primer día ocupado es válido: el check-out es exclusivo (turnover)", () => {
    // llega el 18, se va el 21 → ocupa las noches 18, 19 y 20. La noche 21 es del otro.
    expect(rangeHasBlocked(d("2026-07-18"), d("2026-07-21"), OCUPADAS)).toBe(false);
  });

  it("pisar una sola noche ocupada ya invalida el rango", () => {
    expect(rangeHasBlocked(d("2026-07-18"), d("2026-07-22"), OCUPADAS)).toBe(true);
  });

  it("llegar sobre una noche ocupada invalida", () => {
    expect(rangeHasBlocked(d("2026-07-21"), d("2026-07-23"), OCUPADAS)).toBe(true);
  });

  it("sin fechas ocupadas nunca bloquea", () => {
    expect(rangeHasBlocked(d("2026-07-20"), d("2026-08-02"), [])).toBe(false);
  });

  it("compara por día, ignorando la hora", () => {
    const conHora = [new Date("2026-07-22T18:30:00")];
    expect(rangeHasBlocked(d("2026-07-20"), d("2026-07-25"), conHora)).toBe(true);
  });
});

describe("firstBlockedAfter", () => {
  it("devuelve la primera noche ocupada posterior, que es el tope de la salida", () => {
    expect(firstBlockedAfter(d("2026-07-18"), OCUPADAS)).toEqual(d("2026-07-21"));
  });

  it("ignora las ocupadas anteriores o del mismo día", () => {
    expect(firstBlockedAfter(d("2026-07-25"), OCUPADAS)).toEqual(d("2026-07-26"));
  });

  it("null si no queda ninguna ocupada por delante", () => {
    expect(firstBlockedAfter(d("2026-08-02"), OCUPADAS)).toBeNull();
    expect(firstBlockedAfter(d("2026-07-18"), [])).toBeNull();
  });

  it("no depende del orden del array", () => {
    const desordenadas = [d("2026-08-01"), d("2026-07-21"), d("2026-07-25")];
    expect(firstBlockedAfter(d("2026-07-18"), desordenadas)).toEqual(d("2026-07-21"));
  });
});
```

El helper `d` y la constante `empty` ya existen al inicio del archivo — no redeclararlos.

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `pnpm vitest run tests/reservation/range.test.ts`
Expected: FAIL. Vitest no resuelve los imports `rangeHasBlocked` y `firstBlockedAfter` porque todavía no están exportados.

- [ ] **Step 3: Implementar las funciones**

Agregar al final de `lib/reservation/range.ts`, sin tocar `RangeValue` ni `pickDay`:

```ts
/**
 * Clave numérica de la parte de fecha (YYYYMMDD). Comparar Date con `<`
 * arrastra la hora: dos objetos del mismo día pueden salir distintos según de
 * dónde vinieron (medianoche local vs. el `new Date()` de ahora).
 */
function dayKey(d: Date): number {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

/**
 * ¿La estadía [checkIn, checkOut) pisa alguna fecha ocupada?
 *
 * El check-out es EXCLUSIVO: quien se va el día B no ocupa la noche B, así que
 * una salida justo sobre una fecha ocupada es válida (es el turnover, uno entra
 * el día que el otro se va).
 *
 * Deshabilitar los días ocupados en el calendario NO alcanza para evitar esto:
 * el huésped puede elegir llegada ANTES del bloque y salida DESPUÉS, saltándolo
 * por encima. Las dos puntas están libres y el clic es válido en ambas.
 */
export function rangeHasBlocked(checkIn: Date, checkOut: Date, blocked: Date[]): boolean {
  const from = dayKey(checkIn);
  const to = dayKey(checkOut);
  return blocked.some((b) => {
    const k = dayKey(b);
    return k >= from && k < to;
  });
}

/**
 * Primera fecha ocupada estrictamente posterior a `from`, o null si no hay.
 *
 * Es el tope de la salida: con la llegada puesta, el calendario de check-out
 * deshabilita todo lo que venga DESPUÉS de esta fecha. La fecha en sí queda
 * seleccionable, porque salir ese día no ocupa esa noche.
 */
export function firstBlockedAfter(from: Date, blocked: Date[]): Date | null {
  const k = dayKey(from);
  let best: Date | null = null;
  for (const b of blocked) {
    if (dayKey(b) <= k) continue;
    if (best === null || dayKey(b) < dayKey(best)) best = b;
  }
  return best;
}
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `pnpm vitest run tests/reservation/range.test.ts`
Expected: PASS. 4 tests de `pickDay` + 7 de `rangeHasBlocked` + 4 de `firstBlockedAfter` = 15.

- [ ] **Step 5: Commit**

```bash
git add lib/reservation/range.ts tests/reservation/range.test.ts
git commit -m "feat(calendario): rangeHasBlocked y firstBlockedAfter para validar rangos"
```

---

### Task 2: Topear la salida en RangeCalendar

**Files:**
- Modify: `components/reservas/RangeCalendar.tsx` (hoy 44 líneas)
- Test: `tests/reservation/range-calendar.test.tsx` (hoy 1 test)

**Interfaces:**
- Consumes: `rangeHasBlocked` y `firstBlockedAfter` de la Task 1, con las firmas exactas declaradas allí.
- Produces: nada nuevo. La prop pública `RangeCalendarProps` no cambia: sigue siendo `{ value, onChange, disabledDates? }`.

- [ ] **Step 1: Escribir el test que falla**

Agregar dentro del `describe("RangeCalendar", ...)` existente en `tests/reservation/range-calendar.test.tsx`:

```tsx
  it("con la llegada elegida, topea la salida en la primera noche ocupada", () => {
    const checkIn = new Date(2026, 6, 20); // 20 jul 2026
    const ocupadas = [new Date(2026, 6, 22), new Date(2026, 6, 23)];
    const { container } = render(
      <RangeCalendar
        value={{ checkIn, checkOut: null }}
        onChange={() => {}}
        disabledDates={ocupadas}
      />,
    );

    // La primera noche ocupada sigue elegible como salida: el check-out es
    // exclusivo, así que irse el 22 no ocupa la noche del 22 (turnover).
    // Excluirla perdería una noche vendible en cada borde.
    const tope = container.querySelector('[data-day="2026-07-22"]');
    expect(tope).not.toBeNull();
    expect(tope?.className).not.toContain("rdp-disabled");

    // El 24 está libre, pero queda fuera por ser posterior al tope: si fuera
    // elegible, el huésped saltaría el bloque ocupado por encima.
    const despues = container.querySelector('[data-day="2026-07-24"]');
    expect(despues).not.toBeNull();
    expect(despues?.className).toContain("rdp-disabled");
  });
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `pnpm vitest run tests/reservation/range-calendar.test.tsx`
Expected: FAIL en la segunda aserción del 24 de julio. El componente todavía no aplica el tope, así que el 24 está habilitado y `className` no contiene `rdp-disabled`.

- [ ] **Step 3: Aplicar el tope y la guarda**

En `components/reservas/RangeCalendar.tsx`, cambiar el import de la línea 6:

```tsx
import {
  pickDay,
  rangeHasBlocked,
  firstBlockedAfter,
  type RangeValue,
} from "@/lib/reservation/range";
```

Insertar después del bloque `modifiersClassNames` y antes del `return`:

```tsx
  // Fase de salida: hay llegada elegida y falta el check-out. Ahí el rango se
  // topea en la primera noche ocupada, para que no se pueda saltar el bloque
  // eligiendo llegada antes y salida después (ambas puntas están libres, así
  // que deshabilitar solo los días ocupados no alcanza).
  const pickingDeparture = checkIn !== null && checkOut === null;
  const maxCheckOut = pickingDeparture ? firstBlockedAfter(checkIn, disabledDates) : null;

  // Esa noche tope sigue siendo elegible como salida: el check-out es exclusivo
  // (turnover), y el servidor acepta ese rango.
  const blocked = maxCheckOut
    ? disabledDates.filter((d) => d.getTime() !== maxCheckOut.getTime())
    : disabledDates;
```

Reemplazar la prop `disabled` del `DayPicker`:

```tsx
      disabled={[
        { before: new Date() },
        ...(maxCheckOut ? [{ after: maxCheckOut }] : []),
        ...blocked,
      ]}
```

Reemplazar `onDayClick`:

```tsx
      onDayClick={(day) => {
        // Guarda de último recurso, por si la disponibilidad llegó tarde.
        if (pickingDeparture && day > checkIn && rangeHasBlocked(checkIn, day, disabledDates)) return;
        onChange(pickDay(value, day));
      }}
```

No tocar `modifiers` ni `modifiersClassNames`: las clases `rdp-lago-end` y `rdp-lago-middle` son de La Casa del Lago y deben quedar como están.

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `pnpm vitest run tests/reservation/range-calendar.test.tsx`
Expected: PASS, 2 tests. El test viejo del día ocupado sigue verde: sin `checkIn`, `pickingDeparture` es `false`, `maxCheckOut` es `null` y `blocked` es `disabledDates` sin filtrar, así que el comportamiento previo no cambia.

- [ ] **Step 5: Correr la suite completa**

Run: `pnpm test`
Expected: PASS. 48 tests previos + 11 de la Task 1 + 1 de esta.

- [ ] **Step 6: Verificar el build**

Run: `pnpm build`
Expected: compila sin errores de TypeScript.

- [ ] **Step 7: Commit**

```bash
git add components/reservas/RangeCalendar.tsx tests/reservation/range-calendar.test.tsx
git commit -m "fix(calendario): impedir armar rangos que saltan por encima de fechas ocupadas"
```

---

## Gate de verificación del dominio

Antes de mergear a `main`:

- [ ] `pnpm test` en verde, con la salida a la vista
- [ ] `pnpm build` sin errores
- [ ] Prueba manual en `pnpm dev`: en el buscador del home, elegir una llegada anterior a un bloque ocupado y comprobar que el calendario de salida no deja elegir nada más allá de la primera noche ocupada, y que esa noche sí se puede elegir

Recordar que ninguno de los dos repos tiene `node_modules`: arrancar con `pnpm install`.
