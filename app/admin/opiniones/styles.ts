import type { CSSProperties } from "react";

// Mismos estilos inline que el resto del panel (RateForm, ModeToggle). Se
// comparten acá para que las tres piezas de esta pantalla no se desincronicen.

export const card: CSSProperties = {
  background: "#fff",
  border: "1px solid #E7E0D4",
  borderRadius: 8,
  padding: 24,
};

export const h2: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontWeight: 500,
  fontSize: 22,
  margin: "0 0 8px",
};

export const hint: CSSProperties = {
  fontSize: 12.5,
  color: "#6b665d",
  lineHeight: 1.6,
  margin: "0 0 16px",
};

export const label: CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "#6b665d",
  marginBottom: 6,
  letterSpacing: ".04em",
};

export const input: CSSProperties = {
  width: "100%",
  padding: "11px 12px",
  border: "1px solid #E7E0D4",
  borderRadius: 4,
  fontSize: 14,
  background: "#fff",
  fontFamily: "inherit",
};

export const ok: CSSProperties = { fontSize: 13, color: "#3f8f5f" };
export const err: CSSProperties = { fontSize: 13, color: "#8a3b1d" };

export function submit(pending: boolean): CSSProperties {
  return {
    padding: "13px 30px",
    background: pending ? "#8a8170" : "#23362B",
    color: "#F8F5F0",
    border: "none",
    borderRadius: 3,
    cursor: pending ? "default" : "pointer",
    fontSize: 12.5,
    letterSpacing: ".1em",
    textTransform: "uppercase",
  };
}

/** Botón chico de las filas (subir, bajar, publicar, editar, borrar). */
export function rowButton(danger = false): CSSProperties {
  return {
    background: "transparent",
    border: "1px solid #E7E0D4",
    borderRadius: 4,
    padding: "6px 11px",
    fontSize: 12.5,
    cursor: "pointer",
    color: danger ? "#8a3b1d" : "#6b665d",
    fontFamily: "inherit",
  };
}
