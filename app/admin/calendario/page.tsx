import Link from "next/link";
import { AdminHeader, ADMIN_PAGE } from "@/components/admin/AdminHeader";
import { listReservations } from "@/lib/reservation/reservations.server";
import { todayIso } from "@/lib/admin/reservation-views";
import { parseMonth, shiftMonth, monthOccupancy } from "@/lib/admin/calendar";
import { UNITS } from "@/lib/units";
import { CalendarMonth, type CalendarStay, type CalendarUnit } from "./CalendarMonth";

export const metadata = { title: "Calendario — Panel La Casa del Lago" };

// Siempre fresco: el calendario tiene que mostrar la última reserva cargada.
export const dynamic = "force-dynamic";

const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

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

  let dbError = false;
  let rows: Awaited<ReturnType<typeof listReservations>> = [];
  try {
    rows = await listReservations("all");
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

  // Sólo lo que ocupa fechas en cabañas reales: sin canceladas ni la unidad de prueba.
  const stays: CalendarStay[] = rows
    .filter((r) => r.status !== "released" && unitIds.has(r.unit_id))
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

  const occ = monthOccupancy(stays, ref.year, ref.month);
  const isCurrent = shiftMonth(ref, 0) === today.slice(0, 7);

  return (
    <div className={ADMIN_PAGE}>
      <AdminHeader
        title="Calendario"
        alert={dbError ? "No se pudieron leer las reservas. Probá recargar en un rato." : undefined}
      />

      {/* Navegación de meses */}
      <div className="mb-4 flex items-center gap-2">
        <Link
          href={`/admin/calendario?mes=${shiftMonth(ref, -1)}`}
          aria-label="Mes anterior"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d8cfbf] bg-white text-[18px] text-carbon no-underline"
        >
          ‹
        </Link>
        <h2 className="m-0 min-w-0 flex-1 text-center font-display text-[24px] font-normal">
          {MONTHS[ref.month - 1]} {ref.year}
        </h2>
        <Link
          href={`/admin/calendario?mes=${shiftMonth(ref, 1)}`}
          aria-label="Mes siguiente"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d8cfbf] bg-white text-[18px] text-carbon no-underline"
        >
          ›
        </Link>
        {!isCurrent && (
          <Link
            href="/admin/calendario"
            className="inline-flex min-h-[44px] items-center rounded-full border border-[#183d43] px-4 text-[14px] font-semibold text-[#183d43] no-underline"
          >
            Hoy
          </Link>
        )}
      </div>

      {/* Leyenda + ocupación del mes */}
      <div className="mb-4 grid grid-cols-2 gap-2">
        {units.map((u) => {
          const n = occ.byUnit[u.id] ?? 0;
          return (
            <div key={u.id} className="flex items-center gap-2.5 rounded-[12px] border border-[#E7E0D4] bg-white px-3 py-2.5">
              <span aria-hidden className="h-8 w-1.5 shrink-0 rounded-full" style={{ background: u.color }} />
              <div className="min-w-0">
                <div className="truncate text-[14.5px] font-semibold text-carbon">{u.short}</div>
                <div className="text-[13px] text-[#6b665d]">
                  {n} de {occ.nights} noches · {Math.round((n / occ.nights) * 100)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <CalendarMonth year={ref.year} month={ref.month} today={today} stays={stays} units={units} />

      <p className="mb-0 mt-4 text-[13px] leading-[1.5] text-[#8a8170]">
        Barra llena: confirmada. Barra rayada: pendiente de pago. El día de salida queda libre para otra llegada.
      </p>
    </div>
  );
}
