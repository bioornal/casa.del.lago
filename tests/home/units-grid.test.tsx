import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import en from "@/messages/en.json";
import pt from "@/messages/pt.json";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));
vi.mock("@/lib/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
// Los efectos de scroll tienen su propio test: acá sólo importa el contenido.
vi.mock("@/components/motion/Parallax", () => ({
  Parallax: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/motion/RevelarFila", () => ({
  RevelarFila: ({ lado, className, children }: { lado: string; className?: string; children: React.ReactNode }) => (
    <article data-lado={lado} className={className}>{children}</article>
  ),
}));

import { UnitsGrid } from "@/components/home/UnitsGrid";

const LOCALES = { es, en, pt } as const;
const PRICES = { aratiri: 108200, aguaribay: 118500 };

function conIntl(locale: keyof typeof LOCALES = "es") {
  return render(
    <NextIntlClientProvider locale={locale} messages={LOCALES[locale]}>
      <UnitsGrid prices={PRICES} />
    </NextIntlClientProvider>,
  );
}

describe("UnitsGrid (Cabañas) — editorial alternado", () => {
  it("una fila por cabaña, con la foto alternando de lado (la primera a la derecha, bajo la lámina)", () => {
    conIntl();
    const filas = screen.getAllByRole("article");
    expect(filas).toHaveLength(2);
    expect(filas.map((f) => f.getAttribute("data-lado"))).toEqual(["right", "left"]);
    expect(within(filas[0]).getByRole("heading", { level: 3 })).toHaveTextContent("Cabaña Aguaribay");
    expect(within(filas[1]).getByRole("heading", { level: 3 })).toHaveTextContent("Cabaña Aratirí");
  });

  it("la ficha muestra huéspedes, dormitorios y superficie reales de cada cabaña", () => {
    conIntl();
    const [aguaribay, aratiri] = screen.getAllByRole("article");
    expect(within(aguaribay).getByText("Hasta 6")).toBeInTheDocument();
    expect(within(aguaribay).getByText("2")).toBeInTheDocument();
    expect(within(aguaribay).getByText("65 m²")).toBeInTheDocument();
    expect(within(aratiri).getByText("Hasta 7")).toBeInTheDocument();
    expect(within(aratiri).getByText("1")).toBeInTheDocument();
    expect(within(aratiri).getByText("45 m²")).toBeInTheDocument();
  });

  it("el botón lleva a la ficha de cada cabaña y el precio sale de las tarifas", () => {
    conIntl();
    const [aguaribay, aratiri] = screen.getAllByRole("article");
    expect(within(aguaribay).getByRole("link", { name: /Ver la cabaña/ })).toHaveAttribute("href", "/departamentos/aratiri");
    expect(within(aratiri).getByRole("link", { name: /Ver la cabaña/ })).toHaveAttribute("href", "/departamentos/aguaribay");
    expect(within(aguaribay).getAllByText(/\$108\.200/).length).toBeGreaterThan(0);
    expect(within(aratiri).getAllByText(/\$118\.500/).length).toBeGreaterThan(0);
  });

  it("la foto chica del interior lleva alt con el nombre de la cabaña", () => {
    conIntl();
    expect(screen.getByAltText("Interior de la Cabaña Aguaribay")).toBeInTheDocument();
    expect(screen.getByAltText("Interior de la Cabaña Aratirí")).toBeInTheDocument();
  });

  it.each(["es", "en", "pt"] as const)("el título resalta el final en itálica (%s)", (locale) => {
    conIntl(locale);
    const h2 = screen.getByRole("heading", { level: 2 });
    expect(h2.querySelector("em")).not.toBeNull();
    expect(h2.textContent).not.toContain("<em>");
  });

  it("traduce el botón y la ficha", () => {
    conIntl("en");
    expect(screen.getAllByRole("link", { name: /See the cabin/ })).toHaveLength(2);
    expect(screen.getByText("Up to 6")).toBeInTheDocument();
  });
});
