import { useTranslations } from "next-intl";
import { SERVICES, DISTANCES, CHECK_IN, CHECK_OUT, PETS_ALLOWED } from "@/lib/site";

export function InfoSections() {
  const t = useTranslations("tarifas");

  const kickerClass = "mb-5 text-[10px] font-medium uppercase tracking-[.24em] text-lago";
  const rowClass = "flex justify-between gap-4 border-t border-black/10 py-[9px] text-[13px] leading-[1.35] text-cuerpo";

  return (
    <section className="mt-20 border-y border-borde-medio py-9 md:py-11">
      <div className="mb-8 flex items-end justify-between gap-5">
        <div>
          <div className="mb-2 text-[10px] uppercase tracking-[.24em] text-bronce">{t("infoKicker")}</div>
          <h2 className="m-0 font-display text-[28px] font-normal text-carbon md:text-[34px]">{t("infoTitle")}</h2>
        </div>
        <span className="hidden h-9 w-9 rounded-full border border-[#9fc6c7] text-center font-display text-[20px] leading-8 text-lago md:block">i</span>
      </div>
      <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
        <div className="md:border-r md:border-borde-claro md:pr-8">
          <div className={kickerClass}>{t("services.title")}</div>
          <ul className="m-0 list-none p-0">
            {SERVICES.map((k) => (
              <li key={k} className={rowClass}>
                {t(`services.${k}`)}
              </li>
            ))}
          </ul>
        </div>

        <div className="md:border-r md:border-borde-claro md:pr-8">
          <div className={kickerClass}>{t("distances.title")}</div>
          {DISTANCES.map((d) => (
            <div key={d.key} className={rowClass}>
              <span>{t(`distances.${d.key}`)}</span>
              <span className="text-bronce">{t("distances.km", { km: d.km })}</span>
            </div>
          ))}
        </div>

        <div>
          <div className={kickerClass}>{t("conditions.title")}</div>
          <div className={rowClass}>
            <span>{t("conditions.checkIn")}</span>
            <span>{CHECK_IN}</span>
          </div>
          <div className={rowClass}>
            <span>{t("conditions.checkOut")}</span>
            <span>{CHECK_OUT}</span>
          </div>
          <div className={rowClass}>
            <span>{t("conditions.pets")}</span>
            <span>{PETS_ALLOWED ? t("conditions.petsYes") : t("conditions.petsNo")}</span>
          </div>
          <div className={rowClass}>
            <span>{t("conditions.payment")}</span>
            <span>{t("conditions.paymentCard")}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
