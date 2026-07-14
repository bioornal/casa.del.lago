export type UnitSlug = "timbo" | "lapacho" | "guatambu";
export type Unit = {
  slug: UnitSlug;
  name: string;
  price: number;
  specs: { guests: number; bedrooms: number; baths: number; area: number };
};
export const UNITS: Unit[] = [
  { slug: "timbo",    name: "Cabaña Timbó",    price: 130000, specs: { guests: 6, bedrooms: 2, baths: 1, area: 65 } },
  { slug: "lapacho",  name: "Cabaña Lapacho",  price: 95000,  specs: { guests: 4, bedrooms: 1, baths: 1, area: 45 } },
  { slug: "guatambu", name: "Cabaña Guatambú", price: 110000, specs: { guests: 5, bedrooms: 2, baths: 1, area: 55 } },
];
export const CLEANING_FEE = 30000;
export const BASE_GUESTS = 2;
export const TIMBO_PRICE = 130000;
export const LAPACHO_PRICE = 95000;
export const GUATAMBU_PRICE = 110000;

/** Precio por noche según unidad (tarifa plana por unidad, sin importar huéspedes). */
export function pricePerNight(slug: UnitSlug, _guests: number): number {
  switch (slug) {
    case "timbo":    return TIMBO_PRICE;
    case "lapacho":  return LAPACHO_PRICE;
    case "guatambu": return GUATAMBU_PRICE;
  }
}
export function getUnit(slug: string): Unit | undefined {
  return UNITS.find((u) => u.slug === slug);
}
