"use client";

import { useActionState, useState } from "react";
import { alternarPublicado, moverTestimonio, borrarTestimonio } from "./actions";
import { TestimonioForm } from "./TestimonioForm";
import type { Testimonio } from "@/lib/reviews/testimonios";
import { rowButton, err as errStyle } from "./styles";

const LANG_LABEL: Record<string, string> = { es: "ES", pt: "PT", en: "EN" };

/**
 * Una fila del listado. Cada acción es su propio <form> con su server action:
 * así los botones funcionan igual si falla la hidratación, y el error de cada
 * una se muestra donde ocurrió en vez de en un cartel global.
 */
export function TestimonioRow({
  t,
  primero,
  ultimo,
}: {
  t: Testimonio;
  primero: boolean;
  ultimo: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [pubState, pubAction, pubPending] = useActionState(alternarPublicado, undefined);
  const [moveState, moveAction, movePending] = useActionState(moverTestimonio, undefined);
  const [delState, delAction, delPending] = useActionState(borrarTestimonio, undefined);

  const error = pubState?.error ?? moveState?.error ?? delState?.error;

  return (
    <li
      style={{
        border: "1px solid #E7E0D4",
        borderRadius: 6,
        padding: 16,
        background: t.published ? "#fff" : "#f4f1ea",
        listStyle: "none",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "baseline", marginBottom: 8 }}>
        <strong style={{ fontSize: 15 }}>{t.author}</strong>
        <span style={{ fontSize: 13, color: "#c08a2e", letterSpacing: 1 }}>
          {"★".repeat(t.rating)}
          {"☆".repeat(5 - t.rating)}
        </span>
        {t.dateLabel && <span style={{ fontSize: 12.5, color: "#6b665d" }}>{t.dateLabel}</span>}
        <span style={badge}>{LANG_LABEL[t.lang] ?? t.lang.toUpperCase()}</span>
        {!t.published && <span style={{ ...badge, color: "#8a3b1d", borderColor: "#e0c4b8" }}>Oculto</span>}
      </div>

      <blockquote lang={t.lang} style={{ margin: "0 0 12px", fontSize: 13.5, lineHeight: 1.65, color: "#4a463f" }}>
        “{t.body}”
      </blockquote>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <form action={moveAction}>
          <input type="hidden" name="id" value={t.id} />
          <input type="hidden" name="dir" value="up" />
          <button type="submit" disabled={primero || movePending} style={rowButton()} title="Subir">
            ↑
          </button>
        </form>
        <form action={moveAction}>
          <input type="hidden" name="id" value={t.id} />
          <input type="hidden" name="dir" value="down" />
          <button type="submit" disabled={ultimo || movePending} style={rowButton()} title="Bajar">
            ↓
          </button>
        </form>

        <form action={pubAction}>
          <input type="hidden" name="id" value={t.id} />
          <input type="hidden" name="published" value={String(t.published)} />
          <button type="submit" disabled={pubPending} style={rowButton()}>
            {t.published ? "Ocultar de la home" : "Publicar"}
          </button>
        </form>

        <button type="button" onClick={() => setEditando((v) => !v)} style={rowButton()}>
          {editando ? "Cerrar" : "Editar"}
        </button>

        <form
          action={delAction}
          onSubmit={(e) => {
            // Borrar es definitivo y la alternativa suele ser "Ocultar": vale la
            // pena el paso extra.
            if (!confirm(`¿Borrar para siempre la reseña de ${t.author}? Para sacarla de la home sin perderla, usá "Ocultar".`)) {
              e.preventDefault();
            }
          }}
          style={{ marginLeft: "auto" }}
        >
          <input type="hidden" name="id" value={t.id} />
          <button type="submit" disabled={delPending} style={rowButton(true)}>
            {delPending ? "Borrando…" : "Borrar"}
          </button>
        </form>
      </div>

      {error && (
        <p role="alert" style={{ ...errStyle, margin: "10px 0 0" }}>
          {error}
        </p>
      )}

      {editando && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #E7E0D4" }}>
          <TestimonioForm existing={t} onDone={() => setEditando(false)} />
        </div>
      )}
    </li>
  );
}

const badge: React.CSSProperties = {
  fontSize: 11,
  color: "#6b665d",
  border: "1px solid #E7E0D4",
  borderRadius: 3,
  padding: "2px 7px",
  letterSpacing: ".06em",
};
