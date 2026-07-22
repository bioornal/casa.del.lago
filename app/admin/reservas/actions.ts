"use server";

import { getAdminUser } from "@/lib/admin/auth";
import { insertReservation, OverlapError } from "@/lib/reservation/reservations.server";
import { generateBookingCode } from "@/lib/reservation/code";
import { computeNights } from "@/lib/reservation/pricing";
import { getUnit } from "@/lib/units";
import { isValidEmail } from "@/lib/reservation/validation";
import type { UnitId } from "@/lib/reservation/reducer";

const VALID_UNITS: UnitId[] = ["aratiri", "aguaribay"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type ManualReservationInput = {
  unitId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  total?: number;
};

export type ManualReservationResult =
  | { ok: true }
  | { ok: false; error: "conflict" | "validation" | "server" };

export async function createManualReservation(
  input: ManualReservationInput,
): Promise<ManualReservationResult> {
  const admin = await getAdminUser();
  if (!admin) return { ok: false, error: "validation" };

  const { unitId, checkIn, checkOut, guests, firstName, lastName, email } = input;
  if (
    !(VALID_UNITS as string[]).includes(unitId) ||
    !DATE_RE.test(checkIn) || !DATE_RE.test(checkOut) || checkOut <= checkIn ||
    !Number.isInteger(guests) || guests < 1 ||
    !firstName?.trim() || !lastName?.trim() || !isValidEmail(email)
  ) {
    return { ok: false, error: "validation" };
  }

  const unit = getUnit(unitId as UnitId)!;
  if (guests > unit.specs.guests) return { ok: false, error: "validation" };

  const nights = computeNights(new Date(checkIn), new Date(checkOut));

  try {
    await insertReservation({
      code: generateBookingCode(),
      unitId: unitId as UnitId,
      unitName: unit.name,
      checkIn, checkOut, nights, guests,
      firstName, lastName, email,
      phone: input.phone ?? "",
      total: input.total ?? 0,
      paymentMethod: "manual",
      status: "confirmed",
    });
  } catch (err) {
    if (err instanceof OverlapError) return { ok: false, error: "conflict" };
    console.error("[admin] reserva manual fallo:", err instanceof Error ? err.message : err);
    return { ok: false, error: "server" };
  }

  return { ok: true };
}
