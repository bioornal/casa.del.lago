import { describe, it, expect } from "vitest";
import {
  DEFAULT_SITE_SETTINGS,
  isBookingMode,
  parseSiteSettingsInput,
  rowToSiteSettings,
  siteSettingsToRow,
  type SiteSettingsRow,
} from "@/lib/site-settings";

// Simula una fila con basura tal como podría llegar de una edición manual en
// SQL (una columna boolean puede recibir cualquier JSON válido en la práctica).
function rowWith(testUnitEnabled: unknown): SiteSettingsRow {
  return { test_unit_enabled: testUnitEnabled } as unknown as SiteSettingsRow;
}

describe("DEFAULT_SITE_SETTINGS", () => {
  it("arranca cerrado: el default es whatsapp, nunca online", () => {
    expect(DEFAULT_SITE_SETTINGS.bookingMode).toBe("whatsapp");
  });

  it("la unidad de prueba arranca deshabilitada", () => {
    expect(DEFAULT_SITE_SETTINGS.testUnitEnabled).toBe(false);
  });
});

describe("isBookingMode", () => {
  it("acepta solo los dos modos válidos", () => {
    expect(isBookingMode("whatsapp")).toBe(true);
    expect(isBookingMode("online")).toBe(true);
  });

  it("rechaza cualquier otra cosa", () => {
    for (const v of ["", "ONLINE", "wa", null, undefined, 1, {}]) {
      expect(isBookingMode(v)).toBe(false);
    }
  });
});

describe("rowToSiteSettings", () => {
  it("mapea una fila válida", () => {
    expect(rowToSiteSettings({ booking_mode: "online", test_unit_enabled: true })).toEqual({
      bookingMode: "online",
      testUnitEnabled: true,
    });
  });

  it("cae al default si la columna falta o trae basura", () => {
    expect(rowToSiteSettings({}).bookingMode).toBe("whatsapp");
    expect(rowToSiteSettings({ booking_mode: null }).bookingMode).toBe("whatsapp");
    expect(rowToSiteSettings({ booking_mode: "cualquiera" }).bookingMode).toBe("whatsapp");
  });

  it("testUnitEnabled exige el booleano true estricto: ni string, ni 1, ni null habilitan", () => {
    expect(rowToSiteSettings({}).testUnitEnabled).toBe(false);
    expect(rowToSiteSettings(rowWith(null)).testUnitEnabled).toBe(false);
    expect(rowToSiteSettings(rowWith(undefined)).testUnitEnabled).toBe(false);
    expect(rowToSiteSettings(rowWith("true")).testUnitEnabled).toBe(false);
    expect(rowToSiteSettings(rowWith(1)).testUnitEnabled).toBe(false);
    expect(rowToSiteSettings(rowWith(true)).testUnitEnabled).toBe(true);
  });
});

describe("siteSettingsToRow", () => {
  it("es el inverso de rowToSiteSettings para booking_mode", () => {
    const s = { bookingMode: "online", testUnitEnabled: false } as const;
    expect(rowToSiteSettings(siteSettingsToRow(s)).bookingMode).toBe(s.bookingMode);
  });

  it("NO emite test_unit_enabled: ese toggle se guarda aparte, con saveTestUnitEnabled", () => {
    const row = siteSettingsToRow({ bookingMode: "online", testUnitEnabled: true });
    expect(Object.keys(row)).not.toContain("test_unit_enabled");
  });
});

describe("parseSiteSettingsInput", () => {
  it("acepta los modos válidos y limpia espacios", () => {
    expect(parseSiteSettingsInput({ booking_mode: " online " })).toEqual({
      ok: true,
      value: { bookingMode: "online", testUnitEnabled: false },
    });
  });

  it("rechaza un modo inválido con mensaje legible", () => {
    const r = parseSiteSettingsInput({ booking_mode: "apagado" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/modo/i);
  });
});
