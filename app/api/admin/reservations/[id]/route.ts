import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin/auth";
import {
  getReservationById,
  setReservationStatus,
  cancelConfirmedReservation,
  deleteReleasedReservation,
  type ReservationStatus,
} from "@/lib/reservation/reservations.server";
import { sendConfirmationEmailOnce, sendReleaseEmail } from "@/lib/reservation/email/guest";

type Action = "confirm" | "release" | "cancel" | "delete";

// Estado del que tiene que partir cada acción:
// - confirm / release: pending (confirmar una transferencia o soltar un hold).
// - cancel: confirmed (el huésped canceló). Libera las fechas, sin email: el
//   de release dice "no identificamos tu pago", que acá sería falso.
// - delete: released. Sólo se borra lo que ya no bloquea fechas.
const FROM: Record<Action, ReservationStatus> = {
  confirm: "pending",
  release: "pending",
  cancel: "confirmed",
  delete: "released",
};

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
  if (!(action in FROM)) {
    return NextResponse.json({ error: "validation" }, { status: 400 });
  }
  const act = action as Action;

  const r = await getReservationById(id);
  if (!r) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (r.status !== FROM[act]) {
    return NextResponse.json({ error: "invalid_state" }, { status: 400 });
  }
  if (act === "confirm" && r.payment_method !== "transfer") {
    return NextResponse.json({ error: "invalid_state" }, { status: 400 });
  }

  try {
    if (act === "confirm") {
      await setReservationStatus(id, "confirmed");
      try { await sendConfirmationEmailOnce(r.code); }
      catch (err) { console.error("[admin] email fallo:", err instanceof Error ? err.message : err); }
    } else if (act === "release") {
      await setReservationStatus(id, "released");
      try { await sendReleaseEmail(r); }
      catch (err) { console.error("[admin] release email fallo:", err instanceof Error ? err.message : err); }
    } else if (act === "cancel") {
      await cancelConfirmedReservation(id);
    } else {
      await deleteReleasedReservation(id);
    }
  } catch (err) {
    console.error("[admin] acción fallo:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "server" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
