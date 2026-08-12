// Configuración operativa del sitio, editable desde /admin/configuracion.
// Vive en Supabase (tabla site_settings, fila única id=1). Este módulo es la
// forma compartida (server + cliente + tests): sin imports de server.
//
// Espeja la estructura de lib/reservation/rate-settings.ts a propósito — mismo
// patrón, mismo fail-safe, misma separación entre módulo puro y .server.ts.

export type BookingMode = "whatsapp" | "online";

export type SiteSettings = {
  /** "whatsapp": reserva online pausada, los CTAs derivan a WhatsApp. */
  bookingMode: BookingMode;
  /** Habilita la unidad de prueba (lib/reservation/test-unit.ts) en el checkout. */
  testUnitEnabled: boolean;
};

// El default es el modo CERRADO. Si la DB no responde, si la tabla no existe,
// si la columna trae basura: el sitio no cobra. Nunca al revés. Mismo criterio
// para testUnitEnabled: arranca en false, habilitar un cobro de prueba es
// siempre una acción explícita del admin.
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  bookingMode: "whatsapp",
  testUnitEnabled: false,
};

export type SiteSettingsRow = {
  // Puede faltar si aún no se corrió el SQL de setup.
  booking_mode?: string | null;
  test_unit_enabled?: boolean | null;
};

export function isBookingMode(v: unknown): v is BookingMode {
  return v === "whatsapp" || v === "online";
}

export function rowToSiteSettings(row: SiteSettingsRow): SiteSettings {
  return {
    bookingMode: isBookingMode(row.booking_mode)
      ? row.booking_mode
      : DEFAULT_SITE_SETTINGS.bookingMode,
    // Estrictamente `=== true`: un string, un null o un 1 no habilitan cobros.
    testUnitEnabled: row.test_unit_enabled === true,
  };
}

export function siteSettingsToRow(s: SiteSettings): SiteSettingsRow {
  // NO emite test_unit_enabled a propósito: el upsert de Supabase toca solo
  // las columnas provistas, así que guardar el modo de reserva no puede
  // apagar la unidad de prueba de rebote. Ese toggle se persiste aparte, con
  // saveTestUnitEnabled (site-settings.server.ts).
  return { booking_mode: s.bookingMode };
}

// ---- Validación de la entrada del formulario admin -------------------------

export type SiteSettingsInput = { booking_mode: string };

export function parseSiteSettingsInput(
  raw: SiteSettingsInput,
): { ok: true; value: SiteSettings } | { ok: false; error: string } {
  const mode = raw.booking_mode.trim();
  if (!isBookingMode(mode)) {
    return { ok: false, error: "Modo de reserva inválido: esperaba 'whatsapp' u 'online'." };
  }
  // testUnitEnabled: false es un relleno inerte — siteSettingsToRow no emite
  // esa clave, así que este valor nunca llega a la base. El toggle real se
  // guarda aparte, con saveTestUnitEnabled.
  return { ok: true, value: { bookingMode: mode, testUnitEnabled: false } };
}
