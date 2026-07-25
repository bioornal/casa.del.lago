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

const PLACEHOLDER_CBU = "0000000000000000000000";

function envPresent(raw: string | undefined): boolean {
  return (raw ?? "").trim() !== "";
}

function envOrDefault(raw: string | undefined, fallback: string): string {
  return envPresent(raw) ? (raw as string).trim() : fallback;
}

export const BANK_DETAILS = {
  alias: envOrDefault(process.env.NEXT_PUBLIC_CDL_BANK_ALIAS, "CASA.LAGO.URUGUAI"),
  cbu: envOrDefault(process.env.NEXT_PUBLIC_CDL_BANK_CBU, PLACEHOLDER_CBU),
  holder: envOrDefault(process.env.NEXT_PUBLIC_CDL_BANK_HOLDER, "La Casa del Lago Urugua-í"),
};

/**
 * true solo si las tres env vars de datos bancarios fueron seteadas (no vacías).
 */
export function bankDetailsConfigured(): boolean {
  return (
    envPresent(process.env.NEXT_PUBLIC_CDL_BANK_ALIAS) &&
    envPresent(process.env.NEXT_PUBLIC_CDL_BANK_CBU) &&
    envPresent(process.env.NEXT_PUBLIC_CDL_BANK_HOLDER)
  );
}
