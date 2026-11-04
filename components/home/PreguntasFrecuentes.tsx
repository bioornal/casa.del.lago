import { useTranslations } from "next-intl";
import { Kicker } from "@/components/ui/Kicker";
import { Ilustracion, ILUSTRACION_PREGUNTAS } from "@/components/ui/Ilustracion";

// Preguntas frecuentes de la home. Es texto visible (no sólo JSON-LD): Google
// exige que el FAQPage refleje lo que está en la página, y es el formato que los
// motores de IA citan cuando alguien pregunta "¿tiene pileta?" o "¿a cuánto
// queda de las Cataratas?". Las respuestas salen de datos del propio sitio.
// <details> nativo: se abre con el dedo sin JS y el contenido igual está en el
// HTML para los buscadores.
export function PreguntasFrecuentes() {
  const t = useTranslations("faq");
  const items = t.raw("items") as Array<{ q: string; a: string }>;

  return (
    <section id="preguntas" className="bg-marfil px-[clamp(20px,4vw,56px)] py-[clamp(72px,10vh,128px)]">
      <div className="mx-auto grid max-w-[1240px] grid-cols-1 items-start gap-[clamp(28px,5vw,88px)] md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div>
          <Kicker>{t("kicker")}</Kicker>
          <h2
            className="font-display mt-[22px] text-balance font-normal leading-[1.14] tracking-[-0.02em] text-carbon"
            style={{ fontSize: "clamp(28px,3.2vw,44px)" }}
          >
            {t("title")}
          </h2>
          {/* Ilustración: la llave, la brújula y el mapa del lago — lo que hay
              que saber para llegar. Viñeta en la columna vacía bajo el título
              (nunca detrás de un texto). Sólo en desktop: en celular las
              preguntas vienen enseguida y no hay hueco. El encuadre le saca
              el papel vacío de arriba y abajo: más dibujo en el mismo alto. */}
          <Ilustracion
            {...ILUSTRACION_PREGUNTAS}
            encuadre={{ proporcion: "928 / 760", posicion: "50% 55%" }}
            enFlujo
            aclarar={1.13}
            parallax={30}
            sizes="420px"
            className="mt-[clamp(20px,3vw,40px)] hidden w-[clamp(280px,30vw,420px)] -translate-x-[8%] md:block"
          />
        </div>

        <div className="border-b border-borde-medio">
          {items.map(({ q, a }) => (
            <details key={q} className="group border-t border-borde-medio">
              <summary className="flex min-h-[60px] cursor-pointer list-none items-center justify-between gap-4 py-4 [&::-webkit-details-marker]:hidden">
                <h3 className="m-0 font-display text-[19px] font-normal leading-[1.3] text-carbon">{q}</h3>
                <svg
                  aria-hidden
                  className="h-5 w-5 shrink-0 text-lago transition-transform duration-300 group-open:rotate-45"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </summary>
              <p className="m-0 max-w-[620px] pb-5 text-pretty text-[16px] font-light leading-[1.7] text-cuerpo">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
