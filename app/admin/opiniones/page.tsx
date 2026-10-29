import { listTestimonios, getReviewsAggregate } from "@/lib/reviews/testimonios.server";
import { FICHA_URL } from "@/lib/reviews/testimonios";
import { AdminHeader, ADMIN_PAGE } from "@/components/admin/AdminHeader";
import { TestimonioRow } from "./TestimonioRow";
import { AgregadoForm } from "./AgregadoForm";
import { NuevoTestimonio } from "./NuevoTestimonio";

export const metadata = { title: "Opiniones — Panel La Casa del Lago" };

// Siempre fresco: el admin debe ver lo que está guardado, no una página cacheada.
export const dynamic = "force-dynamic";

export default async function AdminOpinionesPage() {
  const [testimonios, agregado] = await Promise.all([listTestimonios(), getReviewsAggregate()]);
  const publicados = testimonios.filter((t) => t.published).length;

  return (
    <div className={ADMIN_PAGE}>
      <AdminHeader title="Opiniones" description="Las reseñas que se ven en la home, en este orden." />
      <div className="flex max-w-[820px] flex-col gap-5">
        <section className="rounded-[14px] border border-[#E7E0D4] bg-white p-4 md:p-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="m-0 font-display text-[22px] font-normal">Puntaje de Google</h2>
            <a href={FICHA_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[40px] items-center text-[14px] text-[#155e75]">
              Ver ficha ↗
            </a>
          </div>
          <AgregadoForm current={agregado} />
        </section>

        <NuevoTestimonio />

        <section>
          <h2 className="mb-3 mt-1 text-[15px] font-semibold text-[#4b473f]">
            {testimonios.length === 0
              ? "Reseñas"
              : `${publicados} ${publicados === 1 ? "visible" : "visibles"} de ${testimonios.length}`}
          </h2>

          {testimonios.length === 0 ? (
            <p className="m-0 rounded-[12px] border border-dashed border-[#d8cfbf] px-4 py-8 text-center text-[14.5px] text-[#6b665d]">
              Todavía no cargaste reseñas. Mientras tanto, la home muestra sólo el puntaje y el link a Google.
            </p>
          ) : (
            <ul className="m-0 flex flex-col gap-3 p-0">
              {testimonios.map((t, i) => (
                <TestimonioRow
                  key={t.id}
                  t={t}
                  primero={i === 0}
                  ultimo={i === testimonios.length - 1}
                />
              ))}
            </ul>
          )}
          {testimonios.length > 0 && (
            <p className="mb-0 mt-3 text-[13.5px] leading-[1.5] text-[#8a8170]">
              Con ↑ ↓ cambiás el orden en la home: la mejor, primera. &ldquo;Ocultar&rdquo; la saca de la home sin borrarla.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
