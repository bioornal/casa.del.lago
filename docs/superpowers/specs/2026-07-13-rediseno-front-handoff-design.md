# Rediseño del front al handoff — La Casa del Lago Urugua-í

**Fecha:** 2026-07-13
**Estado:** Diseño aprobado — pendiente de plan de implementación

## 1. Contexto y objetivo

El sitio actual es una copia de Aruma Lodge con un primer pase de rebranding a "La Casa
del Lago Urugua-í". La **funcionalidad está completa y funciona** (Next.js 16, i18n es/en/pt,
Supabase, Mercado Pago, Resend, calendario Google, flujo de reserva). Lo que falta es la
**capa de presentación**: el front actual usa una paleta incompleta (sin el color firma
`lago`) y Cormorant Garamond, mientras que el handoff define una identidad visual madura y
distinta.

**Objetivo:** recrear con fidelidad el diseño del handoff (`design_handoff_casa_del_lago/`)
en el codebase, en sus 4 tipos de página, **sin modificar la funcionalidad**. El handoff es
la fuente de verdad para colores, tipografías, layout, estados y copy. Las fotos siguen
siendo placeholders hasta que haya fotografía real.

Referencia de diseño (hifi): `La Casa del Lago.dc.html`, `Tarifas.dc.html`,
`Cabaña Timbó.dc.html`, `Reservas.dc.html` + `README.md` del handoff (tokens y specs exactas).

## 2. Alcance

**Incluye (capa de presentación, 4 páginas):**
- Sistema visual: design tokens (paleta completa), tipografías, escalas.
- Componentes compartidos: `SiteNav`, `SiteFooter`, `SearchWidget`, `WhatsAppFab`.
- Home (`app/[locale]/page.tsx` + `components/home/*`).
- Tarifas (`app/[locale]/tarifas/page.tsx` + `components/tarifas/*`).
- Detalle de cabaña (`app/[locale]/departamentos/[slug]/page.tsx` + `components/departamento/*`).
- Checkout (`app/[locale]/reservas/page.tsx` + `components/reservas/*`).
- Contenido i18n (`messages/{es,en,pt}.json`) alineado al copy del handoff.
- Rename de slugs de unidad al contenido real (Timbó/Lapacho/Guatambú).

**No incluye (se preserva intacto):**
- Lógica de reservas, disponibilidad, precios, pagos, emails, reducer, validación, API routes.
- Integraciones (Supabase, MP, Resend, Google Calendar) — sólo se renombran claves de env
  del calendario para alinearlas a los nuevos slugs; el dueño las reconfigura con la cuenta
  correcta (la actual es heredada de Aruma y es incorrecta).
- Datos reales de contacto/dirección/banco (siguen como TODO en `lib/contact.ts`, `lib/site.ts`).
- Fotografía real (los placeholders picsum/Cloudinary se mantienen; la estructura de
  `ImageSlot`/bucket no cambia).

## 3. Decisiones de arquitectura

### 3.1 Rename de slugs de unidad (aprobado: opción B)
El slug (`yvyra`/`mberu`/`tatu`) es la llave funcional que conecta env del calendario,
disponibilidad, precios, URLs de checkout, claves i18n, galería y features por unidad. Como
el calendario y la cuenta de Google actuales son incorrectos (heredados de Aruma) y se van a
reemplazar de cero, **no hay integración viva que romper**, y renombrar es seguro y da URLs
limpias.

| Slug nuevo | Nombre display | Capacidad | Dorm. | Precio/noche |
|---|---|---|---|---|
| `timbo` | Cabaña Timbó | 6 | 2 | $130.000 |
| `lapacho` | Cabaña Lapacho | 4 | 1 | $95.000 |
| `guatambu` | Cabaña Guatambú | 5 | 2 | $110.000 |

Rename consistente en: `lib/units.ts` (tipo `UnitSlug`, `UNITS`, `pricePerNight`, constantes
de precio), `lib/reservation/availability.server.ts` y `calendar.server.ts` (mapas de env →
`CDL_ICS_TIMBO`/`CDL_CAL_TIMBO`/…), claves i18n (`departamento.spaceBody.*`, features,
galería), y cualquier referencia por slug en componentes. Los **valores** de env los carga el
dueño; el código sólo define los nombres nuevos. La lógica no cambia.

> Nota de precios/specs: son los del handoff (placeholder del diseñador). Quedan como valores
> por defecto editables; no son un compromiso de negocio.

### 3.2 Design tokens (`app/globals.css`)
Reemplazar el bloque `@theme` por la **paleta completa** del handoff. Cambios respecto de hoy:
- **Agregar** (ausentes hoy): `lago #155E75` (color firma), `lago-hover #0E4A5E`,
  `turquesa #1FA2B8`, `atardecer #E08A2C`, `brasa #C4471F`.
