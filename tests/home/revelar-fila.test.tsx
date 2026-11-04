import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { gsap } from "gsap";
import { RevelarFila, cortinaDesde } from "@/components/motion/RevelarFila";

function timelineFalso() {
  const tl = { fromTo: vi.fn(), to: vi.fn(), progress: vi.fn(), scrollTrigger: { kill: vi.fn() } };
  tl.fromTo.mockReturnValue(tl);
  tl.to.mockReturnValue(tl);
  return tl;
}

function montar() {
  return render(
    <RevelarFila lado="left" className="fila">
      <div data-cortina>
        <div data-cortina-img>foto</div>
      </div>
      <span data-linea />
      <p data-escalon>texto</p>
      <div data-flota>interior</div>
    </RevelarFila>,
  );
}

let reduced = false;

beforeEach(() => {
  reduced = false;
  vi.stubGlobal(
    "matchMedia",
    vi.fn((q: string) => ({
      matches: q.includes("reduce") ? reduced : false,
      media: q,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  );
  delete document.documentElement.dataset.fx;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete document.documentElement.dataset.fx;
});

describe("cortinaDesde", () => {
  it("la foto de la izquierda se abre desde el borde izquierdo", () => {
    expect(cortinaDesde("left")).toBe("inset(0% 100% 0% 0%)");
  });
  it("la foto de la derecha se abre desde el borde derecho", () => {
    expect(cortinaDesde("right")).toBe("inset(0% 0% 0% 100%)");
  });
});

describe("RevelarFila", () => {
  it("renderiza un article con el lado y el contenido, visible sin JS", () => {
    vi.spyOn(gsap, "timeline").mockReturnValue(timelineFalso() as unknown as gsap.core.Timeline);
    montar();
    const fila = screen.getByRole("article");
    expect(fila).toHaveClass("fila");
    expect(fila).toHaveAttribute("data-lado", "left");
    expect(screen.getByText("texto")).toBeInTheDocument();
  });

  it("con los efectos apagados (?sinfx=1) no anima nada", () => {
    document.documentElement.dataset.fx = "";
    const spy = vi.spyOn(gsap, "timeline");
    montar();
    expect(spy).not.toHaveBeenCalled();
  });

  it("con prefers-reduced-motion no anima nada", () => {
    reduced = true;
    const spy = vi.spyOn(gsap, "timeline");
    montar();
    expect(spy).not.toHaveBeenCalled();
  });

  it("con efectos prendidos arma la secuencia al entrar la fila, una sola vez", () => {
    const tl = timelineFalso();
    const spy = vi.spyOn(gsap, "timeline").mockReturnValue(tl as unknown as gsap.core.Timeline);
    montar();
    expect(spy).toHaveBeenCalledTimes(1);
    const opts = spy.mock.calls[0][0] as { scrollTrigger: { trigger: Element; once: boolean } };
    expect(opts.scrollTrigger.trigger).toBe(screen.getByRole("article"));
    expect(opts.scrollTrigger.once).toBe(true);
    // La cortina arranca cerrada desde su lado y termina abierta.
    const [, desde, hasta] = tl.fromTo.mock.calls[0];
    expect(desde).toMatchObject({ clipPath: cortinaDesde("left") });
    expect(hasta).toMatchObject({ clipPath: "inset(0% 0% 0% 0%)" });
  });

  it("si el FxWatchdog apaga los efectos en vivo, la fila termina de golpe y queda visible", () => {
    const tl = timelineFalso();
    vi.spyOn(gsap, "timeline").mockReturnValue(tl as unknown as gsap.core.Timeline);
    montar();
    window.dispatchEvent(new Event("lago:fx-degrade"));
    expect(tl.scrollTrigger.kill).toHaveBeenCalled();
    expect(tl.progress).toHaveBeenCalledWith(1);
  });

  it("al desmontar deja de escuchar el apagado de efectos", () => {
    const tl = timelineFalso();
    vi.spyOn(gsap, "timeline").mockReturnValue(tl as unknown as gsap.core.Timeline);
    const { unmount } = montar();
    unmount();
    window.dispatchEvent(new Event("lago:fx-degrade"));
    expect(tl.progress).not.toHaveBeenCalled();
  });
});
