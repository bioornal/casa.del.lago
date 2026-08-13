import { listTestimonios, getReviewsAggregate } from "@/lib/reviews/testimonios.server";
import { FICHA_URL } from "@/lib/reviews/testimonios";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { TestimonioForm } from "./TestimonioForm";
import { TestimonioRow } from "./TestimonioRow";
import { AgregadoForm } from "./AgregadoForm";
import { card, h2, hint } from "./styles";

export const metadata = { title: "Opiniones — Panel La Casa del Lago" };

// Siempre fresco: el admin debe ver lo que está guardado, no una página cacheada.
export const dynamic = "force-dynamic";

export default async function AdminOpinionesPage() {
  const [testimonios, agregado] = await Promise.all([listTestimonios(), getReviewsAggregate()]);
  const publicados = testimonios.filter((t) => t.published).length;

  return (
    <div className="mx-auto max-w-[1200px] px-5 pb-24 pt-6 md:px-8 md:pt-10">
      <AdminHeader current="opiniones" title="Opiniones" description="Publicá testimonios reales y mantené actualizada la prueba social de la casa." />
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <section style={card}>
          <h2 style={h2}>Puntaje de Google</h2>
          <p style={hint}>
            Es el número grande de la sección Opiniones de la home, con el link a{" "}
            <a href={FICHA_URL} target="_blank" rel="noopener noreferrer" style={{ color: "#155e75" }}>
              tu ficha
            </a>
            .
          </p>
          <AgregadoForm current={agregado} />
        </section>

        <section style={card}>
          <h2 style={h2}>Agregar un testimonio</h2>
          <p style={hint}>
            Copiá y pegá una reseña real de tu ficha de Google. No inventes textos: la sección es
            prueba social y un testimonio falso es una mentira a alguien que está por reservar.
          </p>
          <TestimonioForm />
        </section>

        <section style={card}>
          <h2 style={h2}>
            Cargados ({publicados} {publicados === 1 ? "visible" : "visibles"} de {testimonios.length})
          </h2>
          <p style={hint}>
            El orden de esta lista es el orden en la home, y quedan mejor si la más fuerte va
            primera. Para rotarlos usá <strong>Ocultar</strong>: sale de la home pero el texto no
            se pierde.{" "}
            {publicados === 0 &&
              "Con ninguno visible, la home muestra sólo el puntaje y el link a Google — nunca inventa testimonios."}
          </p>

          {testimonios.length === 0 ? (
            <p style={{ ...hint, margin: 0 }}>
              Todavía no hay ninguno. Si el listado sigue vacío después de cargar uno, revisá que
              hayas corrido el bloque de <code>testimonials</code> del <code>setup.sql</code> en el
              SQL Editor de Supabase.
            </p>
          ) : (
            <ul style={{ display: "flex", flexDirection: "column", gap: 12, margin: 0, padding: 0 }}>
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
        </section>
      </div>
    </div>
  );
}
