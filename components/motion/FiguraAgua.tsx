"use client";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { fxAllowed } from "@/lib/fx";

gsap.registerPlugin(ScrollTrigger);

export type FiguraKind = "ola" | "gota" | "gotas" | "bambu" | "fuego";

// Estela de agua — dos cintas encadenadas, el mismo gesto que las olas del
// isotipo de la marca.
const OLA_A =
  "M4 54 C 22 40, 44 40, 62 51 C 74 58, 86 59, 96 52 C 88 66, 70 68, 55 60 C 40 52, 22 52, 4 63 Z";
const OLA_B =
  "M16 76 C 32 66, 52 66, 68 74 C 76 78, 86 78, 94 73 C 86 84, 71 86, 57 80 C 43 74, 31 74, 16 83 Z";

// Gota
const GOTA =
  "M50 10 C 60 30, 76 48, 76 63 C 76 79, 64 90, 50 90 C 36 90, 24 79, 24 63 C 24 48, 40 30, 50 10 Z";

// Bambú / caña — tallo con nudos y dos hojas
const BAMBU_TALLO = "M43 94 L43 22 C 43 15, 57 15, 57 22 L57 94 Z";
const BAMBU_NUDO_1 = "M43 42 L57 42 L57 47 L43 47 Z";
const BAMBU_NUDO_2 = "M43 64 L57 64 L57 69 L43 69 Z";
const BAMBU_HOJA_DER = "M57 31 C 72 24, 85 30, 90 40 C 76 45, 61 39, 57 31 Z";
const BAMBU_HOJA_IZQ = "M43 56 C 28 49, 15 55, 10 65 C 24 70, 39 64, 43 56 Z";

// Par de gotas: la misma silueta a dos escalas, como agua que acaba de caer.
// Se reutiliza GOTA con transform en vez de duplicar el path.

// Fogata — la otra mitad del relato de la casa: el agua afuera, el fuego adentro
// (salamandra, parrilla, asado). Los leños son paralelogramos CERRADOS y no
// líneas: la capa de relleno se dibuja con stroke="none", así que un <path> sin
// área quedaría invisible justo al llenarse.
const FUEGO_LLAMA =
  "M50 6 C 55 24, 69 32, 69 50 C 69 67, 60 80, 50 80 C 40 80, 31 67, 31 50 C 31 38, 39 32, 43 22 C 46 31, 48 31, 50 6 Z";
const FUEGO_LENO_A = "M16 78 L84 88 L84 93 L16 83 Z";
const FUEGO_LENO_B = "M16 88 L84 78 L84 83 L16 93 Z";

function Figura({ kind }: { kind: FiguraKind }) {
  if (kind === "ola") {
    return (
      <>
        <path d={OLA_A} />
        <path d={OLA_B} />
      </>
    );
  }
  if (kind === "gota") return <path d={GOTA} />;
  if (kind === "fuego") {
    return (
      <>
        <path d={FUEGO_LLAMA} />
        <path d={FUEGO_LENO_A} />
        <path d={FUEGO_LENO_B} />
      </>
    );
  }
  if (kind === "gotas") {
    return (
      <>
        <g transform="translate(-4 10) scale(0.76)">
          <path d={GOTA} />
        </g>
        <g transform="translate(50 0) scale(0.44)">
          <path d={GOTA} />
        </g>
      </>
    );
  }
  return (
    <>
      <path d={BAMBU_TALLO} />
      <path d={BAMBU_NUDO_1} />
      <path d={BAMBU_NUDO_2} />
      <path d={BAMBU_HOJA_DER} />
      <path d={BAMBU_HOJA_IZQ} />
    </>
  );
}

// Figura decorativa del lago que arranca como contorno vacío y se "llena" de
// color sólido de abajo hacia arriba a medida que la sección entra en el
// viewport (scrub). Reemplaza a las figuras selváticas de Aruma
// (mariposa/tucán/hoja) conservando su mecánica, que es la que el dueño
// quería: objetos que se van pintando, sin línea que los conecte.
//
// Va POR DETRÁS del contenido: z-0 contra el z-[1] de los contenedores de
// sección. Antes ambos estaban en z-[1] y el orden del DOM era lo único que la
// mantenía atrás — bastaba reordenar el markup para que tapara un título.
// Igual hay que colocarla en una zona de aire: quedar detrás evita que oculte
// el texto, pero una figura opaca bajo un kicker igual arruina el contraste.
//
// El llenado corre SIEMPRE, también con prefers-reduced-motion: no es
// animación autónoma — lo conduce el scroll del usuario, y sin scroll es
// estático. Sin JS queda el contorno, que ya es un estado válido.
export function FiguraAgua({
  kind,
  className = "",
  color = "#155e75",
  size = 110,
  flip = false,
}: {
  kind: FiguraKind;
  className?: string;
  color?: string;
  size?: number;
  flip?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!fxAllowed("figuras")) return;
      const el = fillRef.current;
      if (!el) return;
      // Oculta en mobile (display:none) o sin layout (jsdom): sin trigger,
      // el relleno queda en su estado SSR (vacío)
      if (!ref.current || ref.current.getBoundingClientRect().height === 0) return;

      gsap.fromTo(
        el,
        { clipPath: "inset(100% 0 0 0)" },
        {
          clipPath: "inset(0% 0 0 0)",
          ease: "none",
          scrollTrigger: {
            trigger: ref.current,
            start: "top 92%",
            end: "top 28%",
            scrub: 0.6,
          },
        },
      );
    },
    { scope: ref },
  );

  const svgStyle = flip ? { transform: "scaleX(-1)" } : undefined;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-figura-agua
      className={`pointer-events-none absolute z-0 hidden md:block ${className}`}
      style={{ color, width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" width={size} height={size} style={svgStyle} focusable="false">
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth={1.3}
          strokeOpacity={0.45}
          strokeLinejoin="round"
        >
          <Figura kind={kind} />
        </g>
      </svg>
      <div
        ref={fillRef}
        data-figura-fill
        className="absolute inset-0"
        style={{ clipPath: "inset(100% 0 0 0)" }}
      >
        <svg viewBox="0 0 100 100" width={size} height={size} style={svgStyle} focusable="false">
          <g fill="currentColor" fillOpacity={0.88} stroke="none">
            <Figura kind={kind} />
          </g>
        </svg>
      </div>
    </div>
  );
}
