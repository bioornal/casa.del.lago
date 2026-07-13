# Reskin del front al handoff — La Casa del Lago Urugua-í — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Converger la capa de presentación del sitio a la identidad visual del handoff (color firma `lago`, tipografías Fraunces + Caveat, copy y layouts finales) en las 4 páginas públicas, sin tocar la funcionalidad.

**Architecture:** El sitio ya comparte el ADN de Aruma con el handoff, así que los layouts (grids, bento, sticky booking, rate card) ya existen. El trabajo es un **retheme**: (1) fundaciones que se propagan por tokens de Tailwind (fuentes + paleta), (2) aplicación del color firma y limpieza de literales viejos, (3) quitar el motivo "selva", (4) rename de slugs de unidad, (5) alinear copy i18n, (6) pases de fidelidad por página. Cada tarea deja un entregable verificable en el navegador.

**Tech Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 (`@theme` en `globals.css`) · next-intl (es/en/pt) · `next/font/google` · react-day-picker v10 · GSAP + Lenis · Vitest.

## Global Constraints

- **No modificar funcionalidad**: reservas, disponibilidad, precios, pagos, emails, reducer, validación, API routes y el reducer de `ReservaFlow` quedan intactos en su lógica; sólo cambia markup/estilo/copy y los **nombres** de claves (slugs, env del calendario).
- **Paleta cerrada del handoff** (hex exactos, verbatim): lago `#155E75`, lago-hover `#0E4A5E`, turquesa `#1FA2B8`, selva `#2F4A34`, terracota `#A24B2A`, terracota-hover `#85391F`, atardecer `#E08A2C`, brasa `#C4471F`, marfil `#F5EEE1`, arena `#EAE0CE`, carbón `#1F1D19`, cuerpo `#4A463F`, muted `#6B665D`, borde `#D8CFBF`.
- **Tipografía**: Fraunces (display), Manrope (cuerpo/UI), Caveat 500 (acento, siempre `rotate(-2deg)` en atardecer).
- **Slugs finales**: `timbo` (Cabaña Timbó · 6 huésp · 2 dorm · $130.000), `lapacho` (Cabaña Lapacho · 4 · 1 · $95.000), `guatambu` (Cabaña Guatambú · 5 · 2 · $110.000).
- **Anclas de sección**: `#casa`, `#cabanas`, `#lugar`, `#galeria`, `#contacto`, `#reservar`.
- **Fuente visual de verdad**: los `.dc.html` del handoff (`design_handoff_casa_del_lago/`). Ante duda de un valor, se abren en el navegador y se copia el estilo computado.
- **Fotos**: siguen placeholders; no se cambia `ImageSlot` ni el bucket.
- Después de cada tarea con impacto visual: `pnpm dev` + verificación en navegador (Home/Tarifas/Detalle/Checkout en es/en/pt según aplique). `prefers-reduced-motion` no debe romper contenido.

---

### Task 1: Fuentes — Fraunces + Caveat

**Files:**
- Modify: `lib/fonts.ts`
- Modify: `app/[locale]/layout.tsx:4,25`
- Modify: `app/globals.css:21-22` (vars de `@theme`) y `:69-74,134` (font del date-picker)

**Interfaces:**
- Produces: `export const display` (Fraunces, var `--font-display-loaded`), `export const sans` (Manrope), `export const accent` (Caveat, var `--font-accent-loaded`). Token CSS `--font-display` (Fraunces) y nuevo `--font-accent` (Caveat).

- [ ] **Step 1: Reemplazar `lib/fonts.ts`**

```ts
import { Fraunces, Manrope, Caveat } from "next/font/google";

export const display = Fraunces({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display-loaded",
  display: "swap",
});

export const sans = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans-loaded",
  display: "swap",
});

export const accent = Caveat({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-accent-loaded",
  display: "swap",
});
```

- [ ] **Step 2: Cargar la variable de Caveat en el layout**

En `app/[locale]/layout.tsx`, cambiar el import y la clase de `<html>`:

```tsx
import { display, sans, accent } from "@/lib/fonts";
// ...
<html lang={locale} className={`${display.variable} ${sans.variable} ${accent.variable}`} suppressHydrationWarning>
```

- [ ] **Step 3: Actualizar los tokens de fuente en `globals.css`**

Reemplazar las dos líneas de fuente dentro de `@theme`:

```css
  --font-display: var(--font-display-loaded), "Fraunces", serif;
  --font-sans: var(--font-sans-loaded), "Manrope", system-ui, sans-serif;
  --font-accent: var(--font-accent-loaded), "Caveat", cursive;
```

Y en el override del date-picker cambiar el literal:

```css
.rdp-caption_label {
  font-family: var(--font-display), serif !important;
```

(la regla `.rdp-root` que referencia `var(--font-sans)` queda igual).

- [ ] **Step 4: Verificar en el navegador**

Arrancar el dev server (preview_start con el name de `.claude/launch.json`) y abrir `/es`. Confirmar con `javascript_tool`:
```js
getComputedStyle(document.querySelector('h1')).fontFamily
```
Expected: incluye `Fraunces` (no `Cormorant`). El H1 del hero se ve con la nueva serif.

