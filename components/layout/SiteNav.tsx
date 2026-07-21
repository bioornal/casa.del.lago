"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { LangSwitcher } from "@/components/ui/LangSwitcher";
import { useSectionSpy } from "@/lib/hooks/useSectionSpy";

export function SiteNav() {
  const t = useTranslations("nav");
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const active = useSectionSpy();
  const pathname = usePathname();
  const isHome = pathname === "/";
  const sectionHref = (id: string) => (isHome ? `#${id}` : `/#${id}`);
  // Transparente solo en Home, arriba de todo y con el drawer cerrado
  const dark = isHome && !solid && !open;

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Bloquea el scroll del body cuando el drawer está abierto
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Isotipo + wordmark tipográfico. El isotipo va en dos versiones (carbón y
  // marfil) cruzadas por opacidad: evita el parpadeo que daría cambiar el src
  // al pasar el nav de transparente a sólido. El wordmark sigue siendo texto
  // porque el lockup completo, apilado, es ilegible a la altura del nav.
  const brandLockup = (
    <span className="flex items-center gap-[11px] md:gap-[15px]">
      <span className="relative block h-[42px] md:h-[52px] aspect-[320/253] shrink-0">
        <img
          src="/isotipo-lago.png"
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-contain transition-opacity duration-300"
          style={{ opacity: dark ? 0 : 1 }}
        />
        <img
          src="/isotipo-lago-marfil.png"
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-contain transition-opacity duration-300"
          style={{ opacity: dark ? 1 : 0 }}
        />
      </span>
      <span className="flex flex-col items-start leading-none">
        <span
          className={[
            "font-display font-medium text-[20px] md:text-[23px] tracking-[0.01em] transition-colors duration-300",
            dark ? "text-marfil" : "text-lago",
          ].join(" ")}
        >
          La Casa del Lago
        </span>
        <span
          className={[
            "text-[9.5px] md:text-[11px] uppercase tracking-[0.38em] mt-[5px] transition-colors duration-300",
            dark ? "text-marfil/72" : "text-muted",
          ].join(" ")}
        >
          Urugua-í
        </span>
      </span>
    </span>
  );

  const sections: { id: string; label: string }[] = [
    { id: "casa", label: t("brand") },
    { id: "cabanas", label: t("apartments") },
    { id: "lugar", label: t("experiences") },
    { id: "galeria", label: t("gallery") },
    { id: "contacto", label: t("contact") },
  ];

  const navLinks = (
    <>
      {sections.map(({ id, label }) =>
        isHome ? (
          <a
            key={id}
            href={`#${id}`}
            data-section={id}
            onClick={() => setOpen(false)}
            className={linkClass(id, active, dark)}
          >
            {label}
          </a>
        ) : (
          <Link
            key={id}
            href={sectionHref(id)}
            onClick={() => setOpen(false)}
            className={linkClass(id, active, dark)}
          >
            {label}
          </Link>
        ),
      )}
    </>
  );

  return (
    <>
      {/* Mobile backdrop — oscurece el contenido detrás del drawer */}
      <div
        className="lg:hidden fixed inset-0 z-40 bg-carbon/35 transition-opacity duration-300"
        style={{ opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none" }}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
    <nav
      className={[
        "fixed top-0 left-0 right-0 z-50 border-b transition-[background-color,border-color] duration-300",
        dark
          ? "bg-transparent border-transparent"
          : "bg-[rgba(245,238,225,.92)] backdrop-blur-[14px] border-borde-medio",
      ].join(" ")}
    >
      {/* Ancho completo a propósito (el resto del sitio usa max-w-[1320px]): un nav
          fijo que respira lee mejor que uno "casi alineado" con el contenido. */}
      <div className="w-full px-5 md:px-10 lg:px-16 py-[10px] md:py-3 flex items-center justify-between gap-5">
        {/* LEFT — desktop nav links / mobile: hamburger */}
        <div className="flex items-center gap-[30px]">
          <button
            type="button"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className={[
              "lg:hidden flex flex-col items-center justify-center w-8 h-8 -ml-1",
              dark ? "text-marfil" : "text-carbon",
            ].join(" ")}
          >
            <span
              className={[
                "block w-6 h-px transition-[transform,background-color] duration-300",
                dark ? "bg-marfil" : "bg-carbon",
              ].join(" ")}
              style={{ transform: open ? "translateY(4px) rotate(45deg)" : "none" }}
            />
            <span
              className={[
                "block w-6 h-px transition-[opacity,background-color] duration-300 my-[5px]",
                dark ? "bg-marfil" : "bg-carbon",
              ].join(" ")}
              style={{ opacity: open ? 0 : 1 }}
            />
            <span
              className={[
                "block w-6 h-px transition-[transform,background-color] duration-300",
                dark ? "bg-marfil" : "bg-carbon",
              ].join(" ")}
              style={{ transform: open ? "translateY(-4px) rotate(-45deg)" : "none" }}
            />
          </button>
          <div className="hidden lg:flex items-center gap-[30px]">{navLinks}</div>
        </div>

        {/* CENTER — logo */}
        {isHome ? (
          <a
            href="#top"
            aria-label="La Casa del Lago Urugua-í"
            className="flex items-center no-underline"
          >
            {brandLockup}
          </a>
        ) : (
          <Link
            href="/"
            aria-label="La Casa del Lago Urugua-í"
            className="flex items-center no-underline"
          >
            {brandLockup}
          </Link>
        )}

        {/* RIGHT — lang switcher + book button */}
        <div className="flex items-center justify-end gap-[14px] md:gap-[22px]">
          <span className="hidden sm:block">
            <LangSwitcher variant="light" />
          </span>
          <Link
            href="/reservas"
            className="inline-flex items-center justify-center bg-terracota text-marfil text-[12.5px] uppercase tracking-[.1em] px-[18px] md:px-[22px] py-[10px] md:py-[11px] rounded-[2px] transition-[background,transform] duration-300 hover:bg-terracota-hover hover:-translate-y-px whitespace-nowrap no-underline"
          >
            {t("book")}
          </Link>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        className="lg:hidden overflow-hidden transition-[max-height,opacity] duration-300 ease-[cubic-bezier(.16,.84,.44,1)] bg-marfil"
        style={{ maxHeight: open ? 420 : 0, opacity: open ? 1 : 0 }}
        aria-hidden={!open}
      >
        <div
          className="px-5 pb-8 pt-2 flex flex-col gap-1 border-t border-[#E7E0D4]"
        >
          {navLinks}
          <div className="mt-4 pt-4 border-t border-[#E7E0D4] flex items-center justify-between">
            <LangSwitcher variant="light" />
          </div>
        </div>
      </div>
    </nav>
    </>
  );
}

function linkClass(section: string, active: string, dark: boolean) {
  const isActive = section === active;
  return [
    "text-[15px] md:text-[13px] tracking-[.04em] no-underline transition-colors duration-[250ms] py-3 md:py-0 md:whitespace-nowrap",
    isActive
      ? dark
        ? "text-marfil opacity-100 md:font-medium"
        : "text-lago opacity-100 md:font-medium"
      : dark
        ? "text-marfil/90 opacity-100 hover:text-atardecer"
        : "text-carbon opacity-[.82] hover:text-atardecer",
  ].join(" ");
}
