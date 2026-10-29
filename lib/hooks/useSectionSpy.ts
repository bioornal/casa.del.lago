"use client";
import { useEffect, useState } from "react";

// "llegar" no tiene link en la nav, pero va igual: si no está, el scrollspy deja
// "El lugar" marcado mientras el usuario ya pasó a Cómo llegar.
export const HOME_SECTION_IDS = [
  "casa",
  "cabanas",
  "lugar",
  "llegar",
  "galeria",
  "opiniones",
  "contacto",
] as const;

export type HomeSectionId = (typeof HOME_SECTION_IDS)[number];

// Scrollspy: devuelve el id de la sección visible con mayor ratio ("" al inicio)
export function useSectionSpy(ids: readonly string[] = HOME_SECTION_IDS): string {
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;
    // El observer sólo informa las secciones que CAMBIARON: se lleva el estado
    // de todas para que, al volver al hero (ninguna en la franja), el activo se
    // limpie en vez de quedar pegado en la última (p. ej. "Contacto").
    const ratios = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) ratios.set(e.target.id, e.intersectionRatio);
          else ratios.delete(e.target.id);
        }
        let best = "";
        let bestRatio = -1;
        for (const [id, ratio] of ratios) {
          if (ratio > bestRatio) {
            best = id;
            bestRatio = ratio;
          }
        }
        setActive(best);
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: [0, 0.25, 0.5] },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [ids]);

  return active;
}
