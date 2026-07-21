# Identidad de movimiento del lago — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar los FX selváticos heredados de Aruma (tucán, mariposa, hoja + línea de bronce) por un idioma de movimiento propio del lago: estela de agua, ondas concéntricas y asentado sutil de grillas.

**Architecture:** Se conserva íntegro el motor de `SelvaTrail` (medición, esquive de copy, feathering, lookup monótono, cuantización a 1 px) y sólo cambian forma y color. `SelvaFigure` se reemplaza por `Onda`, que mantiene el mismo contrato de anclaje para que la estela siga trazando la curva a través de los cinco puntos. `Asentar` es un contenedor de grilla con un único ScrollTrigger que anima a sus hijos directos con stagger.

**Tech Stack:** Next.js 15 (App Router), React 19, GSAP + ScrollTrigger + `@gsap/react`, Tailwind v4, Vitest + Testing Library.

## Global Constraints

- Los tres efectos son **desktop-only**: `hidden md:block` en los componentes decorativos.
- Todo componente decorativo lleva `aria-hidden="true"`, `pointer-events-none` y `z-[1]`.
- Todo efecto se gatea con `fxAllowed(<feature>)` de `@/lib/fx`.
- **Convención de `prefers-reduced-motion`:** lo conducido por scroll (Estela, Asentar) corre siempre — sin scroll es estático. Lo autónomo (Onda) se apaga.
- Feature keys nuevas: `trail` → `estela`, `figuras` → `ondas`. `reveals`, `lenis`, `css` y `grano` no cambian.
- Color firma del lago: `#155e75`.
- El estado sin JS de cada componente debe ser visualmente válido (no invisible, no roto).
- Comentarios y nombres en español, como el resto del repo.

---

### Task 1: Componente `Onda`

**Files:**
- Create: `components/motion/Onda.tsx`
- Test: `tests/home/onda.test.tsx`

**Interfaces:**
- Consumes: `fxAllowed(feature: string): boolean` de `@/lib/fx`.
- Produces: `Onda({ className?: string; color?: string; size?: number })`. Renderiza un `<div data-onda>` con un `<svg>` que contiene 3 `<circle data-onda-anillo>`.

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/home/onda.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { Onda } from "@/components/motion/Onda";

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: true, // reduced motion → sin animación autónoma
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
});

