import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { FiguraAgua } from "@/components/motion/FiguraAgua";

// La figura ya no se pinta con el scroll: se quitó el scrub del clip-path y con
// él la capa de relleno. Queda una sola capa, el contorno, que era el estado
// válido sin JS. El componente no corre JS, así que no hay matchMedia a stubear.
describe("FiguraAgua", () => {
  it("renderiza una sola capa de contorno, decorativa y detrás del contenido", () => {
    const { container } = render(<FiguraAgua kind="ola" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("aria-hidden")).toBe("true");
    expect(root.className).toContain("pointer-events-none");
    // z-0, por debajo del z-[1] de los contenedores de sección. Antes era z-[1]
    // en ambos y sólo el orden del DOM la mantenía atrás: bastaba reordenar el
    // markup para que una figura tapara un título.
    expect(root.className).toContain("z-0");
    expect(root.className).not.toContain("z-[1]");
    expect(root.className).toContain("hidden");
    expect(root.className).toContain("md:block");
    expect(root.querySelectorAll("svg")).toHaveLength(1);
    expect(root.querySelector("[data-figura-fill]")).toBeNull();
  });

  it("el contorno va con stroke y sin relleno", () => {
    const { container } = render(<FiguraAgua kind="gota" />);
    const g = container.querySelector("svg > g") as SVGGElement;
    expect(g.getAttribute("fill")).toBe("none");
    expect(g.getAttribute("stroke")).toBe("currentColor");
  });

  it("cada motivo del lago renderiza sus paths", () => {
    for (const kind of ["ola", "gota", "gotas", "bambu", "fuego"] as const) {
      const { container, unmount } = render(<FiguraAgua kind={kind} />);
      expect(container.querySelectorAll("path").length).toBeGreaterThan(0);
      unmount();
    }
  });

  it("el bambú es el motivo con más piezas (tallo, nudos y hojas)", () => {
    const { container } = render(<FiguraAgua kind="bambu" />);
    expect(container.querySelectorAll("path")).toHaveLength(5);
  });

  it("la fogata lleva los leños como formas cerradas, no como líneas", () => {
    const { container } = render(<FiguraAgua kind="fuego" />);
    // llama + 2 leños
    expect(container.querySelectorAll("path")).toHaveLength(3);
    // Se mantienen cerradas: la geometría no cambió al sacar el relleno, y
    // cerrarlas es lo que deja la silueta bien resuelta en las uniones.
    for (const p of container.querySelectorAll("path")) {
      expect(p.getAttribute("d")).toMatch(/z\s*$/i);
    }
  });

  it("gotas son dos, y de tamaños distintos", () => {
    const { container } = render(<FiguraAgua kind="gotas" />);
    expect(container.querySelectorAll("path")).toHaveLength(2);
    const escalas = [...container.querySelectorAll("g[transform]")]
      .map((g) => g.getAttribute("transform")!.match(/scale\(([\d.]+)\)/)![1]);
    expect(new Set(escalas).size).toBe(2);
  });

  it("flip espeja el dibujo sin tocar el contenedor", () => {
    const { container } = render(<FiguraAgua kind="ola" flip />);
    const svg = container.querySelector("svg") as SVGElement;
    expect(svg.style.transform).toBe("scaleX(-1)");
  });

  it("respeta tamaño y color", () => {
    const { container } = render(<FiguraAgua kind="gotas" size={90} color="#123456" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.width).toBe("90px");
    expect(root.style.color).toBe("rgb(18, 52, 86)");
  });
});