- **Corregir a hex exactos:** terracota `#A24B2A` (+ hover `#85391F`), marfil `#F5EEE1`,
  arena `#EAE0CE`, selva `#2F4A34`, carbón `#1F1D19`, cuerpo `#4A463F`, muted `#6B665D`,
  borde `#D8CFBF`.
- Mantener nombres de token existentes donde ya se usan como clase Tailwind (`terracota`,
  `marfil`, `arena`, `selva`, `carbon`, `cuerpo`, `muted`) para no romper markup; agregar los
  nuevos como clases nuevas (`lago`, `turquesa`, `atardecer`, `brasa`).
- Escalas de radius: 2px (botones nav/CTA), 3–4px (media/inputs), 6px (tiles/botones grandes),
  8px (cards booking), 10px (barras buscadoras), 999px (chips).
- Sombra de cards flotantes: `0 30px 60px -46px rgba(21,45,55,.5)`.
- Actualizar el keyframe/duración del Ken Burns a `scale(1.09)→scale(1.01)`, 16s (hoy 1.12→1.01).
- `prefers-reduced-motion` y el kill-switch `?sinfx`/`data-fx` se conservan tal cual.

### 3.3 Tipografía (`lib/fonts.ts`)
- **Display:** Cormorant Garamond → **Fraunces** (weights 300–600, italic). Variable
  `--font-display-loaded`.
- **Cuerpo/UI:** Manrope (se mantiene).
- **Acento manuscrito:** agregar **Caveat** 500 (`--font-accent-loaded`), sólo para
  "¡Te esperamos!" (siempre `rotate(-2deg)`, color atardecer).
- Actualizar las referencias literales a `'Cormorant Garamond'` en `globals.css` (overrides de
  react-day-picker) y en los estilos inline de las páginas (p. ej. `tarifas/page.tsx`) a la
  variable de display / Fraunces.
- Cargar la variable de Caveat en el `<body>`/layout junto a las otras dos.

### 3.4 Motion
Se conserva la mecánica genérica compatible con el handoff: `KenBurns`, `Reveal`,
`RevealTitle`, `Parallax`, `LenisProvider`, `HeroReveal`, `HeroScrollFade`, `ScrollCue`.
**Se elimina** el motivo "selva": `SelvaTrail`, `SelvaFigure`, `SelvaVine` (y su uso en
`page.tsx`) — el handoff es un diseño editorial limpio sin esa línea animada. Los archivos de
esos componentes se borran.

## 4. Componentes compartidos

### 4.1 SiteNav (`components/layout/SiteNav.tsx`)
Reescritura a la spec del handoff:
- **Wordmark tipográfico** centrado: "La Casa del Lago" (Fraunces 500 ~21px) + "URUGUA-Í"
  (10px, tracking .38em, uppercase). Reemplaza el logo-imagen de Aruma (Cloudinary). El
  emblema circular queda pendiente hasta tener el logo oficial.
- **Dos estados** (sólo en Home): inicial `scrollY ≤ 60` transparente, links/wordmark marfil;
  scrolled `> 60` fondo `rgba(245,238,225,.92)` + blur(14px), borde `#D8CFBF`, links carbón,
  wordmark lago. Transición `.35s`. El resto de páginas usa siempre el estado sólido.
- Izquierda: links 13px tracking .04em, hover atardecer. Secciones nuevas:
  `#casa · #cabanas · #lugar · #galeria · #contacto`.
- Derecha: selector ES/EN/PT (`LangSwitcher`, activo en lago) + botón **Reservar** terracota.
- Conservar: drawer mobile, bloqueo de scroll, plumbing i18n, `useSectionSpy` (actualizar los
  ids de sección espiados).

### 4.2 SiteFooter (`components/layout/SiteFooter.tsx`)
Footer lago oscuro `#0E4A5E`, padding 90/36px, grid `1.5fr/1fr/1fr/1fr`: marca + descripción
`#A9CBD5`; columnas Explorar / Contacto / Idioma (labels `#7FC9D6`, links `#C7DDE3` hover
marfil). Barra legal 12px: "© 2026 La Casa del Lago Urugua-í" / "Hecho junto al agua".
Variante compacta de una fila para Tarifas/Detalle/Checkout.

### 4.3 SearchWidget (`components/home/SearchWidget.tsx`)
Mantener la lógica (fechas, stepper huéspedes 1–8, submit a Tarifas). Dos variantes visuales:
- `variant="hero"`: barra glass inmersa en el hero (`rgba(16,30,36,.42)` + blur, borde
  `rgba(245,238,225,.28)`, radius 10px), labels marfil, date inputs Fraunces `color-scheme: dark`.