describe("Onda", () => {
  it("es decorativa y va detrás del contenido, sólo en desktop", () => {
    const { container } = render(<Onda />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("aria-hidden")).toBe("true");
    expect(root.className).toContain("pointer-events-none");
    expect(root.className).toContain("z-[1]");
    expect(root.className).toContain("hidden");
    expect(root.className).toContain("md:block");
  });

  it("expone el ancla data-onda para el trazado de la estela", () => {
    const { container } = render(<Onda />);
    expect(
      (container.firstElementChild as HTMLElement).hasAttribute("data-onda"),
    ).toBe(true);
  });

  it("renderiza tres anillos concéntricos", () => {
    const { container } = render(<Onda />);
    expect(container.querySelectorAll("[data-onda-anillo]")).toHaveLength(3);
  });

  it("sin JS los anillos quedan en su radio final: el estado SSR es visible", () => {
    const { container } = render(<Onda />);
    const anillos = container.querySelectorAll("[data-onda-anillo]");
    anillos.forEach((a) => {
      expect(a.getAttribute("r")).toBe("46");
      expect((a as SVGElement).style.opacity).toBe("");
    });
  });

  it("respeta el tamaño y el color que se le pasan", () => {
    const { container } = render(<Onda size={80} color="#123456" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.width).toBe("80px");
    expect(root.style.color).toBe("rgb(18, 52, 86)");
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npx vitest run tests/home/onda.test.tsx`
Expected: FAIL — `Failed to resolve import "@/components/motion/Onda"`.

- [ ] **Step 3: Implementar el componente**

Crear `components/motion/Onda.tsx`:

```tsx
"use client";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { fxAllowed } from "@/lib/fx";

gsap.registerPlugin(ScrollTrigger);

const ANILLOS = [0, 1, 2];

// Ondas concéntricas: una gota que cae en el lago. Reemplazan a las figuras
// selváticas de Aruma y conservan su rol de ancla — la estela traza la curva
// pasando por los centros de todos los [data-onda].
//
// A diferencia del relleno por scrub de la figura anterior, esto es una
// animación AUTÓNOMA: se dispara una vez al entrar en viewport y sigue sola.
// Por eso respeta prefers-reduced-motion, mientras que la estela (conducida
// por scroll) corre siempre. Sin JS o con reduced-motion queda el anillo
// estático, que es un estado final válido.
export function Onda({
  className = "",
  color = "#155e75",
  size = 110,
}: {
  className?: string;
  color?: string;
  size?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!fxAllowed("ondas")) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const el = ref.current;
      // Oculta en mobile (display:none) o sin layout (jsdom)
      if (!el || el.getBoundingClientRect().height === 0) return;

      gsap.fromTo(
        el.querySelectorAll("[data-onda-anillo]"),
        { scale: 0.14, opacity: 0.55 },
        {
          scale: 1,
          opacity: 0,
          duration: 2.4,
          ease: "power2.out",
          stagger: 0.28,
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        },
      );
    },
    { scope: ref },
  );

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-onda
      className={`pointer-events-none absolute z-[1] hidden md:block ${className}`}
      style={{ color, width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" width={size} height={size} focusable="false">
        {ANILLOS.map((i) => (
          <circle
            key={i}
            data-onda-anillo
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.3}
            strokeOpacity={0.28}
            style={{ transformOrigin: "50% 50%" }}
          />
        ))}
      </svg>
    </div>
  );
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npx vitest run tests/home/onda.test.tsx`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add components/motion/Onda.tsx tests/home/onda.test.tsx
git commit -m "feat(motion): componente Onda — ondas concentricas del lago"
```

---

### Task 2: Cablear `Onda` en las cinco secciones y retirar `SelvaFigure`

**Files:**
- Modify: `components/home/Manifiesto.tsx:5,12`
- Modify: `components/home/UnitsGrid.tsx:7,17`
- Modify: `components/home/RelatoImagenes.tsx:8,57`
- Modify: `components/home/Experiencias.tsx:7,36`
- Modify: `components/home/CtaReserva.tsx:6,16`
- Delete: `components/motion/SelvaFigure.tsx`, `tests/home/selva-figure.test.tsx`

**Interfaces:**
- Consumes: `Onda` de Task 1.
- Produces: cinco `[data-onda]` en el DOM del home, que Task 3 usa como puntos de anclaje.

Las posiciones (`className`) y tamaños se conservan de las figuras que reemplazan. Se descartan `kind` y `flip`: una onda es radialmente simétrica, no tiene variante ni espejo.

- [ ] **Step 1: Reemplazar los cinco call sites**

En `components/home/Manifiesto.tsx`, cambiar el import y el uso:

```tsx
import { Onda } from "@/components/motion/Onda";
```
```tsx
<Onda className="top-14 right-[5%]" size={110} />
```

En `components/home/UnitsGrid.tsx`:

```tsx
import { Onda } from "@/components/motion/Onda";
```
```tsx
<Onda className="bottom-2 left-[2%]" size={110} />
```

En `components/home/RelatoImagenes.tsx`:

```tsx
import { Onda } from "@/components/motion/Onda";
```
```tsx
<Onda className="top-14 left-[4%]" size={130} />
```

En `components/home/Experiencias.tsx` (esta conserva su color claro, que contrasta con el fondo oscuro de la sección):

```tsx
import { Onda } from "@/components/motion/Onda";
```
```tsx
<Onda color="#E4EEF2" className="top-16 right-[4%]" size={90} />
```

En `components/home/CtaReserva.tsx`:

```tsx
import { Onda } from "@/components/motion/Onda";
```
```tsx
<Onda className="top-20 left-[9%]" size={70} />
```

- [ ] **Step 2: Borrar el componente y el test viejos**

```bash
git rm components/motion/SelvaFigure.tsx tests/home/selva-figure.test.tsx
```

- [ ] **Step 3: Verificar que no quedan referencias**

Run: `npx tsc --noEmit`
Expected: sin salida (limpio). Si aparece `Cannot find module '@/components/motion/SelvaFigure'`, quedó un import sin migrar.

Run: `grep -rn "SelvaFigure\|data-selva-figure" app components lib tests`
Expected: sólo `components/motion/SelvaTrail.tsx` (se migra en Task 3).

- [ ] **Step 4: Correr la suite**

Run: `npx vitest run`
Expected: PASS. El conteo baja de 238 a 234 tests (se fueron los 4 de `selva-figure`) y sube a 239 con los 5 de `onda`.

- [ ] **Step 5: Commit**

```bash
git add -A components/home components/motion tests/home
git commit -m "feat(motion): ondas del lago reemplazan las figuras selvaticas"
```

---

### Task 3: `Estela` — renombrar `SelvaTrail`, ondular la curva y recolorear

**Files:**
- Create: `components/motion/Estela.tsx` (por `git mv` desde `SelvaTrail.tsx`)
- Delete: `components/motion/SelvaTrail.tsx`
- Create: `tests/home/estela.test.tsx` (por `git mv` desde `selva-trail.test.tsx`)
- Delete: `tests/home/selva-trail.test.tsx`
- Modify: `app/[locale]/page.tsx:3,95`

**Interfaces:**
- Consumes: los `[data-onda]` de Task 2 como puntos de anclaje.
- Produces: `Estela()` — un `<svg>` con `[data-trail-progress]`, montado dentro de `<main>`.

**No se toca el motor.** `smoothThrough`, `buildLookup`, `lengthAtY`, la medición contra `main`, el esquive de copy, el feathering y la cuantización de `strokeDashoffset` quedan idénticos. Cambian cuatro cosas: el nombre, el selector de anclas, la modulación senoidal y los colores.

- [ ] **Step 1: Mover los archivos conservando el historial**

```bash
git mv components/motion/SelvaTrail.tsx components/motion/Estela.tsx
git mv tests/home/selva-trail.test.tsx tests/home/estela.test.tsx
```

- [ ] **Step 2: Actualizar el test al nombre nuevo**

En `tests/home/estela.test.tsx`, reemplazar el import y el `describe`:

```tsx
import { Estela } from "@/components/motion/Estela";
```
```tsx
describe("Estela", () => {
  it("renderiza el SVG decorativo detrás del contenido sin crashear en jsdom", () => {
    const { container } = render(
      <main>
        <Estela />
      </main>,
    );
```

- [ ] **Step 3: Correr el test para verificar que falla**

Run: `npx vitest run tests/home/estela.test.tsx`
Expected: FAIL — `Failed to resolve import "@/components/motion/Estela"` o `Estela is not exported` (el archivo todavía exporta `SelvaTrail`).

- [ ] **Step 4: Renombrar el componente y el selector de anclas**

En `components/motion/Estela.tsx`:

Cambiar la firma:
```tsx
export function Estela() {
```

Cambiar el selector de anclas (era `[data-selva-figure]`):
```tsx
        const figs = Array.from(
          document.querySelectorAll<HTMLElement>("[data-onda]"),
        )
```

Cambiar el gate de FX (era `fxAllowed("trail")`):
```tsx
      if (!fxAllowed("estela")) return;
```

- [ ] **Step 5: Aplicar la modulación senoidal**

En `components/motion/Estela.tsx`, insertar este bloque **inmediatamente después** de `pts.push(base[base.length - 1]);` y **antes** de la definición de `inMediaCard`:

```tsx
        // Modulación senoidal: la línea deja de ser una diagonal suave y
        // ondula como la superficie del lago. Va ANTES del pase de esquive
        // para que el esquive siga teniendo la última palabra — si no, la
        // onda podría volver a meter la curva dentro de un bloque de copy
        // que ya se había esquivado. Los puntos `fixed` (centros de onda y
        // extremos) no se mueven: son los que anclan el trazado.
        const AMP = 22;
        const LAMBDA = 200; // período ≈ 2π·200 ≈ 1257px de bajada
        pts.forEach((p) => {
          if (p.fixed) return;
          p.x = Math.min(W - 20, Math.max(20, p.x + AMP * Math.sin(p.y / LAMBDA)));
        });
```

- [ ] **Step 6: Recolorear**

En `components/motion/Estela.tsx`, reemplazar las constantes de color:

```tsx
const LAGO_TENUE = "#155e75";
const LAGO = "#155e75";
```

y actualizar los dos `<path>` del render:

```tsx
      <path ref={trackRef} fill="none" stroke={LAGO_TENUE} strokeOpacity={0.14} strokeWidth={1.2} />
      <path
        ref={progressRef}
        data-trail-progress
        fill="none"
        stroke={LAGO}
        strokeOpacity={0.6}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
```

Borrar las constantes `BRONCE` y `TERRACOTA`, que quedan sin uso.

- [ ] **Step 7: Actualizar el call site**

En `app/[locale]/page.tsx`:

```tsx
import { Estela } from "@/components/motion/Estela";
```
```tsx
        <Estela />
```

- [ ] **Step 8: Verificar que pasa y que no quedan referencias**

Run: `npx vitest run tests/home/estela.test.tsx`
Expected: PASS — 1 test.

Run: `grep -rn "SelvaTrail\|SelvaFigure\|data-selva-figure" app components lib tests`
Expected: sin resultados.

Run: `npx tsc --noEmit`
Expected: sin salida.

- [ ] **Step 9: Commit**

```bash
git add -A components/motion app/[locale]/page.tsx tests/home
git commit -m "feat(motion): Estela reemplaza SelvaTrail — curva ondulada color lago"
```

---

### Task 4: Componente `Asentar`

**Files:**
- Create: `components/motion/Asentar.tsx`
- Test: `tests/home/asentar.test.tsx`

**Interfaces:**
- Consumes: `fxAllowed` de `@/lib/fx`.
- Produces: `Asentar({ children, className? })`. **Renderiza un único `<div className={className}>` cuyos hijos directos son los `children`** — es decir, `Asentar` ES la grilla, no un envoltorio alrededor de ella. Esto importa: si agregara un wrapper, los hijos dejarían de ser grid items y la grilla se rompería.

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/home/asentar.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { Asentar } from "@/components/motion/Asentar";

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
});

describe("Asentar", () => {
  it("es la grilla en sí: los hijos quedan como hijos directos", () => {
    const { container } = render(
      <Asentar className="grid grid-cols-3">
        <span data-t="1" />
        <span data-t="2" />
        <span data-t="3" />
      </Asentar>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toBe("grid grid-cols-3");
    expect(root.children).toHaveLength(3);
    expect(root.children[0].getAttribute("data-t")).toBe("1");
  });

  it("sin JS los hijos quedan visibles: el estado SSR es el estado final", () => {
    const { container } = render(
      <Asentar className="grid">
        <span data-t="1" />
      </Asentar>,
    );
    const hijo = container.querySelector("[data-t]") as HTMLElement;
    expect(hijo.style.opacity).toBe("");
    expect(hijo.style.transform).toBe("");
  });

  it("no rompe si no recibe className", () => {
    const { container } = render(
      <Asentar>
        <span data-t="1" />
      </Asentar>,
    );
    expect(container.firstElementChild).not.toBeNull();
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npx vitest run tests/home/asentar.test.tsx`
Expected: FAIL — `Failed to resolve import "@/components/motion/Asentar"`.

- [ ] **Step 3: Implementar el componente**

Crear `components/motion/Asentar.tsx`:

```tsx
"use client";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { fxAllowed } from "@/lib/fx";

gsap.registerPlugin(ScrollTrigger);

// Las tarjetas de la grilla "se asientan": entran con una rotación mínima y un
// desplazamiento corto, y resuelven a cero con desfase entre ellas. A 1,4° el
// gesto se lee como algo que se acomoda sobre una mesa, no como algo que gira
// — a esa escala la foto sigue siendo legible durante toda la transición.
//
// Un solo ScrollTrigger para todo el grupo (no uno por tarjeta): el stagger de
// GSAP hace el desfase, y así la grilla entra como una unidad.
//
// El componente ES la grilla: `className` se aplica a su propio div y los
// children quedan como hijos directos. Envolverlos individualmente los sacaría
// de la grilla y rompería el layout de spans.
export function Asentar({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!fxAllowed("reveals")) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const el = ref.current;
      if (!el || !el.children.length) return;

      gsap.fromTo(
        el.children,
        { opacity: 0, y: 14, rotate: 1.4 },
        {
          opacity: 1,
          y: 0,
          rotate: 0,
          duration: 0.85,
          ease: "power3.out",
          stagger: 0.06,
          scrollTrigger: { trigger: el, start: "top 85%" },
        },
      );
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npx vitest run tests/home/asentar.test.tsx`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add components/motion/Asentar.tsx tests/home/asentar.test.tsx
git commit -m "feat(motion): componente Asentar — grillas que se acomodan"
```

---

### Task 5: Aplicar `Asentar` en `UnitsGrid` y `RelatoImagenes`

**Files:**
- Modify: `components/home/UnitsGrid.tsx:46-83`
- Modify: `components/home/RelatoImagenes.tsx:88-90` (y el cierre del `.map`)

**Interfaces:**
- Consumes: `Asentar` de Task 4.

En ambos casos se **reemplaza** el `Reveal` por ítem (con su `delay` manual) por un único `Asentar`. El `Reveal` de los encabezados de sección no se toca.

- [ ] **Step 1: Migrar `UnitsGrid`**

En `components/home/UnitsGrid.tsx`, agregar el import:

```tsx
import { Asentar } from "@/components/motion/Asentar";
```

Reemplazar el bloque de la grilla (el `<div className="grid ...">` y el `.map` completo) por:

```tsx
        {/* Units grid */}
        <Asentar className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-[30px]">
          {UNITS.map((unit) => {
            const slug = unit.slug as UnitSlug;
            return (
              <Link
                key={slug}
                href={`/departamentos/${slug}`}
                className="group block text-inherit no-underline transition-transform duration-500 ease-[cubic-bezier(.16,.84,.44,1)] hover:-translate-y-2"
              >
                {/* Image */}
                <div className="overflow-hidden rounded-[3px] bg-slot h-[300px] sm:h-[380px] lg:h-[420px]">
                  <Parallax speed={-16}>
                    <ImageSlot
                      label={t(`${slug}.name` as `${UnitSlug}.name`)}
                      className="h-[316px] sm:h-[396px] lg:h-[436px] w-full transition-transform duration-[900ms] ease-[cubic-bezier(.16,.84,.44,1)] group-hover:scale-105"
                    />
                  </Parallax>
                </div>

                {/* Name + price row */}
                <div className="mt-5 flex items-baseline justify-between gap-3">
                  <h3 className="font-display m-0 font-medium text-[24px] md:text-[27px] text-carbon">
                    {t(`${slug}.name` as `${UnitSlug}.name`)}
                  </h3>
                  <span className="shrink-0 text-[13px] text-bronce">
                    {t("fromPrice")}
                  </span>
                </div>

                {/* Sub info */}
                <div className="mt-2 text-[13px] tracking-[.02em] text-muted">
                  {t(`${slug}.sub` as `${UnitSlug}.sub`)}
                </div>
              </Link>
            );
          })}
        </Asentar>
```

Quitar `Reveal` del import si ya no se usa en el archivo — **ojo: sí se sigue usando** en el encabezado (`<Reveal>` del Kicker y del "viewAll"), así que el import se conserva.

- [ ] **Step 2: Migrar `RelatoImagenes`**

En `components/home/RelatoImagenes.tsx`, agregar el import:

```tsx
import { Asentar } from "@/components/motion/Asentar";
```

Reemplazar el bloque completo de la grilla (líneas 88-127) por:

```tsx
        {/* Grilla bento: 2 col mobile, 4 col desktop — las 10 fotos visibles */}
        <Asentar className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-[14px] [grid-auto-rows:150px] md:[grid-auto-rows:208px]">
          {TILES.map((tile) => (
            <div key={tile.key} className={`${tile.span} h-full`}>
              <button
                type="button"
                onClick={() => openAt(tile.at)}
                aria-label={PHOTOS[tile.at].label}
                className="group relative block h-full w-full overflow-hidden rounded-[6px] cursor-zoom-in"
                style={{ background: "#d8cfbf" }}
              >
                <ImageSlot
                  label={PHOTOS[tile.at].label}
                  photo={PHOTOS[tile.at].photo}
                  position={tile.pos}
                  className="h-full w-full transition-transform duration-[900ms] ease-[cubic-bezier(.16,.84,.44,1)] group-hover:scale-[1.04]"
                />

                {/* Número (orden narrativo) — siempre visible */}
                <span className="pointer-events-none absolute top-3 left-4 text-[11px] tracking-[0.2em] text-marfil/85 [text-shadow:0_1px_8px_rgba(0,0,0,.5)]">
                  {String(tile.at + 1).padStart(2, "0")}
                </span>

                {/* Epígrafe: visible en mobile, aparece al hover en desktop */}
                <span
                  className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pt-12 pb-3.5 text-left md:translate-y-2 md:opacity-0 transition-all duration-500 ease-out md:group-hover:translate-y-0 md:group-hover:opacity-100"
                  style={{
                    background: "linear-gradient(to top, rgba(20,18,14,.68), rgba(20,18,14,0))",
                  }}
                >
                  <span className="block font-display text-[17px] leading-tight text-marfil">
                    {t(`relato.frames.${tile.key}.t`)}
                  </span>
                  <span className="mt-0.5 hidden md:block text-[12px] font-light leading-snug text-marfil/75">
                    {t(`relato.frames.${tile.key}.c`)}
                  </span>
                </span>
              </button>
            </div>
          ))}
        </Asentar>
```

El import de `Reveal` se conserva: se sigue usando en el encabezado de la sección.

Ojo con el `<div>` intermedio: **es necesario**, no redundante. Lleva las clases de span de la grilla (`col-span-2 row-span-2`, etc.) que antes cargaba el `Reveal`, y es el hijo directo que `Asentar` anima. Poner el `<button>` directo como hijo de la grilla haría que la rotación se aplicara sobre el elemento con `overflow-hidden`, que es justo el caso donde puede asomar el borde.

- [ ] **Step 3: Verificar tipos y suite**

Run: `npx tsc --noEmit`
Expected: sin salida. Si aparece `'i' is declared but its value is never read`, quedó el índice del `.map` sin quitar.

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/home/UnitsGrid.tsx components/home/RelatoImagenes.tsx
git commit -m "feat(home): grilla de cabanas y galeria se asientan al entrar"
```

---

### Task 6: Actualizar la documentación del sistema de FX y verificar en navegador

**Files:**
- Modify: `lib/fx.ts:7` (lista de features del comentario de cabecera)
- Modify: `AGENTS.md:62-63`, `AGENTS.md:78`

- [ ] **Step 1: Actualizar el comentario de `lib/fx.ts`**

Reemplazar la línea que enumera las features:

```
// Features: lenis · estela · ondas · reveals · css (animaciones/transiciones
// CSS, vía globals.css) · grano (FilmGrain, vía globals.css).
```

- [ ] **Step 2: Actualizar `AGENTS.md`**

Reemplazar las líneas 62-63:

```markdown
- **Decoración scroll:** `Onda` (ondas concéntricas, animación autónoma que
  respeta prefers-reduced-motion) + `Estela` (curva ondulada que conecta las
  ondas y se pinta con el scroll) cableados en Manifiesto,
```

y en la línea 78, cambiar `selva-*` por `onda/estela/asentar`.

- [ ] **Step 3: Verificar en el navegador**

Levantar el server con `preview_start` (nunca `pnpm dev` por Bash) y comprobar, a 1440×900 sobre `/es`:

1. La estela no cruza ningún bloque de copy en toda la bajada del home.
2. Las cinco ondas disparan **una sola vez** al entrar en viewport (volver a subir y bajar no las re-dispara: `once: true`).
3. La grilla de cabañas y la galería se asientan con desfase visible.
4. Ninguna tarjeta asoma su borde durante la rotación. Si asoma ~1 px en las esquinas, agregar `scale: 1.004` al estado inicial de `Asentar` y `scale: 1` al final.
5. `document.documentElement.scrollWidth === window.innerWidth` (sin desborde horizontal).

Repetir el chequeo 1 a 1280×800.

- [ ] **Step 4: Verificar el kill-switch**

1. `/es?sinfx=1` → los tres efectos apagados: sin SVG de estela pintándose, sin ondas animando, grilla visible y quieta.
2. `/es?fx=estela` → sólo la línea; las ondas quedan como anillo estático y la grilla entra sin animación.
3. `/es?fx=ondas` → sólo las ondas.

- [ ] **Step 5: Verificar `prefers-reduced-motion`**

Con `resize_window` en modo reduced-motion (o emulando la media query), comprobar que las ondas **no animan** y quedan como anillo estático, mientras que la estela sigue pintándose con el scroll (es conducida, no autónoma).

- [ ] **Step 6: Suite completa y commit**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS, sin salida de tsc.

```bash
git add lib/fx.ts AGENTS.md
git commit -m "docs(fx): features estela/ondas reemplazan trail/figuras"
```

---

## Notas de verificación acumuladas

- Conteo de tests esperado al final: 238 base − 4 (`selva-figure`) − 1 (`selva-trail`, se renombra pero sigue siendo 1) + 5 (`onda`) + 1 (`estela`) + 3 (`asentar`) = **242**.
- El único riesgo visual identificado es el borde asomando en la rotación (Task 6, paso 3.4). Todo lo demás es reemplazo directo con contrato preservado.
