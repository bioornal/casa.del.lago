import type { ReservationRow } from "@/lib/reservation/reservations.server";
import { guestWhatsAppLink, guestTelLink, formatStayDate } from "@/lib/admin/guest-contact";
import { ReservationActions } from "./ReservationActions";

const money = (n: number) => `$${new Intl.NumberFormat("es-AR").format(n)}`;
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const METHOD: Record<string, string> = { transfer: "Transferencia", card: "Tarjeta", manual: "Carga manual" };

/** Etiqueta de estado pensada para el día a día: primero lo que pasa hoy. */
function stateTag(r: ReservationRow, today: string): { label: string; cls: string } {
  if (r.status === "released") return { label: "Liberada", cls: "bg-[#f3e6e0] text-[#8a3b1d]" };
  if (r.status === "pending") return { label: "Pendiente", cls: "bg-[#fbecd0] text-[#805b1c]" };
  if (r.check_in === today) return { label: "Llega hoy", cls: "bg-[#183d43] text-marfil" };
  if (r.check_out === today) return { label: "Sale hoy", cls: "bg-[#e3eef0] text-[#183d43]" };
  if (r.check_in < today && r.check_out > today) return { label: "En la casa", cls: "bg-[#d9eee4] text-[#245c3c]" };
  if (r.check_out < today) return { label: "Finalizada", cls: "bg-[#efebe4] text-[#6b665d]" };
  return { label: "Confirmada", cls: "bg-[#d9eee4] text-[#245c3c]" };
}

export function ReservationCard({
  r,
  comprobanteUrl,
  today,
}: {
  r: ReservationRow;
  comprobanteUrl: string | null;
  today: string;
}) {
  const wa = guestWhatsAppLink(r.phone);
  const tel = guestTelLink(r.phone);
  const tag = stateTag(r, today);
  const [, m, d] = r.check_in.split("-");
  const pending = r.status === "pending";

  return (
    <article
      className={`overflow-hidden rounded-[14px] border bg-white shadow-[0_14px_34px_-30px_rgba(21,45,55,.8)] ${
        pending ? "border-[#e9cf9c]" : "border-[#E7E0D4]"
      } ${r.status === "released" ? "opacity-75" : ""}`}
    >
      <div className="flex gap-3.5 p-4">
        {/* Día de llegada, como hoja de almanaque */}
        <div className="flex h-[58px] w-[52px] shrink-0 flex-col items-center justify-center rounded-[10px] bg-[#f3efe7] text-carbon">
          <span className="font-display text-[24px] leading-none">{Number(d)}</span>
          <span className="mt-0.5 text-[11.5px] font-semibold uppercase tracking-[.08em] text-[#8a8170]">{MONTHS[Number(m) - 1]}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-[16.5px] font-semibold text-carbon">
                {r.first_name} {r.last_name}
              </div>
              <div className="truncate text-[13.5px] text-[#6b665d]">{r.unit_name}</div>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold ${tag.cls}`}>{tag.label}</span>
          </div>

          <div className="mt-2 text-[14px] text-carbon">
            {formatStayDate(r.check_in)} → {formatStayDate(r.check_out)}
          </div>
          <div className="mt-0.5 text-[13.5px] text-[#6b665d]">
            {r.nights} {r.nights === 1 ? "noche" : "noches"} · {r.guests} {r.guests === 1 ? "huésped" : "huéspedes"} ·{" "}
            <span className="font-semibold text-carbon">{money(r.total)}</span> · {METHOD[r.payment_method] ?? r.payment_method}
          </div>
        </div>
      </div>

      {(wa || tel || pending) && (
        <div className="flex flex-wrap gap-2 border-t border-[#f0eae0] px-4 py-3">
          {wa && (
            <a href={wa} target="_blank" rel="noreferrer" className="admin-contact-btn admin-contact-btn--wa flex-1">
              WhatsApp
            </a>
          )}
          {tel && (
            <a href={tel} className="admin-contact-btn flex-1">
              Llamar
            </a>
          )}
          {pending && (
            <div className="basis-full">
              {comprobanteUrl && (
                <a href={comprobanteUrl} target="_blank" rel="noreferrer" className="mb-2 flex min-h-[44px] items-center justify-center rounded-full border border-[#e0b9a6] text-[14px] text-[#A04B2A] no-underline">
                  Ver comprobante de transferencia ↗
                </a>
              )}
              <ReservationActions
                id={r.id}
                canConfirm={r.payment_method === "transfer"}
                summary={`${r.first_name} ${r.last_name} · ${r.unit_name} · ${formatStayDate(r.check_in)} → ${formatStayDate(r.check_out)}`}
              />
            </div>
          )}
        </div>
      )}

      <details className="group border-t border-[#f0eae0]">
        <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between px-4 text-[13.5px] text-[#6b665d] [&::-webkit-details-marker]:hidden">
          Detalles
          <svg aria-hidden className=" h-4 w-4 transition-transform group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
        </summary>
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 px-4 pb-4 text-[13.5px]">
          <dt className="text-[#8a8170]">Código</dt>
          <dd className="m-0 font-mono text-carbon">{r.code}</dd>
          <dt className="text-[#8a8170]">Email</dt>
          <dd className="m-0 break-all">
            <a href={`mailto:${r.email}`} className="text-[#155e75]">{r.email}</a>
          </dd>
          <dt className="text-[#8a8170]">Teléfono</dt>
          <dd className="m-0 text-carbon">{r.phone || "—"}</dd>
          <dt className="text-[#8a8170]">Fechas</dt>
          <dd className="m-0 text-carbon">{r.check_in} → {r.check_out}</dd>
          {r.payment_id && (
            <>
              <dt className="text-[#8a8170]">Pago MP</dt>
              <dd className="m-0 break-all text-carbon">{r.payment_id}</dd>
            </>
          )}
          {!pending && comprobanteUrl && (
            <>
              <dt className="text-[#8a8170]">Comprobante</dt>
              <dd className="m-0">
                <a href={comprobanteUrl} target="_blank" rel="noreferrer" className="text-[#A04B2A]">Ver ↗</a>
              </dd>
            </>
          )}
        </dl>
      </details>
    </article>
  );
}
