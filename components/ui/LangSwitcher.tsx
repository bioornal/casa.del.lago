"use client";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/lib/i18n/navigation";

const LOCALES = ["es", "en", "pt"] as const;

export function LangSwitcher({ variant = "light" }: { variant?: "light" | "dark" }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const sep = variant === "dark" ? "text-[#34302b]" : "text-bronce";
  const text = variant === "dark" ? "text-marfil" : "text-carbon";
  return (
    <div className="flex items-center gap-[9px] text-[12px] tracking-[0.06em]">
      {LOCALES.map((l, i) => (
        <span key={l} className="flex items-center gap-[9px]">
          <button
            type="button"
            onClick={() => router.replace(pathname, { locale: l })}
            className={`cursor-pointer uppercase transition-[opacity,color] duration-200 ${
              l === locale
                ? "text-lago font-semibold opacity-100"
                : `${text} opacity-45 hover:opacity-100`
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
