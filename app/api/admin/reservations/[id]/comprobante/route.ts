import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin/auth";
import { getReservationById } from "@/lib/reservation/reservations.server";
import { signComprobanteUrl } from "@/lib/reservation/comprobante.server";

// El link firmado del comprobante se pide recién cuando el dueño toca "Ver
// comprobante". Antes la lista de reservas firmaba uno por cada reserva con
// comprobante en cada carga, aunque nadie lo abriera.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  // Defensa en profundidad (el middleware ya bloquea /api/admin).
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const r = await getReservationById(id);
  if (!r?.comprobante_path) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const url = await signComprobanteUrl(r.comprobante_path);
  if (!url) return NextResponse.json({ error: "storage" }, { status: 502 });
  return NextResponse.redirect(url, 302);
}