- [ ] **Step 5: Commit**

```bash
git add lib/fonts.ts app/[locale]/layout.tsx app/globals.css
git commit -m "feat(theme): Fraunces (display) + Caveat (acento) reemplazan Cormorant"
```

---

### Task 2: Design tokens — paleta completa del handoff

**Files:**
- Modify: `app/globals.css:3-31` (bloque `@theme`), `:40` (keyframe Ken Burns)

**Interfaces:**
- Produces: clases Tailwind nuevas `bg-lago text-lago border-lago`, `text-turquesa`, `text-atardecer bg-atardecer`, `text-brasa`, más `lago-hover`. Hex corregidos en los tokens existentes (`terracota`, `marfil`, `arena`, `selva`, `carbon`, `cuerpo`, `muted`, `borde-medio`).

- [ ] **Step 1: Reemplazar el bloque `@theme`** (mantener nombres existentes usados como clase; agregar los nuevos)

```css
@theme {
  /* Paleta cerrada del handoff */
  --color-lago: #155e75;          /* color firma */
  --color-lago-hover: #0e4a5e;
  --color-turquesa: #1fa2b8;
  --color-selva: #2f4a34;
  --color-terracota: #a24b2a;
  --color-terracota-hover: #85391f;
  --color-atardecer: #e08a2c;
  --color-brasa: #c4471f;
  --color-carbon: #1f1d19;
  --color-marfil: #f5eee1;
  --color-arena: #eae0ce;
  --color-arena-clara: #f1ece3;
  --color-bronce: #9a7b4f;
  --color-whatsapp: #2bb673;
  --color-cuerpo: #4a463f;
  --color-muted: #6b665d;
  --color-placeholder: #a89f8e;
  --color-borde-claro: #e2dace;
  --color-borde-medio: #d8cfbf;
  --color-slot: #e4dcce;

  --font-display: var(--font-display-loaded), "Fraunces", serif;
  --font-sans: var(--font-sans-loaded), "Manrope", system-ui, sans-serif;
  --font-accent: var(--font-accent-loaded), "Caveat", cursive;

  --radius-boton: 2px;
  --radius-input: 4px;
  --radius-card: 8px;
  --radius-barra: 10px;

  --shadow-booking: 0 40px 80px -50px rgba(21, 45, 55, 0.55);
  --shadow-card: 0 30px 60px -46px rgba(21, 45, 55, 0.5);
  --shadow-fab: 0 18px 36px -16px rgba(21, 45, 55, 0.55);
}
```

> Nota: las líneas de `--font-*` ya se pusieron en la Task 1; si se ejecuta esta task después, dejarlas como arriba (idempotente).

- [ ] **Step 2: Ajustar el keyframe del Ken Burns** (handoff: `scale(1.09)→scale(1.01)`)

```css
@keyframes lago-kb { from { transform: scale(1.09); } to { transform: scale(1.01); } }
```

- [ ] **Step 3: Verificar el color firma en el navegador**

Recargar `/es`. Con `javascript_tool`:
```js
getComputedStyle(document.documentElement).getPropertyValue('--color-lago')
```
Expected: ` #155e75`. Además, `body` background = marfil `#f5eee1` (más cálido que el `#f8f5f0` anterior).

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "feat(theme): paleta completa del handoff con color firma lago"
```

---

### Task 3: Color firma en UI compartida — Kicker (turquesa) + LangSwitcher (lago)

**Files:**
- Modify: `components/ui/Kicker.tsx`
- Modify: `components/ui/LangSwitcher.tsx:11-12,20`

**Interfaces:**
- Consumes: tokens `turquesa`, `lago` (Task 2).
- Produces: `<Kicker>` en turquesa; item activo del `LangSwitcher` en lago.

- [ ] **Step 1: Kicker → turquesa** (kickers de sección del handoff)

```tsx
export function Kicker({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`text-[12px] uppercase tracking-[0.26em] text-turquesa ${className}`}>
      {children}
    </span>
  );
}
```

- [ ] **Step 2: LangSwitcher — activo en lago**

En `LangSwitcher.tsx`, cambiar el `className` del botón para que el locale activo use lago 600 en vez de opacidad plena:

```tsx
            className={`cursor-pointer uppercase transition-[opacity,color] duration-200 ${
              l === locale
                ? "text-lago font-semibold opacity-100"
                : `${text} opacity-45 hover:opacity-100`
            }`}
