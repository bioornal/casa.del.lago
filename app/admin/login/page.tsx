"use client";

import { useActionState } from "react";
import { signIn } from "./actions";

// El dueño entra desde el celular: labels visibles (el placeholder desaparece al
// escribir), autocomplete para que el teclado ofrezca el email y el gestor de
// contraseñas complete solo, y 16px en los campos para que iOS no haga zoom.
const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 6,
  fontSize: 13,
  color: "#4b473f",
  fontWeight: 500,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 48,
  padding: "12px 14px",
  border: "1px solid #d8cfbf",
  borderRadius: 6,
  fontSize: 16,
  background: "#fff",
};

export default function AdminLoginPage() {
  const [state, action, pending] = useActionState(signIn, undefined);
  return (
    <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 20, background: "#f8f5f0", fontFamily: "var(--font-sans), 'Manrope', sans-serif" }}>
      <form action={action} style={{ width: "100%", maxWidth: 380, background: "#fff", border: "1px solid #E7E0D4", borderRadius: 10, padding: "28px 24px" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 26, margin: "0 0 22px" }}>
          Panel · La Casa del Lago
        </h1>
        <label htmlFor="admin-email" style={labelStyle}>Email</label>
        <input id="admin-email" name="email" type="email" required
          autoComplete="username" inputMode="email" autoCapitalize="none" spellCheck={false}
          style={{ ...inputStyle, marginBottom: 16 }} />
        <label htmlFor="admin-password" style={labelStyle}>Contraseña</label>
        <input id="admin-password" name="password" type="password" required
          autoComplete="current-password"
          style={{ ...inputStyle, marginBottom: 20 }} />
        <button type="submit" disabled={pending}
          style={{ width: "100%", minHeight: 50, padding: "14px", background: "#23362B", color: "#F8F5F0", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, letterSpacing: ".08em", textTransform: "uppercase" }}>
          {pending ? "Ingresando…" : "Ingresar"}
        </button>
        {state?.error && <p role="alert" style={{ color: "#8a3b1d", fontSize: 14, marginTop: 14 }}>{state.error}</p>}
      </form>
    </div>
  );
}
