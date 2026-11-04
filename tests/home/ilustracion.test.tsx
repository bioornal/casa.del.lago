import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/image", () => ({
  default: ({ src, alt, style }: { src: string; alt: string; style?: React.CSSProperties }) => (
    <img src={src} alt={alt} style={style} />
  ),
}));
vi.mock("@/components/motion/Parallax", () => ({
  Parallax: ({ className, children }: { className?: string; children: React.ReactNode }) => (
    <div data-parallax className={className}>{children}</div>
  ),
}));

import {
  Ilustracion,
  LAMINA_BOTANICA,
  ILUSTRACION_KAYAK,
  ILUSTRACION_MATE,
  ILUSTRACION_PREGUNTAS,
} from "@/components/ui/Ilustracion";

const BASE = { src: "/x.jpg", ancho: 928, alto: 1152, sizes: "300px" };

describe("Ilustracion", () => {
  it("es decorativa: alt vacío y oculta para lectores de pantalla", () => {
    const { container } = render(<Ilustracion {...BASE} />);
    expect(screen.getByAltText("")).toBeInTheDocument();
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it("la caja toma la proporción del archivo", () => {
    const { container } = render(<Ilustracion {...BASE} />);
    expect((container.querySelector('[aria-hidden="true"]') as HTMLElement).style.aspectRatio).toBe("928 / 1152");
  });

  it("el encuadre cambia la proporción de la caja y la parte visible del dibujo", () => {
    const { container, getByAltText } = render(
      <Ilustracion {...BASE} encuadre={{ proporcion: "928 / 640", posicion: "50% 0%" }} />,
    );
    expect((container.querySelector('[aria-hidden="true"]') as HTMLElement).style.aspectRatio).toBe("928 / 640");
    expect((getByAltText("") as HTMLImageElement).style.objectPosition).toBe("50% 0%");
  });

  it("aclara el papel sólo si se lo pide", () => {
    const sin = render(<Ilustracion {...BASE} />);
    expect((sin.getByAltText("") as HTMLImageElement).style.filter).toBe("");
    sin.unmount();
    const con = render(<Ilustracion {...BASE} aclarar={1.1} />);
    expect((con.getByAltText("") as HTMLImageElement).style.filter).toBe("brightness(1.1)");
  });

  it("por defecto va absoluta detrás del contenido; enFlujo la deja en la columna", () => {
    const fondo = render(<Ilustracion {...BASE} />);
    expect(fondo.container.firstElementChild).toHaveClass("absolute", "-z-10", "mix-blend-darken");
    const vineta = render(<Ilustracion {...BASE} enFlujo />);
    expect(vineta.container.firstElementChild).toHaveClass("relative");
    expect(vineta.container.firstElementChild).not.toHaveClass("absolute");
  });

  it("sin parallax es un div fijo; con parallax va dentro del Parallax", () => {
    const fija = render(<Ilustracion {...BASE} />);
    expect(fija.container.querySelector("[data-parallax]")).toBeNull();
    const movil = render(<Ilustracion {...BASE} parallax={60} />);
    expect(movil.container.querySelector("[data-parallax]")).not.toBeNull();
  });

  it("espejo da vuelta el dibujo en horizontal", () => {
    const { container } = render(<Ilustracion {...BASE} espejo />);
    expect(container.querySelector(".-scale-x-100")).not.toBeNull();
  });

  it("la lámina botánica apunta al archivo de las hojas (nombre cruzado en el bucket)", () => {
    expect(LAMINA_BOTANICA.src).toContain("secciones/lagoAnochecer.jpg");
    expect([LAMINA_BOTANICA.ancho, LAMINA_BOTANICA.alto]).toEqual([928, 1152]);
  });

  it("las ilustraciones de sección salen de secciones/ con su tamaño real", () => {
    expect(ILUSTRACION_KAYAK).toMatchObject({ ancho: 1200, alto: 896 });
    expect(ILUSTRACION_KAYAK.src).toContain("secciones/lago.jpg");
    expect(ILUSTRACION_MATE).toMatchObject({ ancho: 1024, alto: 1024 });
    expect(ILUSTRACION_MATE.src).toContain("secciones/mate.jpg");
    expect(ILUSTRACION_PREGUNTAS).toMatchObject({ ancho: 928, alto: 1152 });
    expect(ILUSTRACION_PREGUNTAS.src).toContain("secciones/preguntas.jpg");
  });
});
