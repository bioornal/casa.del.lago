"use client";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { fxAllowed } from "@/lib/fx";

gsap.registerPlugin(ScrollTrigger);

export type LadoCortina = "left" | "right";

/** clip-path de arranque: la foto está cerrada y se abre desde su lado. */
export function cortinaDesde(lado: LadoCortina): string {
  return lado === "left" ? "inset(0% 100% 0% 0%)" : "inset(0% 0% 0% 100%)";
}

const ABIERTA = "inset(0% 0% 0% 0%)";

/**
 * Fila editorial que se revela al entrar en pantalla (una sola vez):
 *  - [data-cortina]      la foto se abre como una cortina desde `lado`
 *  - [data-cortina-img]  y su contenido se asienta de un zoom leve (1,14 → 1)
 *  - [data-linea]        filetes que se dibujan de izquierda a derecha
 *  - [data-escalon]      textos que suben escalonados
 *  - [data-flota]        la foto chica sube y aparece después
 *
 * Sin JS, con ?sinfx=1 / FxWatchdog apagando "reveals", o con
 * prefers-reduced-motion, no se toca nada: el contenido ya está visible tal
 * como lo renderiza el servidor. Si el watchdog apaga los efectos con la
 * página ya abierta (evento lago:fx-degrade), la animación salta al final.
 */
export function RevelarFila({
  lado,
  className = "",
  children,
}: {
  lado: LadoCortina;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const root = ref.current;
      if (!root) return;
      if (!fxAllowed("reveals")) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const q = (sel: string) => Array.from(root.querySelectorAll(sel));
      const tl = gsap.timeline({
        scrollTrigger: { trigger: root, start: "top 78%", once: true },
      });
      tl.fromTo(
        q("[data-cortina]"),
        { clipPath: cortinaDesde(lado) },
        { clipPath: ABIERTA, duration: 1.4, ease: "expo.out" },
        0,
      )
        .fromTo(q("[data-cortina-img]"), { scale: 1.14 }, { scale: 1, duration: 1.8, ease: "expo.out" }, 0)
        .fromTo(
          q("[data-linea]"),
          { scaleX: 0 },
          { scaleX: 1, duration: 1.1, ease: "power3.out", stagger: 0.08 },
          0.25,
        )
        .fromTo(
          q("[data-escalon]"),
          { autoAlpha: 0, y: 24 },
          { autoAlpha: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.07 },
          0.2,
        )
        .fromTo(
          q("[data-flota]"),
          { autoAlpha: 0, y: 48 },
          { autoAlpha: 1, y: 0, duration: 1.2, ease: "power3.out" },
          0.45,
        );

      // Si el FxWatchdog apaga los efectos en vivo (máquina lenta), una fila
      // que todavía esperaba su turno quedaría oculta: se termina de golpe.
      const terminar = () => {
        tl.scrollTrigger?.kill();
        tl.progress(1);
      };
      window.addEventListener("lago:fx-degrade", terminar);
      return () => window.removeEventListener("lago:fx-degrade", terminar);
    },
    { scope: ref, dependencies: [lado] },
  );

  return (
    <article ref={ref} data-lado={lado} className={className}>
      {children}
    </article>
  );
}
