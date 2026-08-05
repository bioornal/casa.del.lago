"use client";

import { useActionState, useEffect, useState } from "react";
import { crearTestimonio, editarTestimonio } from "./actions";
import { BODY_MAX, TESTIMONIO_LANGS, type Testimonio } from "@/lib/reviews/testimonios";
import { hint, label, input, submit, ok as okStyle, err as errStyle } from "./styles";

const LANG_LABEL: Record<string, string> = {
  es: "Español",
  pt: "Portugués",
  en: "Inglés",
};

/**
 * El textarea con su contador. Es un componente aparte porque tiene estado
 * propio: así, cuando el <form> se remonta después de un alta, el contador se
 * reinicia junto con el campo en vez de quedar mostrando el largo anterior.
 */
function CampoTexto({ id, defaultValue }: { id: string; defaultValue: string }) {
  const [value, setValue] = useState(defaultValue);
  const cerca = value.length > BODY_MAX * 0.9;

  return (
    <div>
      <label htmlFor={id} style={label}>
        Texto de la reseña
      </label>
      <textarea
        id={id}
        name="body"
        required
        rows={5}
        maxLength={BODY_MAX}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        style={{ ...input, resize: "vertical", lineHeight: 1.6 }}
      />
      <p style={{ ...hint, margin: "6px 0 0", color: cerca ? "#8a3b1d" : "#6b665d" }}>
        {value.length}/{BODY_MAX} caracteres. Pegalo tal cual, sin comillas y sin corregir la
        ortografía: las comillas las agrega el sitio y la voz del huésped es parte de que se lea
        auténtico.
      </p>
    </div>
  );
}

/**
 * Alta y edición usan el mismo formulario: los campos son idénticos y así una
 * validación nueva no puede quedar aplicada en una pantalla y no en la otra.
 * `existing` decide cuál de las dos acciones se dispara.
 */
export function TestimonioForm({
  existing,
  onDone,
}: {
  existing?: Testimonio;
  onDone?: () => void;
}) {
  const editando = Boolean(existing);
  const [state, action, pending] = useActionState(
    editando ? editarTestimonio : crearTestimonio,
    undefined,
  );
  // Cerrar el panel de edición es un efecto, no algo que pueda pasar durante el
  // render: llamar a onDone() en el cuerpo actualizaría al padre mientras React
  // está renderizando este hijo.
  const guardado = Boolean(state?.ok);
  useEffect(() => {
    if (guardado && editando) onDone?.();
  }, [guardado, editando, onDone]);

  return (
    <form
      // Después de un alta exitosa el token cambia, el <form> se remonta y los
      // campos quedan vacíos; sin esto es fácil cargar dos veces la misma
      // reseña. El `state` de la acción sobrevive porque vive en el componente,
      // no en el elemento.
      key={state?.token ?? "init"}
      action={action}
      style={{ display: "flex", flexDirection: "column", gap: 14 }}
    >
      {existing && <input type="hidden" name="id" value={existing.id} />}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
        <div>
          <label htmlFor={`author-${existing?.id ?? "new"}`} style={label}>
            Nombre (como figura en Google)
          </label>
          <input
            id={`author-${existing?.id ?? "new"}`}
            name="author"
            type="text"
            required
            defaultValue={existing?.author ?? ""}
            style={input}
          />
        </div>
        <div>
          <label htmlFor={`date-${existing?.id ?? "new"}`} style={label}>
            Fecha (como la muestra Google)
          </label>
          <input
            id={`date-${existing?.id ?? "new"}`}
            name="date_label"
            type="text"
            placeholder="hace 2 meses"
            defaultValue={existing?.dateLabel ?? ""}
            style={input}
          />
        </div>
        <div>
          <label htmlFor={`lang-${existing?.id ?? "new"}`} style={label}>
            Idioma del texto
          </label>
          <select
            id={`lang-${existing?.id ?? "new"}`}
            name="lang"
            defaultValue={existing?.lang ?? "es"}
            style={input}
          >
            {TESTIMONIO_LANGS.map((l) => (
              <option key={l} value={l}>
                {LANG_LABEL[l]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`rating-${existing?.id ?? "new"}`} style={label}>
            Estrellas
          </label>
          <select
            id={`rating-${existing?.id ?? "new"}`}
            name="rating"
            defaultValue={String(existing?.rating ?? 5)}
            style={input}
          >
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {"★".repeat(n)}
                {"☆".repeat(5 - n)} ({n})
              </option>
            ))}
          </select>
        </div>
      </div>

      <CampoTexto id={`body-${existing?.id ?? "new"}`} defaultValue={existing?.body ?? ""} />

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button type="submit" disabled={pending} style={submit(pending)}>
          {pending ? "Guardando…" : editando ? "Guardar cambios" : "Agregar testimonio"}
        </button>
        {editando && onDone && (
          <button
            type="button"
            onClick={onDone}
            style={{
              background: "transparent",
              border: "1px solid #E7E0D4",
              borderRadius: 4,
              padding: "8px 14px",
              fontSize: 13,
              cursor: "pointer",
              color: "#6b665d",
            }}
          >
            Cancelar
          </button>
        )}
        {state?.ok && !editando && <span style={okStyle}>Agregado. Ya está en la home.</span>}
        {state?.error && (
          <span role="alert" style={errStyle}>
            {state.error}
          </span>
        )}
      </div>
    </form>
  );
}