- `variant="bar"`: buscador claro (fondo blanco, borde `#D8CFBF`, labels lago, sombra
  `0 30px 60px -46px …`) para la cabecera de Tarifas.

### 4.4 WhatsAppFab
Reestilizar al nuevo sistema (verde `#2BB673`, sombra), sin cambiar el `waLink`.

## 5. Página 1 — Home

Orden de secciones en `app/[locale]/page.tsx` (se quita `<SelvaTrail/>`):
`Hero → SearchWidget(hero) → Manifiesto(#casa) → UnitsGrid(#cabanas) → Experiencias(#lugar) →
Galería(#galeria) → CtaReserva(#reservar) → Contacto(#contacto) → SiteFooter`.

- **Hero** (`Hero.tsx`): 100svh (min 640px), Ken Burns, overlay radial dorado + scrim vertical,
  kicker "PUERTO LIBERTAD · MISIONES", H1 "A orillas del lago Urugua-í" (Fraunces clamp
  44–104px), subtítulo Fraunces italic.
- **Manifiesto** (`Manifiesto.tsx`) `#casa`: fondo marfil, kicker turquesa "LA CASA", grid
  1.35/1 gap 64px, H2 + párrafo + link "Conocé el lugar →".
- **Cabañas** (`UnitsGrid.tsx`) `#cabanas`: fondo arena, header con "Ver tarifas →", grid 3
  columnas; card imagen 420px, hover translateY(-8px), nombre Fraunces + "Desde $—" atardecer +
  specs. Cards → `/departamentos/{slug}`. Consume `UNITS` (ya con nombres nuevos).
- **El lugar** (`Experiencias.tsx`) `#lugar`: fondo selva, texto arena, grid 1.15/1, imagen
  560px + lista de 4 experiencias (01 El agua / 02 Atardeceres / 03 Fuego y asado / 04 Selva
  misionera) con separadores y hover.
- **Galería** (`#galeria`): sección bento (grid 4 col, auto-rows 205px, patrón 2×2/1×2/1×1/2×1),
  número overlay. Reutilizar/renombrar `RelatoImagenes`/`GalleryLightbox` para materializar esta
  sección con anchor `#galeria`; conservar el lightbox si aplica.
- **CTA Reserva** (`CtaReserva.tsx`) `#reservar`: fondo marfil, H2 clamp 34–76px, botón Reservar
  + botón WhatsApp outline, y frase Caveat "¡Te esperamos!" rotada.
- **Contacto** (`Contacto.tsx`) `#contacto`: fondo arena, grid 1/1.1; izquierda card WhatsApp
  (fondo selva) + "Dónde estamos" + "Directo" (iconos sociales); derecha mapa Google embed
  (filtro grayscale/sepia) con card overlay "Cómo llegar". Usa `waLink`, `CONTACT_*`.

Actualizar el JSON-LD `LodgingBusiness` sólo en textos derivados del copy nuevo (sin tocar los
TODO de geo/dirección/tel).

## 6. Página 2 — Tarifas (`app/[locale]/tarifas/page.tsx`)

- Nav sólido fijo ("Tarifas" activo). Header padding-top ~170px: kicker "TARIFAS", H1
  "Elegí tus fechas, mirá el lago." + subtítulo.
- `SearchWidget variant="bar"` (buscador claro). Migrar los estilos inline del page (hoy
  `#F4EFE7`, `'Cormorant Garamond'`, `#1D1D1D`) a los tokens/Fraunces.
- **UnitRateCard** (`components/tarifas/UnitRateCard.tsx`): grid `300px 1fr auto`, blanco, borde
  `#D8CFBF`, radius 6px, hover translateY(-4px)+sombra. Centro: nombre Fraunces (hover lago),
  specs, chips pill lago. Derecha: sin fechas → precio + pill "Elegí fechas" deshabilitada; con
  fechas → total Fraunces + "{n} noches · $X/noche" + botón Reservar. Mantener `pricePerNight`,
  `buildCheckoutUrl`, `parseRateQuery`, `getRatesForRange`.
- **InfoSections** (`components/tarifas/InfoSections.tsx`): fondo arena, 3 columnas Estadía /
  Pago / Cancelación con el copy del handoff. Mantiene `lib/site.ts` (CHECK_IN/OUT, etc.).
- Footer compacto.

## 7. Página 3 — Detalle de cabaña (`components/departamento/UnitDetail.tsx`)

Modelo `Cabaña Timbó.dc.html`, replicado para las 3 vía datos por slug:
- Breadcrumb "Cabañas / {nombre}" (turquesa/muted). H1 Fraunces clamp 42–76px + specs a la
  derecha ("6 huéspedes · 2 dormitorios · 65 m²").
