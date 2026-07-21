# Bootstrap del backend Supabase — La Casa del Lago Urugua-í

Fecha: 2026-07-21
Proyecto Supabase: `aqknzqtxhgsrhfaskoeo` (`https://aqknzqtxhgsrhfaskoeo.supabase.co`)

## Problema

El panel `/admin` de este repo funciona, pero contra nada: el proyecto Supabase
nuevo está vacío (0 tablas, 0 migraciones, sin bucket) y las tres variables de
entorno de Supabase siguen con los placeholders del `.env.example`. Lo único que
sostiene el panel es `ADMIN_AUTH_BYPASS=1`, un bypass temporal que deja `/admin`
y toda la API `/api/admin/*` abiertos sin autenticación.

### Lo que NO es el problema

Un barrido comparativo contra `../ArumaLodge/aruma-web` (el repo del que salió
este fork) descartó la hipótesis inicial de features faltantes:

- Los árboles de `app/`, `components/` y `lib/` son **idénticos**. Ningún archivo
  existe en aruma y falta acá.
- Tarifas, pago de prueba y precios por método ya están portados
  (`app/admin/tarifas/`, `app/admin/pago-prueba/`, `lib/reservation/method-pricing.ts`,
  `lib/reservation/rate-settings.ts`).
- Este repo va **adelante**: `app/admin/tarifas/RateForm.tsx` tiene la sección
  "Costo por canal de cobro" con preview en vivo del precio público, que
  aruma-web todavía no tiene.

## Diseño

### 1. Schema

Tres migraciones vía MCP (`apply_migration`), en vez de un `setup.sql`
monolítico, para que queden versionadas en el historial del proyecto:

1. `reservations` — función `set_updated_at()`, tabla, trigger, índice
   `(status, created_at desc)`, RLS activado.
2. Bucket privado `comprobantes` en `storage.buckets`.
3. `rate_settings` — fila única `id=1`, columnas `card_fee_pct` (default 7.7) y
   `transfer_fee_pct` (default 5), RLS activado, trigger de `updated_at`.

Criterio de seguridad heredado del schema original: **RLS activado sin policies**.
Nadie accede con la anon key; la app entra solo con la service role key desde el
server, que ignora RLS.

Los defaults de `rate_settings` (130000 / 95000 / 110000) coinciden con
`lib/units.ts`, así que la primera carga del panel muestra lo mismo que ya
muestra el sitio público.

### 2. Variables de entorno

En `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL=https://aqknzqtxhgsrhfaskoeo.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...` (pública por diseño)
- `SUPABASE_SERVICE_ROLE_KEY` — **la pega el usuario**. Es un secreto que bypassa
  RLS; no se manipula desde acá.
- `ADMIN_EMAILS=lacasadellagouruguay@gmail.com` (solo ese; es el único usuario
  que existe en `auth.users`, con email ya verificado).
- `ADMIN_AUTH_BYPASS` — se elimina.

### 3. Eliminar el bypass

Se borra del código, no solo de la config:

- `isAdminAuthBypassed()` y `BYPASS_USER` de `lib/admin/auth.ts`.
- Sus dos usos en `app/admin/login/actions.ts` (`signIn` y `signOut`).
- La variable y su comentario de `.env.example`.

Razón: una env var que, si se filtra a producción, abre el panel entero. Una vez
que el login real anda, no tiene razón de existir.

### 4. Actualizar `supabase/setup.sql`

El header dice "Aruma Lodge" y referencia el project ref viejo
(`dckpnzkvuzrajvakiusc`). Se actualiza para reflejar las migraciones aplicadas.

### 5. Verificación

Con el dev server (`preview_start`), en este orden:

1. `/admin/reservas` sin sesión → redirige a `/admin/login`.
2. Login real con el usuario de Auth → entra al panel.
3. `/admin/tarifas` → guarda un valor y lo relee de la base (confirmar con SQL
   directo que la fila cambió).
4. `/admin/pago-prueba` con `PAYMENTS_MOCK=1`.
5. Suite de tests (`vitest`) sin regresiones.

## Addendum — el complejo tiene dos cabañas, no tres

Decidido durante la misma sesión. El complejo real son **Timbó y Lapacho**;
Guatambú era relleno del handoff (es la única que nunca tuvo galería de fotos
propia, según `.superpowers/sdd/task-12-report.md`). Se conservan los dos slugs
existentes, así que no hay migración de URLs ni de columnas de los sobrevivientes.

Alcance del borrado (275 ocurrencias en 39 archivos):

- `lib/units.ts`: `UnitSlug`, `UNITS`, `GUATAMBU_PRICE`, `pricePerNight`.
- `lib/reservation/`: `reducer.ts` (`UnitId`), `search.ts`, `rate-settings.ts`,
  `method-pricing.ts`, `availability.server.ts`, `calendar.server.ts`.
- `app/api/`: las cuatro listas `VALID_UNITS`.
- `app/admin/tarifas/`: `RateForm.tsx`, `actions.ts`.
- `components/`: `UnitDetail.tsx` (features ×3 idiomas, extras ×3 idiomas),
  `ui/ImageSlot.tsx` (12 seeds de foto).
- `messages/{es,en,pt}.json`: `name`/`sub`, `spaceBody`, `units`.
- Migración `drop_guatambu_unit`: `alter table rate_settings drop column
  nightly_guatambu`. `supabase/setup.sql` actualizado en consecuencia.
- Tests: `guatambu` → `lapacho` como unidad de prueba. Dos expectativas
  numéricas recalculadas ($390.200 → $341.600 en `payments-route.test.ts`,
  porque el neto pasó de 110.000 a 95.000).

Las env vars de calendario se renombraron de paso (`CDL_ICS_YVYRA/MBERU/TATU` →
`CDL_ICS_TIMBO/LAPACHO`, ídem `CDL_CAL_*`). Estaban **vacías**, así que no hubo
riesgo de que Casa del Lago leyera los calendarios de Aruma.

## Fuera de alcance

`.env.local` define `CDL_ICS_YVYRA/MBERU/TATU` y `CDL_CAL_YVYRA/MBERU/TATU`
(slugs de Aruma), pero `lib/reservation/availability.server.ts` y
`calendar.server.ts` leen `CDL_ICS_TIMBO/LAPACHO/GUATAMBU`. La disponibilidad y
la escritura de eventos de calendario están mudas hasta que se renombren. Queda
para un trabajo aparte por decisión explícita del usuario.