```

(dejar `text`/`sep` como están para el estado inactivo y separadores).

- [ ] **Step 3: Verificar**

Recargar `/es`. Los kickers de sección ("LA CASA", "LAS CABAÑAS", etc.) se ven en turquesa; en el nav/footer el idioma activo (`ES`) se ve en lago.

- [ ] **Step 4: Commit**

```bash
git add components/ui/Kicker.tsx components/ui/LangSwitcher.tsx
git commit -m "feat(theme): kickers en turquesa y selector de idioma activo en lago"
```

---

### Task 4: Quitar el motivo "selva"

**Files:**
- Modify: `app/[locale]/page.tsx:3,96` (import + `<SelvaTrail/>`)
- Modify: `components/home/Manifiesto.tsx`, `components/home/UnitsGrid.tsx`, `components/home/Experiencias.tsx`, `components/home/CtaReserva.tsx`, `components/home/RelatoImagenes.tsx` (imports + usos de `<SelvaFigure .../>`)
- Delete: `components/motion/SelvaFigure.tsx`, `components/motion/SelvaTrail.tsx`

**Interfaces:**
- Produces: Home sin figuras ni línea selva; secciones limpias (editorial), como el handoff.

- [ ] **Step 1: Sacar `SelvaTrail` del Home**

En `app/[locale]/page.tsx`: borrar la línea `import { SelvaTrail } from "@/components/motion/SelvaTrail";` y la línea `<SelvaTrail />` dentro de `<main>`.

- [ ] **Step 2: Sacar cada `<SelvaFigure .../>` y su import** en los 5 componentes de `components/home/`:
  - `Manifiesto.tsx`: quitar el import de `SelvaFigure` y la línea `<SelvaFigure kind="mariposa" ... />`.
  - `UnitsGrid.tsx`: quitar el import y `<SelvaFigure kind="hoja" ... />`.
  - `Experiencias.tsx`: quitar el import y `<SelvaFigure kind="mariposa" ... />`.
  - `CtaReserva.tsx`: quitar el import y `<SelvaFigure kind="mariposa" ... />`.
  - `RelatoImagenes.tsx`: quitar el import y `<SelvaFigure kind="tucan" ... />`.

  Las secciones mantienen `className="relative ..."` y el `<div className="relative z-[1] ...">` interno (no rompe layout).

- [ ] **Step 3: Borrar los archivos huérfanos**

```bash
git rm components/motion/SelvaFigure.tsx components/motion/SelvaTrail.tsx
```

- [ ] **Step 4: Verificar compilación y navegador**

`pnpm dev`; abrir `/es`. Expected: sin errores de import, el Home renderiza sin mariposas/hojas/tucán ni la línea conectora. Revisar `read_console_messages` sin errores.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(home): quitar motivo selva (fidelidad editorial al handoff)"
```

---

### Task 5: Renombrar anclas de sección al handoff

**Files:**
- Modify: `components/home/Manifiesto.tsx` (`id="marca"` → `id="casa"`; el link interno `href="#marca"`)
- Modify: `components/home/UnitsGrid.tsx` (`id="departamentos"` → `id="cabanas"`; anchors `href="#departamentos"`)
- Modify: `components/home/Experiencias.tsx` (`id="experiencias"` → `id="lugar"`)
- Modify: `components/layout/SiteFooter.tsx:47,51,57` (anchors `#departamentos`/`#experiencias` → `#cabanas`/`#lugar`)
- Modify: `lib/hooks/useSectionSpy.ts` (lista de ids observados)

**Interfaces:**
- Consumes: nada nuevo.
- Produces: ids de sección `casa/cabanas/lugar/galeria/contacto/reservar` consistentes en anchors y en el section-spy. `galeria`, `contacto`, `reservar` ya son correctos.

- [ ] **Step 1: Leer `lib/hooks/useSectionSpy.ts`** para ver cómo enumera los ids (array literal o query del DOM) y actualizar la lista a `["casa","cabanas","lugar","galeria","contacto"]` respetando su forma actual.

- [ ] **Step 2: Cambiar los `id=` y `href="#..."`** en Manifiesto (casa), UnitsGrid (cabanas), Experiencias (lugar), y los anchors del footer, según la lista de Files. Buscar cualquier resto con:

```bash
grep -rn "#marca\|#departamentos\|#experiencias\|id=\"marca\"\|id=\"departamentos\"\|id=\"experiencias\"" components/ app/
```
Expected tras los cambios: sin resultados (salvo `#galeria`/`#contacto`/`#reservar`, que no se tocan).

- [ ] **Step 3: Verificar navegación por anclas**

`pnpm dev`; en `/es` hacer click en los links del nav y confirmar scroll suave a cada sección; el section-spy resalta el link activo correcto al scrollear.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(home): anclas de seccion casa/cabanas/lugar del handoff"
```

---

### Task 6: SiteNav — wordmark + estado transparente→sólido con lago

**Files:**
- Modify: `components/layout/SiteNav.tsx`

**Interfaces:**
- Consumes: tokens `lago`, `marfil`, `terracota`, `atardecer` (Task 2); `useSectionSpy` con ids nuevos (Task 5); `LangSwitcher`.
- Produces: nav con wordmark tipográfico y dos estados de color; secciones `casa/cabanas/lugar/galeria/contacto`.

- [ ] **Step 1: Reemplazar el logo-imagen por el wordmark** (centro del nav). En el bloque CENTER, sustituir el `<img src={LOGO_URL} .../>` (en las dos ramas `isHome`/else) por:

```tsx
<span className="flex flex-col items-center leading-none">
  <span className="font-display font-medium text-[19px] md:text-[21px] tracking-[0.01em]"
        style={{ color: solid || !isHome ? "#155e75" : "#f5eee1" }}>
    La Casa del Lago
  </span>
  <span className="text-[9px] md:text-[10px] uppercase mt-1"
        style={{ letterSpacing: "0.38em", color: solid || !isHome ? "#6b665d" : "rgba(245,238,225,.72)" }}>
    Urugua-í
  </span>
