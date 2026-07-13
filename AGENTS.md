# La Casa del Lago Urugua-í — Memoria del proyecto

Cabañas a orillas del **lago Urugua-í**, entre Puerto Iguazú y Puerto Libertad, Misiones, Argentina.

> Este proyecto es una **adaptación** del sitio de Aruma Lodge. Se copió toda la estructura
> (Next.js 16) y se hizo un **primer pase de rebranding**. Los datos reales del alojamiento
> (contacto, dirección, unidades, credenciales, imágenes/logo) están marcados con `TODO` y
> listados en `ADAPTACION.md`.

## Stack
- Next.js 16 App Router · TypeScript · Tailwind v4 · next-intl (es/en/pt) · GSAP + Lenis · react-day-picker v10 · Vitest
- Backend: Supabase, Mercado Pago (MP), Resend (emails), Google Calendar (disponibilidad)
- Deploy: Netlify (`netlify.toml` usa `node ./node_modules/next/dist/bin/next build`)

## Qué se cambió respecto de Aruma (primer pase)
- **Nombre del proyecto:** `aruma-web` → `la-casa-del-lago-web` (package.json).
- **Marca:** "Aruma Lodge" → "La Casa del Lago Urugua-í" en i18n (es/en/pt), JSON-LD, nav, footer, emails, títulos de página, panel admin.
- **Ubicación:** "centro de Puerto Iguazú / a minutos de las Cataratas" → "a orillas del lago Urugua-í, entre Iguazú y Libertad". Kicker, meta, taglines y descripciones reencuadrados.
- **Nav/label:** "Departamentos/Apartments/Apartamentos" → "Cabañas/Cabins/Cabanas".
- **Prefijo de código de reserva:** `ARM-` → `CDL-` (`lib/reservation/code.ts`, regex de lookup, tests).
- **Variables de entorno:** `ARUMA_ICS_*`→`CDL_ICS_*`, `ARUMA_CAL_*`→`CDL_CAL_*`, `NEXT_PUBLIC_ARUMA_BANK_*`→`NEXT_PUBLIC_CDL_BANK_*`, `ARUMA_EMAIL_FROM`→`CDL_EMAIL_FROM`.
- **Bucket de fotos (Supabase Storage):** `Aruma-fotos` → `casa-lago-fotos` (`components/ui/ImageSlot.tsx`).
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
- Emails de confirmación: `lib/reservation/email-template.ts`
- Variables de entorno: `.env.example` (plantilla) → `.env.local` (valores reales, gitignored)

## Verificación pendiente
Correr en local tras instalar dependencias:
```
pnpm install
pnpm test      # vitest — los fixtures ya usan el prefijo CDL- y las env CDL_*
pnpm dev       # http://localhost:3000
```
