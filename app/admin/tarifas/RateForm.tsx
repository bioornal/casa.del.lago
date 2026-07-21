"use client";

import { useActionState, useState } from "react";
import { saveRates } from "./actions";
import type { RateSettings } from "@/lib/reservation/rate-settings";
import { grossUp } from "@/lib/reservation/method-pricing";
import { UNITS, type UnitSlug } from "@/lib/units";

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
  const [cardPct, setCardPct] = useState(String(settings.cardFeePct).replace(".", ","));
  const [transferPct, setTransferPct] = useState(String(settings.transferFeePct).replace(".", ","));
  const cardPctNum = pctOf(cardPct) ?? settings.cardFeePct;
  const transferPctNum = pctOf(transferPct) ?? settings.transferFeePct;

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Precio por noche por unidad */}
      <section style={card}>
        <h2 style={h2}>Precio por noche</h2>
        <p style={hint}>
          Tarifa plana por unidad, sin importar la cantidad de huéspedes. Cuando cambia la
          temporada, actualizá estos valores.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
          {UNITS.map((u) => {
            const net = Number(nightly[u.slug]);
            const valid = Number.isInteger(net) && net > 0;
            return (
              <div key={u.slug}>
                <label htmlFor={`nightly_${u.slug}`} style={label}>
                  {u.name} (hasta {u.specs.guests} huésp.)
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
                    Público: {money(grossUp(net, cardPctNum))} tarjeta · {money(grossUp(net, transferPctNum))} transferencia
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
              defaultValue={settings.baseGuests}
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
              defaultValue={settings.extraGuestFee}
              style={input}
            />
          </div>
        </div>
        <p style={hint}>
          El cargo por huésped extra se guarda pero todavía no se aplica al cálculo: hoy el
          precio es tarifa plana por unidad. Queda listo para activarlo a futuro.
        </p>
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

const preview: React.CSSProperties = {
  fontSize: 11.5,
  color: "#155e75",
  lineHeight: 1.5,
  margin: "6px 0 0",
};
