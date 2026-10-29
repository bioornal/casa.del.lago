// Vistas de la lista de reservas del panel. El dueño la abre desde el celular
// para ver quién llega: por eso la vista por defecto es "Próximas" (ordenada por
// llegada), y no la lista cruda por fecha de carga.

export type ReservationViewId = "upcoming" | "pending" | "confirmed" | "released" | "all";

export const VIEW_IDS: ReservationViewId[] = ["upcoming", "pending", "confirmed", "released", "all"];

export const VIEW_LABEL: Record<ReservationViewId, string> = {
  upcoming: "Próximas",
  pending: "Pendientes",
  confirmed: "Confirmadas",
  released: "Canceladas",
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

/**
 * Noches ocupadas por cabaña (Date a medianoche local, como las espera el
 * RangeCalendar), sacadas de las mismas filas que ya trae la lista. Antes el
 * panel hacía cuatro consultas más a Supabase para lo mismo. Se omiten las
 * reservas que ya terminaron antes de `fromIso`.
 */
export function blockedNightsByUnit(
  rows: Array<{ unit_id: string; status: string; check_in: string; check_out: string }>,
  fromIso: string,
): Record<string, Date[]> {
  const out: Record<string, Date[]> = {};
  for (const r of rows) {
    if (r.status === "released" || r.check_out <= fromIso) continue;
    const [ys, ms, ds] = r.check_in.split("-").map(Number);
    const [ye, me, de] = r.check_out.split("-").map(Number);
    const cur = new Date(ys, ms - 1, ds);
    const end = new Date(ye, me - 1, de);
    const list = (out[r.unit_id] ??= []);
    while (cur < end) {
      list.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
  }
  return out;
}

/**
 * Un hold de tarjeta vencido se muestra ya como liberado, sin esperar a que la
 * limpieza en la base termine: así la limpieza puede correr después de
 * responder y no retrasa la pantalla.
 */
export function withExpiredHoldsReleased<T extends { status: string; expires_at: string | null }>(
  rows: T[],
  now: Date = new Date(),
): T[] {
  // Date.parse y no comparación de texto: Supabase devuelve "+00:00", no "Z".
  const nowMs = now.getTime();
  return rows.map((r) =>
    r.status === "pending" && r.expires_at !== null && Date.parse(r.expires_at) < nowMs ? { ...r, status: "released" } : r,
  );
}
