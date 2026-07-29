import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RevealTitle } from "@/components/motion/RevealTitle";

// Las animaciones de aparición se quitaron: el componente es un wrapper
// transparente. Ya no hay matchMedia que stubear porque no corre JS.
describe("RevealTitle", () => {
  it("renderiza el contenido visible y sin recorte", () => {
    const { container } = render(
      <RevealTitle>
        <h2>Un título</h2>
      </RevealTitle>,
    );
    expect(screen.getByText("Un título")).toBeInTheDocument();
    const wrapper = container.firstElementChild as HTMLElement;
    // El overflow-hidden existía sólo para enmascarar el deslizamiento; sin
    // animación, clipear el título le decapitaría las descendentes.
    expect(wrapper.className).not.toContain("overflow-hidden");
  });

  it("acepta className adicional", () => {
    const { container } = render(
      <RevealTitle className="text-center">
        <h2>Otro</h2>
      </RevealTitle>,
    );
    expect((container.firstElementChild as HTMLElement).className).toContain(
      "text-center",
    );
  });
});
