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
    <div className="rounded-[10px] bg-[#fbf8f2] p-4">
      <h3 className="m-0 text-[15px] font-semibold">Unidad de prueba</h3>

      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "10px 0 12px" }}>
        <span
          style={{
            display: "inline-block",
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: current ? "#3f8f5f" : "#b0741d",
          }}
        />
        <strong style={{ fontSize: 15 }}>{current ? "Habilitada" : "Deshabilitada"}</strong>
      </div>

      <p style={hint}>
        Una cabaña ficticia para probar una reserva pagada de punta a punta (cobro,
        emails y aviso al dueño). No aparece en la web ni bloquea fechas reales; sólo
        se llega por el link. Cobra {money(TEST_UNIT_TOTAL)} reales.
      </p>

      {/* El flag tiene memo de 30 s y en serverless hay varias instancias:
          apagarlo no es instantáneo en todos los servidores. */}
      <p style={hint}>Al deshabilitarla puede tardar hasta 30 segundos en cerrarse del todo.</p>

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
            minHeight: 46,
            padding: "0 20px",
            background: pending ? "#8a8170" : current ? "#8a3b1d" : "#183d43",
            color: "#F8F5F0",
            border: "none",
            borderRadius: 999,
            cursor: pending ? "default" : "pointer",
            fontSize: 14,
            fontWeight: 600,
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

const hint: React.CSSProperties = {
  fontSize: 13.5,
  color: "#6b665d",
  lineHeight: 1.55,
  margin: "0 0 12px",
};
