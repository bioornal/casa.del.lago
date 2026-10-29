"use client";

import { useActionState, useState } from "react";
import { alternarPublicado, moverTestimonio, borrarTestimonio } from "./actions";
import { TestimonioForm } from "./TestimonioForm";
import type { Testimonio } from "@/lib/reviews/testimonios";
import { err as errStyle } from "./styles";

const LANG_LABEL: Record<string, string> = { es: "ES", pt: "PT", en: "EN" };

const btn =
  "inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-[#E7E0D4] bg-white px-3.5 text-[14px] text-[#4b473f] disabled:opacity-35";

/**
 * Una fila del listado. Cada acción es su propio <form> con su server action:
 * así los botones funcionan igual si falla la hidratación, y el error de cada
 * una se muestra donde ocurrió en vez de en un cartel global.
 *
 * En el celular las acciones entran en una sola fila (↑ ↓ Ocultar Editar);
 * Borrar, que no tiene vuelta atrás, queda dentro de Editar.
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
  const [completa, setCompleta] = useState(false);
  const [pubState, pubAction, pubPending] = useActionState(alternarPublicado, undefined);
  const [moveState, moveAction, movePending] = useActionState(moverTestimonio, undefined);
  const [delState, delAction, delPending] = useActionState(borrarTestimonio, undefined);

  const error = pubState?.error ?? moveState?.error ?? delState?.error;
  const larga = t.body.length > 220;

  return (
    <li
      className={`list-none rounded-[14px] border border-[#E7E0D4] p-4 ${t.published ? "bg-white" : "bg-[#f4f1ea]"}`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <strong className="text-[15.5px]">{t.author}</strong>
        <span className="text-[14px] tracking-[1px] text-[#c08a2e]">
          {"★".repeat(t.rating)}
          {"☆".repeat(5 - t.rating)}
        </span>
        <span className="rounded-[4px] border border-[#E7E0D4] px-1.5 text-[12px] text-[#6b665d]">
          {LANG_LABEL[t.lang] ?? t.lang.toUpperCase()}
        </span>
        {!t.published && (
          <span className="rounded-[4px] border border-[#e0c4b8] px-1.5 text-[12px] font-semibold text-[#8a3b1d]">Oculto</span>
        )}
      </div>
      {t.dateLabel && <div className="-mt-1 mb-2 text-[13px] text-[#8a8170]">{t.dateLabel}</div>}

      <blockquote
        lang={t.lang}
        className={`m-0 text-[14.5px] leading-[1.6] text-[#4a463f] ${larga && !completa ? "line-clamp-4" : ""}`}
      >
        “{t.body}”
      </blockquote>
      {larga && (
        <button
          type="button"
          onClick={() => setCompleta((v) => !v)}
          className="min-h-[36px] text-[13.5px] font-semibold text-[#155e75]"
        >
          {completa ? "Ver menos" : "Leer completa"}
        </button>
      )}

      <div className="mt-3 flex items-center gap-2">
        <form action={moveAction}>
          <input type="hidden" name="id" value={t.id} />
          <input type="hidden" name="dir" value="up" />
          <button type="submit" disabled={primero || movePending} className={btn} title="Subir" aria-label="Subir">
            ↑
          </button>
        </form>
        <form action={moveAction}>
          <input type="hidden" name="id" value={t.id} />
          <input type="hidden" name="dir" value="down" />
          <button type="submit" disabled={ultimo || movePending} className={btn} title="Bajar" aria-label="Bajar">
            ↓
          </button>
        </form>

        <form action={pubAction} className="ml-auto">
          <input type="hidden" name="id" value={t.id} />
          <input type="hidden" name="published" value={String(t.published)} />
          <button
            type="submit"
            disabled={pubPending}
            aria-label={t.published ? "Ocultar de la home" : "Publicar"}
            className={t.published ? btn : `${btn} border-[#183d43] bg-[#183d43] font-semibold text-marfil`}
          >
            {t.published ? "Ocultar" : "Publicar"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setEditando((v) => !v)}
          aria-expanded={editando}
          className={btn}
        >
          {editando ? "Cerrar" : "Editar"}
        </button>
      </div>

      {error && (
        <p role="alert" style={{ ...errStyle, margin: "10px 0 0" }}>
          {error}
        </p>
      )}

      {editando && (
        <div className="mt-4 border-t border-[#E7E0D4] pt-4">
          <TestimonioForm existing={t} onDone={() => setEditando(false)} />
          <form
            action={delAction}
            onSubmit={(e) => {
              // Borrar es definitivo y la alternativa suele ser "Ocultar": vale la
              // pena el paso extra.
              if (!confirm(`¿Borrar para siempre la reseña de ${t.author}? Para sacarla de la home sin perderla, usá "Ocultar".`)) {
                e.preventDefault();
              }
            }}
            className="mt-4 border-t border-dashed border-[#E7E0D4] pt-4"
          >
            <input type="hidden" name="id" value={t.id} />
            <button
              type="submit"
              disabled={delPending}
              className="min-h-[44px] w-full rounded-full border border-[#e0b9a6] bg-white px-4 text-[14px] text-[#8a3b1d] sm:w-auto"
            >
              {delPending ? "Borrando…" : "Borrar reseña"}
            </button>
          </form>
        </div>
      )}
    </li>
  );
}
