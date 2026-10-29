import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin/auth";
import Link from "next/link";
import { AdminHeader, ADMIN_PAGE } from "@/components/admin/AdminHeader";
import { TestPaymentBrick } from "./TestPaymentBrick";

// Pago de PRUEBA de la integración productiva de MP ($1000, reembolsable).
// El middleware ya protege /admin/*; re-verificamos por defensa en profundidad
// y de paso obtenemos el email del admin para precargar el Brick.
export default async function PagoPruebaPage() {
  const admin = await getAdminUser();
  if (!admin) redirect("/admin/login");

  return (
    <div className={ADMIN_PAGE}>
      <Link href="/admin/configuracion" className="mb-2 inline-flex min-h-[40px] items-center text-[14px] text-[#155e75] no-underline">
        ← Ajustes
      </Link>
      <AdminHeader title="Pago de prueba" description="Validá las credenciales de Mercado Pago con un cobro real y reembolsable." />

      <div style={{ maxWidth: 700, padding: "14px 16px", borderRadius: 6, background: "#fef6e7",
        border: "1px solid #e9d6a8", color: "#7a5a18", fontSize: 13, marginBottom: 8 }}>
        Este pago es <strong>REAL</strong>: cobra <strong>$1.000 ARS</strong> con las credenciales
        productivas para validar la integración (tokenización + cobro + webhook).
        No genera ninguna reserva ni toca el calendario.
      </div>
      <p style={{ maxWidth: 700, fontSize: 13, color: "#6b665d", margin: "0 0 24px" }}>
        Después de probar, reembolsalo desde la{" "}
        <a href="https://www.mercadopago.com.ar/activities" target="_blank" rel="noreferrer">
          actividad de Mercado Pago
        </a>{" "}
        (el cargo aparece como CASADELLAGO).
      </p>

      <div style={{ maxWidth: 700 }}><TestPaymentBrick adminEmail={admin.email} /></div>
    </div>
  );
}
