// Vistas de la lista de reservas del panel. El dueño la abre desde el celular
// para ver quién llega: por eso la vista por defecto es "Próximas" (ordenada por
// llegada), y no la lista cruda por fecha de carga.

export type ReservationViewId = "upcoming" | "pending" | "confirmed" | "released" | "all";

export const VIEW_IDS: ReservationViewId[] = ["upcoming", "pending", "confirmed", "released", "all"];

export const VIEW_LABEL: Record<ReservationViewId, string> = {
  upcoming: "Próximas",
  pending: "Pendientes",
  confirmed: "Confirmadas",
  released: "Liberadas",
  all: "Todas",
};

type Viewable = {
  status: "pending" | "confirmed" | "released";
  check_in: string;
  check_out: string;
  created_at: string;
};

export function parseView(raw: string | undefined): ReservationViewId {
  return VIEW_IDS.includes(raw as ReservationViewId) ? (raw as ReservationViewId) : "upcoming";
}

/** Fecha de hoy (YYYY-MM-DD) en Argentina: el servidor corre en UTC. */
export function todayIso(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(now);
}

function matches(r: Viewable, view: ReservationViewId, today: string): boolean {
  switch (view) {
    case "upcoming":
      // Incluye la que sale hoy: el dueño todavía tiene que recibir la llave.
      return r.status !== "released" && r.check_out >= today;
    case "all":
      return true;
    default:
      return r.status === view;
  }
}

export function reservationView<T extends Viewable>(
  rows: T[],
  view: ReservationViewId,
  today: string,
): { list: T[]; counts: Record<ReservationViewId, number> } {
  const counts = Object.fromEntries(
    VIEW_IDS.map((v) => [v, rows.filter((r) => matches(r, v, today)).length]),
  ) as Record<ReservationViewId, number>;
  const list = rows.filter((r) => matches(r, view, today));
  if (view === "upcoming") list.sort((a, b) => a.check_in.localeCompare(b.check_in));
  else list.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return { list, counts };
}
