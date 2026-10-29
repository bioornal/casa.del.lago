"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// En el celular un toque de más es fácil y "Liberar" no tiene vuelta atrás desde
// el panel: ambas acciones piden confirmación nombrando la reserva.
export function ReservationActions({ id, canConfirm, summary }: { id: string; canConfirm: boolean; summary?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const act = async (action: "confirm" | "release") => {
    const what = summary ? `\n\n${summary}` : "";
    const question =
      action === "confirm"
        ? `¿Confirmar esta reserva? Se le envía el email de confirmación al huésped.${what}`
        : `¿Liberar esta reserva? Las fechas vuelven a quedar disponibles y se le avisa al huésped por email.${what}`;
    if (!confirm(question)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/reservations/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else alert("No se pudo completar la acción.");
  };

  return (
    <div style={{ display: "flex", gap: 8 }}>
      {canConfirm && (
        <button type="button" disabled={busy} onClick={() => act("confirm")}
          style={{ flex: 2, minHeight: 46, padding: "0 20px", background: "#183d43", color: "#F8F5F0", border: "none", borderRadius: 999, cursor: "pointer", fontSize: 14.5, fontWeight: 600 }}>
          {busy ? "Procesando…" : "Confirmar pago"}
        </button>
      )}
      <button type="button" disabled={busy} onClick={() => act("release")}
        style={{ flex: 1, minHeight: 46, padding: "0 20px", background: "transparent", color: "#8a3b1d", border: "1px solid #e0b9a6", borderRadius: 999, cursor: "pointer", fontSize: 14.5 }}>
        Liberar
      </button>
    </div>
  );
}
