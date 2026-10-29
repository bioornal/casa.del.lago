"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Action = "confirm" | "release" | "cancel" | "delete";

// En el celular un toque de más es fácil: toda acción pide confirmación
// nombrando la reserva y diciendo qué pasa después.
const QUESTION: Record<Action, string> = {
  confirm: "¿Confirmar esta reserva? Se le envía el email de confirmación al huésped.",
  release: "¿Liberar esta reserva? Las fechas vuelven a quedar disponibles y se le avisa al huésped por email.",
  cancel:
    "¿Cancelar esta reserva? Las fechas vuelven a quedar libres en la web.\nNo se le envía ningún email al huésped: avisale vos por WhatsApp.\nSi pagó con tarjeta, el reembolso se hace desde Mercado Pago.",
  delete: "¿Eliminar esta reserva para siempre? Desaparece del historial y no se puede deshacer.",
};

const pill = "min-h-[46px] rounded-full px-5 text-[14.5px] disabled:opacity-50";

export function ReservationActions({
  id,
  status,
  canConfirm,
  summary,
}: {
  id: string;
  status: "pending" | "confirmed" | "released";
  canConfirm?: boolean;
  summary?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const act = async (action: Action) => {
    if (!confirm(`${QUESTION[action]}${summary ? `\n\n${summary}` : ""}`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/reservations/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else alert("No se pudo completar la acción. Recargá la página y probá de nuevo.");
  };

  if (status === "pending") {
    return (
      <div className="flex gap-2">
        {canConfirm && (
          <button type="button" disabled={busy} onClick={() => act("confirm")} className={`${pill} flex-[2] bg-[#183d43] font-semibold text-marfil`}>
            {busy ? "Procesando…" : "Confirmar pago"}
          </button>
        )}
        <button type="button" disabled={busy} onClick={() => act("release")} className={`${pill} flex-1 border border-[#e0b9a6] bg-transparent text-[#8a3b1d]`}>
          Liberar
        </button>
      </div>
    );
  }

  if (status === "confirmed") {
    return (
      <button type="button" disabled={busy} onClick={() => act("cancel")} className={`${pill} w-full border border-[#e0b9a6] bg-white text-[#8a3b1d] sm:w-auto`}>
        {busy ? "Cancelando…" : "Cancelar reserva"}
      </button>
    );
  }

  return (
    <button type="button" disabled={busy} onClick={() => act("delete")} className={`${pill} w-full border border-[#e0b9a6] bg-white text-[#8a3b1d] sm:w-auto`}>
      {busy ? "Eliminando…" : "Eliminar del historial"}
    </button>
  );
}
