# Temporada alta — diseño

Fecha: 2026-10-28 · Estado: aprobado en conversación, pendiente de revisión escrita

## Objetivo

Hoy el sitio tiene una sola tarifa vigente (la de temporada baja) para cualquier
fecha. Se agrega una **temporada alta** definida por rangos de fechas que el
dueño edita desde `/admin/tarifas`, con precio por noche propio por cabaña, un
mínimo de noches propio y **sin** la promo "3 noches al valor de 2,5".

## Reglas de negocio

1. **Pertenencia de una noche.** Una noche pertenece a la fecha en que empieza.
   Es de *alta* si esa fecha cae dentro de algún rango `[desde, hasta]`
   (ambos inclusive); si no, es de *baja*. Ejemplo: rango 15/12 → 28/02 hace de
   alta las noches del 15/12 al 28/02; el check-out del 01/03 es libre.
2. **Precio.** Cada noche se cobra con la tarifa neta de su temporada, más el
   cargo por huésped adicional, grosseada por la comisión del método de pago
   (misma regla que hoy, `grossUp`). La limpieza se suma una vez, sin gross-up.
   Limpieza, huésped adicional, huéspedes base y comisiones son **compartidos**
   entre temporadas.
3. **Promo 3 por 2,5.** Solo si la llegada es viernes, la estadía es de
   **exactamente** 3 noches **y las 3 noches son de baja**. En cualquier otro
   caso se cobran todas las noches completas.
4. **Estadía mínima.** La define la temporada del **día de llegada**:
   - baja: lunes a jueves 2 noches; viernes, sábado o domingo 3 noches (igual que hoy);
   - alta: un mínimo único editable (`high_min_nights`) para cualquier día.
5. **Estadías que cruzan temporadas.** Cada noche se cobra con la tarifa de su
   temporada (regla 2). El mínimo sale de la llegada (regla 4).
6. **Reservas existentes.** No cambian: guardan el total con el que se cobraron.

## Datos

Columnas nuevas en la fila única de `public.rate_settings`:

| Columna | Tipo | Default | Uso |
| --- | --- | --- | --- |
| `high_nightly_aratiri` | integer not null | 149800 | Neto por noche de alta |
| `high_nightly_aguaribay` | integer not null | 149800 | Neto por noche de alta |
| `high_min_nights` | integer not null, check 1–30 | 4 | Mínimo de noches con llegada en alta |
| `high_season_ranges` | jsonb not null | `'[]'` | Lista `[{ "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" }]` |

- El bloque va al final de `supabase/setup.sql` (idempotente, `add column if not exists`).
  `setup.sql` **no** siembra rangos: el default es lista vacía.
- La migración en vivo (Supabase CLI) agrega las columnas y siembra **un rango de
  ejemplo** `2026-12-15 → 2027-02-28`. Los $149.800 y el mínimo 4 son valores
  ficticios: el dueño los reemplaza antes de abrir la reserva online.

## Módulos

- **`lib/reservation/seasons.ts`** (nuevo, puro, sin imports de server):
  - `type SeasonRange = { from: string; to: string }` y `type Season = "low" | "high"`.
  - `seasonOf(date, ranges): Season`.
  - `nightSeasons(checkIn, nights, ranges): Season[]` — una entrada por noche.
  - `parseSeasonRanges(raw: unknown): SeasonRange[] | null` — valida formato
    `YYYY-MM-DD`, `from <= to`, sin superposición, máximo 24 rangos; devuelve los
    rangos ordenados por `from`. `null` si es inválido.
- **`lib/reservation/rate-settings.ts`**:
  - `RateSettings` suma `high: { nightly: Record<UnitSlug, number>; minNights: number; ranges: SeasonRange[] }`.
  - `rowToSettings` tolera columnas ausentes o JSON inválido → `high` con
    precios = los de baja, `minNights` 4 y `ranges: []` (el sitio se comporta
    exactamente como hoy hasta que se corra la migración).
  - `settingsToRow` y `parseRateSettingsInput` incorporan los campos nuevos.
    Validación: precios de alta enteros > 0, mínimo entero 1–30, rangos vía
    `parseSeasonRanges`.
