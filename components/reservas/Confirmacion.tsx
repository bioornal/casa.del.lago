import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { Link } from "@/lib/i18n/navigation";
import type { State } from "@/lib/reservation/reducer";
import { getUnit, CLEANING_FEE, pricePerNight } from "@/lib/units";
import { computeNights, computeTotal } from "@/lib/reservation/pricing";

const money = (n: number) => "$" + new Intl.NumberFormat("es-AR").format(n);

interface ConfirmacionProps {
  state: State;
  code: string;
  pending?: boolean;
}

export function Confirmacion({ state, code, pending }: ConfirmacionProps) {
  const t = useTranslations("reservas");
  const tCta = useTranslations("cta");
  const unit = getUnit(state.unitId)!;
  const nights = computeNights(state.checkIn, state.checkOut);
  const total = computeTotal(pricePerNight(state.unitId, state.guests), nights, CLEANING_FEE);

  const formatDate = (d: Date) => format(d, "d MMM");
  const rangeLabel =
    state.checkIn && state.checkOut
      ? `${formatDate(state.checkIn)} – ${formatDate(state.checkOut)}`
      : "—";

  const guestsLabel = `${state.guests} ${state.guests === 1 ? t("adult") : t("adults")}`;

  const title = pending ? t("payPendingTitle") : t("confirmedTitle");
  const sub = pending ? t("payPendingSub") : t("confirmedSub");

  return (
    <div
      className="border border-borde-claro bg-white"
      style={{
        maxWidth: 620,
        margin: "24px auto 0",
        borderRadius: "var(--radius-card)",
        padding: "56px 48px",
        textAlign: "center",
        color: "var(--color-carbon)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {/* Check circle */}
      <div
        style={{
          width: 70,
          height: 70,
          border: "2px solid var(--color-selva)",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-selva)",
          fontSize: 32,
          margin: "0 auto",
        }}
      >
        ✓
      </div>

      {/* Handwritten, éxito solamente */}
      {!pending && (
        <div
          className="font-accent"
          style={{
            fontWeight: 500,
            fontSize: 34,
            color: "var(--color-atardecer)",
            transform: "rotate(-2deg)",
            marginTop: 22,
          }}
        >
          {tCta("handwritten")}
        </div>
      )}

      {/* Title */}
      <h2
        className="font-display"
        style={{
          fontWeight: 400,
          fontSize: 30,
          margin: pending ? "26px 0 0" : "12px 0 0",
          color: "var(--color-carbon)",
        }}
      >
        {title}
      </h2>

      {/* Subtitle */}
      <p
        className="text-cuerpo"
        style={{
          fontSize: 15,
          lineHeight: 1.7,
          fontWeight: 300,
          margin: "14px auto 0",
          maxWidth: "42ch",
        }}
      >
        {sub}
      </p>

      {/* Summary card */}
      <div
        className="bg-arena-clara border border-borde-claro"
        style={{
          borderRadius: 6,
          padding: 24,
          margin: "34px 0 0",
          textAlign: "left",
        }}
      >
        {/* Code (también sirve de referencia cuando el pago quedó pendiente) */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "9px 0",
            fontSize: 14,
          }}
        >
          <span className="text-muted">{t("code")}</span>
          <span style={{ color: "var(--color-carbon)", letterSpacing: ".08em" }}>{code}</span>
        </div>

        {/* Accommodation */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "9px 0",
            fontSize: 14,
            borderTop: pending ? undefined : "1px solid var(--color-borde-claro)",
          }}
        >
          <span className="text-muted">{t("accommodation")}</span>
          <span style={{ color: "var(--color-carbon)" }}>{unit.name}</span>
        </div>

        {/* Dates */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "9px 0",
            fontSize: 14,
            borderTop: "1px solid var(--color-borde-claro)",
          }}
        >
          <span className="text-muted">{t("dates")}</span>
          <span style={{ color: "var(--color-carbon)" }}>{rangeLabel}</span>
        </div>

        {/* Guests */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "9px 0",
            fontSize: 14,
            borderTop: "1px solid var(--color-borde-claro)",
          }}
        >
          <span className="text-muted">{t("guests")}</span>
          <span style={{ color: "var(--color-carbon)" }}>{guestsLabel}</span>
        </div>

        {/* Total */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "13px 0 4px",
            fontSize: 16,
            borderTop: "1px solid var(--color-borde-claro)",
            marginTop: 6,
          }}
        >
          <span
            className="font-display"
            style={{
              color: "var(--color-carbon)",
              fontSize: 22,
            }}
          >
            Total
          </span>
          <span
            className="font-display"
            style={{
              color: "var(--color-carbon)",
              fontSize: 22,
            }}
          >
            {nights > 0 ? money(total) : "—"}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div
        style={{
          display: "flex",
          gap: 14,
          justifyContent: "center",
          marginTop: 32,
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/"
          className="border border-carbon font-sans transition-[background,color] duration-300 hover:bg-carbon hover:text-arena"
          style={{
            color: "var(--color-carbon)",
            textDecoration: "none",
            fontSize: 12.5,
            letterSpacing: ".1em",
            textTransform: "uppercase",
            padding: "14px 30px",
            borderRadius: 3,
          }}
        >
          {t("backHome")}
        </Link>
        <Link
          href="/tarifas"
          style={{
            background: "var(--color-terracota)",
            color: "#F8F5F0",
            border: "none",
            textDecoration: "none",
            fontFamily: "var(--font-sans)",
            fontSize: 12.5,
            letterSpacing: ".1em",
            textTransform: "uppercase",
            padding: "14px 28px",
            borderRadius: 3,
            transition: "background .3s",
          }}
        >
          {t("newRes")}
        </Link>
      </div>

      {/* Link a la consulta de estado */}
      <p style={{ marginTop: 22, fontSize: 13 }}>
        <Link href="/mi-reserva" style={{ color: "var(--color-lago)", textDecoration: "underline" }}>
          {t("checkStatus")}
        </Link>
      </p>
    </div>
  );
}
