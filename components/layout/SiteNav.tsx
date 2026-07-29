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
  // Alto y color viven en CSS, gobernados por --nav-p y --nav-ink (ver
  // globals.css). Acá sólo se publica el estado de respaldo por data-attribute:
  // donde hay scroll-timeline la animación lo pisa y el cambio es continuo.
  // `compact` es el alto; la solidez además la fuerza el drawer abierto, porque
  // el menú necesita fondo marfil aunque la barra siga alta sobre el hero.
  const compact = !isHome || solid;

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
  // Los tamaños y colores los pone globals.css a partir de --nav-p/--nav-ink.
  const brandLockup = (
    <span className="flex items-center gap-[11px] md:gap-[15px]">
      <span data-nav-iso className="relative block aspect-[320/253] shrink-0">
        <img
          data-nav-iso-carbon
          src="/isotipo-lago.png"
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-contain"
        />
        <img
          data-nav-iso-marfil
          src="/isotipo-lago-marfil.png"
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-contain"
        />
      </span>
      {/* Debajo de sm no caben hamburguesa + isotipo + wordmark + RESERVAR en
          360px: el wordmark se oculta y queda el isotipo, que ya identifica la
          marca. Con el logo completo el CTA se le montaba encima. */}
      <span className="hidden flex-col items-start leading-none sm:flex">
        <span data-nav-word className="font-display font-medium tracking-[0.01em]">
          La Casa del Lago
        </span>
        <span data-nav-sub className="uppercase tracking-[0.38em]">
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
            data-nav-link
            data-active={id === active}
            onClick={() => setOpen(false)}
            className={linkClass(id, active)}
          >
            {label}
          </a>
        ) : (
          <Link
            key={id}
            href={sectionHref(id)}
            data-nav-link
            data-active={id === active}
            onClick={() => setOpen(false)}
            className={linkClass(id, active)}
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
      data-nav
      data-nav-compact={compact}
      data-nav-open={open}
      data-nav-scrub={isHome}
      className="fixed top-0 left-0 right-0 z-50 border-b border-solid"
    >
      {/* Ancho completo a propósito (el resto del sitio usa max-w-[1320px]): un nav
          fijo que respira lee mejor que uno "casi alineado" con el contenido.
          Grid de tres pistas como el diseño: el logo va a la IZQUIERDA y los links
          al centro. Con flex+justify-between el logo "centrado" quedaba 76px
          corrido, porque los grupos laterales nunca miden lo mismo. */}
      {/* flex abajo de lg y grid recién en lg+: los links van display:none en
          mobile, así que el grid los saca del flujo y el grupo derecho caía en la
          columna del medio, quedando 14px corrido del borde. Con flex son dos
          hijos y justify-between los apoya exacto en los dos paddings. */}
      <div
        data-nav-row
        className="flex w-full items-center justify-between gap-[clamp(14px,2vw,32px)] px-5 md:px-10 lg:grid lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:px-16"
      >
        {/* IZQUIERDA — hamburguesa (mobile) + logo */}
        <div className="flex min-w-0 items-center gap-[14px]">
          <button
            type="button"
            data-nav-burger
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden flex flex-col items-center justify-center w-8 h-8 -ml-1"
          >
            <span
              className="block w-6 h-px transition-transform duration-300"
              style={{ transform: open ? "translateY(4px) rotate(45deg)" : "none" }}
            />
            <span
              className="block w-6 h-px transition-opacity duration-300 my-[5px]"
              style={{ opacity: open ? 0 : 1 }}
            />
            <span
              className="block w-6 h-px transition-transform duration-300"
              style={{ transform: open ? "translateY(-4px) rotate(-45deg)" : "none" }}
            />
          </button>
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
        </div>

        {/* CENTRO — links */}
        <div className="hidden min-w-0 items-center justify-center gap-[clamp(12px,1.9vw,36px)] overflow-hidden lg:flex">
          {navLinks}
        </div>

        {/* DERECHA — idioma + reservar */}
        <div className="flex items-center justify-end gap-[14px] md:gap-[22px]">
          <span className="hidden sm:block">
            <LangSwitcher variant="pills" />
          </span>
          <Link
            href="/reservas"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-terracota px-[18px] py-[11px] text-[12px] font-bold uppercase tracking-[.14em] text-marfil no-underline shadow-[0_8px_24px_rgba(31,29,25,.22)] transition-[background,transform] duration-300 hover:-translate-y-px hover:bg-terracota-hover md:px-[clamp(18px,1.8vw,26px)] md:py-[13px]"
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

// El color ya no se decide acá: lo resuelve globals.css interpolando sobre
// --nav-ink según data-active. Sólo queda el peso tipográfico del activo.
function linkClass(section: string, active: string) {
  return [
    "text-[15px] md:text-[13px] tracking-[.04em] no-underline transition-colors duration-[250ms] py-3 md:py-0 md:whitespace-nowrap",
    section === active ? "md:font-medium" : "",
  ].join(" ");
}
