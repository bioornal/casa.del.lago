import { getSiteSettings } from "@/lib/site-settings.server";
import { hasBookingModeOverride } from "@/lib/booking-mode";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { ModeToggle } from "./ModeToggle";
import { TestUnitToggle } from "./TestUnitToggle";

export const metadata = { title: "Configuración — Panel La Casa del Lago" };

// Siempre fresco: el admin debe ver lo que está guardado, no una página cacheada.
export const dynamic = "force-dynamic";

export default async function AdminConfiguracionPage() {
  const settings = await getSiteSettings();

  return (
    <div className="mx-auto max-w-[1200px] px-5 pb-24 pt-6 md:px-8 md:pt-10">
      <AdminHeader current="configuracion" title="Configuración" description="Controlá el modo de reservas y las herramientas internas del panel." />
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <ModeToggle current={settings.bookingMode} overridden={hasBookingModeOverride()} />
        <TestUnitToggle current={settings.testUnitEnabled} />
      </div>
    </div>
  );
}
