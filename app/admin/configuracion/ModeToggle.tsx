"use client";

import { useActionState } from "react";
import { saveBookingMode } from "./actions";
import type { BookingMode } from "@/lib/site-settings";

export function ModeToggle({
  current,
  overridden,
}: {
  current: BookingMode;
  overridden: boolean;
}) {
  const [state, action, pending] = useActionState(saveBookingMode, undefined);
  const isOnline = current === "online";
  const next: BookingMode = isOnline ? "whatsapp" : "online";

  return (
    <section className="rounded-[14px] border border-[#E7E0D4] bg-white p-4 md:p-6">
      <h2 className="m-0 font-display text-[22px] font-normal">Cómo reservan los huéspedes</h2>

      <div
        className={`mt-3 flex items-center gap-3 rounded-[10px] px-4 py-3 ${
          isOnline ? "bg-[#e8f5ee] text-[#245c3c]" : "bg-[#fbecd0] text-[#6b4a12]"
        }`}
      >
        <span aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-full ${isOnline ? "bg-[#3f8f5f]" : "bg-[#b0741d]"}`} />
        <strong className="text-[15.5px]">{isOnline ? "Reservan y pagan en la web" : "Reservan por WhatsApp"}</strong>
      </div>

      <p className="mb-0 mt-3 text-[14px] leading-[1.55] text-[#6b665d]">
        {isOnline
          ? "El huésped elige fechas, paga con tarjeta o transferencia y la reserva te llega sola."
          : "Los botones de reservar abren WhatsApp con las fechas ya escritas. La web sigue mostrando precios y disponibilidad, pero no cobra."}
      </p>

      {overridden && (
        <p role="alert" className="mb-0 mt-3 rounded-[8px] bg-[#f7e9e2] px-3 py-2 text-[13.5px] leading-[1.5] text-[#8a3b1d]">
          Este ajuste está bloqueado desde la configuración del servidor (NEXT_PUBLIC_BOOKING_MODE en Netlify):
          cambiarlo acá no tiene efecto hasta que se quite esa variable.
        </p>
      )}

      <form action={action} className="mt-4">
        <input type="hidden" name="booking_mode" value={next} />
        <button
          type="submit"
          disabled={pending}
          onClick={(e) => {
            if (next === "online" && !confirm(
              "Vas a ABRIR el cobro online. Los huéspedes van a poder pagar con tarjeta y transferencia.\n\n¿Verificaste que los datos bancarios y las credenciales de Mercado Pago estén bien?"
            )) {
              e.preventDefault();
            }
          }}
          className={`min-h-[48px] w-full rounded-full px-5 text-[14.5px] font-semibold text-marfil disabled:bg-[#8a8170] sm:w-auto ${
            next === "online" ? "bg-[#183d43]" : "bg-[#8a3b1d]"
          }`}
        >
          {pending ? "Guardando…" : next === "online" ? "Pasar a cobro en la web" : "Pasar a reservas por WhatsApp"}
        </button>
      </form>

      {state?.ok && <p className="mb-0 mt-3 text-[14px] text-[#3f8f5f]">Guardado ✓ Recargá la página para ver el estado nuevo.</p>}
      {state?.error && (
        <p role="alert" className="mb-0 mt-3 text-[14px] text-[#8a3b1d]">
          {state.error}
        </p>
      )}
    </section>
  );
}
