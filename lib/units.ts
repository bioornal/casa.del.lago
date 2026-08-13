export type UnitSlug = "aratiri" | "aguaribay";
export type Unit = {
  slug: UnitSlug;
  name: string;
  price: number;
  specs: { guests: number; bedrooms: number; baths: number; area: number };
};
export const UNITS: Unit[] = [
  { slug: "aratiri",    name: "Cabaña Aratirí",    price: 99800, specs: { guests: 6, bedrooms: 2, baths: 1, area: 65 } },
  { slug: "aguaribay",  name: "Cabaña Aguaribay",  price: 99800, specs: { guests: 7, bedrooms: 1, baths: 1, area: 45 } },
];
export const CLEANING_FEE = 30000;
export const BASE_GUESTS = 2;
export const EXTRA_GUEST_FEE = 20000;
export const ARATIRI_PRICE = 99800;
export const AGUARIBAY_PRICE = 99800;

/** Tarifa de temporada baja: base para 2 huéspedes + $20.000 por adicional. */
export function pricePerNight(slug: UnitSlug, guests: number): number {
  const base = slug === "aratiri" ? ARATIRI_PRICE : AGUARIBAY_PRICE;
  return base + Math.max(0, guests - BASE_GUESTS) * EXTRA_GUEST_FEE;
}
export function getUnit(slug: string): Unit | undefined {
  return UNITS.find((u) => u.slug === slug);
}
