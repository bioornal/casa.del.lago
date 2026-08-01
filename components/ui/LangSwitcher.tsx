"use client";
import { useLocale } from "next-intl";
import { usePathname } from "@/lib/i18n/navigation";

const LOCALES = ["es", "en", "pt"] as const;

export function LangSwitcher({
  variant = "light",
}: {
  variant?: "light" | "dark" | "pills";
}) {
  const locale = useLocale();
  const pathname = usePathname();

  // Navegación completa a propósito, no router.replace(): cambiar de locale es
  // lo ÚNICO que vuelve a renderizar LocaleLayout en el cliente (navegar entre
  // páginas del mismo idioma no lo toca, porque el segmento no cambia). En ese
  // re-render React se topaba con el <script> de arranque de FX y avisaba por
  // consola que no puede ejecutar scripts en cliente. Con una carga real el
  // script corre cuando corresponde y el aviso desaparece.
  //
  // De paso conserva query y hash, que router.replace() descartaba: eso importa
  // para el kill-switch de diagnóstico (?sinfx=1 sobrevive al cambio de idioma).
  function switchTo(next: string) {
    const base = pathname === "/" ? "" : pathname;
    window.location.assign(
      `/${next}${base}${window.location.search}${window.location.hash}`,
    );
  }

  // "pills": grupo de píldoras del nav. Los colores no se deciden acá — los
  // interpola globals.css sobre --nav-ink, igual que los links del nav.
  if (variant === "pills") {
    return (
      <div
        data-nav-pills
        className="flex items-center gap-[2px] rounded-full border border-solid p-[4px]"
      >
        {LOCALES.map((l) => (
          <button
            key={l}
            type="button"
            data-nav-pill
            data-active={l === locale}
            onClick={() => switchTo(l)}
            className="cursor-pointer rounded-full px-[11px] py-[6px] text-[11.5px] uppercase tracking-[0.1em] transition-[background-color,color] duration-200 data-[active=false]:font-semibold data-[active=true]:font-bold"
          >
            {l}
          </button>
        ))}
      </div>
    );
  }

  const sep = variant === "dark" ? "text-white/30" : "text-bronce";
  const text = variant === "dark" ? "text-marfil" : "text-carbon";
  // Sobre fondo oscuro (footer lago) el activo va en marfil; sobre claro, en lago.
  const active =
    variant === "dark"
      ? "text-marfil font-semibold opacity-100"
      : "text-lago font-semibold opacity-100";
  return (
    <div className="flex items-center gap-[9px] text-[12px] tracking-[0.06em]">
      {LOCALES.map((l, i) => (
        <span key={l} className="flex items-center gap-[9px]">
          <button
            type="button"
            onClick={() => switchTo(l)}
            className={`cursor-pointer uppercase transition-[opacity,color] duration-200 ${
              l === locale ? active : `${text} opacity-45 hover:opacity-100`
            }`}
          >
            {l}
          </button>
          {i < LOCALES.length - 1 && <span className={sep}>·</span>}
        </span>
      ))}
    </div>
  );
}
