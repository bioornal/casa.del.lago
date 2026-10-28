"use client";

import { useActionState, useState, type ReactNode } from "react";
import { differenceInCalendarDays } from "date-fns";
import { saveRates } from "./actions";
import type { RateSettings } from "@/lib/reservation/rate-settings";
import { seasonOf, type Season, type SeasonRange } from "@/lib/reservation/seasons";
import { grossUp, netNightly } from "@/lib/reservation/method-pricing";
import { parseDateOnly } from "@/lib/reservation/booking";
import { UNITS, type UnitSlug } from "@/lib/units";
import { lowRules } from "@/lib/reservation/stay-rules";

type Tab = Season | "fees";
type Prices = Record<UnitSlug, string>;

const money = (n: number) => "$" + new Intl.NumberFormat("es-AR").format(n);
const shortDate = (s: string) =>
  new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", year: "numeric" }).format(parseDateOnly(s));

/** Lee un % del input (coma o punto); null si no es un % válido 0–30. */
function pctOf(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t.replace(",", "."));
  return Number.isFinite(n) && n >= 0 && n <= 30 ? n : null;
}

const posInt = (raw: string): number | null => {
  const n = Number(raw);
  return raw.trim() !== "" && Number.isInteger(n) && n > 0 ? n : null;
};

const rangeNights = (r: SeasonRange) =>
  r.from && r.to && r.from <= r.to ? differenceInCalendarDays(parseDateOnly(r.to), parseDateOnly(r.from)) + 1 : null;

/** Con el formulario repartido en pestañas, un error del server tiene que llevar a la pestaña del campo. */
function tabForError(error: string): Tab | null {
  if (/temporada alta/i.test(error)) return "high";
  if (/limpieza|huésped|comisión|transferencia/i.test(error)) return "fees";
  if (/precio por noche|estadía mínima|paquete/i.test(error)) return "low";
  return null; // p. ej. "No autorizado" o un fallo de Supabase: no es de un campo
}

