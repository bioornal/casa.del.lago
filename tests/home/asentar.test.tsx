import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { Asentar } from "@/components/motion/Asentar";

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
});

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

  it("con prefers-reduced-motion no toca a los hijos: quedan visibles", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
    const { container } = render(
      <Asentar className="grid">
        <span data-t="1" />
      </Asentar>,
    );
    const hijo = container.querySelector("[data-t]") as HTMLElement;
    expect(hijo.style.opacity).toBe("");
    expect(hijo.style.transform).toBe("");
  });

  // Con motion habilitada, GSAP aplica el estado inicial apenas monta: las
  // tarjetas arrancan invisibles y las revela el ScrollTrigger. Es el mismo
  // contrato que ya tiene Reveal.
  it("con motion habilitada arranca en el estado inicial de la animación", () => {
    const { container } = render(
      <Asentar className="grid">
        <span data-t="1" />
      </Asentar>,
    );
    const hijo = container.querySelector("[data-t]") as HTMLElement;
    expect(hijo.style.opacity).toBe("0");
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
