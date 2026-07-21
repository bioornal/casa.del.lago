import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { FiguraAgua } from "@/components/motion/FiguraAgua";

beforeEach(() => {
  // reduced motion → el llenado por scrub corre igual (lo conduce el scroll,
  // no es animación autónoma); sin layout en jsdom queda en su estado SSR.
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
});

describe("FiguraAgua", () => {
  it("renderiza contorno + capa de relleno, decorativa y detrás del contenido", () => {
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
    expect(root.querySelectorAll("svg")).toHaveLength(2);
    expect(root.querySelector("[data-figura-fill]")).not.toBeNull();
  });

  it("el relleno arranca vacío (clip completo) hasta que el scroll lo pinta", () => {
    const { container } = render(<FiguraAgua kind="gota" />);
    const fill = container.querySelector("[data-figura-fill]") as HTMLElement;
    expect(fill.style.clipPath).toBe("inset(100% 0 0 0)");
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
    // 5 paths × 2 capas (contorno + relleno)
    expect(container.querySelectorAll("path")).toHaveLength(10);
  });

  it("la fogata lleva los leños como formas cerradas, no como líneas", () => {
    const { container } = render(<FiguraAgua kind="fuego" />);
    // 3 paths (llama + 2 leños) × 2 capas (contorno + relleno)
    expect(container.querySelectorAll("path")).toHaveLength(6);
    // La capa de relleno va con stroke="none": un leño sin área quedaría
    // invisible justo cuando el scroll termina de pintar la figura.
    const relleno = container.querySelector("[data-figura-fill]")!;
    for (const p of relleno.querySelectorAll("path")) {
      expect(p.getAttribute("d")).toMatch(/z\s*$/i);
    }
  });

  it("gotas son dos, y de tamaños distintos", () => {
    const { container } = render(<FiguraAgua kind="gotas" />);
    // 2 gotas × 2 capas (contorno + relleno)
    expect(container.querySelectorAll("path")).toHaveLength(4);
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
