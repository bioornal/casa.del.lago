import { describe, it, expect } from "vitest";
import { buildConfirmationEmail } from "@/lib/reservation/email-template";
// El template VIVO es este. email-template.ts es un duplicado de 126 líneas que
// nadie importa fuera de este archivo: lo mantienen vivo los tests de arriba.
// Se retira en 2C.
import { buildConfirmationEmail as buildReal } from "@/lib/reservation/email/guest-templates";

const base = {
  code: "CDL-2026-AB12",
  unitName: "Casa Aguaribay",
  firstName: "Juan",
  checkIn: "2026-07-02",
  checkOut: "2026-07-05",
  nights: 3,
  guests: 4,
  total: 480000,
  miReservaUrl: "https://aruma.test/es/mi-reserva?code=CDL-2026-AB12",
} as const;

describe("buildConfirmationEmail", () => {
  it("genera subject/html/text para los 3 locales", () => {
    for (const locale of ["es", "en", "pt"] as const) {
      const out = buildConfirmationEmail({ ...base, locale });
      expect(out.subject).toContain("CDL-2026-AB12");
      expect(out.html).toContain("CDL-2026-AB12");
      expect(out.text).toContain("CDL-2026-AB12");
    }
  });

  it("incluye total, unidad y la URL a mi-reserva en el cuerpo", () => {
    const out = buildConfirmationEmail({ ...base, locale: "es" });
    expect(out.html).toContain("Casa Aguaribay");
    expect(out.html).toContain(base.miReservaUrl);
    expect(out.html).toContain("480.000"); // formato es-AR
    expect(out.text).toContain(base.miReservaUrl);
  });

  it("locale inválido cae a es", () => {
    // @ts-expect-error probamos un locale fuera del union
    const out = buildConfirmationEmail({ ...base, locale: "fr" });
    const es = buildConfirmationEmail({ ...base, locale: "es" });
    expect(out.subject).toBe(es.subject);
  });

  it("escapa HTML en campos del huésped (anti-inyección)", () => {
    const out = buildConfirmationEmail({
      ...base, locale: "es", firstName: "<script>x</script>", unitName: "<b>u</b>",
    });
    expect(out.html).not.toContain("<script>x</script>");
    expect(out.html).not.toContain("<b>u</b>");
    expect(out.html).toContain("&lt;script&gt;");
  });
});

describe("robustez del mail rediseñado", () => {
  const input = { ...base, locale: "es" as const, whatsappUrl: "https://wa.me/549123?text=hola" };

  it("sin imágenes, sigue entregando código, unidad, total y estado", () => {
    // Gmail y Outlook bloquean imágenes por defecto: todo dato tiene que
    // viajar como texto, las imágenes son decorativas.
    const { html } = buildReal(input);
    const sinImgs = html.replace(/<img[^>]*>/g, "");
    expect(sinImgs).toContain("CDL-2026-AB12");
    expect(sinImgs).toContain("Casa Aguaribay");
    expect(sinImgs).toContain("155e75"); // la franja de estado sobrevive como color
  });

  it("la maqueta es una tabla de ancho fijo, no un div con max-width", () => {
    // Outlook de escritorio renderiza con el motor de Word, que ignora
    // max-width: con un div el mail se estira a toda la ventana.
    const { html } = buildReal(input);
    expect(html).toContain('width="560"');
    expect(html).not.toMatch(/<div[^>]*max-width/);
  });

  it("menciona el .ics adjunto, que hoy se manda y nunca se nombra", () => {
    const { html, text } = buildReal(input);
    expect(html.toLowerCase()).toMatch(/calendario|agenda/);
    expect(text.toLowerCase()).toMatch(/calendario|agenda/);
  });
});
