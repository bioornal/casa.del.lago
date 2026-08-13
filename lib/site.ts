// Datos estáticos del alojamiento para la página de tarifas.
// Distancias reales por ruta (OSRM/OpenStreetMap, ago-2026) desde el complejo
// (-25.8439634, -54.5348569, Ex Ruta 12, Puerto Libertad).

export type DistanceKey = "airport" | "falls" | "downtown" | "foz" | "cde";
export const DISTANCES: { key: DistanceKey; km: number }[] = [
  { key: "airport", km: 30 }, // Aeropuerto IGR (~40 min)
  { key: "falls", km: 27 },   // Acceso Parque Nacional Iguazú, lado argentino (~35 min)
  { key: "downtown", km: 15 }, // Puerto Libertad centro (~20 min)
  { key: "foz", km: 45 },     // Foz do Iguaçu centro, BR (~55 min + aduana)
  { key: "cde", km: 50 },     // Ciudad del Este (Monalisa), PY (~65 min + 2 aduanas)
];

export const CHECK_IN = "15:00";
export const CHECK_OUT = "11:00";
export const PETS_ALLOWED = false;

// Servicios mostrados (las etiquetas viven en i18n: tarifas.services.<key>).
export type ServiceKey = "wifi" | "ac" | "kitchen" | "reception" | "parking" | "linens";
export const SERVICES: ServiceKey[] = ["wifi", "ac", "kitchen", "reception", "parking", "linens"];

function envPresent(raw: string | undefined): boolean {
  return (raw ?? "").trim() !== "";
}

function envOrDefault(raw: string | undefined, fallback: string): string {
  return envPresent(raw) ? (raw as string).trim() : fallback;
}

// Única cuenta para transferencias manuales. No se muestra CBU porque no fue
// informado; el alias alcanza para operar la transferencia.
export const BRUBANK_DETAILS = {
  bank: "Brubank",
  alias: envOrDefault(process.env.NEXT_PUBLIC_CDL_BRUBANK_ALIAS, "jmhbank"),
  holder: envOrDefault(process.env.NEXT_PUBLIC_CDL_BRUBANK_HOLDER, "Juan Manuel Hambley"),
};
