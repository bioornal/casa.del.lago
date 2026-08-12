"use server";

import { revalidatePath } from "next/cache";
import { routing } from "@/lib/i18n/routing";
import { UNITS } from "@/lib/units";
import { parseSiteSettingsInput } from "@/lib/site-settings";
import { saveSiteSettings, saveTestUnitEnabled } from "@/lib/site-settings.server";
import { getAdminUser } from "@/lib/admin/auth";

export type SaveModeState = { ok?: boolean; error?: string } | undefined;

export async function saveBookingMode(
  _prev: SaveModeState,
  formData: FormData,
): Promise<SaveModeState> {
  // El middleware guarda por PATH, no por acción: un POST con el Next-Action
  // id correcto puede llegar directo acá sin pasar por guardAdmin (ver
  // middleware.ts). La Server Action tiene que exigir su propia sesión.
  const admin = await getAdminUser();
  if (!admin) return { error: "No autorizado." };

  const parsed = parseSiteSettingsInput({
    booking_mode: String(formData.get("booking_mode") ?? ""),
  });
  if (!parsed.ok) return { error: parsed.error };

  try {
    await saveSiteSettings(parsed.value);
  } catch {
    return {
      error:
        "No se pudo guardar en Supabase. ¿Corriste el bloque de site_settings del setup.sql en el SQL Editor?",
    };
  }

  // Las páginas de departamentos son estáticas (prerender): sin revalidar
  // seguirían sirviendo el HTML viejo con los CTAs del modo anterior.
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/tarifas`);
    revalidatePath(`/${locale}/reservas`);
    for (const u of UNITS) revalidatePath(`/${locale}/departamentos/${u.slug}`);
  }

  return { ok: true };
}

export async function saveTestUnit(
  _prev: SaveModeState,
  formData: FormData,
): Promise<SaveModeState> {
  // Misma razón que en saveBookingMode: esta acción habilita un endpoint de
  // cobro real, así que la verificación de admin no es opcional acá.
  const admin = await getAdminUser();
  if (!admin) return { error: "No autorizado." };

  // Se prende solo con el "1" exacto. Cualquier otra cosa —campo ausente, string
  // vacía, basura— apaga: la dirección segura del error es no dejar cobrable una
  // unidad que nadie pidió habilitar.
  const enabled = formData.get("test_unit_enabled") === "1";

  try {
    await saveTestUnitEnabled(enabled);
  } catch {
    return {
      error:
        "No se pudo guardar en Supabase. ¿Corriste el ALTER de test_unit_enabled del setup.sql en el SQL Editor?",
    };
  }

  // Sin revalidatePath acá: /reservas lee searchParams con await, eso la
  // vuelve dinámica (se renderiza por request, no hay HTML cacheado que
  // invalidar), así que revalidar esa ruta sería un no-op. La decisión del
  // toggle ya se lee fresca en cada visita vía isTestUnitEnabled().

  return { ok: true };
}
