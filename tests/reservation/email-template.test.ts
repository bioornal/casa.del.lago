import { describe, it, expect } from "vitest";
// El template VIVO es este: email-template.ts (el duplicado de 126 líneas que
// solo mantenían vivo los tests de acá abajo) se retiró en 2C.
import {
  buildConfirmationEmail,
  buildReleaseEmail,
} from "@/lib/reservation/email/guest-templates";

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

describe("robustez del mail rediseñado", () => {
  const input = { ...base, locale: "es" as const, whatsappUrl: "https://wa.me/549123?text=hola" };

  it("sin imágenes, sigue entregando código, unidad, total y estado", () => {
    // Gmail y Outlook bloquean imágenes por defecto: todo dato tiene que
    // viajar como texto, las imágenes son decorativas.
    const { html } = buildConfirmationEmail(input);
    const sinImgs = html.replace(/<img[^>]*>/g, "");
    expect(sinImgs).toContain("CDL-2026-AB12");
    expect(sinImgs).toContain("Casa Aguaribay");
    expect(sinImgs).toContain("155e75"); // la franja de estado sobrevive como color
  });

  it("la maqueta es una tabla de ancho fijo, no un div con max-width", () => {
    // Outlook de escritorio renderiza con el motor de Word, que ignora
    // max-width: con un div el mail se estira a toda la ventana.
    const { html } = buildConfirmationEmail(input);
    expect(html).toContain('width="560"');
    expect(html).not.toMatch(/<div[^>]*max-width/);
  });

  it("menciona el .ics adjunto, que hoy se manda y nunca se nombra", () => {
    const { html, text } = buildConfirmationEmail(input);
    expect(html.toLowerCase()).toMatch(/calendario|agenda/);
    expect(text.toLowerCase()).toMatch(/calendario|agenda/);
  });

  // Los tres casos de abajo vivían en email-template.ts (el duplicado muerto,
  // retirado en 2C). Esa lógica -los 3 locales, el fallback de locale inválido
  // y el escapado anti-inyección- también vive acá, en el template vigente, y
  // se había quedado sin cobertura propia.
  it("genera subject/html/text para los 3 locales", () => {
    // El subject de es y pt es idéntico ("Reserva confirmada — …"), así que
    // solo comprobar que el código aparece pasaría con cualquier copy —incluso
    // con la selección de idioma rota. El saludo sí varía por locale (Hola/Hi/
    // Olá): es el fragmento que hace discriminante el test.
    const greetingFragment = { es: "Hola Juan,", en: "Hi Juan,", pt: "Olá Juan," } as const;
    for (const locale of ["es", "en", "pt"] as const) {
      const out = buildConfirmationEmail({ ...input, locale });
      expect(out.subject).toContain("CDL-2026-AB12");
      expect(out.html).toContain("CDL-2026-AB12");
      expect(out.text).toContain("CDL-2026-AB12");
      expect(out.html).toContain(greetingFragment[locale]);
      expect(out.text).toContain(greetingFragment[locale]);
    }
  });

  it("locale inválido cae a es", () => {
    // Comparar solo el subject no sirve: es y pt comparten el mismo subject,
    // así que un fallback roto a "pt" pasaría igual. El html completo (saludo,
    // intro, etc.) sí distingue es de pt.
    // @ts-expect-error probamos un locale fuera del union
    const out = buildConfirmationEmail({ ...input, locale: "fr" });
    const es = buildConfirmationEmail({ ...input, locale: "es" });
    expect(out.html).toBe(es.html);
  });

  it("escapa HTML en campos del huésped (anti-inyección)", () => {
    const out = buildConfirmationEmail({
      ...input, firstName: "<script>x</script>", unitName: "<b>u</b>",
    });
    expect(out.html).not.toContain("<script>x</script>");
    expect(out.html).not.toContain("<b>u</b>");
    expect(out.html).toContain("&lt;script&gt;");
  });
});

describe("buildReleaseEmail", () => {
  const input = {
    code: "CDL-2026-AB12",
    unitName: "Casa Aguaribay",
    firstName: "Juan",
    checkIn: "2026-07-02",
    checkOut: "2026-07-05",
    locale: "es" as const,
    whatsappUrl: "https://wa.me/549123?text=hola",
  };

  it("lleva la identidad del lago, no la heredada de Aruma", () => {
    // Este mail se quedó en el sobre viejo cuando la confirmación se rediseñó:
    // le llegaba al huésped con el verde y el terracota de otro hotel.
    const { html } = buildReleaseEmail(input);
    expect(html).toContain("155e75"); // lago
    expect(html.toLowerCase()).not.toContain("23362b"); // verde de Aruma
    expect(html.toLowerCase()).not.toContain("a04b2a"); // terracota de Aruma
  });

  it("comparte el shell: tabla de ancho fijo, no un div con max-width", () => {
    const { html } = buildReleaseEmail(input);
    expect(html).toContain('width="560"');
    expect(html).not.toMatch(/<div[^>]*max-width/);
  });

  it("no lleva foto de portada: para una mala noticia es el tono equivocado", () => {
    const { html } = buildReleaseEmail(input);
    expect(html).not.toContain("hero");
  });

  it("sin imágenes, sigue diciendo qué reserva se liberó y cómo reclamarla", () => {
    const { html } = buildReleaseEmail(input);
    const sinImgs = html.replace(/<img[^>]*>/g, "");
    expect(sinImgs).toContain("CDL-2026-AB12");
    expect(sinImgs).toContain("Casa Aguaribay");
    expect(sinImgs).toContain(input.whatsappUrl);
  });

  it("no culpa al huésped: no dice 'rechazado' ni 'inválido'", () => {
    for (const locale of ["es", "en", "pt"] as const) {
      const { html, text } = buildReleaseEmail({ ...input, locale });
      expect(`${html} ${text}`.toLowerCase()).not.toMatch(
        /rechaz|inválid|invalid|rejected/,
      );
    }
  });

  it("escapa HTML en campos del huésped (anti-inyección)", () => {
    const { html } = buildReleaseEmail({
      ...input, firstName: "<script>x</script>", unitName: "<b>u</b>",
    });
    expect(html).not.toContain("<script>x</script>");
    expect(html).not.toContain("<b>u</b>");
    expect(html).toContain("&lt;script&gt;");
  });
});