</span>
```

Quitar la constante `LOGO_URL` y su comentario (ya no se usa).

- [ ] **Step 2: Dos estados de color del nav** (sólo Home; el resto siempre sólido). Reemplazar las clases del `<nav>` y de los links para que el estado inicial sea transparente con texto marfil y el scrolled sea marfil translúcido con texto carbón/lago. Usar `const dark = isHome && !solid && !open;`:
  - Fondo `<nav>`: `dark` → `bg-transparent border-transparent`; si no → `bg-[rgba(245,238,225,.92)] backdrop-blur-[14px] border-b border-borde-medio`.
  - `linkClass`: en estado `dark`, links en `text-marfil/90 hover:text-atardecer`; en sólido, `text-carbon opacity-[.82] hover:text-atardecer` (activo en `text-lago`). Pasar `dark` como parámetro a `linkClass`.
  - Umbral de scroll: subir a `window.scrollY > 60` (handoff) en el `onScroll`.
  - Botón Reservar: mantener terracota (ya cumple) con hover `terracota-hover` + `-translate-y-px`.

- [ ] **Step 3: Verificar los dos estados**

`pnpm dev`; en `/es` arriba de todo el nav es transparente con wordmark marfil sobre el hero; al scrollear >60px pasa a fondo marfil translúcido con wordmark lago y links carbón. En `/es/tarifas` el nav arranca sólido. Chequear en `resize_window` mobile que el drawer sigue funcionando.

- [ ] **Step 4: Commit**

```bash
git add components/layout/SiteNav.tsx
git commit -m "feat(nav): wordmark tipografico y estado transparente->solido con lago"
```

---

### Task 7: Rename de slugs de unidad → timbo / lapacho / guatambu

**Files:**
- Modify: `lib/units.ts`
- Modify: `lib/reservation/availability.server.ts:9-11`, `lib/reservation/calendar.server.ts:7-9`
- Modify: `components/departamento/UnitDetail.tsx` (mapas por slug: `UNIT_EXTRAS`, `UNIT_GALLERY`, `useFeatValues`)
- Modify: `messages/es.json`, `messages/en.json`, `messages/pt.json` (claves `units.<slug>`, `departamento.spaceBody.<slug>` y cualquier otra keyed por slug)
- Test: `tests/` (fixtures/pruebas que referencien los slugs viejos)

**Interfaces:**
- Consumes: nada nuevo.
- Produces: `type UnitSlug = "timbo" | "lapacho" | "guatambu"`; `UNITS` con nombres/specs/precios del handoff; `pricePerNight(slug, guests)` con los slugs nuevos; env del calendario `CDL_ICS_TIMBO`/`CDL_CAL_TIMBO`/etc.

- [ ] **Step 1: Reescribir `lib/units.ts`**

```ts
export type UnitSlug = "timbo" | "lapacho" | "guatambu";
export type Unit = {
  slug: UnitSlug;
  name: string;
  price: number;
  specs: { guests: number; bedrooms: number; baths: number; area: number };
};
export const UNITS: Unit[] = [
  { slug: "timbo",    name: "Cabaña Timbó",    price: 130000, specs: { guests: 6, bedrooms: 2, baths: 1, area: 65 } },
  { slug: "lapacho",  name: "Cabaña Lapacho",  price: 95000,  specs: { guests: 4, bedrooms: 1, baths: 1, area: 45 } },
  { slug: "guatambu", name: "Cabaña Guatambú", price: 110000, specs: { guests: 5, bedrooms: 2, baths: 1, area: 55 } },
];
export const CLEANING_FEE = 30000;
export const BASE_GUESTS = 2;
export const TIMBO_PRICE = 130000;
export const LAPACHO_PRICE = 95000;
export const GUATAMBU_PRICE = 110000;

/** Precio por noche según unidad (tarifa plana por unidad, sin importar huéspedes). */
export function pricePerNight(slug: UnitSlug, _guests: number): number {
  switch (slug) {
    case "timbo":    return TIMBO_PRICE;
    case "lapacho":  return LAPACHO_PRICE;
    case "guatambu": return GUATAMBU_PRICE;
  }
}
export function getUnit(slug: string): Unit | undefined {
  return UNITS.find((u) => u.slug === slug);
}
```

- [ ] **Step 2: Actualizar los mapas de env del calendario**

En `lib/reservation/availability.server.ts` (objeto de env ICS) y `lib/reservation/calendar.server.ts` (objeto de env CAL), reemplazar las claves:

```ts
// availability.server.ts
  timbo: "CDL_ICS_TIMBO",
  lapacho: "CDL_ICS_LAPACHO",
  guatambu: "CDL_ICS_GUATAMBU",
```
```ts
// calendar.server.ts
  timbo: "CDL_CAL_TIMBO",
  lapacho: "CDL_CAL_LAPACHO",
  guatambu: "CDL_CAL_GUATAMBU",
