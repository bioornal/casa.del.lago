"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RangeCalendar } from "@/components/reservas/RangeCalendar";
import type { RangeValue } from "@/lib/reservation/range";
import { createManualReservation } from "./actions";

type Props = { disabledByUnit: { aratiri: Date[]; aguaribay: Date[] } };

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function ManualReservationForm({ disabledByUnit }: Props) {
  const router = useRouter();
  const [unitId, setUnitId] = useState<"aratiri" | "aguaribay">("aratiri");
  const [range, setRange] = useState<RangeValue>({ checkIn: null, checkOut: null });
  const [guests, setGuests] = useState(2);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [total, setTotal] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!range.checkIn || !range.checkOut) { setMsg("Elegí las fechas."); return; }
    setBusy(true); setMsg(null);
    const res = await createManualReservation({
      unitId, checkIn: fmt(range.checkIn), checkOut: fmt(range.checkOut),
      guests, firstName, lastName, email, phone,
      total: total ? Number(total) : undefined,
    });
    setBusy(false);
    if (res.ok) { setRange({ checkIn: null, checkOut: null }); router.refresh(); }
    else setMsg(res.error === "conflict" ? "Esas fechas ya están ocupadas." : "Revisá los datos.");
  };

  return (
    <div style={{ background: "#fff", border: "1px solid #E7E0D4", borderRadius: 8, padding: 18, marginBottom: 20 }}>
      <h2 style={{ fontSize: 16, marginTop: 0 }}>Cargar reserva manual</h2>
      <select value={unitId} onChange={(e) => setUnitId(e.target.value as "aratiri" | "aguaribay")}>
        <option value="aratiri">Aratirí</option>
        <option value="aguaribay">Aguaribay</option>
      </select>
      <RangeCalendar value={range} onChange={setRange} disabledDates={disabledByUnit[unitId]} />
      <input type="number" min={1} value={guests} onChange={(e) => setGuests(Number(e.target.value))} placeholder="Huéspedes" />
      <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Nombre" />
      <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Apellido" />
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Teléfono (opcional)" />
      <input type="number" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="Total (opcional)" />
      {msg && <p role="alert" style={{ color: "#8a3b1d" }}>{msg}</p>}
      <button type="button" disabled={busy} onClick={submit}
        style={{ padding: "9px 16px", background: "#23362B", color: "#F8F5F0", border: "none", borderRadius: 3, cursor: "pointer" }}>
        Guardar reserva
      </button>
    </div>
  );
}
