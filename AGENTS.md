# La Casa del Lago Urugua-í — Memoria del proyecto

Cabañas a orillas del **lago Urugua-í**, entre Puerto Iguazú y Puerto Libertad, Misiones, Argentina.

> Este proyecto es una **adaptación** del sitio de Aruma Lodge. Se copió toda la estructura
> (Next.js 16) y se hizo un **primer pase de rebranding**. Los datos reales del alojamiento
> (contacto, dirección, unidades, credenciales, imágenes/logo) están marcados con `TODO` y
> listados en `ADAPTACION.md`.

## Stack
- Next.js 16 App Router · TypeScript · Tailwind v4 · next-intl (es/en/pt) · GSAP + Lenis · react-day-picker v10 · Vitest
- Backend: Supabase, Mercado Pago (MP) y Resend (emails). La disponibilidad sale de Supabase.
- Deploy: Netlify (`netlify.toml` usa `node ./node_modules/next/dist/bin/next build`)

## Qué se cambió respecto de Aruma (primer pase)
- **Nombre del proyecto:** `aruma-web` → `la-casa-del-lago-web` (package.json).
- **Marca:** "Aruma Lodge" → "La Casa del Lago Urugua-í" en i18n (es/en/pt), JSON-LD, nav, footer, emails, títulos de página, panel admin.
- **Ubicación:** "centro de Puerto Iguazú / a minutos de las Cataratas" → "a orillas del lago Urugua-í, entre Iguazú y Libertad". Kicker, meta, taglines y descripciones reencuadrados.
- **Nav/label:** "Departamentos/Apartments/Apartamentos" → "Cabañas/Cabins/Cabanas".
- **Prefijo de código de reserva:** `ARM-` → `CDL-` (`lib/reservation/code.ts`, regex de lookup, tests).
- **Variables de entorno:** `ARUMA_ICS_*`→`CDL_ICS_*`, `ARUMA_CAL_*`→`CDL_CAL_*`, `NEXT_PUBLIC_ARUMA_BANK_*`→`NEXT_PUBLIC_CDL_BANK_*`, `ARUMA_EMAIL_FROM`→`CDL_EMAIL_FROM`.
- **Bypass del admin:** eliminado (2026-07-21). El panel exige sesión real de
  Supabase Auth con un email en `ADMIN_EMAILS`; no hay env var que lo saltee.
- **Bucket de fotos (Supabase Storage):** `Aruma-fotos` → `imagenes` (`components/ui/ImageSlot.tsx`).
- **Identificadores internos:** keyframes `aruma-kb`/`aruma-cue` → `lago-kb`/`lago-cue`; clases `rdp-aruma-*` → `rdp-lago-*`.
- **Descriptor de pago MP:** `ARUMALODGE` → `CASADELLAGO`.
- **`.env.local`** se reemplazó por una plantilla limpia (sin los secretos reales de Aruma).

## Qué NO se cambió (a propósito)
- **Paleta de colores y fuentes** (`app/globals.css`, `lib/fonts.ts`): se mantuvo la de Aruma como punto de partida. Ajustar cuando haya identidad visual propia.
- **URLs de imágenes en Cloudinary** (`/ArumaLodge/...`) y contenido interno de las unidades (Yvyrá/Mberú/Tatú): se dejaron como **plantilla** para que el sitio siga renderizando. Reemplazar con fotos y datos reales de las cabañas.

## Fuentes de verdad (dónde editar)
- Contacto: `lib/contact.ts`
- Distancias / banco / servicios / check-in-out: `lib/site.ts`
- Textos visibles: `messages/es.json`, `messages/en.json`, `messages/pt.json`
- SEO / JSON-LD / OG: `app/[locale]/page.tsx`
- Emails de confirmación (huésped): `lib/reservation/email/guest-templates.ts`
- Emails operativos (dueño): `lib/reservation/email/admin.ts`
- Variables de entorno: `.env.example` (plantilla) → `.env.local` (valores reales, gitignored)

## Port de features de Aruma (2026-07-20, segunda tanda)
Se portó del working tree de Aruma (rama `reskin/handoff`) todo lo funcional
posterior a la copia inicial, **manteniendo copy, paleta, fuentes e imágenes del
lago** (el front del lago está MÁS avanzado que el de Aruma en estilo):

- **Tarifas editables + precios por método de pago:** tabla `rate_settings`
  (bloque en `supabase/setup.sql`, correrlo en el SQL Editor), módulos
  `lib/reservation/rate-settings(.server).ts` y `method-pricing.ts`. El admin
  configura lo que quiere RECIBIR neto; el público ve precio de lista = tarjeta
  (`neto ÷ (1 − %/100)`, redondeo ↑ $100) y la transferencia como ahorro.
  Defaults: tarjeta 7,7% · transferencia 5%.
- **`/admin/tarifas`** (page + RateForm + actions) con los campos de % por canal
  (en Aruma quedaron a medio implementar; acá están completos). Links desde el
  header de `/admin/reservas`.
