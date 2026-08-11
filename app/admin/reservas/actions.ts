"use server";

import { getAdminUser } from "@/lib/admin/auth";
import {
  insertReservation,
  generateUniqueBookingCode,
  OverlapError,
} from "@/lib/reservation/reservations.server";
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
  | { ok: false; error: "conflict" | "validation" | "server" | "code" };

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

  // Contra la base, no a ciegas: generateBookingCode() sortea sobre 32^4 sin
  // mirar si el código ya existe, y el código es la clave del lookup, del email
  // y del flip de deduplicación.
  let code: string;
  try {
    code = await generateUniqueBookingCode();
  } catch (err) {
    console.error("[admin] código único falló:", err instanceof Error ? err.message : err);
    return { ok: false, error: "code" };
  }

  try {
    await insertReservation({
      code,
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
