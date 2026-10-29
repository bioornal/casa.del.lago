"use client";

import { useState } from "react";
import { monthGrid, occupiedNight, overlapsDay } from "@/lib/admin/calendar";
import { formatStayDate, guestWhatsAppLink } from "@/lib/admin/guest-contact";

export type CalendarStay = {
  id: string;
  unit_id: string;
  unit_name: string;
  status: "pending" | "confirmed";
  check_in: string;
  check_out: string;
  first_name: string;
  last_name: string;
  guests: number;
  nights: number;
  phone: string | null;
};

export type CalendarUnit = { id: string; name: string; short: string; color: string; soft: string };

export const WEEKDAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

/** Fondo de la barra: lleno si está confirmada, rayado si todavía está pendiente. */
export function barStyle(u: CalendarUnit, pending: boolean): React.CSSProperties {
  return pending
    ? { background: `repeating-linear-gradient(135deg, ${u.soft} 0 5px, ${u.color}55 5px 9px)`, color: u.color }
    : { background: u.color, color: "#fff" };
}

export function CalendarMonth({
  year,
  month,
  today,
  stays,
  units,
  onZoomOut,
  zoomBackLabel,
}: {
  year: number;
  month: number;
  today: string;
  stays: CalendarStay[];
  units: CalendarUnit[];
  onZoomOut?: () => void;
  zoomBackLabel?: string;
}) {
  const weeks = monthGrid(year, month);
  const inMonthToday = today.startsWith(`${year}-${String(month).padStart(2, "0")}`);
  const [selected, setSelected] = useState<string | null>(inMonthToday ? today : null);
  const unitById = Object.fromEntries(units.map((u) => [u.id, u]));

  const monthFrom = weeks[0][0].iso;
  const monthTo = weeks[weeks.length - 1][6].iso;
  const agenda = stays
    .filter((s) => (selected ? overlapsDay(s, selected) : s.check_in <= monthTo && s.check_out >= monthFrom))
    .sort((a, b) => a.check_in.localeCompare(b.check_in));

  return (
    <div>
      {onZoomOut && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-[#183d43]/15 bg-[#f0f6f6] px-4 py-2.5">
          <div className="flex items-center gap-2 text-[13.5px] text-[#183d43]">
            <span className="font-semibold">Modo ampliado</span>
            <span className="text-[#6b665d]">· Vista detallada del mes con agenda lateral</span>
          </div>
          <button
            type="button"
            onClick={onZoomOut}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-[#183d43] bg-white px-3.5 py-1 text-[13px] font-semibold text-[#183d43] shadow-xs hover:bg-[#183d43] hover:text-white transition-colors cursor-pointer"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {zoomBackLabel ?? "Volver a vista múltiple"}
          </button>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
      <div className="overflow-hidden rounded-[14px] border border-[#E7E0D4] bg-white">
        <div className="grid grid-cols-7 border-b border-[#f0eae0] bg-[#fbf8f2]">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2 text-center text-[12px] font-semibold uppercase tracking-[.06em] text-[#8a8170]">
              {d}
            </div>
          ))}
        </div>

        {weeks.map((week) => (
          <div key={week[0].iso} className="grid grid-cols-7 border-b border-[#f3eee6] last:border-b-0">
            {week.map((day, col) => {
              const isToday = day.iso === today;
              const isSel = day.iso === selected;
              return (
                <button
                  key={day.iso}
                  type="button"
                  onClick={() => setSelected(isSel ? null : day.iso)}
                  aria-pressed={isSel}
                  aria-label={`${formatStayDate(day.iso)}${isToday ? " (hoy)" : ""}`}
                  className={`relative flex min-h-[74px] flex-col pb-1.5 pt-1 text-left md:min-h-[96px] ${
                    day.inMonth ? "" : "bg-[#faf8f4]"
                  } ${isSel ? "bg-[#eef5f5]" : ""} ${col < 6 ? "border-r border-[#f3eee6]" : ""}`}
                >
                  <span
                    className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-[13.5px] md:mx-1.5 ${
                      isToday ? "bg-[#183d43] font-semibold text-white" : day.inMonth ? "text-carbon" : "text-[#c2b9aa]"
                    }`}
                  >
                    {day.day}
                  </span>

                  {/* Una franja fija por cabaña: así se lee de un vistazo cuál está libre. */}
                  <span className="mt-1 flex flex-col gap-[3px]">
                    {units.map((u) => {
                      const night = occupiedNight(stays, u.id, day.iso);
                      if (!night) return <span key={u.id} className="h-[16px] md:h-[20px]" />;
                      // El nombre va donde arranca la barra o al empezar cada semana.
                      const label = night.start || col === 0;
                      return (
                        <span
                          key={u.id}
                          style={barStyle(u, night.status === "pending")}
                          className={`flex h-[16px] items-center overflow-hidden whitespace-nowrap text-[10.5px] font-semibold leading-none md:h-[20px] md:text-[11.5px] ${
                            night.start ? "ml-1 rounded-l-[6px] pl-1" : "-ml-px"
                          } ${night.end ? "mr-1 rounded-r-[6px]" : "-mr-px"}`}
                        >
                          {label && <span className="hidden truncate px-0.5 sm:inline">{night.first_name}</span>}
                        </span>
                      );
                    })}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Agenda: lo del día tocado, o todo el mes */}
      <section aria-live="polite">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="m-0 text-[16px] font-semibold text-carbon">
            {selected ? (selected === today ? `Hoy · ${formatStayDate(selected)}` : formatStayDate(selected)) : "Todo el mes"}
          </h2>
          {selected && (
            <button type="button" onClick={() => setSelected(null)} className="min-h-[40px] rounded-full px-3 text-[14px] text-[#155e75]">
              Ver todo el mes
            </button>
          )}
        </div>

        {agenda.length === 0 ? (
          <p className="m-0 rounded-[12px] border border-dashed border-[#d8cfbf] px-4 py-6 text-center text-[14.5px] text-[#6b665d]">
            {selected ? "Las dos cabañas están libres ese día." : "No hay reservas este mes."}
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {agenda.map((s) => {
              const u = unitById[s.unit_id];
              const wa = guestWhatsAppLink(s.phone);
              const what =
                selected === s.check_in ? "Llega" : selected === s.check_out ? "Se va" : selected ? "En la casa" : null;
              return (
                <li key={s.id} className="flex items-center gap-3 rounded-[12px] border border-[#E7E0D4] bg-white p-3">
                  <span aria-hidden className="h-10 w-1.5 shrink-0 rounded-full" style={barStyle(u, s.status === "pending")} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[15px] font-semibold text-carbon">
                        {s.first_name} {s.last_name}
                      </span>
                      {what && <span className="shrink-0 rounded-full bg-[#eef5f5] px-2 text-[12px] font-semibold text-[#183d43]">{what}</span>}
                      {s.status === "pending" && (
                        <span className="shrink-0 rounded-full bg-[#fbecd0] px-2 text-[12px] font-semibold text-[#805b1c]">Pendiente</span>
                      )}
                    </div>
                    <div className="truncate text-[13.5px] text-[#6b665d]">
                      {u?.short ?? s.unit_name} · {formatStayDate(s.check_in)} → {formatStayDate(s.check_out)} · {s.guests} huésp.
                    </div>
                  </div>
                  {wa && (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`WhatsApp a ${s.first_name}`}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.042z" />
                      </svg>
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  </div>
  );
}
