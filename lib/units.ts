export type UnitSlug = "aratiri" | "aguaribay";
export type Unit = {
  slug: UnitSlug;
  name: string;
  price: number;
  specs: { guests: number; bedrooms: number; baths: number; area: number };
};
export const UNITS: Unit[] = [
  { slug: "aratiri",    name: "Cabaña Aratirí",    price: 130000, specs: { guests: 6, bedrooms: 2, baths: 1, area: 65 } },
  { slug: "aguaribay",  name: "Cabaña Aguaribay",  price: 95000,  specs: { guests: 4, bedrooms: 1, baths: 1, area: 45 } },
];
export const CLEANING_FEE = 30000;
export const BASE_GUESTS = 2;
export const ARATIRI_PRICE = 130000;
export const AGUARIBAY_PRICE = 95000;

/** Precio por noche según unidad (tarifa plana por unidad, sin importar huéspedes). */
export function pricePerNight(slug: UnitSlug, _guests: number): number {
  switch (slug) {
    case "aratiri":    return ARATIRI_PRICE;
    case "aguaribay":  return AGUARIBAY_PRICE;
  }
}
export function getUnit(slug: string): Unit | undefined {
  return UNITS.find((u) => u.slug === slug);
}