- **`/admin/pago-prueba` + `/api/admin/test-payment`:** cobro REAL de $1.000
  para validar credenciales productivas de MP (descriptor `CASADELLAGO`,
  metadata sin `unit_id` → webhook no-op). Reembolso manual desde MP.
- **FX:** `lib/fx.ts` exporta `FX_DEFAULT` (null = todo prendido),
  `fxDefaultAttr()` y `FX_BOOT_SCRIPT`; `components/motion/FxWatchdog.tsx`
  auto-degrada por FPS (flag `lago-fx-off` en localStorage, TTL 24h, evento
  `lago:fx-degrade` que apaga Lenis). Overrides: `?sinfx=1` · `?fx=on` · `?fx=a,b`.
- **Decoración scroll:** `FiguraAgua` (ola/gota/bambu/nenufar, contorno que se
  rellena por scrub; sin línea conectora) + `Asentar` (grillas que entran con
  1,4° y resuelven a 0) cableados en Manifiesto,
  UnitsGrid, Experiencias, RelatoImagenes, CtaReserva y `page.tsx`.
- **Experiencias:** layout cinematográfico full-bleed (banda panorámica con
  parallax + caption + tira de 4 ítems) adaptado a la paleta del lago
  (`lago-hover` + turquesa). La foto sale del placeholder temático
  (`POOL.lago` de ImageSlot); al tener foto real del lago, pasar `photo=…`.
- **RelatoImagenes:** orden de PHOTOS = orden visual de la grilla (numeración
  01–10 correlativa con el lightbox).
- Fix: `scripts/sandbox-pago.mjs` leía `ARUMA_CAL_*` → ahora `CDL_CAL_*`;
  test de lookup usaba código `arm-…` → `cdl-…`.

## Pase mobile (2026-10-29)
La mayoría de los huéspedes entra por celular y el dueño opera el panel SÓLO
desde el teléfono. Criterios aplicados: áreas táctiles ≥ 40–44px, campos a 16px
en pantallas táctiles (regla global en `globals.css`, evita el zoom de iOS),
textos informativos ≥ 12,5px.
- **Ficha de cabaña:** `MobileBookingBar` (precio + reservar) fija al pie debajo
  de lg; `WhatsAppFab raised` sube el botón flotante para no pisarla.
- **Menú mobile:** hamburguesa 44px, accesos a Tarifas y Mi reserva.
- **Calendario del buscador:** marca la llegada al elegir la salida y titula
  el modal (Llegada/Salida).
- **Footer:** links a secciones con `/{locale}#id` (funcionan fuera de la home),
  "WhatsApp" abre WhatsApp, email sin cortarse.
- **Redes:** `INSTAGRAM_URL`/`FACEBOOK_URL` en `lib/contact.ts`; en null no se
  muestran (antes eran botones muertos). Cargar las URLs reales.
- **Panel:** login con labels/autocomplete; reservas con botones WhatsApp/Llamar
  al huésped (`lib/admin/guest-contact.ts`), fechas legibles ("jue 5 nov"),
  confirmación antes de Confirmar/Liberar; reserva manual plegada por defecto.
- **Panel tipo app (2026-10-29, segunda vuelta):** navegación en
  `components/admin/AdminNav.tsx` (montada en `app/admin/layout.tsx`): barra
  superior compacta + pestañas fijas abajo en mobile (Reservas · Tarifas ·
  Opiniones · Ajustes). `AdminHeader` es sólo título/aviso; `ADMIN_PAGE` es el
  contenedor común. Reservas abre en "Próximas" ordenadas por llegada, con
  contadores por pestaña (`lib/admin/reservation-views.ts`, fecha de hoy en
  hora argentina). Ajustes guarda lo técnico (unidad y pago de prueba) en un
  plegable. En Opiniones, "Borrar" vive dentro de "Editar".
- **Cancelar / eliminar reservas:** la ruta `/api/admin/reservations/[id]`
  acepta `cancel` (confirmed → released, libera fechas, SIN email: el de
  release habla de "pago no identificado") y `delete` (sólo released). En la
  tarjeta van dentro de "Detalles". Una released con `confirmed_at` o manual se
  muestra "Cancelada"; sin eso, "Liberada" (hold que no se pagó).
- **Calendario (`/admin/calendario`):** vista mensual con una franja por
  cabaña (color fijo), pendientes rayadas, ocupación del mes y agenda del día
  tocado. Lógica en `lib/admin/calendar.ts` (fechas ISO como string).

## Verificación
```
pnpm install
pnpm test      # vitest — 243 tests (incluye method-pricing, rate-settings,
               # test-payment, fx-default, fx-watchdog, onda/estela/asentar)
pnpm exec tsc  # typecheck limpio
pnpm build     # pasa; /admin/tarifas y /admin/pago-prueba quedan dinámicas
pnpm dev       # http://localhost:3000
```
