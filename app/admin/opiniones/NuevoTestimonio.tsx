"use client";

import { useState } from "react";
import { TestimonioForm } from "./TestimonioForm";

// Plegado de entrada: el formulario abierto empujaba la lista de reseñas
// (lo que el dueño viene a revisar) varias pantallas hacia abajo.
export function NuevoTestimonio() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[12px] border border-dashed border-[#183d43]/45 bg-white px-4 text-[15px] font-semibold text-[#183d43]"
      >
        <span aria-hidden className="text-[20px] leading-none">+</span> Agregar reseña de Google
      </button>
    );
  }

  return (
    <section className="rounded-[14px] border border-[#E7E0D4] bg-white p-4 md:p-6">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="m-0 font-display text-[22px] font-normal">Nueva reseña</h2>
          <p className="mb-0 mt-1 text-[13.5px] leading-[1.5] text-[#6b665d]">
            Copiá y pegá una reseña real de tu ficha de Google, tal cual está.
          </p>
        </div>
        <button
          type="button"
          aria-label="Cerrar formulario"
          onClick={() => setOpen(false)}
          className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[22px] text-[#6b665d] hover:bg-[#f3efe7]"
        >
          ×
        </button>
      </div>
      <TestimonioForm />
    </section>
  );
}
