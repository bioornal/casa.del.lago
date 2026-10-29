import { getRateSettings } from "@/lib/reservation/rate-settings.server";
import { AdminHeader, ADMIN_PAGE } from "@/components/admin/AdminHeader";
import { RateForm } from "./RateForm";

export const metadata = { title: "Tarifas — Panel La Casa del Lago" };

// Siempre fresco: el admin debe ver lo que está guardado, no una página cacheada.
export const dynamic = "force-dynamic";

export default async function AdminTarifasPage() {
  const settings = await getRateSettings();

  return (
    <div className={ADMIN_PAGE}>
      <AdminHeader title="Tarifas" description="Cargá lo que querés recibir por noche; la web calcula el precio que ve el huésped." />
      <RateForm settings={settings} />
    </div>
  );
}