```
Verificar que el tipo del record siga siendo `Record<UnitSlug, string>` (si está tipado así, TypeScript obliga a cubrir los 3 nuevos).

- [ ] **Step 3: Renombrar claves keyed-by-slug en `UnitDetail.tsx`**

Buscar en `components/departamento/UnitDetail.tsx` los objetos `UNIT_EXTRAS`, `UNIT_GALLERY` y la función `useFeatValues` (que hacen `switch`/lookup por `"yvyra"|"mberu"|"tatu"`) y renombrar esas claves a `timbo/lapacho/guatambu`, manteniendo el contenido (fotos placeholder y features) por ahora.

- [ ] **Step 4: Renombrar claves i18n por slug** en `messages/es.json`, `en.json`, `pt.json`: `units.yvyra`→`units.timbo`, `units.mberu`→`units.lapacho`, `units.tatu`→`units.guatambu`, e igual para `departamento.spaceBody.<slug>`. (El contenido textual se ajusta en la Task 8; acá sólo se renombran las claves para que no queden huérfanas.)

- [ ] **Step 5: Barrido de restos**

```bash
grep -rn "yvyra\|mberu\|tatu\|YVYRA\|MBERU\|TATU\|Yvyrá\|Mberú\|Tatú" lib/ app/ components/ messages/ tests/
```
Expected: sin resultados. Resolver cualquiera que aparezca.

- [ ] **Step 6: Tests**

```bash
pnpm test
```
Expected: PASS. Si algún fixture usaba `yvyra/mberu/tatu`, actualizarlo a los slugs nuevos y volver a correr.

- [ ] **Step 7: Verificar las 3 URLs de detalle**

`pnpm dev`; abrir `/es/departamentos/timbo`, `/es/departamentos/lapacho`, `/es/departamentos/guatambu`. Expected: las 3 responden 200 y muestran el nombre correcto; ninguna 404. En `/es/tarifas` aparecen las 3 cabañas.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(units): renombrar slugs a timbo/lapacho/guatambu (contenido real)"
```

---

### Task 8: Copy i18n alineado al handoff (es/en/pt)

**Files:**
- Modify: `messages/es.json` (fuente de verdad), `messages/en.json`, `messages/pt.json`

**Interfaces:**
- Consumes: claves ya renombradas (Task 7).
- Produces: textos visibles = copy del handoff en ES, con traducción fiel a EN/PT.

- [ ] **Step 1: Actualizar `messages/es.json`** con el copy del handoff (verbatim del `README.md` del handoff / `.dc.html`). Namespaces a tocar:
  - `nav`: labels "Casa"/"Cabañas"/"El lugar"/"Galería"/"Contacto" y botón "Reservar".
  - `hero`: kicker "PUERTO LIBERTAD · MISIONES", title "A orillas del lago Urugua-í", subtitle "Cabañas de madera y ladrillo, pileta frente al lago y fuego para el asado."
  - `manifiesto`: kicker "LA CASA", title "El día termina mirando el atardecer sobre el agua.", body + link "Conocé el lugar →".
  - `units`: `sectionKicker`, `sectionTitle` "Cada cabaña, una forma de mirar el lago.", `viewAll`, `fromPrice` "Desde $—", y por cabaña `{name, sub}` (specs del handoff).
  - `experiencias`: kicker, title "El lago, sin apuro.", body, y los 4 items → **El agua / Atardeceres / Fuego y asado / Selva misionera** con sus descripciones (reemplazan nature/gastronomy/frontier/activities manteniendo esas keys).
  - `galeria`: kicker, title, `viewFull`, y los epígrafes `relato.frames.*`.
  - `cta`: kicker "RESERVÁ", title "Tu lugar junto al agua te espera.", body, `bookNow` "Reservar ahora", `whatsapp`.
  - `contacto`: kicker, title, textos de WhatsApp/Dónde/Directo/`mapCta` "Cómo llegar".
  - `footer`: `tagline`, títulos de columna, `copyright` "© 2026 La Casa del Lago Urugua-í", `credit` "Hecho junto al agua".
  - `tarifas`: `title`/`subtitle`/`pickDatesTitle`/`pickDatesHint` + condiciones (Estadía/Pago/Cancelación) del handoff.
  - `departamento`: leads/`spaceBody.<slug>` + labels de características/servicios.
  - `reservas`: kicker "RESERVÁ", title "Falta poco para el lago.", labels del form, notas, y estado de éxito ("Recibimos tu pedido de reserva.").

- [ ] **Step 2: Propagar a `en.json` y `pt.json`** con traducción fiel (mismas keys, contenido traducido). Mantener nombres propios de cabañas sin traducir (Timbó/Lapacho/Guatambú).

- [ ] **Step 3: Validar JSON y paridad de claves**

```bash
node -e "['es','en','pt'].forEach(l=>{const o=require('./messages/'+l+'.json');console.log(l,'ok')})"
```
Expected: `es ok / en ok / pt ok` (sin SyntaxError). Revisar que las tres tengan el mismo set de claves de nivel superior.

- [ ] **Step 4: Verificar en los 3 idiomas**

