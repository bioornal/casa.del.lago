"use client";

import { useActionState } from "react";
import { saveTestUnit } from "./actions";
import { TEST_UNIT_ID, TEST_UNIT_TOTAL } from "@/lib/reservation/test-unit";

const money = (n: number) => "$" + new Intl.NumberFormat("es-AR").format(n);

/** Fechas del link de prueba: bien lejos, para no colisionar con nada real. */
function testLink(): string {
  const day = 24 * 60 * 60 * 1000;
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const checkIn = new Date(Date.now() + 365 * day);
  const checkOut = new Date(Date.now() + 366 * day);
  return `/es/reservas?unit=${TEST_UNIT_ID}&checkIn=${fmt(checkIn)}&checkOut=${fmt(checkOut)}&guests=2`;
}

export function TestUnitToggle({ current }: { current: boolean }) {
  const [state, action, pending] = useActionState(saveTestUnit, undefined);

  return (
    <div style={card}>
      <h2 style={h2}>Unidad de prueba</h2>

      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }}>
        <span
          style={{
            display: "inline-block",
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: current ? "#3f8f5f" : "#b0741d",
          }}
        />
        <strong style={{ fontSize: 17 }}>{current ? "HABILITADA" : "Deshabilitada"}</strong>
      </div>

      <p style={hint}>
        Una unidad de alojamiento que no existe, para probar la cadena completa de una
        reserva pagada: cobro con tarjeta, fila en reservas, email al huésped con el
        .ics adjunto y aviso al dueño. No aparece en el sitio, no está en el buscador
        ni en tarifas, y no bloquea disponibilidad de ninguna unidad real. Solo se
        llega por el link.
      </p>

      <p style={hint}>
        Cobra {money(TEST_UNIT_TOTAL)} reales con la tarjeta que se use para probar.
      </p>

      <p style={hint}>
        Apagar el flag puede tardar hasta 30 segundos en propagarse a todos los
        servidores: la lectura de este valor tiene un memo con ese TTL y en
        serverless hay varias instancias corriendo a la vez. No asumas que
        quedó cerrado al instante de tocar el botón.
      </p>

      {current && (
        <p style={hint}>
          Link de prueba:{" "}
          <code style={{ userSelect: "all", wordBreak: "break-all" }}>{testLink()}</code>
        </p>
      )}

      <form action={action}>
        <input type="hidden" name="test_unit_enabled" value={current ? "0" : "1"} />
        <button
          type="submit"
          disabled={pending}
          onClick={(e) => {
            // Solo al HABILITAR: es la acción que abre un endpoint de cobro
            // real. Apagar no necesita confirmación, igual que ModeToggle
            // solo la pide para abrir el cobro online, no para pausarlo.
            if (!current && !confirm(
              `Vas a HABILITAR la unidad de prueba: un endpoint de cobro REAL de ${money(TEST_UNIT_TOTAL)}, alcanzable por cualquiera que tenga el link.\n\n¿Te vas a acordar de apagarla apenas termine la prueba?`
            )) {
              e.preventDefault();
            }
          }}
          style={{
            padding: "13px 30px",
            background: pending ? "#8a8170" : current ? "#8a3b1d" : "#23362B",
            color: "#F8F5F0",
            border: "none",
            borderRadius: 3,
            cursor: pending ? "default" : "pointer",
            fontSize: 12.5,
            letterSpacing: ".1em",
            textTransform: "uppercase",
          }}
        >
          {pending ? "Guardando…" : current ? "Deshabilitar unidad de prueba" : "Habilitar unidad de prueba"}
        </button>
      </form>

      {state?.ok && (
        <p style={{ fontSize: 13, color: "#3f8f5f", marginTop: 14 }}>
          Guardado. Recargá esta página para ver el estado nuevo.
        </p>
      )}
      {state?.error && (
        <p role="alert" style={{ fontSize: 13, color: "#8a3b1d", marginTop: 14 }}>
          {state.error}
        </p>
      )}
    </div>
  );
}

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #E7E0D4",
  borderRadius: 8,
  padding: 24,
};

const h2: React.CSSProperties = {
  fontFamily: "'Cormorant Garamond', serif",
  fontWeight: 500,
  fontSize: 22,
  margin: 0,
};

const hint: React.CSSProperties = {
  fontSize: 12.5,
  color: "#6b665d",
  lineHeight: 1.6,
  margin: "0 0 16px",
};
