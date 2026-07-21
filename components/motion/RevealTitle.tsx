"use client";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { fxAllowed } from "@/lib/fx";

gsap.registerPlugin(ScrollTrigger);

// Reveal enmascarado: el hijo entra deslizándose desde abajo del wrapper.
// El estado final (visible) es el estado por defecto — sin JS no se oculta nada.
export function RevealTitle({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!fxAllowed("reveals")) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const inner = ref.current?.firstElementChild;
      if (!inner) return;
      gsap.fromTo(
        inner,
        // 130 y no 110: el wrapper ahora es más alto que el texto (ver pb abajo),
        // así que hace falta más recorrido para que el hijo quede fuera de vista.
        { yPercent: 130 },
        {
          yPercent: 0,
          duration: 1.1,
          delay,
          ease: "power3.out",
          scrollTrigger: { trigger: ref.current, start: "top 85%" },
        },
      );
    },
    { scope: ref },
  );

  return (
    // Los títulos display van con leading < 1 (ej. leading-[1.05]): la caja de
    // línea queda MÁS BAJA que la letra, así que las descendentes —la "g" de
    // "lago", la coma— sobresalen y el overflow-hidden las decapitaba.
    // El padding da aire al clip y el margen negativo lo descuenta del flujo,
    // de modo que el espaciado de la página no cambia. En px y no em: el em se
    // resolvería contra el font-size del wrapper (16px heredado), no contra el
    // del título. 8px cubre el desborde del título más grande del sitio (52px,
    // medido en ~3px) con margen de sobra.
    <div
      ref={ref}
      className={`overflow-hidden pb-2 mb-[-8px] ${className}`}
    >
      <div>{children}</div>
    </div>
  );
}
