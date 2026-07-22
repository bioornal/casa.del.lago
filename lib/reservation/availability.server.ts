import { getServiceClient } from "@/lib/supabase/server";
import type { Availability, DateRange } from "./availability";
import type { UnitId } from "./reducer";

// Solo debe importarse desde código server. No agregar "server-only" para
// mantener el módulo testeable en Vitest.

const STUB: Availability = { disabledDates: [], source: "stub" };

function toDateOnly(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

// Expande [checkIn, checkOut) a Dates a medianoche LOCAL, una por noche ocupada
// (incluye checkIn, excluye checkOut → el día de salida queda libre).
function expandRange(checkIn: string, checkOut: string): Date[] {
  const [ys, ms, ds] = checkIn.split("-").map(Number);
  const [ye, me, de] = checkOut.split("-").map(Number);
  const cur = new Date(ys, ms - 1, ds);
  const end = new Date(ye, me - 1, de);
  const out: Date[] = [];
  while (cur < end) {
    out.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/**
 * Disponibilidad real desde Supabase: las reservas activas (status != released)
 * de la unidad que solapan la ventana [from, to). Fail-open: ante cualquier error
 * devuelve el stub (sin fechas deshabilitadas) para no romper la UI.
 */
export async function getAvailabilityServer(
  unitId: UnitId,
  range: DateRange,
): Promise<Availability> {
  try {
    const fromYmd = toDateOnly(range.from);
    const toYmd = toDateOnly(range.to);
    const { data, error } = await getServiceClient()
      .from("reservations")
      .select("check_in, check_out")
      .eq("unit_id", unitId)
      .neq("status", "released")
      .lt("check_in", toYmd)
      .gt("check_out", fromYmd);
    if (error) {
      console.error(`[availability] query error para ${unitId}: ${error.message}`);
      return STUB;
    }
    const rows = (data ?? []) as Array<{ check_in: string; check_out: string }>;
    const disabledDates: Date[] = [];
    for (const r of rows) {
      for (const d of expandRange(r.check_in, r.check_out)) disabledDates.push(d);
    }
    return { disabledDates, source: "supabase" };
  } catch (err) {
    console.error(
      `[availability] error para ${unitId}: ${err instanceof Error ? err.message : String(err)}`,
    );
    return STUB;
  }
}
