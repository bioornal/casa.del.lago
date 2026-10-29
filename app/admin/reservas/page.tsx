import Link from "next/link";
import { after } from "next/server";
import { AdminHeader, ADMIN_PAGE } from "@/components/admin/AdminHeader";
import { listReservations, releaseExpiredPendingReservations } from "@/lib/reservation/reservations.server";
import { signComprobanteUrl } from "@/lib/reservation/comprobante.server";
import {
  parseView,
  reservationView,
  todayIso,
  blockedNightsByUnit,
  withExpiredHoldsReleased,
  VIEW_IDS,
  VIEW_LABEL,
} from "@/lib/admin/reservation-views";
import { ManualReservationForm } from "./ManualReservationForm";
import { ReservationCard } from "./ReservationCard";

const EMPTY: Record<string, string> = {
  upcoming: "No hay reservas próximas.",
  pending: "No hay reservas esperando confirmación.",
  confirmed: "Todavía no hay reservas confirmadas.",
  released: "No hay reservas canceladas.",
  all: "Todavía no hay reservas.",
};

export default async function AdminReservasPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter: raw } = await searchParams;
  const view = parseView(raw);
  const today = todayIso();

  // Fail-open: sin el proyecto Supabase configurado (o DB caída) el panel igual
  // entra y muestra el aviso, en vez de romper con un 500.
  let dbError: string | null = null;
  let rows: Awaited<ReturnType<typeof listReservations>> = [];
  try {
    // UNA consulta para todo: la lista, los contadores de cada pestaña y las
    // fechas ocupadas del formulario manual. Antes eran seis consultas en fila
    // (lista + limpieza y disponibilidad por cabaña), ~1,2 s por navegación.
    rows = withExpiredHoldsReleased(await listReservations("all"));
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
  }
  // La limpieza de holds vencidos en la base corre después de responder: la
  // pantalla ya los muestra liberados (withExpiredHoldsReleased).
  after(() =>
    releaseExpiredPendingReservations().catch((err) =>
      console.error("[admin] limpieza de holds falló:", err instanceof Error ? err.message : err),
    ),
  );

  const { list, counts } = reservationView(rows, view, today);
  const withUrls = await Promise.all(
    list.map(async (r) => ({
      r,
      comprobanteUrl: r.comprobante_path ? await signComprobanteUrl(r.comprobante_path) : null,
    })),
  );

  const blocked = blockedNightsByUnit(rows, today);
  const availabilityHealthy = dbError === null;

  return (
    <div className={ADMIN_PAGE}>
      <AdminHeader
        title="Reservas"
        alert={
          dbError
            ? "No se pudieron leer las reservas ni la disponibilidad. Probá recargar en un rato; si sigue, avisale a quien mantiene la web."
            : undefined
        }
      />

      {/* Lo único que pide acción: arriba de todo y con un toque para verlo. */}
      {counts.pending > 0 && view !== "pending" && (
        <Link
          href="/admin/reservas?filter=pending"
          className="mb-4 flex min-h-[52px] items-center justify-between gap-3 rounded-[12px] bg-[#fbecd0] px-4 text-[14.5px] text-[#6b4a12] no-underline"
        >
          <span>
            <strong>{counts.pending}</strong> {counts.pending === 1 ? "reserva espera" : "reservas esperan"} tu confirmación
          </span>
          <span aria-hidden className="text-[18px]">→</span>
        </Link>
      )}

      <ManualReservationForm
        disabledByUnit={{ aratiri: blocked.aratiri ?? [], aguaribay: blocked.aguaribay ?? [] }}
        availabilityHealthy={availabilityHealthy}
      />

      {/* Filtros: una sola fila que se desliza de costado en el celular. */}
      <nav aria-label="Filtrar reservas" className="-mx-4 mb-4 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0">
        <div className="flex w-max gap-2">
          {VIEW_IDS.map((v) => {
            const active = v === view;
            return (
              <Link
                key={v}
                href={`/admin/reservas?filter=${v}`}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-[42px] items-center gap-2 rounded-full border px-4 text-[14px] no-underline ${
                  active ? "border-[#183d43] bg-[#183d43] font-semibold text-marfil" : "border-[#d8cfbf] bg-white text-[#4b473f]"
                }`}
              >
                {VIEW_LABEL[v]}
                <span className={`rounded-full px-1.5 text-[12px] ${active ? "bg-white/15" : "bg-[#f3efe7] text-[#6b665d]"}`}>{counts[v]}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {withUrls.length === 0 && !dbError && (
        <p className="rounded-[12px] border border-dashed border-[#d8cfbf] px-4 py-8 text-center text-[14.5px] text-[#6b665d]">
          {EMPTY[view]}
        </p>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {withUrls.map(({ r, comprobanteUrl }) => (
          <ReservationCard key={r.id} r={r} comprobanteUrl={comprobanteUrl} today={today} />
        ))}
      </div>
    </div>
  );
}
