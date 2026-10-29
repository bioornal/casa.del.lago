import Link from "next/link";
import { getSiteSettings } from "@/lib/site-settings.server";
import { hasBookingModeOverride } from "@/lib/booking-mode";
import { getAdminUser } from "@/lib/admin/auth";
import { signOut } from "@/app/admin/login/actions";
import { AdminHeader, ADMIN_PAGE } from "@/components/admin/AdminHeader";
import { ModeToggle } from "./ModeToggle";
import { TestUnitToggle } from "./TestUnitToggle";

export const metadata = { title: "Ajustes — Panel La Casa del Lago" };

// Siempre fresco: el admin debe ver lo que está guardado, no una página cacheada.
export const dynamic = "force-dynamic";

export default async function AdminConfiguracionPage() {
  const [settings, admin] = await Promise.all([getSiteSettings(), getAdminUser()]);

  return (
    <div className={ADMIN_PAGE}>
      <AdminHeader title="Ajustes" />
      <div className="flex max-w-[720px] flex-col gap-4">
        <ModeToggle current={settings.bookingMode} overridden={hasBookingModeOverride()} />

        <section className="rounded-[14px] border border-[#E7E0D4] bg-white p-4 md:p-6">
          <h2 className="m-0 font-display text-[22px] font-normal">Tu cuenta</h2>
          {admin?.email && <p className="mb-0 mt-1 break-all text-[14px] text-[#6b665d]">{admin.email}</p>}
          <form action={signOut} className="mt-4">
            <button
              type="submit"
              className="min-h-[46px] w-full rounded-full border border-[#e0b9a6] bg-white px-5 text-[14.5px] text-[#8a3b1d] sm:w-auto"
            >
              Cerrar sesión
            </button>
          </form>
        </section>

        {/* Herramientas para quien mantiene la web: no son del día a día y
            mostraban textos técnicos (TTL, variables de entorno) al dueño. */}
        <details className="group rounded-[14px] border border-[#E7E0D4] bg-white">
          <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between px-4 text-[15px] font-semibold text-[#4b473f] md:px-6 [&::-webkit-details-marker]:hidden">
            Herramientas de prueba (técnico)
            <svg aria-hidden className="text-[#8a8170] h-4 w-4 transition-transform group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
          </summary>
          <div className="flex flex-col gap-4 border-t border-[#f0eae0] p-4 md:p-6">
            <TestUnitToggle current={settings.testUnitEnabled} />
            <div className="rounded-[10px] bg-[#fbf8f2] p-4">
              <h3 className="m-0 text-[15px] font-semibold">Pago de prueba con Mercado Pago</h3>
              <p className="mb-3 mt-1 text-[13.5px] leading-[1.55] text-[#6b665d]">
                Cobro real de $1.000 para validar las credenciales. Se reembolsa desde Mercado Pago.
              </p>
              <Link
                href="/admin/pago-prueba"
                className="inline-flex min-h-[44px] items-center rounded-full border border-[#d8cfbf] bg-white px-4 text-[14px] text-[#183d43] no-underline"
              >
                Abrir pago de prueba →
              </Link>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
