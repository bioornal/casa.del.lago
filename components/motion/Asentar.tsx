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
