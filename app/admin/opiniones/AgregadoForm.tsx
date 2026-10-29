"use client";

import { useActionState } from "react";
import { guardarAgregado } from "./actions";
import type { ReviewsAggregate } from "@/lib/reviews/testimonios";
import { label, input, submit, ok as okStyle, err as errStyle, hint } from "./styles";

/**
 * El "4,7 sobre 88" que la home muestra al lado de las estrellas. Se carga a
 * mano porque NO sale de los testimonios de acá abajo: son las reseñas que
 * tiene la ficha en Google, muchas más de las que copiamos.
 */
export function AgregadoForm({ current }: { current: ReviewsAggregate }) {
  const [state, action, pending] = useActionState(guardarAgregado, undefined);

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label htmlFor="rating" style={label}>
            Puntaje (ej. 4,7)
          </label>
          <input
            id="rating"
            name="rating"
            type="text"
            inputMode="decimal"
            required
            defaultValue={String(current.rating).replace(".", ",")}
            style={input}
          />
        </div>
        <div>
          <label htmlFor="count" style={label}>
            Cantidad de reseñas
          </label>
          <input
            id="count"
            name="count"
            type="number"
            min={0}
            step={1}
            required
            defaultValue={current.count}
            style={input}
          />
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
        <button type="submit" disabled={pending} style={submit(pending)}>
          {pending ? "Guardando…" : "Guardar puntaje"}
        </button>
        {state?.ok && <span style={okStyle}>Guardado. La home ya lo muestra.</span>}
        {state?.error && (
          <span role="alert" style={errStyle}>
            {state.error}
          </span>
        )}
      </div>

      {/* No se declara como dato estructurado a propósito: Google penaliza
          marcar reseñas de terceros como propias. */}
      <p style={{ ...hint, margin: 0 }}>
        No se actualiza solo: copialo de tu ficha de Google cuando cambie.
      </p>
    </form>
  );
}
