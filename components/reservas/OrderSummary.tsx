import { useTranslations } from "next-intl";
import { format } from "date-fns";
import type { State } from "@/lib/reservation/reducer";
import { getUnit } from "@/lib/units";
import type { RateSettings } from "@/lib/reservation/rate-settings";
import { computeNights } from "@/lib/reservation/pricing";
import { priceBreakdown, transferSavings, type PaymentMethod } from "@/lib/reservation/method-pricing";

const money = (n: number) => "$" + new Intl.NumberFormat("es-AR").format(n);

interface OrderSummaryProps {
  state: State;
  settings: RateSettings;
  /** Método elegido en el paso Pago: el desglose muestra SUS precios. */
  method?: PaymentMethod;
}

export function OrderSummary({ state, settings, method = "card" }: OrderSummaryProps) {
  const t = useTranslations("reservas");
  const unit = getUnit(state.unitId)!;
  const nights = computeNights(state.checkIn, state.checkOut);
  const bd = priceBreakdown(settings, method, state.unitId, nights);
  const savings = transferSavings(settings, state.unitId, nights);

  // Format date range
  const formatDate = (d: Date) => format(d, "d MMM");
  const rangeLabel =
    state.checkIn && state.checkOut
      ? `${formatDate(state.checkIn)} – ${formatDate(state.checkOut)}`
      : "—";

  return (
    <div
      className="border border-borde-claro bg-white"
      style={{
        color: "var(--color-carbon)",
        borderRadius: "var(--radius-card)",
        padding: 30,
        boxShadow: "var(--shadow-card)",
      }}
    >
      {/* Kicker */}
      <div
        className="text-bronce"
        style={{
          fontSize: 11,
          letterSpacing: ".22em",
          textTransform: "uppercase",
        }}
      >
        {t("yourReservation")}
      </div>

      {/* Unit name */}
      <div
        className="font-display"
        style={{
          fontSize: 28,
          color: "var(--color-carbon)",
          marginTop: 10,
        }}
      >
        {unit.name}
      </div>

      {/* Info rows */}
      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
          <span className="text-muted">{t("dates")}</span>
          <span style={{ color: "var(--color-carbon)", textAlign: "right" }}>{rangeLabel}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
          <span className="text-muted">{t("nights")}</span>
          <span style={{ color: "var(--color-carbon)" }}>{nights > 0 ? String(nights) : "—"}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
          <span className="text-muted">{t("guests")}</span>
          <span style={{ color: "var(--color-carbon)" }}>
            {state.guests}{" "}
            {state.guests === 1 ? t("adult") : t("adults")}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: "1px solid var(--color-borde-claro)", margin: "24px 0" }} />

      {/* Price breakdown */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
          <span className="text-muted">
            {money(bd.nightly)} × {nights || 0}
          </span>
          <span style={{ color: "var(--color-carbon)" }}>
            {nights > 0 ? money(bd.lodging) : "—"}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
          <span className="text-muted">{t("cleaning")}</span>
          <span style={{ color: "var(--color-carbon)" }}>
            {nights > 0 ? money(bd.cleaningFee) : "—"}
          </span>
        </div>
        {nights > 0 && bd.discount > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
            <span style={{ color: "#2f6b46" }}>{t("transferDiscount")}</span>
            <span style={{ color: "#2f6b46" }}>−{money(bd.discount)}</span>
          </div>
        )}
      </div>

      {/* Total */}
      <div style={{ borderTop: "1px solid var(--color-borde-claro)", margin: "24px 0 0" }} />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginTop: 20,
        }}
      >
        <span className="font-display" style={{ fontSize: 24, color: "var(--color-carbon)" }}>
          Total
        </span>
        <span className="font-display" style={{ fontSize: 30, color: "var(--color-carbon)" }}>
          {nights > 0 ? money(bd.total) : "—"}
        </span>
      </div>

      {/* Ahorro eligiendo transferencia (solo si está mirando tarjeta) */}
      {method === "card" && nights > 0 && savings > 0 && (
        <div style={{ fontSize: 12.5, color: "#2f6b46", marginTop: 12, lineHeight: 1.5 }}>
          {t("transferSaves", { amount: money(savings) })}
        </div>
      )}

      {/* No fees note */}
      <div className="text-muted" style={{ fontSize: 12, marginTop: 10, lineHeight: 1.5 }}>
        {t("noFees")}
      </div>
    </div>
  );
}