`pnpm dev`; recorrer `/es`, `/en`, `/pt`: Home muestra los títulos/kicker del handoff; las 4 experiencias son El agua/Atardeceres/Fuego y asado/Selva misionera; el footer dice "Hecho junto al agua". Sin claves crudas visibles (p. ej. `experiencias.title`).

- [ ] **Step 5: Commit**

```bash
git add messages/
git commit -m "feat(i18n): copy del handoff en es/en/pt"
```

---

### Task 9: SearchWidget — retheme (Fraunces + acentos lago/terracota)

**Files:**
- Modify: `components/home/SearchWidget.tsx`

**Interfaces:**
- Consumes: tokens y fuentes nuevas.
- Produces: buscador con valores en Fraunces, labels lago (variante bar) / marfil (variante hero), CTA terracota, rango de huéspedes 1–8.

- [ ] **Step 1: Fuente de los valores** — reemplazar los dos literales `fontFamily: "'Cormorant Garamond', serif"` (en `valueStyle` y en el `<span>` de huéspedes) por `fontFamily: "var(--font-display)"`.

- [ ] **Step 2: Color de labels según variante** — `label.color` hoy es `#9A7B4F` (bronce). Cambiar a lago para la variante clara del handoff: en el objeto `label`, usar `color: "#155e75"` cuando `variant === "bar"` y `color: "rgba(245,238,225,.75)"` cuando `variant === "hero"`. (Derivar de `variant`.)

- [ ] **Step 3: CTA terracota** — en el botón submit, cambiar el fondo válido de `#1D1D1D`/hover `#A04B2A` a terracota directo: `background: valid ? "#a24b2a" : "#bdb4a4"`, y en `onMouseEnter`/`onMouseLeave` alternar `#85391f`/`#a24b2a`. Texto marfil `#f5eee1`.

- [ ] **Step 4: Rango de huéspedes 1–8** (handoff) — en el botón `+`, cambiar `Math.min(6, g + 1)` por `Math.min(8, g + 1)`.

- [ ] **Step 5: Variante hero glass** (opcional de fidelidad) — para `variant === "hero"`, el contenedor puede usar fondo glass oscuro (`rgba(16,30,36,.42)` + `backdrop-blur`) con borde `rgba(245,238,225,.28)` en vez de `bg-marfil`, para que se inmersa en el hero como el handoff. Aplicar sólo si el resultado en navegador mejora la fidelidad; si no, dejar la barra clara.

- [ ] **Step 6: Verificar**

`pnpm dev`; en `/es` el buscador del hero muestra fechas/huéspedes en Fraunces y CTA terracota; el `+` llega hasta 8. En `/es/tarifas` los labels del buscador claro se ven en lago.

- [ ] **Step 7: Commit**

```bash
git add components/home/SearchWidget.tsx
git commit -m "feat(search): retheme del buscador (Fraunces, labels lago, CTA terracota, 1-8)"
```

---

### Task 10: Home — pase de fidelidad de Hero y secciones

**Files:**
- Modify: `components/home/Hero.tsx` (overlays/kicker/subtítulo)
- Modify: `components/home/Experiencias.tsx`, `components/home/Manifiesto.tsx`, `components/home/CtaReserva.tsx` (nits de color a tokens donde aplique)

**Interfaces:**
- Consumes: tokens/fuentes/copy nuevos.
- Produces: Home visualmente fiel al `La Casa del Lago.dc.html`.

- [ ] **Step 1: Hero overlays** — ajustar los gradientes al handoff: glow radial dorado `radial-gradient(120% 80% at 76% 10%, rgba(224,138,44,.30), transparent 48%)` y scrim vertical `linear-gradient(180deg, rgba(13,26,31,.49) 0%, rgba(13,26,31,.05) 34%, rgba(13,26,31,.18) 60%, rgba(13,26,31,.65) 100%)`. Kicker y subtítulo en arena `#eae0ce` (ya están en `#E8E1D5`; alinear a arena). H1 ya usa `font-display` + `text-marfil` (correcto con Fraunces).

- [ ] **Step 2: Manifiesto link** — el `border-b` del link "Conocé el lugar →" usa `#d8b9a8`; alinearlo al handoff (`border-[#b8d2da]`, hover lago) y el color del link a `text-lago`.

- [ ] **Step 3: Experiencias** — los separadores/hover ya usan verdes selva; confirmar contra el handoff (`#3E5A44` separadores, hover `#2A4230`) y ajustar si hace falta. El número a la derecha en `#8FA391`.

- [ ] **Step 4: CtaReserva — frase Caveat** — agregar debajo de los botones la frase manuscrita del handoff:

```tsx
<p className="font-accent text-atardecer text-[27px] mt-8 inline-block" style={{ transform: "rotate(-2deg)" }}>
  {t("handwritten")}
</p>
```
(con la key `cta.handwritten` = "¡Te esperamos!" agregada en la Task 8, o agregarla aquí a los 3 json). `font-accent` debe existir como utilidad de Tailwind por el token `--font-accent`; si no resuelve, usar `style={{ fontFamily: "var(--font-accent)" }}`.

- [ ] **Step 5: Verificar contra el handoff**

