"use client";

import { useActionState, useState } from "react";
import { saveRates } from "./actions";
import type { RateSettings } from "@/lib/reservation/rate-settings";
import type { SeasonRange } from "@/lib/reservation/seasons";
import { grossUp, netNightly } from "@/lib/reservation/method-pricing";
import { UNITS, type UnitSlug } from "@/lib/units";
import {
  LOW_SEASON_WEEKDAY_MIN_NIGHTS,
  WEEKEND_PACKAGE_BILLED_NIGHTS,
  WEEKEND_PACKAGE_NIGHTS,
} from "@/lib/reservation/stay-rules";

const money = (n: number) => "$" + new Intl.NumberFormat("es-AR").format(n);

/** Lee un % del input (coma o punto); null si no es un % válido 0–30. */
function pctOf(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t.replace(",", "."));
  return Number.isFinite(n) && n >= 0 && n <= 30 ? n : null;
}

const label: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "#6b665d",
  marginBottom: 6,
  letterSpacing: ".04em",
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "11px 12px",
  border: "1px solid #E7E0D4",
  borderRadius: 4,
  fontSize: 14,
  background: "#fff",
};

export function RateForm({ settings }: { settings: RateSettings }) {
  const [state, action, pending] = useActionState(saveRates, undefined);

  // Vista previa en vivo: lo que el público ve con cada canal (neto grosseado).
  const [nightly, setNightly] = useState<Record<UnitSlug, string>>({
    aratiri: String(settings.nightly.aratiri),
    aguaribay: String(settings.nightly.aguaribay),
  });
  const [baseGuests, setBaseGuests] = useState(String(settings.baseGuests));
  const [extraGuestFee, setExtraGuestFee] = useState(String(settings.extraGuestFee));
  const [cardPct, setCardPct] = useState(String(settings.cardFeePct).replace(".", ","));
  const [transferPct, setTransferPct] = useState(String(settings.transferFeePct).replace(".", ","));
  const cardPctNum = pctOf(cardPct) ?? settings.cardFeePct;
  const transferPctNum = pctOf(transferPct) ?? settings.transferFeePct;
  const baseGuestsNum = Number.isInteger(Number(baseGuests)) && Number(baseGuests) >= 1 && Number(baseGuests) <= 20
    ? Number(baseGuests)
    : settings.baseGuests;
  const extraGuestFeeNum = extraGuestFee.trim() !== "" && Number.isInteger(Number(extraGuestFee)) && Number(extraGuestFee) >= 0
    ? Number(extraGuestFee)
    : settings.extraGuestFee;
  // Temporada alta. Sin bloque guardado arranca con los precios de baja y mínimo 4.
  const [highNightly, setHighNightly] = useState<Record<UnitSlug, string>>({
    aratiri: String(settings.high?.nightly.aratiri ?? settings.nightly.aratiri),
    aguaribay: String(settings.high?.nightly.aguaribay ?? settings.nightly.aguaribay),
  });
  const [highMin, setHighMin] = useState(String(settings.high?.minNights ?? 4));
  const [ranges, setRanges] = useState<SeasonRange[]>(settings.high?.ranges ?? []);
  const setRange = (i: number, patch: Partial<SeasonRange>) =>
    setRanges((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const previewSettings = {
    ...settings,
    nightly: {
      aratiri: Number(nightly.aratiri) || settings.nightly.aratiri,
      aguaribay: Number(nightly.aguaribay) || settings.nightly.aguaribay,
    },
    baseGuests: baseGuestsNum,
    extraGuestFee: extraGuestFeeNum,
  };

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Precio por noche por unidad */}
      <section style={card}>
        <h2 style={h2}>Precio por noche</h2>
        <p style={hint}>
           Precio neto base para los huéspedes incluidos. Por cada huésped adicional se suma el
           importe configurado en la sección de tasas.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
          {UNITS.map((u) => {
            const net = Number(nightly[u.slug]);
            const valid = Number.isInteger(net) && net > 0;
            return (
              <div key={u.slug}>
                <label htmlFor={`nightly_${u.slug}`} style={label}>
                   {u.name} (base, hasta {u.specs.guests} huésp.)
                </label>
                <input
                  id={`nightly_${u.slug}`}
                  name={`nightly_${u.slug}`}
                  type="number"
                  min={1}
                  step={1}
                  required
                  value={nightly[u.slug]}
                  onChange={(e) => setNightly((v) => ({ ...v, [u.slug]: e.target.value }))}
                  style={input}
                />
                {valid && (
                  <p style={preview}>
                    Público para {baseGuestsNum} huésp.: {money(grossUp(net, cardPctNum))} tarjeta · {money(grossUp(net, transferPctNum))} transferencia
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Tasas */}
      <section style={card}>
        <h2 style={h2}>Tasas</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
          <div>
            <label htmlFor="cleaning_fee" style={label}>
              Limpieza (por estadía)
            </label>
            <input
              id="cleaning_fee"
              name="cleaning_fee"
              type="number"
              min={0}
              step={1}
              required
              defaultValue={settings.cleaningFee}
              style={input}
            />
          </div>
          <div>
            <label htmlFor="base_guests" style={label}>
              Huéspedes incluidos
            </label>
            <input
              id="base_guests"
              name="base_guests"
              type="number"
              min={1}
              max={20}
              step={1}
              required
               value={baseGuests}
               onChange={(e) => setBaseGuests(e.target.value)}
              style={input}
            />
          </div>
          <div>
            <label htmlFor="extra_guest_fee" style={label}>
              Huésped extra
            </label>
            <input
              id="extra_guest_fee"
              name="extra_guest_fee"
              type="number"
              min={0}
              step={1}
              required
               value={extraGuestFee}
               onChange={(e) => setExtraGuestFee(e.target.value)}
              style={input}
            />
          </div>
        </div>
        <p style={hint}>
           El cargo por huésped extra se aplica a cada noche por encima de la cantidad incluida.
        </p>
      </section>

      <section style={card}>
        <h2 style={h2}>Precios efectivos por huéspedes</h2>
        <p style={hint}>
          Vista previa de lo que calcula la web. Los importes netos son lo que recibe el alojamiento;
          los importes públicos ya incluyen el costo de cada canal.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
          {UNITS.map((u) => {
            const guests = Array.from(
              { length: Math.max(0, u.specs.guests - baseGuestsNum + 1) },
              (_, i) => baseGuestsNum + i,
            );
            return (
              <div key={u.slug} style={{ border: "1px solid #E7E0D4", borderRadius: 5, overflow: "hidden" }}>
                <div style={{ padding: "12px 14px", background: "#fbf8f2", fontSize: 13, fontWeight: 700 }}>
                  {u.name} · máximo {u.specs.guests}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, padding: "10px 14px", fontSize: 11, color: "#6b665d", borderTop: "1px solid #E7E0D4" }}>
                  <strong>Personas</strong><strong>Neto</strong><strong>Tarjeta</strong><strong>Transf.</strong>
                  {guests.map((count) => {
                    const net = netNightly(previewSettings, u.slug, count);
                    return (
                      <span key={count} style={{ display: "contents" }}>
                        <span>{count}</span>
                        <span>{money(net)}</span>
                        <span>{money(grossUp(net, cardPctNum))}</span>
                        <span>{money(grossUp(net, transferPctNum))}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Temporada alta */}
      <section style={card}>
        <h2 style={h2}>Temporada alta</h2>
        <p style={hint}>
          Las noches que caen dentro de un rango se cobran con estos precios netos. Limpieza, huésped
          extra y comisiones son los mismos que en baja. En alta no aplica el paquete de fin de semana.
          Si una estadía cruza el cambio de temporada, cada noche se cobra con su tarifa.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
          {UNITS.map((u) => {
            const net = Number(highNightly[u.slug]);
            const valid = Number.isInteger(net) && net > 0;
            return (
              <div key={u.slug}>
                <label htmlFor={`high_nightly_${u.slug}`} style={label}>
                  {u.name} · noche en alta (base)
                </label>
                <input
                  id={`high_nightly_${u.slug}`}
                  name={`high_nightly_${u.slug}`}
                  type="number"
                  min={1}
                  step={1}
                  required
                  value={highNightly[u.slug]}
                  onChange={(e) => setHighNightly((v) => ({ ...v, [u.slug]: e.target.value }))}
                  style={input}
                />
                {valid && (
                  <p style={preview}>
                    Público para {baseGuestsNum} huésp.: {money(grossUp(net, cardPctNum))} tarjeta · {money(grossUp(net, transferPctNum))} transferencia
                  </p>
                )}
              </div>
            );
          })}
          <div>
            <label htmlFor="high_min_nights" style={label}>
              Estadía mínima en alta (noches)
            </label>
            <input
              id="high_min_nights"
              name="high_min_nights"
              type="number"
              min={1}
              max={30}
              step={1}
              required
              value={highMin}
              onChange={(e) => setHighMin(e.target.value)}
              style={input}
            />
          </div>
        </div>

        <h3 style={{ fontSize: 13, fontWeight: 700, margin: "22px 0 8px" }}>Fechas de temporada alta</h3>
        <p style={hint}>
          Desde y hasta son inclusive: es la fecha de cada noche. Ejemplo: del 15/12 al 28/02 hace de
          alta la noche del 28/02; el check-out del 01/03 no cuenta. Sin rangos, todo se cobra como baja.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {ranges.map((r, i) => (
            <div key={i} style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 12 }}>
              <div>
                <label htmlFor={`range_from_${i}`} style={label}>Desde</label>
                <input
                  id={`range_from_${i}`}
                  type="date"
                  value={r.from}
                  onChange={(e) => setRange(i, { from: e.target.value })}
                  style={{ ...input, width: 180 }}
                />
              </div>
              <div>
                <label htmlFor={`range_to_${i}`} style={label}>Hasta</label>
                <input
                  id={`range_to_${i}`}
                  type="date"
                  value={r.to}
                  onChange={(e) => setRange(i, { to: e.target.value })}
                  style={{ ...input, width: 180 }}
                />
              </div>
              <button
                type="button"
                onClick={() => setRanges((rs) => rs.filter((_, j) => j !== i))}
                style={secondaryButton}
              >
                Quitar
              </button>
            </div>
          ))}
          <div>
            <button type="button" onClick={() => setRanges((rs) => [...rs, { from: "", to: "" }])} style={secondaryButton}>
              Agregar rango
            </button>
          </div>
        </div>
        {/* Las filas a medio completar no viajan: el server valida el resto. */}
        <input type="hidden" name="high_season_ranges" value={JSON.stringify(ranges.filter((r) => r.from && r.to))} />
      </section>

      <section style={{ ...card, background: "#fbf8f2" }}>
        <h2 style={h2}>Condiciones de temporada baja</h2>
        <ul style={{ margin: 0, paddingLeft: 20, color: "#6b665d", fontSize: 13, lineHeight: 1.8 }}>
          <li>Lunes a jueves: estadía mínima de {LOW_SEASON_WEEKDAY_MIN_NIGHTS} noches.</li>
          <li>Fin de semana: paquete de {WEEKEND_PACKAGE_NIGHTS} noches al valor de {WEEKEND_PACKAGE_BILLED_NIGHTS}.</li>
          <li>En temporada alta no aplica el paquete de fin de semana.</li>
          <li>Aguaribay admite hasta 6 huéspedes; Aratirí admite hasta 7.</li>
        </ul>
      </section>

      {/* Costo por canal de cobro */}
      <section style={card}>
        <h2 style={h2}>Costo por canal de cobro</h2>
        <p style={hint}>
          El precio por noche que configurás arriba es lo que <strong>RECIBÍS</strong>; el
          público ve el precio con el costo del canal incluido (neto ÷ (1 − %), redondeado
          hacia arriba a $100). El precio de lista es el de tarjeta; pagando por
          transferencia el huésped ve el ahorro en pesos.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
          <div>
            <label htmlFor="card_fee_pct" style={label}>
              Comisión tarjeta (%)
            </label>
            <input
              id="card_fee_pct"
              name="card_fee_pct"
              type="text"
              inputMode="decimal"
              required
              value={cardPct}
              onChange={(e) => setCardPct(e.target.value)}
              style={input}
            />
          </div>
          <div>
            <label htmlFor="transfer_fee_pct" style={label}>
              Costo transferencia (%)
            </label>
            <input
              id="transfer_fee_pct"
              name="transfer_fee_pct"
              type="text"
              inputMode="decimal"
              required
              value={transferPct}
              onChange={(e) => setTransferPct(e.target.value)}
              style={input}
            />
          </div>
        </div>
        <p style={hint}>
          Referencia: tarjeta MP ~7,7% efectivo (6,29% + IVA, liberación inmediata);
          transferencia ~5% (retención IIBB Misiones). Si cambia el plazo de liberación
          en MP, ajustá el % de tarjeta. Valores entre 0 y 30, acepta decimales con coma.
        </p>
      </section>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button
          type="submit"
          disabled={pending}
          style={{
            padding: "13px 30px",
            background: pending ? "#8a8170" : "#23362B",
            color: "#F8F5F0",
            border: "none",
            borderRadius: 3,
            cursor: pending ? "default" : "pointer",
            fontSize: 12.5,
            letterSpacing: ".1em",
            textTransform: "uppercase",
          }}
        >
          {pending ? "Guardando…" : "Guardar tarifas"}
        </button>
        {state?.ok && (
          <span style={{ fontSize: 13, color: "#3f8f5f" }}>
            Guardado. Los precios públicos ya reflejan el cambio.
          </span>
        )}
        {state?.error && (
          <span role="alert" style={{ fontSize: 13, color: "#8a3b1d" }}>
            {state.error}
          </span>
        )}
      </div>

      <p style={{ ...hint, margin: 0 }}>
        Impacta de inmediato en las tarifas públicas y en las reservas nuevas. Las reservas
        ya creadas conservan el total con el que se hicieron.
      </p>
    </form>
  );
}

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #E7E0D4",
  borderRadius: 8,
  padding: 24,
};

const h2: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  fontWeight: 500,
  fontSize: 22,
  margin: "0 0 8px",
};

const hint: React.CSSProperties = {
  fontSize: 12.5,
  color: "#6b665d",
  lineHeight: 1.6,
  margin: "0 0 16px",
};

const secondaryButton: React.CSSProperties = {
  padding: "10px 16px",
  background: "#fff",
  color: "#23362B",
  border: "1px solid #d8cfbf",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 12.5,
};

const preview: React.CSSProperties = {
  fontSize: 11.5,
  color: "#155e75",
  lineHeight: 1.5,
  margin: "6px 0 0",
};
