import { AdminHeader } from "@/components/admin/AdminHeader";
import { listActiveStaysBetween, type StayRow } from "@/lib/reservation/reservations.server";
import { todayIso } from "@/lib/admin/reservation-views";
import { parseMonth, getMonthsSequence, multiMonthDateBounds } from "@/lib/admin/calendar";
import { UNITS } from "@/lib/units";
import { AdminCalendarView } from "./AdminCalendarView";
import type { CalendarStay, CalendarUnit } from "./CalendarMonth";

export const metadata = { title: "Calendario — Panel La Casa del Lago" };

// Siempre fresco: el calendario tiene que mostrar la última reserva cargada.
export const dynamic = "force-dynamic";

// Un color fijo por cabaña, el mismo en la barra, la agenda y la leyenda.
const UNIT_COLORS: Record<string, { color: string; soft: string }> = {
  aratiri: { color: "#A04B2A", soft: "#f6e3d9" },
  aguaribay: { color: "#1f6f78", soft: "#dcefef" },
};

export default async function AdminCalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const today = todayIso();
  const ref = parseMonth(mes, today);

  // Traemos un búfer de 5 meses consecutivos a partir del mes de referencia.
  // Permite alternar en PC entre 1, 2, 3 o 4 meses al instante sin saltos ni esperas.
  const bufferMonths = getMonthsSequence(ref, 5);
  const { fromIso, toIso } = multiMonthDateBounds(bufferMonths);

  let dbError = false;
  let rows: StayRow[] = [];
  try {
    rows = await listActiveStaysBetween(fromIso, toIso);
  } catch {
    dbError = true;
  }

  const units: CalendarUnit[] = UNITS.map((u) => ({
    id: u.slug,
    name: u.name,
    short: u.name.replace(/^Cabaña\s+/, ""),
    ...(UNIT_COLORS[u.slug] ?? { color: "#6b665d", soft: "#eee" }),
  }));
  const unitIds = new Set(units.map((u) => u.id));

  // Sólo cabañas reales: la unidad de prueba no se dibuja (las canceladas ya
  // vienen filtradas desde la consulta).
  const stays: CalendarStay[] = rows
    .filter((r) => unitIds.has(r.unit_id))
    .map((r) => ({
      id: r.id,
      unit_id: r.unit_id,
      unit_name: r.unit_name,
      status: r.status as CalendarStay["status"],
      check_in: r.check_in,
      check_out: r.check_out,
      first_name: r.first_name,
      last_name: r.last_name,
      guests: r.guests,
      nights: r.nights,
      phone: r.phone,
    }));

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-[calc(96px+env(safe-area-inset-bottom))] pt-5 md:px-8 md:pb-24 md:pt-8">
      <AdminHeader
        title="Calendario"
        alert={dbError ? "No se pudieron leer las reservas. Probá recargar en un rato." : undefined}
      />

      <AdminCalendarView
        initialRef={ref}
        today={today}
        stays={stays}
        units={units}
      />

      <p className="mb-0 mt-4 text-[13px] leading-[1.5] text-[#8a8170]">
        Barra llena: confirmada. Barra rayada: pendiente de pago. El día de salida queda libre para otra llegada.
      </p>
    </div>
  );
}
