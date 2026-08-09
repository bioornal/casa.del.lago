# Portar features de Aruma Web a La Casa del Lago — Diseño

**Fecha:** 2026-08-09
**Estado:** aprobado, pendiente de plan de implementación
**Origen:** `bioornal/arumalodgeweb` @ `0e2a7d3` (2026-08-07)
**Destino:** `bioornal/casa.del.lago` @ `23ebabc` (2026-08-05)

## Problema

La Casa del Lago nació el 2026-07-13 como copia del árbol de Aruma Lodge
(`a48b2af baseline: front heredado de Aruma Lodge`). Desde entonces los dos proyectos
avanzaron por separado y la réplica quedó atrás en features y correcciones que Aruma
ya tiene en producción.

Pero el atraso **no es uniforme**. La divergencia es bidireccional: en varios archivos
La Casa del Lago está por delante, con trabajo propio que Aruma no tiene.

| Métrica | Aruma | Casa del Lago |
|---|---|---|
| Commits | 123 | 50 |
| Último commit | 2026-08-07 | 2026-08-05 |
| Tests | 53 | 48 |

Diff de árboles (excluyendo `.git`, `node_modules`, `.next`, lockfiles):

- **37** archivos solo en Aruma
- **29** archivos solo en La Casa del Lago
- **138** archivos que difieren

### Hallazgo que condiciona toda la estrategia

**Los dos repos no comparten historia git.** La Casa del Lago no es un fork: es un
snapshot del árbol de Aruma con historia propia desde cero. Los SHAs de Aruma no
existen en su object store (verificado con `git cat-file -t`).

Esto **descarta `cherry-pick`, `merge` y `rebase`**. Todo el portado tiene que hacerse
por diff de árboles y reaplicación manual.

### La réplica también borró cosas a propósito

Tres decisiones deliberadas de La Casa del Lago que un portado ingenuo revertiría:

1. **Google Calendar eliminado** (`41cd8d2`, `c52b1b9`) en favor de Supabase como
   fuente única de disponibilidad — ver
   `2026-07-22-supabase-fuente-disponibilidad-design.md`. Aruma todavía tiene
   `lib/reservation/calendar.server.ts`.
2. **Animaciones bajadas** (`c4f83f9`, `0e61ff7`). Aruma tiene seis componentes en
   `components/motion/`, dos de ellos (`SelvaFigure`, `SelvaTrail`) además son branding
   de selva, no de lago.
3. **Rediseño propio de hero y nav** (`2370ba0`, `0e61ff7`), que choca de frente con
   el rework de navbar de Aruma.

## Objetivo

Llevar La Casa del Lago al nivel funcional de Aruma bajo **paridad selectiva**: portar
las features y correcciones que faltan, respetando las decisiones deliberadas de la
réplica y conservando su trabajo propio.

Alcance incluye el panel de administración con el mismo criterio.

## No-objetivos

- **No** revivir Google Calendar (`calendar.server.ts`, env `GOOGLE_*`, `ARUMA_CAL_*`,
  `ARUMA_ICS_*`).
- **No** portar `components/motion/` ni sus tests
  (`tests/home/selva-*.test.tsx`, `reveal-title.test.tsx`).
- **No** portar el rework de navbar de Aruma (~12 commits). Descartado explícitamente
  por destruir el hero y la nav propios a cambio de cero funcionalidad.
- **No** tocar branding: `lib/fonts.ts`, paleta de `app/globals.css`, logos.
- **No** portar `docs/superpowers/` de Aruma (histórico ajeno).
- **No** portar valores de variables de entorno (ver "Variables de entorno").
- **No** completar los datos reales del alojamiento (ver "Fuera de alcance").

## Clasificación del gap

Los deltas de líneas separan atraso real de divergencia deliberada:

| Archivo | Aruma | Casa | Delta | Lectura |
|---|---|---|---|---|
| `lib/reservation/email/guest-templates.ts` | 425 | 223 | **+202** | rediseño del email (`f1ce901`) |
| `lib/reservation/method-pricing.ts` | 98 | 46 | **+52** | precios por método (`aaeabd2`) |
| `lib/reservation/range.ts` | 55 | **9** | **+46** | fix del calendario (`0e2a7d3`) |
| `lib/site-settings.server.ts` | 91 | 64 | +27 | flag `test_unit_enabled` |
| `lib/reservation/ics.ts` | 100 | 80 | +20 | atraso |
| `lib/reservation/search.ts` | 52 | 40 | +12 | atraso |
| `lib/reservation/availability.server.ts` | 51 | **66** | −15 | motor Supabase propio |
| `lib/fonts.ts` | 16 | **28** | −12 | tipografía del lago |
| `lib/reservation/comprobante.server.ts` | 42 | **52** | −10 | casa adelante |
| `app/admin/reservas/page.tsx` | 108 | **138** | −30 | reservas manuales |
| `app/admin/tarifas/RateForm.tsx` | 218 | **258** | −40 | casa adelante |

## Estrategia: portado por dominios

Cinco dominios, ejecutados en orden. Una rama por dominio (`port/01-calendario`,
`port/02-emails`, …), mergeada a `main` solo al pasar su gate de verificación. Un
dominio que se complica se descarta sin arrastrar a los demás.

| # | Dominio | Entra | Conservar de casa |
|---|---|---|---|
| 1 | Disponibilidad/calendario | `range.ts`, `ics.ts`, `search.ts` | `availability.server.ts` |
| 2 | Emails | `guest-templates.ts`, `guest.ts`, `email/admin.ts` (nuevo), `comprobante.ts` (nuevo), `scripts/preview-email.mts`, script `email:preview` | `comprobante.server.ts` |
| 3 | Pricing/tarifas | `method-pricing.ts`, `rate-settings.ts`, `rates.server.ts` | `RateForm.tsx` |
| 4 | Checkout/pagos | fix del selector de comprobante (`ffe8dad`), `app/api` (4 archivos), `components/reservas` (7) | — |
| 5 | Admin | `TestUnitToggle.tsx`, `configuracion/actions.ts`, flags de `site-settings` | `opiniones/`, `ManualReservationForm.tsx`, `reservas/actions.ts` |

**Los tests no son un dominio.** Son transversales: los 24 archivos de
`tests/reservation` y el resto se portan junto al dominio que cubren, en la misma rama
y el mismo commit. Un dominio sin sus tests portados no pasa el gate.

El dominio 1 va primero por riesgo (posible bug de doble reserva), no por dependencia.
El dominio 2 va segundo por ser el gap más grande y más limpio: en emails no hay
divergencia bidireccional, es puro atraso. La Casa del Lago quedó con una arquitectura
anterior (`email-template.ts` + `email.server.ts`) que se retira al portar la nueva.

### Granularidad de los planes

Los cinco dominios son demasiado para un solo plan de implementación. Cada dominio
recibe **su propio plan**, escrito recién cuando el anterior cerró su gate. Así el
plan del dominio N+1 se escribe con la información que dejó el dominio N — en especial
el dominio 1, cuyo resultado (bug confirmado o no) cambia el tamaño del trabajo.

## Merge quirúrgico: tres categorías

Cada archivo cae en una y solo una categoría. **Nunca se sobrescribe un archivo con
trabajo propio.**

**Adopción** — solo existe en Aruma, o casa está muy atrás sin trabajo propio.
Se copia y se adapta branding, nombres de unidad y rutas de env.
→ `range.ts`, `guest-templates.ts`, `method-pricing.ts`, `email/admin.ts`,
`comprobante.ts`, `TestUnitToggle.tsx`, `preview-email.mts`

**Merge quirúrgico** — ambos lados tienen trabajo propio. Se lee el commit de Aruma
para entender qué resuelve y se aplica esa intención sobre la versión de casa.
→ `comprobante.server.ts`, `RateForm.tsx`, `reservas/page.tsx`,
`configuracion/actions.ts`, `guest.ts`

**Conservar** — casa adelante o divergencia deliberada. No se toca.
→ `availability.server.ts`, `fonts.ts`, `opiniones/`, `ManualReservationForm.tsx`,
`ComoLlegar.tsx`, `ScrollCue.tsx`, `Opiniones.tsx`

## Base de datos

La Casa del Lago tiene su propio `supabase/setup.sql`, ya divergido del de Aruma.

