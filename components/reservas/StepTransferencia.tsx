"use client";

import { useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import type { State } from "@/lib/reservation/reducer";
import { createTransferReservation } from "@/lib/reservation/transfer";
import { formatDateOnly } from "@/lib/reservation/booking";
import type { RateSettings } from "@/lib/reservation/rate-settings";
import { computeNights } from "@/lib/reservation/pricing";
import { checkoutTotal, checkoutSavings } from "@/lib/reservation/test-unit";
import { BRUBANK_DETAILS } from "@/lib/site";
import { ACCEPT_ATTR, MAX_BYTES, isAllowedMime, formatBytes } from "@/lib/reservation/comprobante";

interface Props {
  state: State;
  settings: RateSettings;
  onPending: (code: string) => void;
}

export function StepTransferencia({ state, settings, onPending }: Props) {
  const t = useTranslations("reservas");
  const locale = useLocale();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Valida antes de subir, contra los mismos límites que aplica el servidor:
  // si divergieran, el huésped vería el archivo aceptado acá y rechazado en el POST.
  function pickFile(f: File | null) {
    if (!f) { setFile(null); return; }
    if (!isAllowedMime(f.type)) { setFile(null); setError(t("transferFileBadType")); return; }
    if (f.size > MAX_BYTES) { setFile(null); setError(t("transferFileTooBig", { size: formatBytes(f.size) })); return; }
    setError(null);
    setFile(f);
  }

  const nights = computeNights(state.checkIn!, state.checkOut!);
  // Total del método TRANSFERENCIA (más barato que el precio de lista).
  const total = checkoutTotal(settings, "transfer", state.unitId, nights, state.guests, state.checkIn);
  const savings = checkoutSavings(settings, state.unitId, nights, state.guests, state.checkIn);
  const money = (n: number) => `$${new Intl.NumberFormat("es-AR").format(n)}`;

  const submit = async () => {
    if (!file) { setError(t("transferMissingFile")); return; }
    setError(null);
    setProcessing(true);
    const res = await createTransferReservation({
      unitId: state.unitId,
      checkIn: formatDateOnly(state.checkIn!),
      checkOut: formatDateOnly(state.checkOut!),
      guests: state.guests,
      firstName: state.firstName,
      lastName: state.lastName,
      email: state.email,
      phone: state.phone,
      file,
      locale: locale as "es" | "en" | "pt",
    });
    setProcessing(false);
    if (res.status === "pending") return onPending(res.code);
    setError(res.error === "conflict" ? t("errConflict") : t("transferErrorServer"));
  };

  const row: React.CSSProperties = {
    display: "flex", justifyContent: "space-between", gap: 16,
    padding: "11px 0", borderBottom: "1px solid #ece5d8", fontSize: 14,
  };

  return (
    <div>
      <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 26, margin: "0 0 6px" }}>
        {t("transferTitle")}
      </h3>
      <p style={{ fontSize: 13, color: "#6b665d", margin: "0 0 22px", lineHeight: 1.6 }}>
        {t("transferIntro")}
      </p>

      <div style={{ marginBottom: 12 }}>
        <AccountCard title={t("transferBrubank")} alias={BRUBANK_DETAILS.alias} holder={BRUBANK_DETAILS.holder} row={row} t={t} />
      </div>
      <div style={{ background: "#fbf8f2", border: "1px solid #ece5d8", borderRadius: 6, padding: "6px 18px", marginBottom: 22 }}>
        <div style={{ ...row, borderBottom: "none" }}><span style={{ color: "#6b665d" }}>{t("transferAmount")}</span><strong>{money(total)}</strong></div>
      </div>

      {savings > 0 && (
        <p style={{ fontSize: 12.5, color: "#2f6b46", margin: "-12px 0 22px" }}>
          {t("transferSaves", { amount: money(savings) })}
        </p>
      )}

      <label style={{ display: "block", fontSize: 13, color: "#6b665d", marginBottom: 8 }}>
        {t("transferUpload")}
      </label>
      {/* Oculto fuera de vista pero dentro del tab order: display:none o
          visibility:hidden lo sacarían del foco por teclado. */}
      <input
        ref={inputRef}
        id="comprobante"
        type="file"
        accept={ACCEPT_ATTR}
        onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        style={{
          position: "absolute", width: 1, height: 1, padding: 0, margin: -1,
          overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0,
        }}
      />
      {!file ? (
        <label
          htmlFor="comprobante"
          style={{
            display: "block", textAlign: "center", padding: "22px 16px", marginBottom: 20,
            border: "1px dashed #ece5d8", borderRadius: 6, background: "#fbf8f2", cursor: "pointer",
          }}
        >
          <span style={{ fontWeight: 700, textDecoration: "underline" }}>{t("transferPickFile")}</span>
          <div style={{ fontSize: 12, color: "#6b665d", marginTop: 4 }}>{t("transferPickHint")}</div>
        </label>
      ) : (
        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
            padding: "14px 16px", marginBottom: 20, border: "1px solid #ece5d8", borderRadius: 6, background: "#fbf8f2",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ color: "#2f6b46", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {file.name}
            </div>
            <div style={{ fontSize: 12, color: "#6b665d" }}>{formatBytes(file.size)}</div>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            style={{ background: "none", border: "none", color: "#a24b2a", fontSize: 13, cursor: "pointer", flexShrink: 0 }}
          >
            {t("transferChangeFile")}
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={processing}
        style={{
          display: "block", width: "100%", background: processing ? "#d8cdbd" : "#23362B",
          color: "#F8F5F0", border: "none", cursor: processing ? "not-allowed" : "pointer",
          fontFamily: "'Manrope', sans-serif", fontSize: 12.5, letterSpacing: ".1em",
          textTransform: "uppercase", padding: "15px 30px", borderRadius: 3,
        }}
      >
        {processing ? t("transferProcessing") : t("transferSubmit")}
      </button>

      {error && (
        <div role="alert" style={{ marginTop: 18, padding: "12px 16px", borderRadius: 6,
          background: "#f7e9e2", border: "1px solid #e0b9a6", color: "#8a3b1d", fontSize: 13 }}>
          {error}
        </div>
      )}
    </div>
  );
}

function AccountCard({
  title,
  alias,
  cbu,
  holder,
  row,
  t,
}: {
  title: string;
  alias: string;
  cbu?: string;
  holder: string;
  row: React.CSSProperties;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div style={{ background: "#fbf8f2", border: "1px solid #ece5d8", borderRadius: 6, padding: "6px 18px" }}>
      <strong style={{ display: "block", padding: "10px 0 4px", fontSize: 14 }}>{title}</strong>
      <div style={row}><span style={{ color: "#6b665d" }}>{t("transferAlias")}</span><strong>{alias}</strong></div>
      {cbu && <div style={row}><span style={{ color: "#6b665d" }}>{t("transferCbu")}</span><strong>{cbu}</strong></div>}
      <div style={{ ...row, borderBottom: "none" }}><span style={{ color: "#6b665d" }}>{t("transferHolder")}</span><strong>{holder}</strong></div>
    </div>
  );
}
