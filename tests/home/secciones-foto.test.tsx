import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";
import en from "@/messages/en.json";
import pt from "@/messages/pt.json";

// next/image valida hosts y configura loaders que en jsdom no hacen falta: un
// <img> plano alcanza para chequear el alt y la ruta de la foto.
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));
vi.mock("@/lib/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

import { Manifiesto } from "@/components/home/Manifiesto";
import { CtaReserva } from "@/components/home/CtaReserva";
import { ComoLlegar } from "@/components/home/ComoLlegar";

const LOCALES = { es, en, pt } as const;

function conIntl(ui: React.ReactNode, locale: keyof typeof LOCALES = "es") {
  return render(
    <NextIntlClientProvider locale={locale} messages={LOCALES[locale]}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("Manifiesto (La casa) — panorámica", () => {
  // Sin NEXT_PUBLIC_SUPABASE_URL (el caso en tests) ImageSlot cae al
  // placeholder, así que acá se chequea el alt y no la ruta del bucket.
  it.each(["es", "en", "pt"] as const)("la foto lleva alt traducido (%s)", (locale) => {
    conIntl(<Manifiesto />, locale);
    expect(screen.getByAltText(LOCALES[locale].manifiesto.photoAlt)).toBeInTheDocument();
  });

  it.each(["es", "en", "pt"] as const)("el título resalta el final en itálica (%s)", (locale) => {
    conIntl(<Manifiesto />, locale);
    const h2 = screen.getByRole("heading", { level: 2 });
    expect(h2.querySelector("em")).not.toBeNull();
    // Las etiquetas de formato no se filtran como texto.
    expect(h2.textContent).not.toContain("<em>");
  });

  it("el link baja a la sección El lugar", () => {
    conIntl(<Manifiesto />);
    expect(screen.getByRole("link", { name: es.manifiesto.link })).toHaveAttribute("href", "#lugar");
  });
});

describe("CtaReserva (Reservá) — noche en la galería", () => {
  it("con reservas por WhatsApp, Reservar ahora lleva a /tarifas", () => {
    conIntl(<CtaReserva bookingMode="whatsapp" />);
    expect(screen.getByRole("link", { name: es.cta.bookNow })).toHaveAttribute("href", "/tarifas");
  });

  it("con reservas online, Reservar ahora lleva a /reservas", () => {
    conIntl(<CtaReserva bookingMode="online" />);
    expect(screen.getByRole("link", { name: es.cta.bookNow })).toHaveAttribute("href", "/reservas");
  });

  it("el botón de WhatsApp abre wa.me y la foto lleva alt", () => {
    conIntl(<CtaReserva bookingMode="whatsapp" />);
    expect(screen.getByRole("link", { name: /whatsapp/i }).getAttribute("href")).toContain("wa.me");
    expect(screen.getByAltText(es.cta.photoAlt)).toBeInTheDocument();
  });

  it.each(["es", "en", "pt"] as const)("el título resalta el final en itálica (%s)", (locale) => {
    conIntl(<CtaReserva bookingMode="whatsapp" />, locale);
    const h2 = screen.getByRole("heading", { level: 2 });
    expect(h2.querySelector("em")).not.toBeNull();
    expect(h2.textContent).not.toContain("<em>");
  });
});

describe("ComoLlegar — banda del lago al anochecer", () => {
  it.each(["es", "en", "pt"] as const)("la banda lleva la foto con alt traducido (%s)", (locale) => {
    conIntl(<ComoLlegar />, locale);
    expect(screen.getByAltText(LOCALES[locale].comoLlegar.photoAlt)).toBeInTheDocument();
  });

  it("la banda va antes del contenido y no tapa el título", () => {
    conIntl(<ComoLlegar />);
    const foto = screen.getByAltText(es.comoLlegar.photoAlt);
    const h2 = screen.getByRole("heading", { level: 2 });
    // DOCUMENT_POSITION_FOLLOWING = 4: el título viene después de la foto.
    expect(foto.compareDocumentPosition(h2) & 4).toBe(4);
  });
});