Abrir `La Casa del Lago.dc.html` en el navegador (preview_start con esa URL de archivo o comparación visual) y `/es` lado a lado. Confirmar hero, manifiesto, cabañas, el lugar, galería, CTA (con "¡Te esperamos!" en Caveat rotada), contacto y footer. Screenshot para el usuario.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(home): pase de fidelidad al handoff (hero, links lago, frase Caveat)"
```

---

### Task 11: Tarifas — retheme de página y cards

**Files:**
- Modify: `app/[locale]/tarifas/page.tsx:46,51` (fondo + estilos inline del header)
- Modify: `components/tarifas/UnitRateCard.tsx`
- Modify: `components/tarifas/InfoSections.tsx`

**Interfaces:**
- Consumes: tokens/fuentes/copy; `pricePerNight`, `buildCheckoutUrl`, `parseRateQuery`, `getRatesForRange` (sin cambios de lógica).
- Produces: Tarifas fiel a `Tarifas.dc.html`.

- [ ] **Step 1: Page header** — en `tarifas/page.tsx` reemplazar el fondo inline `#F4EFE7` por marfil (`background: "#f5eee1"`), y en el `<h1>` el `fontFamily: "'Cormorant Garamond', serif"` por `var(--font-display)` y el color `#1D1D1D` por carbón `#1f1d19`. Subir el `paddingTop` del header a ~170px como el handoff.

- [ ] **Step 2: UnitRateCard** — reemplazar literales `'Cormorant Garamond'` por `var(--font-display)`; nombre con hover lago; chips pill del handoff (11px uppercase, texto lago, fondo `#EAF2F4`, borde `#CFE2E7`, radius 999px); botón Reservar terracota (radius 3px); precio sin fechas en muted, pill deshabilitada "Elegí fechas". Card blanca, borde `#d8cfbf`, radius 6px, hover `translateY(-4px)` + `--shadow-card`.

- [ ] **Step 3: InfoSections** — fondo arena, 3 columnas (Estadía / Pago / Cancelación) con el copy del handoff (ya en i18n por Task 8); labels de columna en lago, cuerpo en `cuerpo`. Reemplazar cualquier `'Cormorant Garamond'`→`var(--font-display)`.

- [ ] **Step 4: Verificar**

`pnpm dev`; `/es/tarifas` sin fechas → cards con "Elegí fechas"; con fechas (`/es/tarifas?checkIn=2026-08-01&checkOut=2026-08-04&guests=2`) → total y "3 noches · $/noche" + botón Reservar. Chips en lago, header en Fraunces/marfil.

- [ ] **Step 5: Commit**

```bash
git add app/[locale]/tarifas/page.tsx components/tarifas/
git commit -m "feat(tarifas): retheme de header, rate cards (chips lago) y condiciones"
```

---

### Task 12: Detalle de cabaña — retheme de UnitDetail + StickyBookingCard

**Files:**
- Modify: `components/departamento/UnitDetail.tsx`
- Modify: `components/departamento/StickyBookingCard.tsx`

**Interfaces:**
- Consumes: tokens/fuentes/copy; datos por slug ya renombrados (Task 7); lógica de cálculo intacta.
- Produces: detalle fiel a `Cabaña Timbó.dc.html`, replicado para las 3.

- [ ] **Step 1: UnitDetail** — reemplazar literales `'Cormorant Garamond'`→`var(--font-display)`; breadcrumb "Cabañas / {nombre}" en turquesa/muted (12px uppercase tracking .26em); H1 Fraunces clamp 42–76px + specs a la derecha; kicker "EL ESPACIO" (turquesa vía `<Kicker>`); bullets de Servicios en terracota (7px). Galería asimétrica ya existe; confirmar el patrón de grid contra el handoff (hero 2×2, wide 2×1, 1×1×3, banda 3×1) y ajustar spans si difieren.

- [ ] **Step 2: StickyBookingCard** — literales `'Cormorant Garamond'`→`var(--font-display)`; precio Fraunces 30px; celdas de fecha marfil con labels lago (10px uppercase); total Fraunces; botón Reservar terracota full-width radius 6px; nota "No pagás nada todavía. Confirmamos por WhatsApp." Mantener el link `/reservas?unit={slug}` y la lógica de noches/total.

- [ ] **Step 3: Verificar**

`pnpm dev`; `/es/departamentos/timbo`: breadcrumb turquesa, H1 Fraunces, galería, booking card sticky con precio/total en Fraunces y botón terracota; "Otras cabañas" muestra Lapacho y Guatambú. Repetir chequeo rápido en `/es/departamentos/lapacho`.

- [ ] **Step 4: Commit**

```bash
git add components/departamento/
git commit -m "feat(detalle): retheme de UnitDetail y booking card al handoff"
```

---

### Task 13: Checkout — retheme del flujo de reserva

**Files:**
- Modify: `components/reservas/ReservaFlow.tsx`, `StepDatos.tsx`, `OrderSummary.tsx`, `Confirmacion.tsx`
- (Tocar `StepPago.tsx`, `StepTransferencia.tsx`, `ReservaEstado.tsx`, `Stepper.tsx`, `LookupForm.tsx` sólo para el barrido de literales `'Cormorant Garamond'`→`var(--font-display)`.)