La migración `20260725_rename_unit_columns.sql` de Aruma **no se porta**: renombra
columnas a `nightly_amambay` y `nightly_irupe` y reescribe reservas a `amambay`/`irupe`,
que son unidades de Aruma. Si el código portado necesita un cambio de esquema, se
escribe una migración nueva con las unidades reales del lago.

No hay reservas reales en la base, así que las migraciones van directo: sin backup
previo, sin rollback, sin despliegue por etapas.

## Variables de entorno

**Regla dura: se porta código que lee variables, nunca valores.** Las credenciales de
La Casa del Lago (Supabase, Mercado Pago, Resend, `ADMIN_EMAILS`) son propias y se
configuran aparte, en Netlify.

Mapeo de prefijo: `ARUMA_` → `CDL_`.

A agregar en `.env.example` de casa, requeridas por `email/admin.ts`:

- `CDL_EMAIL_REPLY_TO`
- `CDL_ADMIN_EMAIL`

Quedan fuera por la decisión de Google Calendar: `GOOGLE_SERVICE_ACCOUNT_JSON`,
`GOOGLE_CALENDAR_TIMEZONE`, `ARUMA_CAL_*`, `ARUMA_ICS_*`.

Diferencia de dependencias detectada: Aruma tiene `@next/third-parties` (Google
Analytics, `NEXT_PUBLIC_GA_ID`); casa tiene `@opentelemetry/api` (agregado en
`3c9695d`). Analytics no entra en este portado.

## Gate de verificación por dominio

Ningún dominio se cierra sin las tres cosas, con salida a la vista:

1. `pnpm test` en verde — 48 tests actuales más los que sume el dominio
2. `pnpm build` sin errores
3. Prueba manual en `pnpm dev` del flujo tocado

Ninguno de los dos repos tiene `node_modules`: el trabajo arranca con `pnpm install`.

## Riesgos

**Paso cero del dominio 1: resuelto el 2026-08-09.** El bug existe, pero es de
experiencia, no de integridad de datos.

Confirmado por inspección:
- `lib/reservation/range.ts` de casa tiene solo `pickDay`. `rangeHasBlocked` y
  `firstBlockedAfter` no existen.
- `RangeCalendar.tsx` hace `disabled={[{ before: new Date() }, ...disabledDates]}` y
  `onDayClick={pickDay(...)}`, sin validación de rango. Es el escenario exacto que
  describe `0e2a7d3`: deshabilitar los días ocupados no alcanza, porque las dos puntas
  del rango están libres y el clic es válido en ambas.
- `tests/reservation/range.test.ts` solo cubre `pickDay`.
- No hay guarda equivalente en `StickyBookingCard.tsx`.

**Pero la red server-side de casa es más fuerte que la que tenía Aruma:** el esquema
define una constraint de exclusión GiST (`reservations_no_overlap`,
`daterange(check_in, check_out, '[)') with &&`) y `reservations.server.ts` traduce el
SQLSTATE `23P01` a `OverlapError`. La base rechaza el solapamiento.

Severidad final: **no hay doble reserva ni sobreventa posible**. Lo que se pierde es
conversión — el huésped completa datos y tarjeta para que lo rebocen al final. El
dominio 1 se mantiene primero por costo/beneficio (dos funciones puras, alto impacto en
UX), no por urgencia de integridad.

**Riesgo de regresión en merges quirúrgicos.** Los cinco archivos de esa categoría son
donde puede perderse trabajo propio sin que ningún test lo detecte. Mitigación: revisar
el diff de cada uno contra `main` antes de commitear, no solo contra Aruma.

## Fuera de alcance: bloqueantes de producción

No son atraso respecto de Aruma sino carga de datos pendiente del checklist de
`ADAPTACION.md`. Solo las puede completar el dueño del proyecto y **bloquean la salida
a producción con independencia de este portado**:

- `lib/contact.ts` — `WHATSAPP_NUMBER` en `549XXXXXXXXXX`, `CONTACT_PHONE_HREF` en
  `tel:+549XXXXXXXXXX`, `CONTACT_EMAIL` genérico
- `lib/site.ts` — las tres entradas de `DISTANCES` en `0` km
- `app/[locale]/page.tsx` — `geo`, `streetAddress`, `telephone`, imagen OG

## Limpieza

`install.cmd` quedó sin trackear en la raíz de casa del lago (residuo de una instalación
del CLI). Se borra al empezar.
