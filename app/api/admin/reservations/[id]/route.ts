import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin/auth";
import { getReservationById, setReservationStatus } from "@/lib/reservation/reservations.server";
import { sendConfirmationEmailOnce } from "@/lib/reservation/email.server";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  // Defensa en profundidad (el middleware ya bloquea, pero re-verificamos).
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  let action: string;
  try {
    action = String(((await req.json()) as { action?: string }).action ?? "");
  } catch {
    return NextResponse.json({ error: "validation" }, { status: 400 });
  }
  if (action !== "confirm" && action !== "release") {
    return NextResponse.json({ error: "validation" }, { status: 400 });
  }

  const r = await getReservationById(id);
  if (!r) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (r.status !== "pending") {
    return NextResponse.json({ error: "invalid_state" }, { status: 400 });
  }
  if (action === "confirm" && r.payment_method !== "transfer") {
    return NextResponse.json({ error: "invalid_state" }, { status: 400 });
  }

  try {
    if (action === "confirm") {
      await setReservationStatus(id, "confirmed");
      try { await sendConfirmationEmailOnce(r.code); }
      catch (err) { console.error("[admin] email fallo:", err instanceof Error ? err.message : err); }
    } else {
      await setReservationStatus(id, "released");
    }
  } catch (err) {
    console.error("[admin] acción fallo:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "server" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
