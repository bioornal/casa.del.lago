# Identidad de movimiento del lago — reemplazo de los FX selváticos

Fecha: 2026-07-21

## Problema

El sistema de movimiento del sitio se heredó entero de Aruma Lodge y sigue
hablando de selva: una línea de bronce/terracota que conecta tucanes, mariposas
y hojas a lo largo del home. La Casa del Lago no es un lodge en la selva: es una
casa a orillas del lago Urugua-í, y su propio isotipo tiene olas. La iconografía
actual contradice la marca.

Además hay una hipótesis del dueño que conviene registrar porque se descartó
parcialmente: rotar las grillas de imágenes de forma marcada (~7°) al
scrollear. Se descartó a esa escala por tres razones — pelea con la lectura de
fotos de interiores, es lo contrario de minimalista, y no dice nada del lago
(cambiaría iconografía selvática por un efecto genérico de portfolio). Se
conserva la **versión chica** de la misma idea: a 1,4° el gesto se lee como
"se acomoda", no como "gira".

## Diseño

Tres efectos que comparten una sola lógica —agua que se asienta— para que el
sitio quede con un idioma de movimiento y no con tres trucos sueltos.

### Renombres

| antes | después |
|---|---|
| `components/motion/SelvaTrail.tsx` | `components/motion/Estela.tsx` |
| `components/motion/SelvaFigure.tsx` | `components/motion/Onda.tsx` |
| atributo `data-selva-figure` | `data-onda` |
| feature FX `trail` | `estela` |
| feature FX `figuras` | `ondas` |
| `tests/home/selva-trail.test.tsx` | `tests/home/estela.test.tsx` |
| `tests/home/selva-figure.test.tsx` | `tests/home/onda.test.tsx` |

Las feature keys son parte del contrato de `?fx=` (herramienta de diagnóstico
en producción, sin redeploy), así que se actualiza la lista de features del
comentario de cabecera de `lib/fx.ts` — hoy dice `lenis · trail · figuras ·
reveals · css · grano` y pasa a `lenis · estela · ondas · reveals · css ·
grano` — y la mención correspondiente en `AGENTS.md`.

### A — Estela (reemplaza SelvaTrail)

Se conserva **el motor completo**, que es la parte cara y es agnóstica al
dibujo: medición contra `main`, esquive de bloques de copy reales, feathering
en las bandas de entrada/salida, lookup monótono largo→y, y la cuantización a
1 px de `strokeDashoffset` (cada escritura invalida el repintado de un SVG del
alto de la página).

Cambia sólo la forma y el color:

- **Forma**: a la lista de puntos ya densificada se le suma una modulación
  lateral senoidal, `x += A · sin(y / λ)`, con A ≈ 22 px. Se aplica **antes**
  del pase de esquive de texto, para que el esquive siga teniendo la última
  palabra y la línea nunca cruce copy.
- **Color**: track `#9A7B4F` (bronce) → `#155e75` (lago) con opacidad baja;
  progreso `#A04B2A` (terracota) → `#155e75`.

Decisión tomada: **una sola línea**. La variante de dos líneas paralelas
desfasadas lee más literal como estela de lancha, pero suma ruido a esa
opacidad y se aleja del registro minimalista. Es un parámetro, no un rediseño.

El scrub sigue corriendo siempre, también con `prefers-reduced-motion`: no es
animación autónoma, la conduce el scroll, y sin scroll es estática.

### B — Ondas (reemplaza SelvaFigure)

Tres anillos concéntricos que se expanden desde el punto de anclaje y se
apagan, con desfase de ~0,28 s, disparados **una vez** al entrar en viewport
(no scrubbed). Van en los mismos 5 puntos donde hoy hay figuras: `Manifiesto`,
`UnitsGrid`, `RelatoImagenes`, `Experiencias`, `CtaReserva`.

Contrato que se preserva del componente actual (lo fijan los tests):
`aria-hidden="true"`, `pointer-events-none`, `z-[1]`, `hidden md:block`, y el
atributo de anclaje que usa la estela para trazar la curva.

**`prefers-reduced-motion`: renderiza un anillo estático y no anima.** Es el
único efecto autónomo del set; la convención del repo es que lo conducido por
scroll corre siempre y lo autónomo se respeta. Sin JS queda también el anillo
tenue, que es un estado final válido.

### C — Asentado de grillas

Componente nuevo que envuelve una grilla y anima a sus hijos con **un solo
ScrollTrigger** para todo el grupo (no uno por tarjeta):

```
{ opacity: 0, y: 14, rotate: 1.4 } → { opacity: 1, y: 0, rotate: 0 }
stagger 0.06 · duration 0.85 · ease power3.out · start "top 85%"
```

Se aplica **sólo** en `UnitsGrid` (grilla de cabañas del home) y
`RelatoImagenes` (galería del complejo). Fuera de alcance por decisión
explícita: la galería del detalle de cabaña y las tarjetas de `/tarifas`.

Hereda de `Reveal` el gate `fxAllowed("reveals")` y el respeto a
`prefers-reduced-motion`.

**Riesgo conocido**: rotar una tarjeta con `overflow-hidden` e imagen puede
asomar ~1 px en las esquinas durante la transición. Mitigación si aparece:
acompañar con `scale(1.004)` que vuelve a 1. Verificar en navegador.

## Integración con el sistema de FX

Todo efecto nuevo se enchufa a lo que ya existe, sin tocarlo:

- Kill-switch por feature: `?sinfx=1`, `?fx=on`, `?fx=estela,ondas,reveals`.
- `FxWatchdog` mide FPS al cargar y auto-degrada a `data-fx=""` (TTL 24 h).
- Los tres efectos son desktop-only (`hidden md:block`), como los actuales.

## Verificación

1. `vitest` sin regresiones (238 tests hoy) + tests nuevos de `Onda` para el
   caso `prefers-reduced-motion`.
2. `tsc --noEmit` limpio.
3. Navegador: que la estela no cruce ningún bloque de copy en 1440 y en 1280;
   que las ondas disparen una sola vez; que el asentado no produzca desborde
   horizontal ni asome el borde de las tarjetas.
4. `?sinfx=1` apaga los tres; `?fx=estela` deja sólo la línea.
5. Con `prefers-reduced-motion: reduce`: estela y asentado quedan estáticos en
   su estado final, ondas no animan.
