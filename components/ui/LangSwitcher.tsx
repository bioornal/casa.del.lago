"use client";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/lib/i18n/navigation";

const LOCALES = ["es", "en", "pt"] as const;

export function LangSwitcher({
  variant = "light",
}: {
  variant?: "light" | "dark" | "pills";
}) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

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
            onClick={() => router.replace(pathname, { locale: l })}
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
            onClick={() => router.replace(pathname, { locale: l })}
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
