import { useTranslations } from "next-intl";
import { SERVICES, DISTANCES, CHECK_IN, CHECK_OUT, PETS_ALLOWED } from "@/lib/site";

export function InfoSections() {
  const t = useTranslations("tarifas");

  const kickerClass = "mb-[14px] text-[11px] uppercase tracking-[.22em] text-lago";
  const rowClass = "flex justify-between border-t border-black/10 py-[7px] text-[14px] text-cuerpo";

  return (
    <div className="mt-10 rounded-[8px] border border-borde-medio bg-arena px-6 py-8 md:px-10 md:py-10">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-10">
        <div>
          <div className={kickerClass}>{t("services.title")}</div>
          <ul className="m-0 list-none p-0">
            {SERVICES.map((k) => (
              <li key={k} className={rowClass}>
                {t(`services.${k}`)}
              </li>
            ))}
          </ul>
        </div>

        <div>
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
    </div>
  );
}
