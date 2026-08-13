import { getRateSettings } from "@/lib/reservation/rate-settings.server";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { RateForm } from "./RateForm";

export const metadata = { title: "Tarifas — Panel La Casa del Lago" };

// Siempre fresco: el admin debe ver lo que está guardado, no una página cacheada.
export const dynamic = "force-dynamic";

export default async function AdminTarifasPage() {
  const settings = await getRateSettings();

  return (
    <div className="mx-auto max-w-[1200px] px-5 pb-24 pt-6 md:px-8 md:pt-10">
      <AdminHeader current="tarifas" title="Tarifas" description="Configurá lo que recibe el alojamiento y revisá el precio final que ve cada huésped." />
      <RateForm settings={settings} />
    </div>
  );
}