**Interfaces:**
- Consumes: tokens/fuentes/copy; reducer y validación intactos.
- Produces: checkout fiel a `Reservas.dc.html`, incluyendo estado de éxito con Caveat.

- [ ] **Step 1: Form (StepDatos / ReservaFlow)** — labels 11px uppercase tracking .16em muted; inputs blanco, borde `#d8cfbf`, radius 4px, focus borde lago; botón "Confirmar pedido de reserva" terracota full-width radius 6px; nota de seña por WhatsApp. Reemplazar literales de fuente/hex viejos.

- [ ] **Step 2: OrderSummary** — card blanca radius 8px, foto 190px, nombre en `var(--font-display)`; fechas + stepper editables; desglose "$… × n noches" + "Limpieza final: Incluida"; Total en Fraunces; "Seña del 30% para confirmar: $X" con el monto en atardecer 600.

- [ ] **Step 3: Confirmacion — éxito con Caveat** — "¡Te esperamos!" en `var(--font-accent)` 34px `rotate(-2deg)` atardecer; "Recibimos tu pedido de reserva." en Fraunces 30px; botón outline "Volver al inicio".

- [ ] **Step 4: Verificar** (el checkout online sólo aplica si `NEXT_PUBLIC_BOOKING_MODE` no es `whatsapp`)

`pnpm dev` con booking mode online; `/es/reservas?unit=timbo&checkIn=2026-08-01&checkOut=2026-08-04&guests=2`: form con inputs foco lago, resumen sticky con total Fraunces y seña en atardecer. Simular submit → pantalla de éxito con "¡Te esperamos!" en Caveat. Si el modo es `whatsapp`, confirmar que `/es/reservas` redirige a `/es/tarifas` (lógica intacta).

- [ ] **Step 5: Commit**

```bash
git add components/reservas/
git commit -m "feat(checkout): retheme del flujo de reserva y estado de exito (Caveat)"
```

---

### Task 14: Barrido final de literales + verificación global

**Files:**
- Modify: cualquier archivo restante con `'Cormorant Garamond'` (p. ej. `app/[locale]/mi-reserva/page.tsx`, `app/admin/login/page.tsx`, `app/admin/reservas/page.tsx`) → `var(--font-display)`.

**Interfaces:**
- Produces: cero referencias a Cormorant; sitio 100% en la nueva identidad.

- [ ] **Step 1: Barrer literales de fuente**

```bash
grep -rn "Cormorant" app/ components/ lib/
```
Expected inicial: lista de archivos. Reemplazar cada `'Cormorant Garamond', serif` (o similar) por `var(--font-display)` en estilos inline. Volver a correr el grep → sin resultados.

- [ ] **Step 2: Tests + typecheck**

```bash
pnpm test
```
Expected: PASS.

- [ ] **Step 3: Recorrido final en navegador** (es/en/pt)

`pnpm dev`; recorrer Home, Tarifas, Detalle (las 3), Checkout en los 3 idiomas. Checklist:
  - Color firma lago presente (nav scrolled, labels, links).
  - Fraunces en todos los titulares; Caveat en "¡Te esperamos!".
  - Nav transparente→sólido en Home; sólido en el resto.
  - Sin figuras/línea selva; sin claves i18n crudas; sin errores en `read_console_messages`.
  - `prefers-reduced-motion` (resize_window/emular) no oculta contenido.
  - Screenshot de Home para el usuario.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(theme): barrido final de literales Cormorant y verificacion global"
```

---

## Self-Review

**Cobertura del spec:**
- §3.2 tokens → Task 2. §3.3 fuentes → Task 1. §3.4 quitar selva → Task 4. §3.1 rename slugs → Task 7.
- §4.1 SiteNav → Task 6 (+ ids Task 5). §4.2 SiteFooter → Task 5 (anchors) + Task 8 (copy). §4.3 SearchWidget → Task 9. §4.4 WhatsAppFab → cubierto por el barrido de tokens (auto vía clases) y Task 14 (sin literales); su verde `#2BB673` ya es correcto.
- §5 Home → Tasks 4,5,9,10. §6 Tarifas → Task 11. §7 Detalle → Task 12. §8 Checkout → Task 13. §9 i18n → Task 8. §10 riesgos (barrido de literales/slug) → Tasks 7,14.
- Kicker turquesa / LangSwitcher lago (no explícitos en el spec pero requeridos por el handoff) → Task 3.

**Placeholder scan:** Task 9 Step 5 y Task 12 Step 1 dicen "ajustar si difiere" — son verificaciones contra el handoff con criterio de aceptación (comparación visual), no trabajo sin definir. El resto tiene valores/código concretos.

**Consistencia de tipos:** `UnitSlug` = `"timbo"|"lapacho"|"guatambu"` usado igual en units.ts, los records de env (Task 7 Step 2) y las claves i18n (Step 4). `pricePerNight(slug, _guests)` mantiene su firma. `var(--font-display)` y `var(--font-accent)` definidos en Task 1/2 y consumidos en Tasks 9–14.
