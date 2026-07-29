"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { format } from "date-fns";
import { es as esLocale, enUS, ptBR } from "date-fns/locale";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { useRouter } from "@/lib/i18n/navigation";
import { formatDateOnly, parseDateOnly } from "@/lib/reservation/booking";
import { buildTarifasUrl } from "@/lib/reservation/search";
import { Reveal } from "@/components/motion/Reveal";

interface SearchWidgetProps {
  variant: "hero" | "bar";
  initial?: { checkIn: string; checkOut: string; guests: number };
}

export function SearchWidget({ variant, initial }: SearchWidgetProps) {
  const t = useTranslations("searchWidget");
  const locale = useLocale();
  const router = useRouter();
  const dateFnsLocale =
    locale === "en" ? enUS : locale === "pt" ? ptBR : esLocale;
  const [checkIn, setCheckIn] = useState<Date | null>(() =>
    initial ? parseDateOnly(initial.checkIn) : null,
  );
  const [checkOut, setCheckOut] = useState<Date | null>(() =>
    initial ? parseDateOnly(initial.checkOut) : null,
  );
  const [guests, setGuests] = useState(initial?.guests ?? 2);
  const [open, setOpen] = useState<null | "arrival" | "departure">(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const valid = checkIn !== null && checkOut !== null;
  const fmtDate = (d: Date | null) => (d ? format(d, "dd/MM/yyyy") : t("select"));

  function pickArrival(day: Date) {
    setCheckIn(day);
    setCheckOut(null);
    setOpen("departure");
  }

  function pickDeparture(day: Date) {
    if (checkIn && day > checkIn) {
      setCheckOut(day);
      setOpen(null);
    }
  }

  function clickArrival() {
    setOpen(open === "arrival" ? null : "arrival");
  }

  function clickDeparture() {
    if (!checkIn) {
      setOpen("arrival");
      return;
    }
    setOpen(open === "departure" ? null : "departure");
  }

  function submit() {
    if (!valid) return;
    router.push(
      buildTarifasUrl({
        checkIn: formatDateOnly(checkIn!),
        checkOut: formatDateOnly(checkOut!),
        guests,
      }),
    );
  }

  // Hero: el buscador ya vive dentro de la columna de texto del hero, así que no
  // lleva ancho ni padding propios — los hereda de esa columna.
  const wrapperClass =
    variant === "hero"
      ? "relative z-20 w-full"
      : "relative z-20 max-w-[1020px] mx-auto px-5 md:px-6";

  // Separadores verticales entre campos, según fondo (glass oscuro vs claro)
  const sep = variant === "hero" ? "rgba(255,255,255,.16)" : "#E7E0D4";

  const isHero = variant === "hero";

  const label: React.CSSProperties = {
    fontSize: isHero ? 10.5 : 11,
    fontWeight: isHero ? 600 : undefined,
    letterSpacing: ".2em",
    textTransform: "uppercase",
    color: isHero ? "rgba(248,243,232,.62)" : "#155e75",
  };
  const valueStyle: React.CSSProperties = {
    fontFamily: "var(--font-display)",
    fontSize: isHero ? 19 : 21,
    color: isHero ? "#F8F3E8" : "#1D1D1D",
    marginTop: isHero ? 8 : 5,
  };
  const cellPadding = isHero ? "20px 24px" : "18px 24px";
  // Apilado en mobile el separador tiene que ser horizontal; recién en sm+, con
  // las cuatro celdas en fila, pasa a ser vertical.
  const cellDivider = `border-t sm:border-t-0 sm:border-l`;
  const dividerStyle: React.CSSProperties = { borderColor: sep };
  // Mobile: modal centrado con backdrop (el popover quedaba cortado por la nav fija).
  // Desktop (sm+): popover anclado que abre hacia arriba, como antes.
  const popoverClass =
    "fixed left-1/2 top-1/2 z-[70] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[#E7E0D4] bg-white p-3 shadow-[0_30px_70px_-45px_rgba(29,29,29,.5)] " +
    (variant === "bar"
      ? "sm:absolute sm:left-0 sm:top-[calc(100%+8px)] sm:bottom-auto sm:translate-x-0 sm:translate-y-0 sm:p-[18px]"
      : "sm:absolute sm:left-0 sm:top-auto sm:bottom-[calc(100%+8px)] sm:translate-x-0 sm:translate-y-0 sm:p-[18px]");

  const backdrop = (
    <div
      className="fixed inset-0 z-[60] bg-black/40 sm:hidden"
      onClick={() => setOpen(null)}
      aria-hidden="true"
    />
  );

  return (
    <Reveal delay={0.05}>
      <div className={wrapperClass}>
        <div
          className={
            isHero
              ? "grid grid-cols-1 items-stretch rounded-[16px] border sm:grid-cols-[1.05fr_1.05fr_1.25fr_auto]"
              : "flex flex-wrap items-stretch rounded-[4px] border border-[#E7E0D4] bg-marfil"
          }
          style={isHero ? glassPanel : { boxShadow: "0 40px 80px -50px rgba(29,29,29,.6)" }}
        >
          {/* Llegada — cada fecha es su propia celda, así el calendario se ancla
              a su campo y no al par. */}
          <div className={isHero ? "relative" : "relative flex-1 min-w-[160px]"}>
            <button
              type="button"
              onClick={clickArrival}
              className="h-full w-full text-left bg-transparent border-none cursor-pointer"
              style={{ padding: cellPadding }}
            >
              <div style={label}>{t("arrival")}</div>
              <div style={valueStyle}>{fmtDate(checkIn)}</div>
            </button>

            {open === "arrival" && (
              <>
                {backdrop}
                <div className={popoverClass} onClick={(e) => e.stopPropagation()}>
                  <DayPicker
                    locale={dateFnsLocale}
                    defaultMonth={checkIn ?? new Date()}
                    weekStartsOn={1}
                    disabled={{ before: new Date() }}
                    modifiers={{ picked: checkIn ? [checkIn] : [] }}
                    modifiersClassNames={{ picked: "rdp-lago-end" }}
                    onDayClick={pickArrival}
                  />
                </div>
              </>
            )}
          </div>

          {/* Salida */}
          <div
            className={
              (isHero ? "relative " : "relative flex-1 min-w-[160px] ") + cellDivider
            }
            style={dividerStyle}
          >
            <button
              type="button"
              onClick={clickDeparture}
              className="h-full w-full text-left bg-transparent border-none cursor-pointer"
              style={{ padding: cellPadding }}
            >
              <div style={label}>{t("departure")}</div>
              <div style={valueStyle}>{fmtDate(checkOut)}</div>
            </button>

            {open === "departure" && checkIn && (
              <>
                {backdrop}
                <div className={popoverClass} onClick={(e) => e.stopPropagation()}>
                  <DayPicker
                    locale={dateFnsLocale}
                    defaultMonth={checkIn}
                    weekStartsOn={1}
                    disabled={{ before: checkIn }}
                    modifiers={{ picked: checkOut ? [checkOut] : [] }}
                    modifiersClassNames={{ picked: "rdp-lago-end" }}
                    onDayClick={pickDeparture}
                  />
                </div>
              </>
            )}
          </div>

          {/* Huéspedes */}
          <div
            className={
              (isHero ? "relative " : "relative flex-1 min-w-[180px] ") + cellDivider
            }
            style={{ ...dividerStyle, padding: cellPadding }}
          >
            <div style={label}>{t("guests")}</div>
            <div
              className="flex items-center justify-between gap-4"
              style={{ marginTop: valueStyle.marginTop }}
            >
              <span
                style={{
                  fontFamily: valueStyle.fontFamily,
                  fontSize: valueStyle.fontSize,
                  color: valueStyle.color,
                  whiteSpace: "nowrap",
                }}
              >
                {guests} {guests === 1 ? t("guest") : t("guestsPlural")}
              </span>
              <span className="flex gap-[10px]">
                <button
                  type="button"
                  aria-label="−"
                  onClick={() => setGuests((g) => Math.max(1, g - 1))}
                  style={variant === "hero" ? roundBtnGlass : roundBtnLight}
                >
                  −
                </button>
                <button
                  type="button"
                  aria-label="+"
                  onClick={() => setGuests((g) => Math.min(6, g + 1))}
                  style={variant === "hero" ? roundBtnGlass : roundBtnLight}
                >
                  +
                </button>
              </span>
            </div>
          </div>

          {/* CTA — ancho completo en mobile */}
          <button
            type="button"
            onClick={submit}
            disabled={!valid}
            className={
              "group/btn flex items-center justify-center gap-[10px] w-full sm:w-auto border-none text-[12.5px] font-bold uppercase tracking-[.16em] transition-[background] duration-300 " +
              // El contenedor no puede llevar overflow-hidden (recortaría el
              // calendario), así que el CTA redondea sus propias esquinas.
              (isHero
                ? "py-5 px-[clamp(30px,3.4vw,52px)] rounded-bl-[15px] rounded-br-[15px] sm:rounded-bl-none sm:rounded-tr-[15px]"
                : "py-4 px-9")
            }
            style={{
              flex: "0 0 auto",
              cursor: valid ? "pointer" : "not-allowed",
              background: valid ? "#a24b2a" : "#bdb4a4",
              color: "#f5eee1",
            }}
            onMouseEnter={(e) => {
              if (valid) e.currentTarget.style.background = "#85391f";
            }}
            onMouseLeave={(e) => {
              if (valid) e.currentTarget.style.background = "#a24b2a";
            }}
          >
            {t("cta")}
          </button>
        </div>
      </div>
    </Reveal>
  );
}

// Glass del buscador sobre el hero: el degradé claro encima del tinte oscuro es
// lo que da el reflejo; el `inset` de arriba simula el canto iluminado del vidrio.
const glassPanel: React.CSSProperties = {
  background:
    "linear-gradient(180deg,rgba(255,255,255,.16) 0%,rgba(255,255,255,.05) 46%,rgba(255,255,255,.02) 100%),rgba(12,24,29,.34)",
  backdropFilter: "blur(22px) saturate(165%)",
  WebkitBackdropFilter: "blur(22px) saturate(165%)",
  borderColor: "rgba(255,255,255,.20)",
  boxShadow:
    "0 34px 70px -34px rgba(6,14,18,.72),0 2px 10px -4px rgba(6,14,18,.45),inset 0 1px 0 rgba(255,255,255,.30)",
};

const roundBtnBase: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: "50%",
  cursor: "pointer",
  fontSize: 17,
  lineHeight: 1,
  transition: "background .2s,border-color .2s",
};

const roundBtnLight: React.CSSProperties = {
  ...roundBtnBase,
  border: "1px solid #c9bfae",
  background: "#fff",
  color: "#1D1D1D",
};

// Sobre el glass, los círculos blancos sólidos se veían como parches pegados.
const roundBtnGlass: React.CSSProperties = {
  ...roundBtnBase,
  border: "1px solid rgba(255,255,255,.34)",
  background: "rgba(255,255,255,.12)",
  color: "#f5eee1",
};
