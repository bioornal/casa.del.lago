// Datos estáticos del alojamiento para la página de tarifas.
// PLACEHOLDERS: el dueño confirma km reales al lago, horarios y política de mascotas.

export type DistanceKey = "airport" | "falls" | "downtown";
export const DISTANCES: { key: DistanceKey; km: number }[] = [
  { key: "airport", km: 0 }, // TODO: km reales aeropuerto IGR ↔ lago Urugua-í
  { key: "falls", km: 0 },   // TODO: km reales Cataratas ↔ lago
  { key: "downtown", km: 0 }, // TODO: km reales Puerto Libertad ↔ lago
];

export const CHECK_IN = "15:00";
export const CHECK_OUT = "11:00";
export const PETS_ALLOWED = false;

// Servicios mostrados (las etiquetas viven en i18n: tarifas.services.<key>).
export type ServiceKey = "wifi" | "ac" | "kitchen" | "reception" | "parking" | "linens";
export const SERVICES: ServiceKey[] = ["wifi", "ac", "kitchen", "reception", "parking", "linens"];

// Datos bancarios para pago por transferencia. NEXT_PUBLIC_ porque se leen client-side
// (son datos públicos para que el huésped transfiera).
export const BANK_DETAILS = {
  alias: process.env.NEXT_PUBLIC_CDL_BANK_ALIAS ?? "CASA.LAGO.URUGUAI", // TODO: alias real
  cbu: process.env.NEXT_PUBLIC_CDL_BANK_CBU ?? "0000000000000000000000", // TODO: CBU real
  holder: process.env.NEXT_PUBLIC_CDL_BANK_HOLDER ?? "La Casa del Lago Urugua-í", // TODO: titular real
};
