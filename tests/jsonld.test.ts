import { describe, it, expect } from "vitest";
import { accommodationJsonLd, breadcrumbJsonLd } from "@/lib/jsonld";
import { getUnit } from "@/lib/units";

const unit = getUnit("aratiri")!;

describe("accommodationJsonLd", () => {
  const ld = accommodationJsonLd({ unit, locale: "es", nightlyPrice: 140900 });

  it("es un Accommodation con el nombre de la unidad", () => {
    expect(ld["@type"]).toBe("Accommodation");
    expect(ld.name).toBe("Cabaña Aguaribay");
  });

  it("publica el precio por noche en ARS", () => {
    expect(ld.offers.price).toBe(140900);
    expect(ld.offers.priceCurrency).toBe("ARS");
  });

  it("declara capacidad y ambientes desde las specs de la unidad", () => {
    expect(ld.occupancy.maxValue).toBe(unit.specs.guests);
    expect(ld.numberOfRooms).toBe(unit.specs.bedrooms);
    expect(ld.floorSize.value).toBe(unit.specs.area);
  });

  it("la URL es absoluta y del idioma pedido", () => {
    expect(ld.url).toMatch(/^https:\/\/.+\/es\/departamentos\/aratiri$/);
  });

  it("no emite campos vacíos ni undefined", () => {
    expect(JSON.stringify(ld)).not.toContain("undefined");
  });
});

describe("breadcrumbJsonLd", () => {
  const ld = breadcrumbJsonLd({ locale: "es", unit });

  it("tiene 3 niveles: inicio, alojamientoss, unidad", () => {
    expect(ld["@type"]).toBe("BreadcrumbList");
    expect(ld.itemListElement).toHaveLength(3);
    expect(ld.itemListElement[2].name).toBe("Cabaña Aguaribay");
  });

  it("las posiciones van de 1 a 3 en orden", () => {
    expect(ld.itemListElement.map((i) => i.position)).toEqual([1, 2, 3]);
  });
});

describe("lodgingJsonLd", async () => {
  const { lodgingJsonLd, LODGING_ID, accommodationId } = await import("@/lib/jsonld");
  const ld = lodgingJsonLd({ locale: "en", description: "Two cabins", images: ["https://x/1.jpg"], fromPrice: 108200 });
  const [site, lodging] = ld["@graph"] as Array<Record<string, any>>;

  it("WebSite + LodgingBusiness enlazados por @id", () => {
    expect(site["@type"]).toBe("WebSite");
    expect(site.publisher).toEqual({ "@id": LODGING_ID });
    expect(lodging["@type"]).toBe("LodgingBusiness");
    expect(lodging["@id"]).toBe(LODGING_ID);
  });

  it("se conecta con la ficha de Google Maps (sameAs + hasMap)", () => {
    expect(lodging.sameAs).toContain(lodging.hasMap);
    expect(lodging.hasMap).toMatch(/^https:\/\/www\.google\.com\/maps\?cid=\d+$/);
  });

  it("horarios, mascotas y cabañas salen de los datos del sitio", () => {
    expect(lodging.checkinTime).toBe("15:00");
    expect(lodging.checkoutTime).toBe("11:00");
    expect(lodging.petsAllowed).toBe(false);
    expect(lodging.containsPlace.map((p: any) => p["@id"])).toEqual([accommodationId("aratiri"), accommodationId("aguaribay")]);
  });

  it("textos en el idioma de la página y sin undefined", () => {
    expect(lodging.amenityFeature[0].name).toBe("Private pool");
    expect(lodging.priceRange).toContain("108.200");
    expect(JSON.stringify(ld)).not.toContain("undefined");
  });
});

describe("faqJsonLd", async () => {
  const { faqJsonLd } = await import("@/lib/jsonld");
  it("arma un FAQPage con una Question/Answer por ítem", () => {
    const ld = faqJsonLd([{ q: "¿Pileta?", a: "Sí." }]);
    expect(ld["@type"]).toBe("FAQPage");
    expect(ld.mainEntity[0]).toEqual({ "@type": "Question", name: "¿Pileta?", acceptedAnswer: { "@type": "Answer", text: "Sí." } });
  });
});

describe("accommodationJsonLd enlazado", () => {
  it("la cabaña pertenece al negocio por @id y publica precio por noche", async () => {
    const { accommodationJsonLd, LODGING_ID } = await import("@/lib/jsonld");
    const ld = accommodationJsonLd({ unit, locale: "es", nightlyPrice: 108200, description: "Cabaña", images: ["https://x/a.jpg"] });
    expect(ld.containedInPlace).toEqual({ "@id": LODGING_ID });
    expect(ld.offers.priceSpecification.unitText).toBe("noche");
    expect(ld.image).toEqual(["https://x/a.jpg"]);
  });
});
