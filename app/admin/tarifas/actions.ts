"use server";

import { revalidatePath } from "next/cache";
import { routing } from "@/lib/i18n/routing";
import { UNITS } from "@/lib/units";
import { parseRateSettingsInput, type RateSettingsInput } from "@/lib/reservation/rate-settings";
import { saveRateSettings } from "@/lib/reservation/rate-settings.server";
import { getAdminUser } from "@/lib/admin/auth";

export type SaveRatesState = { ok?: boolean; error?: string } | undefined;

export async function saveRates(
  _prev: SaveRatesState,
  formData: FormData,
): Promise<SaveRatesState> {
  // El middleware guarda por PATH, no por acción: un POST con el Next-Action
  // id correcto puede llegar directo acá sin pasar por guardAdmin (ver
  // middleware.ts). La Server Action tiene que exigir su propia sesión.
  const admin = await getAdminUser();
  if (!admin) return { error: "No autorizado." };

  const raw: RateSettingsInput = {
    nightly_aratiri: String(formData.get("nightly_aratiri") ?? ""),
    nightly_aguaribay: String(formData.get("nightly_aguaribay") ?? ""),
    cleaning_fee: String(formData.get("cleaning_fee") ?? ""),
    base_guests: String(formData.get("base_guests") ?? ""),
    extra_guest_fee: String(formData.get("extra_guest_fee") ?? ""),
    card_fee_pct: String(formData.get("card_fee_pct") ?? ""),
    transfer_fee_pct: String(formData.get("transfer_fee_pct") ?? ""),
  };
  // Temporada alta: solo si el form la manda. Sin estos campos la parte de alta
  // no se valida ni se guarda (ver parseRateSettingsInput).
  for (const key of ["high_nightly_aratiri", "high_nightly_aguaribay", "high_min_nights", "high_season_ranges"] as const) {
    if (formData.has(key)) raw[key] = String(formData.get(key) ?? "");
  }

  const parsed = parseRateSettingsInput(raw);
  if (!parsed.ok) return { error: parsed.error };

  try {
    await saveRateSettings(parsed.value);
  } catch {
    return {
      error:
        "No se pudo guardar en Supabase. ¿Corriste el bloque de rate_settings del setup.sql en el SQL Editor?",
    };
  }

  // Las páginas de departamentos son estáticas (prerender): hay que revalidarlas
  // para que el HTML con los precios nuevos se regenere. Tarifas/reservas son
  // dinámicas, pero las revalidamos igual por las dudas.
  for (const locale of routing.locales) {
    // El home también: su buscador recibe los rangos de temporada alta.
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/tarifas`);
    revalidatePath(`/${locale}/reservas`);
    for (const u of UNITS) revalidatePath(`/${locale}/departamentos/${u.slug}`);
  }

  return { ok: true };
}