export function RateForm({ settings }: { settings: RateSettings }) {
  const [state, action, pending] = useActionState(saveRates, undefined);
  const [tab, setTab] = useState<Tab>("low");
  const [dirty, setDirty] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const [nightly, setNightly] = useState<Prices>({
    aratiri: String(settings.nightly.aratiri),
    aguaribay: String(settings.nightly.aguaribay),
  });
  // Sin bloque de alta guardado arranca con los precios de baja y mínimo 4.
  const [highNightly, setHighNightly] = useState<Prices>({
    aratiri: String(settings.high?.nightly.aratiri ?? settings.nightly.aratiri),
    aguaribay: String(settings.high?.nightly.aguaribay ?? settings.nightly.aguaribay),
  });
  const [highMin, setHighMin] = useState(String(settings.high?.minNights ?? 4));
  const [ranges, setRanges] = useState<SeasonRange[]>(settings.high?.ranges ?? []);
  const [cleaningFee, setCleaningFee] = useState(String(settings.cleaningFee));
  const [baseGuests, setBaseGuests] = useState(String(settings.baseGuests));
  const [extraGuestFee, setExtraGuestFee] = useState(String(settings.extraGuestFee));
  const [cardPct, setCardPct] = useState(String(settings.cardFeePct).replace(".", ","));
  const [transferPct, setTransferPct] = useState(String(settings.transferFeePct).replace(".", ","));
  const savedLow = lowRules(settings);
  const [weekdayMin, setWeekdayMin] = useState(String(savedLow.weekdayMinNights));
  const [weekendMin, setWeekendMin] = useState(String(savedLow.weekendMinNights));
  const [pkgEnabled, setPkgEnabled] = useState(savedLow.packageEnabled);
  const [pkgNights, setPkgNights] = useState(String(savedLow.packageNights));
  const [pkgBilled, setPkgBilled] = useState(String(savedLow.packageBilledNights).replace(".", ","));

  // Al llegar una respuesta nueva del server: limpiar "sin guardar" o saltar a la pestaña del error.
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (state?.ok) setDirty(false);
    const errorTab = state?.error ? tabForError(state.error) : null;
    if (errorTab) setTab(errorTab);
  }

  // Valores que usa la vista previa: si un campo está a medio tipear, cae al guardado.
  const cardPctNum = pctOf(cardPct) ?? settings.cardFeePct;
  const transferPctNum = pctOf(transferPct) ?? settings.transferFeePct;
  const baseGuestsNum = (() => {
    const n = posInt(baseGuests);
    return n !== null && n <= 20 ? n : settings.baseGuests;
  })();
  const extraGuestFeeNum =
    extraGuestFee.trim() !== "" && Number.isInteger(Number(extraGuestFee)) && Number(extraGuestFee) >= 0
      ? Number(extraGuestFee)
      : settings.extraGuestFee;
  const priceOf = (p: Prices, slug: UnitSlug, fallback: number) => posInt(p[slug]) ?? fallback;
  const completeRanges = ranges.filter((r) => r.from && r.to);
  const preview: RateSettings = {
    ...settings,
    nightly: {
      aratiri: priceOf(nightly, "aratiri", settings.nightly.aratiri),
      aguaribay: priceOf(nightly, "aguaribay", settings.nightly.aguaribay),
    },
    baseGuests: baseGuestsNum,
    extraGuestFee: extraGuestFeeNum,
    high: {
      nightly: {
        aratiri: priceOf(highNightly, "aratiri", settings.nightly.aratiri),
        aguaribay: priceOf(highNightly, "aguaribay", settings.nightly.aguaribay),
      },
      minNights: posInt(highMin) ?? 4,
      ranges: completeRanges,
    },
  };

  // Ejemplo de la promo con la cabaña más barata, precio con tarjeta.
  const pkgNightsNum = posInt(pkgNights);
  const weekendMinNum = posInt(weekendMin);
  const pkgBilledNum = Number(pkgBilled.trim().replace(",", "."));
  const pkgExample = (() => {
    if (pkgNightsNum === null || !(pkgBilledNum > 0) || pkgBilledNum > pkgNightsNum) return null;
    const nightlyCard = Math.min(...UNITS.map((u) => grossUp(netNightly(preview, u.slug, baseGuestsNum), cardPctNum)));
    const fmt = (n: number) => String(n).replace(".", ",");
    return `${pkgNightsNum} noches a ${money(nightlyCard)} se cobran ${fmt(pkgBilledNum)} × ${money(nightlyCard)} = ${money(
      Math.round(nightlyCard * pkgBilledNum),
    )} (en vez de ${money(nightlyCard * pkgNightsNum)}), más la limpieza.`;
  })();

  const todaySeason = seasonOf(new Date(), completeRanges);
  const fromPrice = (season: Season) =>
    Math.min(...UNITS.map((u) => grossUp(netNightly(preview, u.slug, baseGuestsNum, season), cardPctNum)));
  const setRange = (i: number, patch: Partial<SeasonRange>) =>
    setRanges((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <form
      action={action}
      noValidate
      onChange={() => {
        setDirty(true);
        setLocalError(null);
      }}
      onSubmit={(e) => {
        // Una fila con una sola fecha no viaja al server: mejor avisar que perderla en silencio.
        if (ranges.some((r) => !r.from !== !r.to)) {
          e.preventDefault();
          setTab("high");
          setLocalError("Completá las dos fechas de cada período de temporada alta, o quitá la fila.");
        }
      }}
      className="pb-28"
    >
      {/* Selector de temporada */}
      <div role="tablist" aria-label="Sección de tarifas" className="grid gap-3 md:grid-cols-3">
        <TabCard
          active={tab === "low"}
          onClick={() => setTab("low")}
          title="Temporada baja"
          badge={todaySeason === "low" ? "Rige hoy" : undefined}
          lines={[`Desde ${money(fromPrice("low"))} por noche`, "Todo el año fuera de las fechas de alta"]}
        />
        <TabCard
          active={tab === "high"}
          onClick={() => setTab("high")}
          title="Temporada alta"
          badge={todaySeason === "high" ? "Rige hoy" : undefined}
          lines={[
            `Desde ${money(fromPrice("high"))} por noche`,
            completeRanges.length === 0
              ? "Sin fechas cargadas"
              : `${shortDate(completeRanges[0].from)} → ${shortDate(completeRanges[0].to)}` +
                (completeRanges.length > 1 ? ` (+${completeRanges.length - 1})` : ""),
          ]}
        />
        <TabCard
          active={tab === "fees"}
          onClick={() => setTab("fees")}
          title="Cargos y comisiones"
          lines={[
            `Limpieza ${money(Number(cleaningFee) || 0)} · Huésped extra ${money(extraGuestFeeNum)}`,
            `Tarjeta ${String(cardPctNum).replace(".", ",")}% · Transferencia ${String(transferPctNum).replace(".", ",")}%`,
          ]}
        />
      </div>

      <div className="mt-5 rounded-[10px] border border-[#E7E0D4] bg-white">
        {/* Temporada baja */}
        <div role="tabpanel" hidden={tab !== "low"}>
          <Section
            title="Precio por noche"
            hint={`Lo que recibís por noche para ${baseGuestsNum} huéspedes. El huésped ve el precio con la comisión ya incluida.`}
          >
            <PriceTable prefix="nightly" values={nightly} onChange={setNightly} cardPct={cardPctNum} transferPct={transferPctNum} />
          </Section>
          <Section title="Estadía mínima" hint="Según el día de llegada del huésped.">
            <div className="grid gap-4 sm:grid-cols-2 lg:max-w-[560px]">
              <Field id="low_weekday_min_nights" label="Llegada de lunes a jueves" suffix="noches">
                <input id="low_weekday_min_nights" name="low_weekday_min_nights" type="number" inputMode="numeric" min={1} max={30} value={weekdayMin} onChange={(e) => setWeekdayMin(e.target.value)} className={inputCls} />
              </Field>
              <Field id="low_weekend_min_nights" label="Llegada de viernes a domingo" suffix="noches">
                <input id="low_weekend_min_nights" name="low_weekend_min_nights" type="number" inputMode="numeric" min={1} max={30} value={weekendMin} onChange={(e) => setWeekendMin(e.target.value)} className={inputCls} />
              </Field>
            </div>
          </Section>
          <Section
            title="Promoción de fin de semana"
            hint="Con llegada un viernes y una estadía de exactamente esa cantidad de noches, se cobra menos. Solo en temporada baja."
          >
            <label className="inline-flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={pkgEnabled}
                onChange={(e) => setPkgEnabled(e.target.checked)}
                className="peer sr-only"
              />
              <span className="relative h-6 w-11 rounded-full bg-[#d8cfbf] transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-[#2f6b46] peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-[#183d43]/30" />
              <span className="text-[13.5px] font-semibold text-[#1f2a24]">
                {pkgEnabled ? "Promoción activa" : "Promoción desactivada"}
              </span>
            </label>
            <input type="hidden" name="weekend_package_enabled" value={pkgEnabled ? "true" : "false"} />
            <div className={`mt-4 grid gap-4 sm:grid-cols-2 lg:max-w-[560px] ${pkgEnabled ? "" : "opacity-50"}`}>
              <Field id="weekend_package_nights" label="Noches de la estadía" suffix="noches">
                <input id="weekend_package_nights" name="weekend_package_nights" type="number" inputMode="numeric" min={1} max={30} value={pkgNights} onChange={(e) => setPkgNights(e.target.value)} className={inputCls} />
              </Field>
              <Field id="weekend_package_billed" label="Se cobran" suffix="noches" note="Enteras o con media, ej. 2,5">
                <input id="weekend_package_billed" name="weekend_package_billed" type="text" inputMode="decimal" value={pkgBilled} onChange={(e) => setPkgBilled(e.target.value)} className={inputCls} />
              </Field>
            </div>
            {pkgEnabled && pkgExample && (
              <p className="mb-0 mt-4 rounded-[6px] bg-[#eaf5f3] px-4 py-3 text-[12.5px] leading-[1.6] text-[#245c3c]">
                Ejemplo: {pkgExample}
              </p>
            )}
            {pkgEnabled && pkgNightsNum !== null && weekendMinNum !== null && pkgNightsNum < weekendMinNum && (
              <p className="mb-0 mt-3 text-[12.5px] text-[#805b1c]">
                Atención: la promoción es de {pkgNightsNum} noches pero el mínimo de fin de semana es {weekendMinNum}. Nunca va a aplicar.
              </p>
            )}
          </Section>
          <GuestsTable settings={preview} season="low" cardPct={cardPctNum} transferPct={transferPctNum} />
        </div>

        {/* Temporada alta */}
        <div role="tabpanel" hidden={tab !== "high"}>
          <Section
            title="Fechas de temporada alta"
            hint="Cada noche entre estas fechas (inclusive) se cobra como alta. Si una estadía cruza el cambio, cada noche se cobra con su tarifa."
          >
            <div className="flex flex-col gap-2">
              {ranges.length === 0 && (
                <p className="m-0 rounded-[6px] border border-dashed border-[#d8cfbf] px-4 py-3 text-[13px] text-[#6b665d]">
                  Sin períodos cargados: todo el año se cobra como temporada baja.
                </p>
              )}
              {ranges.map((r, i) => {
                const n = rangeNights(r);
                return (
                  <div key={i} className="flex flex-wrap items-center gap-3 rounded-[6px] bg-[#fbf8f2] px-3 py-2.5">
                    <DateInput label="Desde" value={r.from} onChange={(v) => setRange(i, { from: v })} />
                    <span aria-hidden className="text-[#a59d8f]">→</span>
                    <DateInput label="Hasta" value={r.to} onChange={(v) => setRange(i, { to: v })} />
                    <span className="text-[12px] text-[#6b665d]">
                      {n !== null ? `${n} noches` : r.from && r.to ? "La fecha final es anterior a la inicial" : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setRanges((rs) => rs.filter((_, j) => j !== i));
                        setDirty(true);
                      }}
                      className="ml-auto rounded-[4px] px-2.5 py-1.5 text-[12px] text-[#8a3b1d] hover:bg-[#f6e6df]"
                    >
                      Quitar
                    </button>
                  </div>
                );
              })}
              <div>
                <button
                  type="button"
                  onClick={() => setRanges((rs) => [...rs, { from: "", to: "" }])}
                  className="mt-1 rounded-[4px] border border-[#d8cfbf] bg-white px-3.5 py-2 text-[12.5px] text-[#23362B] hover:bg-[#fbf8f2]"
                >
                  + Agregar período
                </button>
              </div>
            </div>
            {/* Las filas vacías no viajan; las incompletas se frenan en onSubmit. */}
            <input type="hidden" name="high_season_ranges" value={JSON.stringify(completeRanges)} />
          </Section>
          <Section
            title="Precio por noche"
            hint={`Lo que recibís por noche en alta para ${baseGuestsNum} huéspedes. Limpieza, huésped extra y comisiones son los mismos que en baja.`}
          >
            <PriceTable prefix="high_nightly" values={highNightly} onChange={setHighNightly} cardPct={cardPctNum} transferPct={transferPctNum} />
          </Section>
          <Section title="Reglas de estadía">
            <div className="flex flex-wrap items-end gap-6">
              <Field id="high_min_nights" label="Estadía mínima" suffix="noches" width="w-[150px]">
                <input
                  id="high_min_nights"
                  name="high_min_nights"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={30}
                  value={highMin}
                  onChange={(e) => setHighMin(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <p className="m-0 pb-2.5 text-[12.5px] text-[#6b665d]">
                Rige para cualquier día de llegada. En alta no hay promoción de fin de semana.
              </p>
            </div>
          </Section>
          <GuestsTable settings={preview} season="high" cardPct={cardPctNum} transferPct={transferPctNum} />
        </div>

        {/* Cargos y comisiones */}
        <div role="tabpanel" hidden={tab !== "fees"}>
          <Section title="Cargos" hint="Valen para las dos temporadas.">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field id="cleaning_fee" label="Limpieza" prefix="$" note="Una vez por estadía">
                <input id="cleaning_fee" name="cleaning_fee" type="number" inputMode="numeric" min={0} value={cleaningFee} onChange={(e) => setCleaningFee(e.target.value)} className={inputCls} />
              </Field>
              <Field id="base_guests" label="Huéspedes incluidos" suffix="personas" note="Cubiertos por el precio por noche">
                <input id="base_guests" name="base_guests" type="number" inputMode="numeric" min={1} max={20} value={baseGuests} onChange={(e) => setBaseGuests(e.target.value)} className={inputCls} />
              </Field>
              <Field id="extra_guest_fee" label="Huésped extra" prefix="$" note="Por persona adicional, por noche">
                <input id="extra_guest_fee" name="extra_guest_fee" type="number" inputMode="numeric" min={0} value={extraGuestFee} onChange={(e) => setExtraGuestFee(e.target.value)} className={inputCls} />
              </Field>
            </div>
          </Section>
          <Section
            title="Comisiones de cobro"
            hint="Se suman al precio que ve el huésped para que recibas el neto completo. El precio publicado es el de tarjeta; con transferencia el huésped ve el ahorro."
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <Field id="card_fee_pct" label="Tarjeta (Mercado Pago)" suffix="%" note="7,7% con acreditación en el día">
                <input id="card_fee_pct" name="card_fee_pct" type="text" inputMode="decimal" value={cardPct} onChange={(e) => setCardPct(e.target.value)} className={inputCls} />
              </Field>
              <Field id="transfer_fee_pct" label="Transferencia" suffix="%" note="Retención de IIBB Misiones">
                <input id="transfer_fee_pct" name="transfer_fee_pct" type="text" inputMode="decimal" value={transferPct} onChange={(e) => setTransferPct(e.target.value)} className={inputCls} />
              </Field>
            </div>
          </Section>
        </div>
      </div>

      {/* Barra de guardado */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#E7E0D4] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3.5 md:px-8">
          <div className="min-w-0 flex-1 text-[13px]">
            {localError || state?.error ? (
              <span role="alert" className="text-[#8a3b1d]">{localError ?? state?.error}</span>
            ) : dirty ? (
              <span className="text-[#805b1c]">Hay cambios sin guardar.</span>
            ) : state?.ok ? (
              <span className="text-[#3f8f5f]">Guardado. La web ya muestra los precios nuevos.</span>
            ) : (
              <span className="hidden text-[#6b665d] sm:inline">Los cambios aplican a reservas nuevas; las ya hechas conservan su precio.</span>
            )}
          </div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-[4px] bg-[#23362B] px-7 py-3 text-[12px] font-semibold uppercase tracking-[.1em] text-[#F8F5F0] transition-colors hover:bg-[#1a2a21] disabled:cursor-default disabled:bg-[#8a8170]"
          >
            {pending ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </form>
  );
}

const inputCls =
  "w-full min-w-0 border-0 bg-transparent px-3 py-2.5 text-[15px] tabular-nums text-[#1f2a24] outline-none";

function TabCard({
  active,
  onClick,
  title,
  badge,
  lines,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  badge?: string;
  lines: string[];
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-[10px] border px-5 py-3.5 text-left md:py-4 ${
        active ? "border-[#183d43] bg-[#183d43] text-[#F8F5F0]" : "border-[#E7E0D4] bg-white text-[#1f2a24] hover:border-[#bfb4a2]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-[22px] leading-tight">{title}</span>
        {badge && (
          <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-semibold ${active ? "bg-[#d9eee4] text-[#245c3c]" : "bg-[#e6f1ec] text-[#245c3c]"}`}>
            {badge}
          </span>
        )}
      </div>
      {lines.map((l, i) => (
        <div
          key={i}
          className={`mt-1 text-[12.5px] ${active ? "text-[#c7dde3]" : "text-[#6b665d]"} ${i === 0 ? "font-semibold" : "hidden md:block"}`}
        >
          {l}
        </div>
      ))}
    </button>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="border-b border-[#efe9df] px-5 py-6 last:border-b-0 md:px-7">
      <h2 className="m-0 font-display text-[22px] font-medium">{title}</h2>
      {hint && <p className="mb-0 mt-1 max-w-[720px] text-[12.5px] leading-[1.6] text-[#6b665d]">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({
  id,
  label,
  prefix,
  suffix,
  note,
  width,
  children,
}: {
  id: string;
  label: string;
  prefix?: string;
  suffix?: string;
  note?: string;
  width?: string;
  children: ReactNode;
}) {
  return (
    <div className={width}>
      <label htmlFor={id} className="mb-1.5 block text-[12px] font-medium text-[#4b473f]">
        {label}
      </label>
      <div className="flex items-center rounded-[6px] border border-[#ddd5c7] bg-white focus-within:border-[#183d43] focus-within:ring-2 focus-within:ring-[#183d43]/15">
        {prefix && <span className="pl-3 text-[14px] text-[#8a8170]">{prefix}</span>}
        {children}
        {suffix && <span className="pr-3 text-[12.5px] text-[#8a8170]">{suffix}</span>}
      </div>
      {note && <p className="mb-0 mt-1.5 text-[11.5px] text-[#8a8170]">{note}</p>}
    </div>
  );
}

function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-2 text-[12px] text-[#6b665d]">
      {label}
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-[6px] border border-[#ddd5c7] bg-white px-2.5 py-2 text-[14px] text-[#1f2a24] outline-none focus:border-[#183d43]"
      />
    </label>
  );
}

/** Una fila por cabaña: lo que recibe el alojamiento y lo que ve el huésped en cada canal. */
function PriceTable({
  prefix,
  values,
  onChange,
  cardPct,
  transferPct,
}: {
  prefix: "nightly" | "high_nightly";
  values: Prices;
  onChange: (fn: (v: Prices) => Prices) => void;
  cardPct: number;
  transferPct: number;
}) {
  // Grilla en vez de <table>: en el celular cada cabaña se apila (nombre, input, precios) sin scroll lateral.
  const cols = "md:grid md:grid-cols-[minmax(0,1.3fr)_210px_minmax(0,1fr)_minmax(0,1fr)] md:items-center md:gap-4";
  return (
    <div>
      <div className={`hidden pb-2 text-[11px] uppercase tracking-[.08em] text-[#8a8170] ${cols}`}>
        <span>Cabaña</span>
        <span>Recibís por noche</span>
        <span className="text-right">Huésped paga con tarjeta</span>
        <span className="text-right">Con transferencia</span>
      </div>
      {UNITS.map((u) => {
        const id = `${prefix}_${u.slug}`;
        const net = posInt(values[u.slug]);
        return (
          <div key={u.slug} className={`border-t border-[#efe9df] py-3 ${cols}`}>
            <div className="mb-2 md:mb-0">
              <label htmlFor={id} className="text-[14px] font-semibold text-[#1f2a24]">
                {u.name}
              </label>
              <div className="text-[11.5px] text-[#8a8170]">Hasta {u.specs.guests} huéspedes</div>
            </div>
            <div className="flex items-center rounded-[6px] border border-[#ddd5c7] bg-white focus-within:border-[#183d43] focus-within:ring-2 focus-within:ring-[#183d43]/15">
              <span className="pl-3 text-[14px] text-[#8a8170]">$</span>
              <input
                id={id}
                name={id}
                type="number"
                inputMode="numeric"
                min={1}
                value={values[u.slug]}
                onChange={(e) => onChange((v) => ({ ...v, [u.slug]: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div className="mt-2 flex justify-between text-[15px] font-semibold tabular-nums text-[#183d43] md:mt-0 md:block md:text-right">
              <span className="text-[12px] font-normal text-[#8a8170] md:hidden">Huésped paga con tarjeta</span>
              {net ? money(grossUp(net, cardPct)) : "—"}
            </div>
            <div className="mt-1 flex justify-between text-[14px] tabular-nums text-[#4b473f] md:mt-0 md:block md:text-right">
              <span className="text-[12px] text-[#8a8170] md:hidden">Con transferencia</span>
              {net ? money(grossUp(net, transferPct)) : "—"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Detalle plegable: precio por noche según cantidad de huéspedes, para la temporada de la pestaña. */
function GuestsTable({
  settings,
  season,
  cardPct,
  transferPct,
}: {
  settings: RateSettings;
  season: Season;
  cardPct: number;
  transferPct: number;
}) {
  return (
    <details className="px-5 py-5 md:px-7">
      <summary className="cursor-pointer select-none text-[13px] font-semibold text-[#183d43]">
        Ver precio por noche según cantidad de huéspedes
      </summary>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {UNITS.map((u) => {
          const counts = Array.from(
            { length: Math.max(0, u.specs.guests - settings.baseGuests + 1) },
            (_, i) => settings.baseGuests + i,
          );
          return (
            <div key={u.slug} className="overflow-hidden rounded-[6px] border border-[#efe9df]">
              <div className="bg-[#fbf8f2] px-4 py-2.5 text-[13px] font-semibold">{u.name}</div>
              <table className="w-full border-collapse text-[12.5px] tabular-nums">
                <thead>
                  <tr className="text-[11px] text-[#8a8170]">
                    <th className="px-4 py-2 text-left font-medium">Huéspedes</th>
                    <th className="px-4 py-2 text-right font-medium">Recibís</th>
                    <th className="px-4 py-2 text-right font-medium">Tarjeta</th>
                    <th className="px-4 py-2 text-right font-medium">Transferencia</th>
                  </tr>
                </thead>
                <tbody>
                  {counts.map((count) => {
                    const net = netNightly(settings, u.slug, count, season);
                    return (
                      <tr key={count} className="border-t border-[#f3eee6]">
                        <td className="px-4 py-1.5">{count}</td>
                        <td className="px-4 py-1.5 text-right">{money(net)}</td>
                        <td className="px-4 py-1.5 text-right">{money(grossUp(net, cardPct))}</td>
                        <td className="px-4 py-1.5 text-right">{money(grossUp(net, transferPct))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </details>
  );
}
