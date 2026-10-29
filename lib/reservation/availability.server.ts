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

type Blocked = { byUnit: Record<string, Date[]>; source: "supabase" | "stub" };

/**
 * Noches ocupadas de VARIAS cabañas en UNA consulta: las reservas activas que
 * solapan [from, to). Antes cada cabaña hacía su consulta más un UPDATE de
 * limpieza, en cada búsqueda de cada visitante.
 *
 * Los holds de tarjeta vencidos se descartan en el filtro (pending con
 * expires_at ya pasado) en vez de limpiarlos con un UPDATE en cada lectura:
 * la limpieza real corre sólo antes de insertar una reserva (payments y
 * transfer), que es cuando la constraint de exclusión los necesita fuera.
 *
 * Fail-open: ante cualquier error devuelve "stub" sin fechas, para no romper
 * la UI (la constraint de la base sigue siendo el candado real).
 */
export async function getBlockedNightsByUnit(unitIds: string[], range: DateRange): Promise<Blocked> {
  try {
    const { data, error } = await getServiceClient()
      .from("reservations")
      .select("unit_id, check_in, check_out")
      .in("unit_id", unitIds)
      .neq("status", "released")
      .or(`status.neq.pending,expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .lt("check_in", toDateOnly(range.to))
      .gt("check_out", toDateOnly(range.from));
    if (error) {
      console.error(`[availability] query error para ${unitIds.join(",")}: ${error.message}`);
      return { byUnit: {}, source: "stub" };
    }
    const byUnit: Record<string, Date[]> = Object.fromEntries(unitIds.map((u) => [u, []]));
    for (const r of (data ?? []) as Array<{ unit_id: string; check_in: string; check_out: string }>) {
      (byUnit[r.unit_id] ??= []).push(...expandRange(r.check_in, r.check_out));
    }
    return { byUnit, source: "supabase" };
  } catch (err) {
    console.error(`[availability] error para ${unitIds.join(",")}: ${err instanceof Error ? err.message : String(err)}`);
    return { byUnit: {}, source: "stub" };
  }
}

/** Disponibilidad de una cabaña (la usa la API pública). */
export async function getAvailabilityServer(unitId: UnitId, range: DateRange): Promise<Availability> {
  const { byUnit, source } = await getBlockedNightsByUnit([unitId], range);
  return source === "stub" ? STUB : { disabledDates: byUnit[unitId] ?? [], source };
}