- **`lib/reservation/stay-rules.ts`**:
  - `minimumNights(checkIn, settings)` aplica la regla 4.
  - `isWeekendPackage(checkIn, nights, ranges)` aplica la regla 3.
  - `meetsStayMinimum(checkIn, checkOut, settings)`.
- **`lib/reservation/method-pricing.ts`**:
  - `netNightly(s, slug, guests, season)`.
  - Nuevo `stayLines(s, method, slug, nights, guests, checkIn)` →
    `{ season, nights, billed, nightly }[]`, agrupando noches consecutivas de la
    misma temporada. Con promo, una sola línea de baja con `billed = 2.5`.
  - `methodTotal` = Σ `nightly × billed` + limpieza (0 si no hay noches).
  - `PriceBreakdown` reemplaza `nightly`/`billedNights` por `lines` (precio de
    lista = tarjeta, como hoy) y mantiene `lodging`, `cleaningFee`,
    `listTotal`, `discount`, `total`, más `weekendPackage: boolean`.
  - `methodRates` sigue devolviendo las tarifas de **baja**: alimentan los
    "desde $X por noche" de home, ficha de cabaña y tarjetas de tarifas.
- **`lib/reservation/rates.server.ts`**: `UnitRate` suma `lines` y calcula
  `weekendPackage` con rangos.

Todos los consumidores (checkout, `/api/payments`, `/api/reservations/transfer`,
tarifas, test-unit) siguen pasando por `methodTotal` / `checkoutTotal`, así que
lo mostrado y lo cobrado coinciden.

## Interfaz

- **`/admin/tarifas`**: nueva sección "Temporada alta" en `RateForm` con precio
  por noche de cada cabaña, mínimo de noches y lista de rangos (filas
  desde–hasta con agregar/quitar). Los rangos viajan en un campo oculto
  `high_season_ranges` (JSON). La vista previa muestra el precio de lista de
  alta por canal, igual que hoy con baja.
- **Checkout (`OrderSummary`)**: una línea por tramo, p. ej.
  "Temporada baja · $108.200 × 2" y "Temporada alta · $162.300 × 2". La
  leyenda de la promo aparece si `weekendPackage`.
- **Tarjetas de `/tarifas` (`UnitRateCard`)**: si el rango tiene un solo tramo,
  se ve como hoy; si cruza temporadas, se listan los tramos.
- **Calendarios** (`SearchWidget`, `RangeCalendar`): reciben la configuración de
  estadía (mínimo de alta + rangos) por props desde las páginas server que ya
  leen `getRateSettings`, y aplican `minimumNights(checkIn, settings)`.
- **Textos (es/en/pt)**: la promo pasa a decir "en temporada baja"; las
  condiciones de estadía mencionan el mínimo de temporada alta.

## Fuera de alcance

- Limpieza o cargo por huésped adicional distintos por temporada.
- Más de dos temporadas, o precios por cabaña y día.
- Promociones propias de temporada alta.
- Que el formulario de reserva manual del panel saltee el mínimo de noches
  (hoy lo aplica; queda igual).

## Tests

- `seasons`: pertenencia de noches en bordes de rango (desde, hasta, día
  siguiente), `nightSeasons` con cruce, `parseSeasonRanges` (formato, orden,
  superposición, `from > to`, límite de cantidad).
- `stay-rules`: mínimo en baja (lun–jue / vie–dom) y en alta; promo solo con 3
  noches de baja desde viernes; sin promo si alguna noche es de alta.
- `method-pricing`: total solo baja, solo alta, cruce, con promo, con huéspedes
  extra, por tarjeta y transferencia; `PriceBreakdown` suma el total.
- `rate-settings`: `rowToSettings` con columnas ausentes / JSON inválido;
  `parseRateSettingsInput` con errores de cada campo nuevo.
- Se arreglan los 2 tests de `range-calendar.test.tsx` que hoy fallan por usar
  fechas fijas ya vencidas.

## Despliegue

1. Migración en Supabase con la CLI (columnas + rango de ejemplo).
2. `pnpm test`, `pnpm exec tsc`, build local.
3. Commit y push a `main` → deploy de Netlify desde GitHub.
4. Verificar en producción `/es/tarifas` con un rango de alta y uno que cruce.
