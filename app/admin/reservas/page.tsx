import { listReservations, type ReservationStatus } from "@/lib/reservation/reservations.server";
import { signComprobanteUrl } from "@/lib/reservation/comprobante.server";
import { signOut } from "../login/actions";
import { ReservationActions } from "./ReservationActions";

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

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 80px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 30, margin: 0 }}>
          Reservas
        </h1>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <a href="/admin/tarifas" style={{ fontSize: 13, color: "#6b665d", border: "1px solid #E7E0D4", borderRadius: 4, padding: "8px 14px", textDecoration: "none" }}>
            Tarifas
          </a>
          <a href="/admin/pago-prueba" style={{ fontSize: 13, color: "#6b665d", border: "1px solid #E7E0D4", borderRadius: 4, padding: "8px 14px", textDecoration: "none" }}>
            Pago de prueba
          </a>
          <form action={signOut}>
            <button type="submit" style={{ background: "transparent", border: "1px solid #E7E0D4", borderRadius: 4, padding: "8px 14px", fontSize: 13, cursor: "pointer", color: "#6b665d" }}>
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {tabs.map((tb) => (
          <a key={tb} href={`/admin/reservas?filter=${tb}`}
            style={{
              padding: "7px 14px", borderRadius: 20, fontSize: 13, textDecoration: "none",
              border: "1px solid #E7E0D4",
              background: filter === tb ? "#23362B" : "#fff",
              color: filter === tb ? "#F8F5F0" : "#6b665d",
            }}>
            {tb === "pending" ? "Pendientes" : tb === "confirmed" ? "Confirmadas" : tb === "released" ? "Liberadas" : "Todas"}
          </a>
        ))}
      </div>

      {dbError && (
        <div role="alert" style={{ padding: "14px 16px", borderRadius: 6, background: "#fef6e7", border: "1px solid #e9d6a8", color: "#7a5a18", fontSize: 13, marginBottom: 20 }}>
          No se pudo leer Supabase ({dbError}). ¿Ya configuraste el proyecto nuevo
          (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) y corriste el setup.sql?
        </div>
      )}

      {withUrls.length === 0 && !dbError && <p style={{ color: "#6b665d" }}>No hay reservas en este filtro.</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {withUrls.map(({ r, comprobanteUrl }) => (
          <div key={r.id} style={{ background: "#fff", border: "1px solid #E7E0D4", borderRadius: 8, padding: 18, display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr auto", gap: 16, alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600 }}>{r.unit_name}</div>
              <div style={{ fontSize: 13, color: "#6b665d" }}>{r.first_name} {r.last_name} · {r.email}</div>
              <div style={{ fontSize: 13, color: "#6b665d" }}>{r.phone || "—"}</div>
            </div>
            <div style={{ fontSize: 13 }}>
              <div>{r.check_in} → {r.check_out}</div>
              <div style={{ color: "#6b665d" }}>{r.nights} noches · {r.guests} huésp.</div>
              <div style={{ fontWeight: 600 }}>{money(r.total)}</div>
            </div>
            <div style={{ fontSize: 13 }}>
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
                <a href={comprobanteUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "#A04B2A" }}>
                  Ver comprobante ↗
                </a>
              )}
            </div>
            <div>
              {r.payment_method === "transfer" && r.status === "pending" && (
                <ReservationActions id={r.id} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
