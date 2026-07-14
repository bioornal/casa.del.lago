import { useTranslations } from "next-intl";
import { format } from "date-fns";
import type { State } from "@/lib/reservation/reducer";
import { getUnit, CLEANING_FEE, pricePerNight } from "@/lib/units";
import {
  computeNights,
  computeSubtotal,
  computeTotal,
} from "@/lib/reservation/pricing";

const money = (n: number) => "$" + new Intl.NumberFormat("es-AR").format(n);

interface OrderSummaryProps {
  state: State;
}

export function OrderSummary({ state }: OrderSummaryProps) {
  const t = useTranslations("reservas");
  const unit = getUnit(state.unitId)!;
  const nights = computeNights(state.checkIn, state.checkOut);
  const nightly = pricePerNight(state.unitId, state.guests);
  const subtotal = computeSubtotal(nightly, nights);
  const total = computeTotal(nightly, nights, CLEANING_FEE);

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
            {money(nightly)} × {nights || 0}
          </span>
          <span style={{ color: "var(--color-carbon)" }}>
            {nights > 0 ? money(subtotal) : "—"}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
          <span className="text-muted">{t("cleaning")}</span>
          <span style={{ color: "var(--color-carbon)" }}>
            {nights > 0 ? money(CLEANING_FEE) : "—"}
          </span>
        </div>
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
          {nights > 0 ? money(total) : "—"}
        </span>
      </div>

      {/* No fees note */}
      <div className="text-muted" style={{ fontSize: 12, marginTop: 10, lineHeight: 1.5 }}>
        {t("noFees")}
      </div>
    </div>
  );
}
