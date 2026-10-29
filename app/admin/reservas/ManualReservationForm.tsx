"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RangeCalendar } from "@/components/reservas/RangeCalendar";
import type { RangeValue } from "@/lib/reservation/range";
import { computeNights } from "@/lib/reservation/pricing";
import { createManualReservation } from "./actions";

type UnitId = "aratiri" | "aguaribay";
type Props = {
  disabledByUnit: Record<UnitId, Date[]>;
  availabilityHealthy: boolean;
};

const UNIT_LIMITS: Record<UnitId, number> = { aratiri: 6, aguaribay: 7 };

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 44,
  padding: "10px 12px",
  border: "1px solid #d8cfbf",
  borderRadius: 5,
  background: "#fff",
  color: "#1f1d19",
  fontSize: 16,
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 7,
  color: "#6b665d",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: ".12em",
  textTransform: "uppercase",
};

export function ManualReservationForm({ disabledByUnit, availabilityHealthy }: Props) {
  const router = useRouter();
  const [unitId, setUnitId] = useState<UnitId>("aratiri");
  const [range, setRange] = useState<RangeValue>({ checkIn: null, checkOut: null });
  const [guests, setGuests] = useState(2);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [total, setTotal] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Plegado de entrada: en el celular el formulario ocupaba varias pantallas
  // antes de la lista de reservas, que es lo que el dueño mira a diario.
  const [open, setOpen] = useState(false);

  const maxGuests = UNIT_LIMITS[unitId];
  const nights = range.checkIn && range.checkOut ? computeNights(range.checkIn, range.checkOut) : 0;

  const changeUnit = (next: UnitId) => {
    setUnitId(next);
    setGuests((current) => Math.min(current, UNIT_LIMITS[next]));
    setRange({ checkIn: null, checkOut: null });
    setMsg(null);
  };

  const submit = async () => {
    if (!range.checkIn || !range.checkOut) {
      setMsg("Elegí llegada y salida.");
      return;
    }
    setBusy(true);
    setMsg(null);
    const res = await createManualReservation({
      unitId,
      checkIn: fmt(range.checkIn),
      checkOut: fmt(range.checkOut),
      guests,
      firstName,
      lastName,
      email,
      phone,
      total: total ? Number(total) : undefined,
    });
    setBusy(false);
    if (res.ok) {
      setRange({ checkIn: null, checkOut: null });
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setTotal("");
      setMsg("Reserva guardada y fechas bloqueadas en Supabase.");
      router.refresh();
    } else if (res.error === "conflict") {
      setMsg("Esas fechas ya están ocupadas. Actualicé el calendario; elegí otro rango.");
    } else if (res.error === "code" || res.error === "server") {
      setMsg("Hubo un problema al guardar. Probá de nuevo en un momento.");
    } else {
      setMsg("Revisá los datos obligatorios.");
    }
  };

  return (
    <section className="mb-8 overflow-hidden rounded-[12px] border border-borde-medio bg-white shadow-[0_20px_50px_-42px_rgba(21,45,55,.65)]">
      <div className="border-b border-white/10 bg-[#183d43] px-6 py-6 text-marfil md:px-8">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[.24em] text-[#a9cbd5]">Nueva reserva</div>
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h2 className="m-0 font-display text-[30px] font-normal leading-none">Cargar reserva manual</h2>
            <p className="mb-0 mt-2 max-w-[620px] text-[13px] leading-[1.6] text-[#c7dde3]">
              Para reservas tomadas por WhatsApp o fuera del checkout. Al guardar, Supabase bloquea las fechas automáticamente.
            </p>
          </div>
          <div className={`self-start rounded-full px-3 py-1.5 text-[12px] font-semibold md:self-auto ${availabilityHealthy ? "bg-[#d9eee4] text-[#245c3c]" : "bg-[#f8e4c1] text-[#805b1c]"}`}>
            {availabilityHealthy ? "Supabase conectado" : "Verificar disponibilidad"}
          </div>
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="manual-reservation-body"
          onClick={() => setOpen((v) => !v)}
          className="mt-5 inline-flex min-h-[46px] w-full items-center justify-center rounded-[6px] border border-white/25 bg-white/10 px-5 text-[14px] font-semibold text-marfil transition-colors hover:bg-white/15 sm:w-auto"
        >
          {open ? "Cerrar formulario" : "+ Cargar una reserva"}
        </button>
      </div>

      {open && (
      <div id="manual-reservation-body">

      {!availabilityHealthy && (
        <div className="border-b border-[#e9d6a8] bg-[#fef6e7] px-6 py-3 text-[12.5px] leading-[1.5] text-[#7a5a18] md:px-8">
          No se pudo consultar la disponibilidad real. El calendario puede mostrar fechas libres aunque exista una reserva: verificá Supabase antes de guardar.
        </div>
      )}

      <div className="grid gap-8 p-4 md:p-8 lg:grid-cols-[minmax(360px,1.05fr)_minmax(360px,.95fr)]">
        <div className="rounded-[8px] border border-borde-claro bg-[#fbf8f2] p-3 md:p-6">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[.2em] text-lago">Paso 1</div>
              <h3 className="m-0 font-display text-[24px] font-medium">Elegí la cabaña y las fechas</h3>
            </div>
            <span className="text-[12.5px] text-muted">{disabledByUnit[unitId].length} noches ocupadas</span>
          </div>

          <label htmlFor="manual-unit" style={labelStyle}>Cabaña</label>
          <select id="manual-unit" value={unitId} onChange={(e) => changeUnit(e.target.value as UnitId)} style={inputStyle}>
            <option value="aratiri">Aguaribay · hasta 6 huéspedes</option>
            <option value="aguaribay">Aratirí · hasta 7 huéspedes</option>
          </select>

          <div className="admin-calendar mt-5 rounded-[6px] border border-borde-claro bg-white p-1 md:p-4">
            <RangeCalendar value={range} onChange={setRange} disabledDates={disabledByUnit[unitId]} />
          </div>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-muted">
            <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-terracota align-[-1px]" />Llegada / salida</span>
            <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-[#ead3c5] align-[-1px]" />Estadía elegida</span>
            <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-carbon/30 align-[-1px]" />Ocupada</span>
          </div>
        </div>

        <div>
          <div className="mb-5">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-[.2em] text-lago">Paso 2</div>
            <h3 className="m-0 font-display text-[24px] font-medium">Datos del huésped</h3>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nombre" htmlFor="manual-first-name">
              <input id="manual-first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} style={inputStyle} required />
            </Field>
            <Field label="Apellido" htmlFor="manual-last-name">
              <input id="manual-last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} style={inputStyle} required />
            </Field>
            <Field label="Email" htmlFor="manual-email">
              <input id="manual-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} required />
            </Field>
            <Field label="Teléfono" htmlFor="manual-phone" optional>
              <input id="manual-phone" value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} />
            </Field>
            <Field label={`Huéspedes · máximo ${maxGuests}`} htmlFor="manual-guests">
              <input id="manual-guests" type="number" min={1} max={maxGuests} value={guests} onChange={(e) => setGuests(Math.max(1, Math.min(maxGuests, Number(e.target.value) || 1)))} style={inputStyle} required />
            </Field>
            <Field label="Total cobrado" htmlFor="manual-total" optional>
              <input id="manual-total" type="number" min={0} step={100} value={total} onChange={(e) => setTotal(e.target.value)} style={inputStyle} placeholder="Ej. 250000" />
            </Field>
          </div>

          <div className="mb-5 rounded-[7px] border border-[#b9d6d5] bg-[#eaf5f3] px-4 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-[.16em] text-lago">Resumen</div>
            <div className="mt-1 text-[14px] text-carbon">
              {range.checkIn && range.checkOut ? `${fmt(range.checkIn)} → ${fmt(range.checkOut)} · ${nights} ${nights === 1 ? "noche" : "noches"}` : "Elegí un rango en el calendario"}
              <span className="text-muted"> · {guests} {guests === 1 ? "huésped" : "huéspedes"}</span>
            </div>
          </div>

          {msg && <div role="alert" className="mb-4 rounded-[6px] border border-[#e0b9a6] bg-[#f7e9e2] px-4 py-3 text-[13px] leading-[1.5] text-[#8a3b1d]">{msg}</div>}
          <button type="button" disabled={busy} onClick={submit} className="min-h-[50px] w-full rounded-[6px] border-none bg-[#23362B] px-5 py-3.5 text-[14px] font-semibold uppercase tracking-[.12em] text-marfil transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
            {busy ? "Guardando…" : "Guardar reserva confirmada"}
          </button>
          <p className="mb-0 mt-3 text-[13px] leading-[1.5] text-muted">La reserva manual queda confirmada y ocupa el rango en la base de datos.</p>
        </div>
      </div>
      </div>
      )}
    </section>
  );
}

function Field({ label, htmlFor, optional, children }: { label: string; htmlFor: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor}>
      <span style={labelStyle}>{label}{optional && <em className="ml-1 not-italic normal-case tracking-normal text-placeholder">(opcional)</em>}</span>
      {children}
    </label>
  );
}
