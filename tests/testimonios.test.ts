import { describe, it, expect } from "vitest";
import {
  parseTestimonioInput,
  parseAggregateInput,
  rowToTestimonio,
  rowToAggregate,
  isMostrable,
  DEFAULT_AGGREGATE,
  BODY_MAX,
  FICHA_URL,
  type TestimonioInput,
} from "@/lib/reviews/testimonios";

const VALIDO: TestimonioInput = {
  author: "  Ana P.  ",
  body: "  Todo impecable, volvemos.  ",
  lang: "es",
  rating: "5",
  date_label: " hace 2 meses ",
};

describe("parseTestimonioInput", () => {
  it("acepta una carga válida y recorta los espacios", () => {
    const r = parseTestimonioInput(VALIDO);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toEqual({
      author: "Ana P.",
      body: "Todo impecable, volvemos.",
      lang: "es",
      rating: 5,
      dateLabel: "hace 2 meses",
    });
  });

  it("exige autor y texto", () => {
    expect(parseTestimonioInput({ ...VALIDO, author: "   " })).toMatchObject({ ok: false });
    expect(parseTestimonioInput({ ...VALIDO, body: "  " })).toMatchObject({ ok: false });
  });

  it("rechaza el texto que viene con comillas: las agrega el sitio", () => {
    for (const q of ['"Muy lindo"', "“Muy lindo”", "«Muy lindo»"]) {
      const r = parseTestimonioInput({ ...VALIDO, body: q });
      expect(r.ok, `debería rechazar ${q}`).toBe(false);
    }
  });

  it("rechaza textos más largos que el tope de la grilla", () => {
    const r = parseTestimonioInput({ ...VALIDO, body: "a".repeat(BODY_MAX + 1) });
    expect(r.ok).toBe(false);
    // El largo exacto en el mensaje: sin eso el admin no sabe cuánto recortar.
    if (!r.ok) expect(r.error).toContain(String(BODY_MAX + 1));
  });

  it("acepta justo el tope", () => {
    expect(parseTestimonioInput({ ...VALIDO, body: "a".repeat(BODY_MAX) }).ok).toBe(true);
  });

  it("rechaza idiomas fuera de es/pt/en", () => {
    expect(parseTestimonioInput({ ...VALIDO, lang: "fr" })).toMatchObject({ ok: false });
  });

  it("rechaza estrellas fuera de 1–5 o no enteras", () => {
    for (const rating of ["0", "6", "4.5", "", "cinco"]) {
      expect(parseTestimonioInput({ ...VALIDO, rating }).ok, `rating=${rating}`).toBe(false);
    }
  });
});

describe("rowToTestimonio", () => {
  it("mapea una fila completa", () => {
    expect(
      rowToTestimonio({
        id: "abc",
        author: " Ana ",
        body: " Hola ",
        lang: "pt",
        rating: 4,
        date_label: " marzo ",
        position: 3,
        published: true,
      }),
    ).toEqual({
      id: "abc",
      author: "Ana",
      body: "Hola",
      lang: "pt",
      rating: 4,
      dateLabel: "marzo",
      position: 3,
      published: true,
    });
  });

  it("cae a valores seguros con columnas nulas o basura", () => {
    const t = rowToTestimonio({ id: "x", lang: "klingon", rating: 99 });
    expect(t.lang).toBe("es");
    expect(t.rating).toBe(5);
    expect(t.position).toBe(0);
    // published sólo es false si la columna dice false explícitamente.
    expect(t.published).toBe(true);
  });

  it("no considera mostrable una fila sin texto o sin autor", () => {
    expect(isMostrable(rowToTestimonio({ id: "x", author: "Ana", body: "  " }))).toBe(false);
    expect(isMostrable(rowToTestimonio({ id: "x", author: "  ", body: "Hola" }))).toBe(false);
    expect(isMostrable(rowToTestimonio({ id: "x", author: "Ana", body: "Hola" }))).toBe(true);
  });
});

describe("parseAggregateInput", () => {
  it("acepta coma o punto y redondea a un decimal", () => {
    expect(parseAggregateInput({ rating: "4,7", count: "88" })).toEqual({
      ok: true,
      value: { rating: 4.7, count: 88 },
    });
    expect(parseAggregateInput({ rating: "4.72", count: "88" })).toMatchObject({
      ok: true,
      value: { rating: 4.7 },
    });
  });

  it("rechaza puntajes fuera de 0–5 y totales no enteros", () => {
    expect(parseAggregateInput({ rating: "5.1", count: "88" }).ok).toBe(false);
    expect(parseAggregateInput({ rating: "0", count: "88" }).ok).toBe(false);
    expect(parseAggregateInput({ rating: "4,7", count: "88.5" }).ok).toBe(false);
    expect(parseAggregateInput({ rating: "4,7", count: "-1" }).ok).toBe(false);
  });
});

describe("rowToAggregate", () => {
  it("acepta el numeric que postgrest manda como string", () => {
    expect(rowToAggregate({ reviews_rating: "4.7", reviews_count: 88 })).toEqual({
      rating: 4.7,
      count: 88,
    });
  });

  it("cae al default si las columnas faltan o traen basura", () => {
    expect(rowToAggregate({})).toEqual(DEFAULT_AGGREGATE);
    expect(rowToAggregate({ reviews_rating: 9, reviews_count: -3 })).toEqual(DEFAULT_AGGREGATE);
  });
});

describe("FICHA_URL", () => {
  it("apunta a Google Maps por CID", () => {
    expect(FICHA_URL).toMatch(/^https:\/\/www\.google\.com\/maps\?cid=\d+$/);
  });
});
