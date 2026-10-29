import { describe, it, expect } from "vitest";
import { reservationView, parseView, todayIso } from "@/lib/admin/reservation-views";

type Row = { id: string; status: "pending" | "confirmed" | "released"; check_in: string; check_out: string; created_at: string };
const row = (id: string, status: Row["status"], check_in: string, check_out: string, created_at = "2026-10-01T00:00:00Z"): Row =>
  ({ id, status, check_in, check_out, created_at });

const rows: Row[] = [
  row("pasada", "confirmed", "2026-10-01", "2026-10-03"),
  row("en-curso", "confirmed", "2026-10-28", "2026-10-30"),
  row("lejana", "confirmed", "2026-12-20", "2026-12-24"),
  row("cercana-pend", "pending", "2026-11-05", "2026-11-08"),
  row("liberada", "released", "2026-11-10", "2026-11-12"),
  row("sale-hoy", "confirmed", "2026-10-27", "2026-10-29"),
];

describe("reservationView", () => {
  const today = "2026-10-29";

  it("próximas: no liberadas, que todavía no se fueron, ordenadas por llegada", () => {
    const { list } = reservationView(rows, "upcoming", today);
    expect(list.map((r) => r.id)).toEqual(["sale-hoy", "en-curso", "cercana-pend", "lejana"]);
  });

  it("pendientes / confirmadas / liberadas filtran por estado", () => {
    expect(reservationView(rows, "pending", today).list.map((r) => r.id)).toEqual(["cercana-pend"]);
    expect(reservationView(rows, "released", today).list.map((r) => r.id)).toEqual(["liberada"]);
    expect(reservationView(rows, "confirmed", today).list).toHaveLength(4);
  });

  it("todas: más nuevas primero (por fecha de carga)", () => {
    const r = [row("a", "confirmed", "2026-11-01", "2026-11-02", "2026-10-01T00:00:00Z"), row("b", "confirmed", "2026-11-01", "2026-11-02", "2026-10-05T00:00:00Z")];
    expect(reservationView(r, "all", today).list.map((x) => x.id)).toEqual(["b", "a"]);
  });

  it("cuenta cada vista para las pestañas", () => {
    expect(reservationView(rows, "upcoming", today).counts).toEqual({ upcoming: 4, pending: 1, confirmed: 4, released: 1, all: 6 });
  });
});

describe("parseView", () => {
  it("acepta las vistas conocidas y cae en 'upcoming'", () => {
    expect(parseView("pending")).toBe("pending");
    expect(parseView(undefined)).toBe("upcoming");
    expect(parseView("cualquiera")).toBe("upcoming");
  });
});

describe("todayIso", () => {
  it("usa la fecha de Argentina, no la del servidor en UTC", () => {
    // 29/10 a las 23:30 en Buenos Aires = 30/10 02:30 UTC
    expect(todayIso(new Date("2026-10-30T02:30:00Z"))).toBe("2026-10-29");
  });
});