- **Galería asimétrica**: grid 4 col auto-rows 210px (hero 2×2, wide 2×1, 1×1×3, banda 3×1).
  Reusar `UNIT_GALLERY` por slug.
- Contenido grid 1.5/1: izquierda kicker "EL ESPACIO", lead Fraunces, párrafo
  (`spaceBody.{slug}`), **Características** (grid 2 col sobre fondo borde) y **Servicios** (grid
  2 col, bullet terracota) — reusar `useFeatValues`/`UNIT_EXTRAS`.
- Derecha: **StickyBookingCard** (`components/departamento/StickyBookingCard.tsx`) — precio,
  fechas grid 2 col, stepper 1–capacidad, desglose + total Fraunces, botón Reservar full-width,
  nota "No pagás nada todavía. Confirmamos por WhatsApp." Mantener la lógica de cálculo y el link
  `/reservas?unit={slug}`.
- **Otras cabañas**: fondo arena, 2 cards (`UNITS.filter(...)`).
- Footer compacto.

## 8. Página 4 — Checkout (`components/reservas/*`)

`Reservas.dc.html`. El page redirige a Tarifas si `isWhatsAppBookingMode()` — se conserva esa
lógica; el rediseño aplica al modo online.
- Nav sólido sin botón Reservar. Kicker "RESERVÁ" + H1 "Falta poco para el lago."
- Grid 1.35/1: **form** (`StepDatos`/`ReservaFlow`) labels 11px uppercase, inputs blanco borde
  `#D8CFBF` focus lago; campos Nombre/Email/WhatsApp/País + Notas; botón "Confirmar pedido de
  reserva" terracota full-width; nota de seña por WhatsApp.
- **Resumen sticky** (`OrderSummary.tsx`): card blanca, foto 190px, nombre Fraunces + ubicación,
  fechas + stepper editables, desglose "$… × n noches" + "Limpieza final: Incluida", Total
  Fraunces, "Seña del 30%: $X" en atardecer.
- **Estado de éxito** (`Confirmacion.tsx`): "¡Te esperamos!" Caveat 34px rotado, "Recibimos tu
  pedido de reserva." + botón outline "Volver al inicio".
- Mantener todo el reducer/estado (`reducer.ts`, `Stepper`, `StepPago`, `StepTransferencia`,
  `ReservaEstado`, validación) — sólo cambia el estilo/markup presentacional.

## 9. Contenido e i18n

Los namespaces ya existen y mapean 1:1 con las secciones (`nav`, `hero`, `bookingBar`,
`searchWidget`, `tarifas`, `manifiesto`, `units`, `experiencias`, `galeria`, `cta`, `contacto`,
`footer`, `departamento`, `reservas`, `miReserva`). Trabajo:
- Adoptar el **copy ES del handoff** como fuente de verdad en `messages/es.json`.
- Propagar traducción fiel a `messages/en.json` y `messages/pt.json`.
- Actualizar `units` y `departamento.spaceBody.*` a Timbó/Lapacho/Guatambú (con las claves
  renombradas a los nuevos slugs).
- Labels nuevos del nav ("Cabañas", "El lugar", "Galería", "Contacto", "Reservar").

## 10. Riesgos y mitigaciones

- **Rename de slug incompleto** → 404 o claves i18n faltantes. Mitigación: rename mecánico con
  búsqueda global de `yvyra|mberu|tatu`, más `pnpm test` y navegación de las 3 URLs.
- **Estilos inline con hex/fuente viejos** dispersos en pages → glitches de marca. Mitigación:
  grep de `Cormorant`, `#1D1D1D`, `#F4EFE7`, `#a04b2a` y migrarlos a tokens.
- **Fotos placeholder** con encuadres del handoff distintos a los actuales → aceptable; se
  documentan los slots para reemplazo real posterior.

## 11. No-objetivos
- No se cargan datos reales (contacto, dirección, banco, geo) — siguen como TODO.
- No se sube el logo oficial ni fotografía real.
- No se toca Tarifas/Detalle/Checkout a nivel lógico.
- No se agregan features nuevas ni se refactoriza código no relacionado.

## 12. Verificación
```
pnpm install
pnpm test        # vitest: prefijo CDL-, slugs nuevos en fixtures si aplica
pnpm dev         # http://localhost:3000 — recorrer Home, Tarifas, Detalle, Checkout en es/en/pt
```
Chequear: paleta (color firma lago presente), Fraunces cargada, nav transparente→sólido en
Home, sólido en el resto, las 3 URLs de detalle responden, buscador → Tarifas, checkout online
render OK (y redirección WhatsApp si el modo está activo), `prefers-reduced-motion` sin animación.
