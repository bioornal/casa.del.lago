import type { CSSProperties } from "react";

// Mismos estilos inline que el resto del panel (RateForm, ModeToggle). Se
// comparten acá para que las tres piezas de esta pantalla no se desincronicen.

export const hint: CSSProperties = {
  fontSize: 13.5,
  color: "#6b665d",
  lineHeight: 1.6,
  margin: "0 0 16px",
};

export const label: CSSProperties = {
  display: "block",
  fontSize: 13,
  color: "#6b665d",
  marginBottom: 6,
  letterSpacing: ".04em",
};

export const input: CSSProperties = {
  width: "100%",
  minHeight: 48,
  padding: "11px 12px",
  border: "1px solid #ddd5c7",
  borderRadius: 8,
  fontSize: 14,
  background: "#fff",
  fontFamily: "inherit",
};

export const ok: CSSProperties = { fontSize: 14, color: "#3f8f5f" };
export const err: CSSProperties = { fontSize: 14, color: "#8a3b1d" };

export function submit(pending: boolean): CSSProperties {
  return {
    minHeight: 48,
    padding: "0 24px",
    background: pending ? "#8a8170" : "#183d43",
    color: "#F8F5F0",
    border: "none",
    borderRadius: 999,
    cursor: pending ? "default" : "pointer",
    fontSize: 14.5,
    fontWeight: 600,
  };
}

