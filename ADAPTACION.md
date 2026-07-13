# Checklist de adaptación — La Casa del Lago Urugua-í

El primer pase de rebranding ya cambió nombre, marca, ubicación e identificadores internos.
Falta cargar los **datos reales del alojamiento**. Cada punto indica el archivo exacto.

## 1. Datos de contacto (`lib/contact.ts`)
- [ ] `WHATSAPP_NUMBER` — número real (formato `549XXXXXXXXXX`, sin `+`)
- [ ] `CONTACT_EMAIL` — email real
- [ ] `CONTACT_PHONE_HREF` — teléfono real

## 2. SEO / mapa / ficha del negocio (`app/[locale]/page.tsx`)
- [ ] `geo` — latitud/longitud reales del lago (placeholder actual: -25.90, -54.58)
- [ ] `streetAddress` / `addressLocality` — acceso/dirección reales
- [ ] `telephone`, `email` — reales
- [ ] Imagen OG (`url` de Cloudinary) — foto real

## 3. Distancias, banco y condiciones (`lib/site.ts`)
- [ ] `DISTANCES` — km reales: aeropuerto IGR, Cataratas, Puerto Libertad (hoy en 0)
- [ ] `CHECK_IN` / `CHECK_OUT` / `PETS_ALLOWED` — confirmar
- [ ] `BANK_DETAILS` — alias, CBU y titular reales (o vía env `NEXT_PUBLIC_CDL_BANK_*`)

## 4. Contenido visible — i18n (`messages/es.json`, `en.json`, `pt.json`)
- [ ] Dirección exacta en `contacto.address` (hoy: "Costa del lago Urugua-í…")
- [ ] **Unidades** (`units`, `departamento.spaceBody`, `reservas.units`, `tarifas`): las 3
      unidades heredadas de Aruma (Yvyrá / Mberú / Tatú, con piscina/jacuzzi) son **plantilla**.
      Reemplazar por las cabañas reales: cantidad, nombres, capacidad, ambientes, servicios.
- [ ] Sección "Experiencias" y "Galería": ajustar textos al entorno del lago.

## 5. Imágenes y logo
- [ ] Logo: hoy apunta a la imagen de Aruma en Cloudinary (`ArumaLodge/ALARGADA…`) en
      `components/layout/SiteNav.tsx` y `SiteFooter.tsx`. Subir el logo propio y cambiar la URL.
- [ ] Hero y galería: `components/home/Hero.tsx` (Cloudinary) y bucket Supabase
      `casa-lago-fotos` (`components/ui/ImageSlot.tsx`). Crear el bucket y subir fotos reales.
- [ ] `app/icon.png` — favicon propio.

## 6. Identidad visual (opcional, cuando haya branding)
- [ ] Paleta: `app/globals.css` (`@theme`: terracota, selva, arena, bronce…).
- [ ] Fuentes: `lib/fonts.ts` (hoy Cormorant Garamond + Manrope).

## 7. Credenciales / entorno (`.env.local` — ya limpio, sin secretos de Aruma)
- [ ] Supabase (proyecto nuevo): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
      → correr `supabase/setup.sql` en el proyecto nuevo y crear el bucket `casa-lago-fotos`.
- [ ] Mercado Pago (cuenta propia): `MERCADOPAGO_ACCESS_TOKEN`, `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`, `MERCADOPAGO_WEBHOOK_SECRET`
- [ ] Resend: `RESEND_API_KEY`, `CDL_EMAIL_FROM` (remitente verificado)
- [ ] Google Calendar (1 por cabaña): `CDL_ICS_*` (lectura), `CDL_CAL_*` + `GOOGLE_SERVICE_ACCOUNT_JSON` (escritura)
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
