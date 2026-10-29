import { AdminHeader } from "@/components/admin/AdminHeader";
import { listReservations, type ReservationStatus } from "@/lib/reservation/reservations.server";
import { signComprobanteUrl } from "@/lib/reservation/comprobante.server";
import { getAvailabilityServer } from "@/lib/reservation/availability.server";
import { ReservationActions } from "./ReservationActions";
import { ManualReservationForm } from "./ManualReservationForm";
import { guestWhatsAppLink, guestTelLink, formatStayDate } from "@/lib/admin/guest-contact";

const money = (n: number) => `$${new Intl.NumberFormat("es-AR").format(n)}`;

export default async function AdminReservasPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter: raw } = await searchParams;
  const filter = (["pending", "confirmed", "released", "all"].includes(raw ?? "")
    ? raw
    : "pending") as ReservationStatus | "all";

  // Fail-open: sin el proyecto Supabase configurado (o DB caída) el panel igual
  // entra y muestra el aviso, en vez de romper con un 500.
  let dbError: string | null = null;
  let rows: Awaited<ReturnType<typeof listReservations>> = [];
  try {
    rows = await listReservations(filter);
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
  }
  const withUrls = await Promise.all(
    rows.map(async (r) => ({
      r,
      comprobanteUrl: r.comprobante_path ? await signComprobanteUrl(r.comprobante_path) : null,
    })),
  );

  const tabs: Array<ReservationStatus | "all"> = ["pending", "confirmed", "released", "all"];

  const winFrom = new Date();
  const winTo = new Date(winFrom.getFullYear() + 1, winFrom.getMonth(), 1);
  const [avAra, avAgu] = await Promise.all([
    getAvailabilityServer("aratiri", { from: winFrom, to: winTo }),
    getAvailabilityServer("aguaribay", { from: winFrom, to: winTo }),
  ]);
  const availabilityHealthy = avAra.source === "supabase" && avAgu.source === "supabase";

  return (
    <div className="mx-auto max-w-[1200px] px-5 pb-24 pt-6 md:px-8 md:pt-10">
      <AdminHeader
        current="reservas"
        title="Reservas"
        description="Disponibilidad, reservas directas y bloqueos manuales en un solo lugar."
        status={{ label: availabilityHealthy ? "Disponibilidad sincronizada con Supabase" : "Disponibilidad requiere revisión", ok: availabilityHealthy }}
      />

      <ManualReservationForm disabledByUnit={{ aratiri: avAra.disabledDates, aguaribay: avAgu.disabledDates }} availabilityHealthy={availabilityHealthy} />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
        {tabs.map((tb) => (
          <a key={tb} href={`/admin/reservas?filter=${tb}`}
            aria-current={filter === tb ? "page" : undefined}
            style={{
              display: "inline-flex", alignItems: "center", minHeight: 44,
              padding: "0 16px", borderRadius: 6, fontSize: 14, textDecoration: "none", letterSpacing: ".02em",
              border: filter === tb ? "1px solid #23362B" : "1px solid #d8cfbf",
              background: filter === tb ? "#23362B" : "#fff",
              color: filter === tb ? "#F8F5F0" : "#6b665d",
            }}>
            {tb === "pending" ? "Pendientes" : tb === "confirmed" ? "Confirmadas" : tb === "released" ? "Liberadas" : "Todas"}
          </a>
        ))}
        </div>
        <span className="text-[13px] text-muted">{withUrls.length} {withUrls.length === 1 ? "reserva" : "reservas"}</span>
      </div>

      {dbError && (
        <div role="alert" style={{ padding: "14px 16px", borderRadius: 6, background: "#fef6e7", border: "1px solid #e9d6a8", color: "#7a5a18", fontSize: 13, marginBottom: 20 }}>
          No se pudo leer Supabase ({dbError}). ¿Ya configuraste el proyecto nuevo
          (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) y corriste el setup.sql?
        </div>
      )}

      {withUrls.length === 0 && !dbError && <p style={{ color: "#6b665d" }}>No hay reservas en este filtro.</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {withUrls.map(({ r, comprobanteUrl }) => {
          const wa = guestWhatsAppLink(r.phone);
          const tel = guestTelLink(r.phone);
          return (
          <div key={r.id} className="admin-reservation-card">
            <div className="admin-reservation-person">
              <div style={{ fontWeight: 600 }}>{r.unit_name}</div>
              <div style={{ fontSize: 15, color: "#1f1d19" }}>{r.first_name} {r.last_name}</div>
              <a href={`mailto:${r.email}`} style={{ fontSize: 14, color: "#6b665d", wordBreak: "break-all" }}>{r.email}</a>
              <div style={{ fontSize: 14, color: "#6b665d" }}>{r.phone || "—"}</div>
              {/* El dueño opera desde el celular: un toque para escribir o llamar. */}
              {(wa || tel) && (
                <div className="admin-contact-actions">
                  {wa && (
                    <a href={wa} target="_blank" rel="noreferrer" className="admin-contact-btn admin-contact-btn--wa">
                      WhatsApp
                    </a>
                  )}
                  {tel && (
                    <a href={tel} className="admin-contact-btn">
                      Llamar
                    </a>
                  )}
                </div>
              )}
            </div>
            <div className="admin-reservation-stay" style={{ fontSize: 14 }}>
              <div style={{ fontWeight: 600 }}>{formatStayDate(r.check_in)} → {formatStayDate(r.check_out)}</div>
              <div style={{ color: "#8a8170", fontSize: 12.5 }}>{r.check_in} → {r.check_out}</div>
              <div style={{ color: "#6b665d" }}>{r.nights} noches · {r.guests} huésp.</div>
              <div style={{ fontWeight: 600 }}>{money(r.total)}</div>
            </div>
            <div className="admin-reservation-meta" style={{ fontSize: 14 }}>
              <div>
                <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 12, background: r.payment_method === "transfer" ? "#eef3ee" : "#f3eee6" }}>
                  {r.payment_method === "transfer" ? "Transferencia" : "Tarjeta"}
                </span>
              </div>
              <div style={{ color: "#6b665d", marginTop: 4 }}>Ref: {r.code}</div>
              {r.payment_id && <div style={{ color: "#6b665d" }}>Pago MP: {r.payment_id}</div>}
              <div style={{ marginTop: 4, fontWeight: 600, color: r.status === "pending" ? "#a06a1d" : r.status === "confirmed" ? "#23362B" : "#8a3b1d" }}>
                {r.status === "pending" ? "Pendiente" : r.status === "confirmed" ? "Confirmada" : "Liberada"}
              </div>
              {comprobanteUrl && (
                <a href={comprobanteUrl} target="_blank" rel="noreferrer" style={{ display: "inline-block", padding: "8px 0", fontSize: 14, color: "#A04B2A" }}>
                  Ver comprobante ↗
                </a>
              )}
            </div>
            <div className="admin-reservation-actions">
              {r.status === "pending" && (
                <ReservationActions
                  id={r.id}
                  canConfirm={r.payment_method === "transfer"}
                  summary={`${r.first_name} ${r.last_name} · ${r.unit_name} · ${formatStayDate(r.check_in)} → ${formatStayDate(r.check_out)}`}
                />
              )}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
