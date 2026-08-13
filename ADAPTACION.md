# Checklist de adaptación — La Casa del Lago Urugua-í

El primer pase de rebranding ya cambió nombre, marca, ubicación e identificadores internos.
Falta cargar los **datos reales del alojamiento**. Cada punto indica el archivo exacto.

## 1. Datos de contacto (`lib/contact.ts`)
- [x] `WHATSAPP_NUMBER` — `+54 9 3757 446156`
- [x] `CONTACT_EMAIL` — `lacasadellagouruguay@gmail.com`
- [x] `CONTACT_PHONE_HREF` — `tel:+5493757446156`

## 2. SEO / mapa / ficha del negocio (`app/[locale]/page.tsx`)
- [ ] `geo` — latitud/longitud reales del lago (placeholder actual: -25.90, -54.58)
- [ ] `streetAddress` / `addressLocality` — acceso/dirección reales
   - [x] `telephone` — `+54 9 3757 446156`
   - [x] `email` — `lacasadellagouruguay@gmail.com`
- [ ] Imagen OG (`url` de Cloudinary) — foto real

## 3. Distancias, banco y condiciones (`lib/site.ts`)
- [ ] `DISTANCES` — km reales: aeropuerto IGR, Cataratas, Puerto Libertad (hoy en 0)
- [ ] `CHECK_IN` / `CHECK_OUT` / `PETS_ALLOWED` — confirmar
- [x] Transferencias manuales — sólo Brubank: alias `jmhbank`, titular Juan Manuel Hambley; sin CBU informado. Mercado Pago queda reservado para la pasarela de pago.

## 4. Contenido visible — i18n (`messages/es.json`, `en.json`, `pt.json`)
- [ ] Dirección exacta en `contacto.address` (hoy: "Costa del lago Urugua-í…")
- [x] **Unidades**: Aguaribay hasta 6 huéspedes y Aratirí hasta 7. Temporada baja:
      base de $99.800 para 2 huéspedes + $20.000 por huésped adicional.
- [x] **Condiciones de temporada baja**: mínimo 2 noches lunes a jueves; paquete de fin de
      semana de 3 noches al valor de 2,5.
- [ ] Sección "Experiencias" y "Galería": ajustar textos al entorno del lago.

## 5. Imágenes y logo
- [ ] Logo: hoy apunta a la imagen de Aruma en Cloudinary (`ArumaLodge/ALARGADA…`) en
      `components/layout/SiteNav.tsx` y `SiteFooter.tsx`. Subir el logo propio y cambiar la URL.
- [x] Hero y galería: `components/home/Hero.tsx` (Cloudinary) y bucket Supabase
      `imagenes` (`components/ui/ImageSlot.tsx`). Bucket creado y fotos subidas.
- [ ] `app/icon.png` — favicon propio.

## 6. Identidad visual (opcional, cuando haya branding)
- [ ] Paleta: `app/globals.css` (`@theme`: terracota, selva, arena, bronce…).
- [ ] Fuentes: `lib/fonts.ts` (hoy Cormorant Garamond + Manrope).

## 7. Credenciales / entorno (`.env.local` — ya limpio, sin secretos de Aruma)
- [ ] Supabase (proyecto nuevo): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
      → correr `supabase/setup.sql` en el proyecto nuevo y crear el bucket `imagenes`.
- [ ] Mercado Pago (cuenta propia): `MERCADOPAGO_ACCESS_TOKEN`, `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`, `MERCADOPAGO_WEBHOOK_SECRET`
- [ ] Resend: `RESEND_API_KEY`, `CDL_EMAIL_FROM` (remitente verificado)
- [x] Disponibilidad desde Supabase: tabla `reservations` y constraint `reservations_no_overlap`.
- [ ] `ADMIN_EMAILS` — emails del panel admin
- [ ] `NEXT_PUBLIC_BOOKING_MODE` — vacío = checkout online; `whatsapp` = deriva a WhatsApp

## 8. Deploy (Netlify)
- [ ] Repo git propio + sitio nuevo en Netlify.
- [ ] Cargar las env vars en Netlify (no se suben en `.env.local`).

## 9. Verificar
```
pnpm install
pnpm test
pnpm dev
```
