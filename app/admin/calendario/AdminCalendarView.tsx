"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  type MonthRef,
  shiftMonth,
  addMonthsToRef,
  getMonthsSequence,
  formatMonthRange,
  monthGrid,
  monthOccupancy,
  rangeOccupancy,
  occupiedNight,
  overlapsDay,
} from "@/lib/admin/calendar";
import { formatStayDate, guestWhatsAppLink } from "@/lib/admin/guest-contact";
import { CalendarMonth, type CalendarStay, type CalendarUnit, barStyle, WEEKDAYS } from "./CalendarMonth";

export type ViewCount = 1 | 2 | 3 | 4;

const STORAGE_KEY = "cdl-admin-cal-view";

export function AdminCalendarView({
  initialRef,
  today,
  stays,
  units,
}: {
  initialRef: MonthRef;
  today: string;
  stays: CalendarStay[];
  units: CalendarUnit[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [currentRef, setCurrentRef] = useState<MonthRef>(initialRef);
  const [viewCount, setViewCount] = useState<ViewCount>(3);
  const [isDesktop, setIsDesktop] = useState(false);
  const [zoomedMonth, setZoomedMonth] = useState<MonthRef | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Detectar pantalla PC vs celular y leer preferencia guardada
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const applySize = (matches: boolean) => {
      setIsDesktop(matches);
      if (matches) {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && ["1", "2", "3", "4"].includes(saved)) {
          setViewCount(Number(saved) as ViewCount);
        }
      }
    };

    applySize(mq.matches);
    const handler = (e: MediaQueryListEvent) => applySize(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Sincronizar initialRef si cambia por navegación externa
  useEffect(() => {
    setCurrentRef(initialRef);
  }, [initialRef.year, initialRef.month]);

  // En mobile siempre 1 mes. En desktop, viewCount o 1 si se amplió un mes en particular.
  const effectiveCount: ViewCount = !isDesktop || zoomedMonth ? 1 : viewCount;
  const activeStartRef = zoomedMonth ?? currentRef;
  const visibleMonths = getMonthsSequence(activeStartRef, effectiveCount);

  // Ocupación calculada para el período visible
  const occupancy = rangeOccupancy(stays, visibleMonths);
  const unitById = Object.fromEntries(units.map((u) => [u.id, u]));

  const changeMonth = (delta: number) => {
    const nextRef = addMonthsToRef(currentRef, delta);
    setCurrentRef(nextRef);
    setZoomedMonth(null);
    setSelectedDay(null);
    const iso = shiftMonth(currentRef, delta);
    startTransition(() => {
      router.replace(`/admin/calendario?mes=${iso}`, { scroll: false });
    });
  };

  const goToToday = () => {
    const [y, m] = today.split("-").map(Number);
    const targetRef = { year: y, month: m };
    setCurrentRef(targetRef);
    setZoomedMonth(null);
    setSelectedDay(null);
    startTransition(() => {
      router.replace("/admin/calendario", { scroll: false });
    });
  };

  const handleSelectView = (count: ViewCount) => {
    setViewCount(count);
    setZoomedMonth(null);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, String(count));
    }
  };

  const isCurrentMonth =
    currentRef.year === Number(today.slice(0, 4)) && currentRef.month === Number(today.slice(5, 7));

  // Si está en modo 1 mes (por mobile, por elección de 1 mes, o por haber ampliado un mes):
  if (effectiveCount === 1) {
    const singleMonth = visibleMonths[0];
    const singleOcc = monthOccupancy(stays, singleMonth.year, singleMonth.month);

    return (
      <div>
        {/* Barra superior de navegación y selector de vista */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              aria-label="Mes anterior"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d8cfbf] bg-white text-[18px] text-carbon hover:bg-[#fbf9f5] transition-colors cursor-pointer"
            >
              ‹
            </button>
            <h2 className="m-0 text-center font-display text-[22px] font-normal text-carbon md:text-[24px]">
              {formatMonthRange(visibleMonths)}
            </h2>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              aria-label="Mes siguiente"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d8cfbf] bg-white text-[18px] text-carbon hover:bg-[#fbf9f5] transition-colors cursor-pointer"
            >
              ›
            </button>
            {!isCurrentMonth && (
              <button
                type="button"
                onClick={goToToday}
                className="inline-flex min-h-[44px] items-center rounded-full border border-[#183d43] px-4 text-[14px] font-semibold text-[#183d43] hover:bg-[#183d43] hover:text-white transition-colors cursor-pointer"
              >
                Hoy
              </button>
            )}
          </div>

          {/* Selector de cantidad de calendarios (solo en PC) */}
          <div className="hidden md:inline-flex items-center rounded-full border border-[#d8cfbf] bg-[#faf8f4] p-1 shadow-xs">
            <span className="px-2.5 text-[12.5px] font-medium text-[#8a8170]">Vista:</span>
            {([1, 2, 3, 4] as ViewCount[]).map((n) => {
              const active = !zoomedMonth && viewCount === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => handleSelectView(n)}
                  className={`min-h-[34px] rounded-full px-3 text-[13px] font-semibold transition-all cursor-pointer ${
                    active
                      ? "bg-[#183d43] text-white shadow-xs"
                      : "text-[#6b665d] hover:text-carbon hover:bg-[#f0eae0]"
                  }`}
                >
                  {n === 1 ? "1 mes" : `${n} meses`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Leyenda + ocupación del mes */}
        <div className="mb-4 grid grid-cols-2 gap-2">
          {units.map((u) => {
            const n = singleOcc.byUnit[u.id] ?? 0;
            return (
              <div key={u.id} className="flex items-center gap-2.5 rounded-[12px] border border-[#E7E0D4] bg-white px-3 py-2.5">
                <span aria-hidden className="h-8 w-1.5 shrink-0 rounded-full" style={{ background: u.color }} />
                <div className="min-w-0">
                  <div className="truncate text-[14.5px] font-semibold text-carbon">{u.short}</div>
                  <div className="text-[13px] text-[#6b665d]">
                    {n} de {singleOcc.nights} noches · {Math.round((n / singleOcc.nights) * 100)}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <CalendarMonth
          year={singleMonth.year}
          month={singleMonth.month}
          today={today}
          stays={stays}
          units={units}
          onZoomOut={zoomedMonth ? () => setZoomedMonth(null) : undefined}
          zoomBackLabel={zoomedMonth ? `Volver a vista de ${viewCount} meses` : undefined}
        />
      </div>
    );
  }

  // MODO MULTI-MES (2, 3 o 4 calendarios a la par en PC)
  const staysInVisiblePeriod = stays
    .filter((s) => {
      if (selectedDay) return overlapsDay(s, selectedDay);
      const first = visibleMonths[0];
      const last = visibleMonths[visibleMonths.length - 1];
      const from = `${first.year}-${String(first.month).padStart(2, "0")}-01`;
      const to = `${last.year}-${String(last.month).padStart(2, "0")}-31`;
      return s.check_in <= to && s.check_out >= from;
    })
    .sort((a, b) => a.check_in.localeCompare(b.check_in));

  // Grilla según cantidad de meses
  const gridColsClass =
    effectiveCount === 2
      ? "grid-cols-1 md:grid-cols-2"
      : effectiveCount === 3
        ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
        : "grid-cols-1 md:grid-cols-2 xl:grid-cols-4";

  return (
    <div>
      {/* Barra superior de navegación y selector de vista */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            aria-label="Mes anterior"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d8cfbf] bg-white text-[18px] text-carbon hover:bg-[#fbf9f5] transition-colors cursor-pointer"
          >
            ‹
          </button>
          <h2 className="m-0 text-center font-display text-[22px] font-normal text-carbon md:text-[24px]">
            {formatMonthRange(visibleMonths)}
          </h2>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            aria-label="Mes siguiente"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d8cfbf] bg-white text-[18px] text-carbon hover:bg-[#fbf9f5] transition-colors cursor-pointer"
          >
            ›
          </button>
          {!isCurrentMonth && (
            <button
              type="button"
              onClick={goToToday}
              className="inline-flex min-h-[44px] items-center rounded-full border border-[#183d43] px-4 text-[14px] font-semibold text-[#183d43] hover:bg-[#183d43] hover:text-white transition-colors cursor-pointer"
            >
              Hoy
            </button>
          )}
        </div>

        {/* Selector de cantidad de calendarios (solo en PC) */}
        <div className="hidden md:inline-flex items-center rounded-full border border-[#d8cfbf] bg-[#faf8f4] p-1 shadow-xs">
          <span className="px-2.5 text-[12.5px] font-medium text-[#8a8170]">Vista:</span>
          {([1, 2, 3, 4] as ViewCount[]).map((n) => {
            const active = viewCount === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => handleSelectView(n)}
                className={`min-h-[34px] rounded-full px-3 text-[13px] font-semibold transition-all cursor-pointer ${
                  active
                    ? "bg-[#183d43] text-white shadow-xs"
                    : "text-[#6b665d] hover:text-carbon hover:bg-[#f0eae0]"
                }`}
              >
                {n === 1 ? "1 mes" : `${n} meses`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Leyenda + ocupación combinada del período visible */}
      <div className="mb-4 grid grid-cols-2 gap-2">
        {units.map((u) => {
          const n = occupancy.byUnit[u.id] ?? 0;
          return (
            <div key={u.id} className="flex items-center gap-2.5 rounded-[12px] border border-[#E7E0D4] bg-white px-3 py-2.5">
              <span aria-hidden className="h-8 w-1.5 shrink-0 rounded-full" style={{ background: u.color }} />
              <div className="min-w-0">
                <div className="truncate text-[14.5px] font-semibold text-carbon">{u.short}</div>
                <div className="text-[13px] text-[#6b665d]">
                  {n} de {occupancy.nights} noches del período · {Math.round((n / occupancy.nights) * 100)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grilla de calendarios múltiples a la par */}
      <div className={`grid gap-4 ${gridColsClass}`}>
        {visibleMonths.map((m) => {
          const mOcc = monthOccupancy(stays, m.year, m.month);
          const weeks = monthGrid(m.year, m.month);

          return (
            <div
              key={`${m.year}-${m.month}`}
              className="flex flex-col overflow-hidden rounded-[14px] border border-[#E7E0D4] bg-white shadow-xs"
            >
              {/* Encabezado del mes individual con botón Ampliar */}
              <div className="flex items-center justify-between border-b border-[#f0eae0] bg-[#fbf8f2] px-3.5 py-2.5">
                <div className="min-w-0">
                  <div className="truncate font-display text-[17px] font-semibold text-carbon">
                    {formatMonthRange([m])}
                  </div>
                  <div className="truncate text-[11.5px] text-[#6b665d]">
                    {units
                      .map((u) => `${u.short}: ${Math.round(((mOcc.byUnit[u.id] ?? 0) / mOcc.nights) * 100)}%`)
                      .join(" · ")}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setZoomedMonth(m)}
                  title={`Ampliar ${formatMonthRange([m])} a mes completo`}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#d8cfbf] bg-white px-2.5 py-1 text-[12px] font-semibold text-[#183d43] hover:bg-[#183d43] hover:text-white transition-colors cursor-pointer"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                    />
                  </svg>
                  Ampliar
                </button>
              </div>

              {/* Días de la semana */}
              <div className="grid grid-cols-7 border-b border-[#f0eae0] bg-[#faf6ef]">
                {WEEKDAYS.map((d) => (
                  <div
                    key={d}
                    className="py-1 text-center text-[10.5px] font-semibold uppercase tracking-[.05em] text-[#8a8170]"
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Días del mes */}
              <div className="flex flex-1 flex-col">
                {weeks.map((week) => (
                  <div
                    key={week[0].iso}
                    className="grid flex-1 grid-cols-7 border-b border-[#f3eee6] last:border-b-0"
                  >
                    {week.map((day, col) => {
                      const isToday = day.iso === today;
                      const isSel = day.iso === selectedDay;

                      return (
                        <button
                          key={day.iso}
                          type="button"
                          onClick={() => setSelectedDay(isSel ? null : day.iso)}
                          aria-pressed={isSel}
                          aria-label={`${formatStayDate(day.iso)}${isToday ? " (hoy)" : ""}`}
                          className={`relative flex min-h-[58px] md:min-h-[64px] flex-col pb-1 pt-0.5 text-left transition-colors cursor-pointer ${
                            day.inMonth ? "bg-white" : "bg-[#faf8f4] opacity-40"
                          } ${isSel ? "bg-[#eef5f5] ring-2 ring-inset ring-[#183d43]" : "hover:bg-[#fbf9f5]"} ${
                            col < 6 ? "border-r border-[#f3eee6]" : ""
                          }`}
                        >
                          <span
                            className={`mx-auto flex h-5 w-5 items-center justify-center rounded-full text-[11.5px] md:mx-1 ${
                              isToday
                                ? "bg-[#183d43] font-semibold text-white"
                                : day.inMonth
                                  ? "text-carbon font-medium"
                                  : "text-[#c2b9aa]"
                            }`}
                          >
                            {day.day}
                          </span>

                          {/* Franjas por cabaña */}
                          <span className="mt-0.5 flex flex-col gap-[2px] px-0.5">
                            {units.map((u) => {
                              const night = occupiedNight(stays, u.id, day.iso);
                              if (!night) return <span key={u.id} className="h-[13px]" />;
                              const label = night.start || col === 0;
                              return (
                                <span
                                  key={u.id}
                                  style={barStyle(u, night.status === "pending")}
                                  title={`${night.first_name} ${night.last_name} (${u.short}): ${formatStayDate(night.check_in)} → ${formatStayDate(night.check_out)}`}
                                  className={`flex h-[13px] items-center overflow-hidden whitespace-nowrap text-[9.5px] font-semibold leading-none ${
                                    night.start ? "ml-0.5 rounded-l-[4px] pl-0.5" : "-ml-px"
                                  } ${night.end ? "mr-0.5 rounded-r-[4px]" : "-mr-px"}`}
                                >
                                  {label && (
                                    <span className="truncate px-0.5">
                                      {night.first_name}
                                    </span>
                                  )}
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
            </div>
          );
        })}
      </div>

      {/* Agenda interactiva debajo de los calendarios */}
      <section aria-live="polite" className="mt-5 rounded-[14px] border border-[#E7E0D4] bg-white p-4 md:p-5 shadow-xs">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-[#f0eae0] pb-3">
          <div>
            <h3 className="m-0 text-[16.5px] font-semibold text-carbon md:text-[18px]">
              {selectedDay
                ? selectedDay === today
                  ? `Hoy · ${formatStayDate(selectedDay)}`
                  : `Agenda del ${formatStayDate(selectedDay)}`
                : "Reservas del período visible"}
            </h3>
            <p className="m-0 mt-0.5 text-[13px] text-[#6b665d]">
              {selectedDay
                ? "Movimientos y huéspedes para el día seleccionado"
                : "Tocá cualquier día en los calendarios de arriba para ver quién llega, quién se va o está alojado."}
            </p>
          </div>
          {selectedDay && (
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="inline-flex min-h-[36px] items-center rounded-full border border-[#d8cfbf] bg-white px-3 text-[13px] font-semibold text-[#183d43] hover:bg-[#f3eee6] transition-colors cursor-pointer"
            >
              Ver todo el período
            </button>
          )}
        </div>

        {staysInVisiblePeriod.length === 0 ? (
          <p className="m-0 rounded-[12px] border border-dashed border-[#d8cfbf] px-4 py-6 text-center text-[14.5px] text-[#6b665d]">
            {selectedDay
              ? "Las dos cabañas están libres ese día."
              : "No hay reservas registradas en este período."}
          </p>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {staysInVisiblePeriod.map((s) => {
              const u = unitById[s.unit_id];
              const wa = guestWhatsAppLink(s.phone);
              const what = selectedDay
                ? selectedDay === s.check_in
                  ? "Llega"
                  : selectedDay === s.check_out
                    ? "Se va"
                    : "En la casa"
                : null;

              return (
                <div
                  key={s.id}
                  className="flex items-center gap-3 rounded-[12px] border border-[#E7E0D4] bg-white p-3 shadow-xs"
                >
                  <span
                    aria-hidden
                    className="h-10 w-1.5 shrink-0 rounded-full"
                    style={barStyle(u, s.status === "pending")}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[14.5px] font-semibold text-carbon">
                        {s.first_name} {s.last_name}
                      </span>
                      {what && (
                        <span className="shrink-0 rounded-full bg-[#eef5f5] px-2 text-[11px] font-semibold text-[#183d43]">
                          {what}
                        </span>
                      )}
                      {s.status === "pending" && (
                        <span className="shrink-0 rounded-full bg-[#fbecd0] px-2 text-[11px] font-semibold text-[#805b1c]">
                          Pendiente
                        </span>
                      )}
                    </div>
                    <div className="truncate text-[13px] text-[#6b665d]">
                      {u?.short ?? s.unit_name} · {formatStayDate(s.check_in)} → {formatStayDate(s.check_out)} · {s.guests} huésp.
                    </div>
                  </div>
                  {wa && (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`WhatsApp a ${s.first_name}`}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white hover:opacity-90 transition-opacity"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.042z" />
                      </svg>
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
