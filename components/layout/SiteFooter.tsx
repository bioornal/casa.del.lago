import Link from "next/link";
import { useTranslations } from "next-intl";
import { LangSwitcher } from "@/components/ui/LangSwitcher";
import { Link as IntlLink } from "@/lib/i18n/navigation";

export function SiteFooter() {
  const tf = useTranslations("footer");
  const tn = useTranslations("nav");
  const tc = useTranslations("contacto");
  const tll = useTranslations("comoLlegar");

  return (
    <footer className="bg-lago-hover text-arena pt-16 md:pt-[90px] pb-9">
      <div className="max-w-[1320px] mx-auto px-5 md:px-12">
        {/* Top grid — responsive */}
        <div
          className="grid gap-10 md:gap-12 pb-12 md:pb-16 border-b border-white/10 grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]"
        >
          {/* 1. Brand — logo oficial, variante marfil (el fondo es teal oscuro) */}
          <div className="col-span-2 lg:col-span-1">
            <img
              src="/logo-lago-marfil.png"
              alt="La Casa del Lago Urugua-í"
              width={560}
              height={402}
              className="w-[190px] md:w-[215px] h-auto"
            />
            <p className="text-[14px] leading-[1.7] font-light text-[#A9CBD5] mt-[22px] max-w-[34ch]">
              {tf("tagline")}
            </p>
          </div>

          {/* 2. Explorar */}
          <div>
            <div className="text-[11px] uppercase tracking-[.22em] text-[#7FC9D6] mb-5">
              {tf("exploreTitle")}
            </div>
            <div className="flex flex-col gap-[13px] text-[14px]">
              <a
                href="#casa"
                className="text-[#C7DDE3] no-underline transition-colors duration-[250ms] hover:text-marfil"
              >
                {tn("brand")}
              </a>
              <a
                href="#cabanas"
                className="text-[#C7DDE3] no-underline transition-colors duration-[250ms] hover:text-marfil"
              >
                {tn("apartments")}
              </a>
              <a
                href="#lugar"
                className="text-[#C7DDE3] no-underline transition-colors duration-[250ms] hover:text-marfil"
              >
                {tn("experiences")}
              </a>
              <a
                href="#llegar"
                className="text-[#C7DDE3] no-underline transition-colors duration-[250ms] hover:text-marfil"
              >
                {tll("kicker")}
              </a>
              <a
                href="#galeria"
                className="text-[#C7DDE3] no-underline transition-colors duration-[250ms] hover:text-marfil"
              >
                {tn("gallery")}
              </a>
            </div>
          </div>

          {/* 3. Contacto */}
          <div>
            <div className="text-[11px] uppercase tracking-[.22em] text-[#7FC9D6] mb-5">
              {tf("contactTitle")}
            </div>
            <div className="flex flex-col gap-[13px] text-[14px]">
              <IntlLink
                href="/mi-reserva"
                className="text-[#C7DDE3] no-underline transition-colors duration-[250ms] hover:text-marfil"
              >
                {tf("myReservation")}
              </IntlLink>
              <a
                href="#contacto"
                className="text-[#C7DDE3] no-underline transition-colors duration-[250ms] hover:text-marfil"
              >
                WhatsApp
              </a>
              <a
                href="mailto:info@lacasadellago.com.ar"
                className="text-[#C7DDE3] no-underline transition-colors duration-[250ms] hover:text-marfil"
              >
                info@lacasadellago.com.ar
              </a>
              <a
                href="#contacto"
                className="text-[#C7DDE3] no-underline transition-colors duration-[250ms] hover:text-marfil"
              >
                {tc("address")}
              </a>
            </div>
          </div>

          {/* 4. Idioma */}
          <div>
            <div className="text-[11px] uppercase tracking-[.22em] text-[#7FC9D6] mb-5">
              {tf("langTitle")}
            </div>
            <LangSwitcher variant="dark" />
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex justify-between items-center flex-wrap gap-[14px] pt-7 text-[12px] text-[#7fa9b5] tracking-[.04em]">
          <span>
            <Link
              href="/admin/login"
              aria-label="Acceso administración"
              className="text-[#7fa9b5] no-underline cursor-pointer"
            >
              {tf("copyright")}
            </Link>
          </span>
          <a
            href="https://selva-digital.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#7fa9b5] no-underline hover:text-marfil transition-colors duration-[250ms]"
          >
            {tf("credit")}
          </a>
        </div>
      </div>
    </footer>
  );
}
