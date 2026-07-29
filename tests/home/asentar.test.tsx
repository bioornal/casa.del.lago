import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Asentar } from "@/components/motion/Asentar";

// El "asentado" de las tarjetas se quitó: el componente sólo aporta la grilla.
describe("Asentar", () => {
  it("es la grilla en sí: los hijos quedan como hijos directos", () => {
    const { container } = render(
      <Asentar className="grid grid-cols-3">
        <span data-t="1" />
        <span data-t="2" />
        <span data-t="3" />
      </Asentar>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toBe("grid grid-cols-3");
    expect(root.children).toHaveLength(3);
    expect(root.children[0].getAttribute("data-t")).toBe("1");
  });

  it("no toca a los hijos: quedan visibles y sin transform", () => {
    const { container } = render(
      <Asentar className="grid">
        <span data-t="1" />
      </Asentar>,
    );
    const hijo = container.querySelector("[data-t]") as HTMLElement;
    expect(hijo.style.opacity).toBe("");
    expect(hijo.style.transform).toBe("");
  });

  it("no rompe si no recibe className", () => {
    const { container } = render(
      <Asentar>
        <span data-t="1" />
      </Asentar>,
    );
    expect(container.firstElementChild).not.toBeNull();
  });
});
