import { describe, it, expect } from "vitest";
import {
  DEFAULT_RATE_SETTINGS,
  parseRateSettingsInput,
  rowToSettings,
  settingsToRow,
  type RateSettingsInput,
} from "@/lib/reservation/rate-settings";
import { UNITS, CLEANING_FEE, BASE_GUESTS } from "@/lib/units";

const VALID: RateSettingsInput = {
  nightly_aratiri: "140000",
  nightly_aguaribay: "100000",
  cleaning_fee: "35000",
  base_guests: "2",
  extra_guest_fee: "15000",
  card_fee_pct: "7.7",
  transfer_fee_pct: "5",
};

describe("DEFAULT_RATE_SETTINGS", () => {
  it("espeja los valores históricos de lib/units (fallback seguro)", () => {
    for (const u of UNITS) {
      expect(DEFAULT_RATE_SETTINGS.nightly[u.slug]).toBe(u.price);
    }
    expect(DEFAULT_RATE_SETTINGS.cleaningFee).toBe(CLEANING_FEE);
    expect(DEFAULT_RATE_SETTINGS.baseGuests).toBe(BASE_GUESTS);
    expect(DEFAULT_RATE_SETTINGS.extraGuestFee).toBe(20000);
    expect(DEFAULT_RATE_SETTINGS.cardFeePct).toBe(7.7);
    expect(DEFAULT_RATE_SETTINGS.transferFeePct).toBe(5);
  });
});

describe("rowToSettings / settingsToRow", () => {
  it("round-trip conserva todos los campos", () => {
    const s = rowToSettings({
      nightly_aratiri: 1,
      nightly_aguaribay: 2,
      cleaning_fee: 4,
      base_guests: 5,
      extra_guest_fee: 6,
      card_fee_pct: 8.5,
      transfer_fee_pct: 4.25,
    });
    expect(s).toEqual({
      nightly: { aratiri: 1, aguaribay: 2 },
      cleaningFee: 4,
      baseGuests: 5,
      extraGuestFee: 6,
      cardFeePct: 8.5,
      transferFeePct: 4.25,
    });
    expect(settingsToRow(s)).toEqual({
      nightly_aratiri: 1,
      nightly_aguaribay: 2,
      cleaning_fee: 4,
      base_guests: 5,
      extra_guest_fee: 6,
      card_fee_pct: 8.5,
      transfer_fee_pct: 4.25,
    });
  });

  it("columnas de % ausentes o string (numeric de Postgres) → defaults / parseo", () => {
    const base = {
      nightly_aratiri: 1, nightly_aguaribay: 2,
      cleaning_fee: 4, base_guests: 5, extra_guest_fee: 6,
    };
    // ALTER aún no corrido: columnas ausentes → defaults (nada de NaN)
    const sinCols = rowToSettings(base);
    expect(sinCols.cardFeePct).toBe(7.7);
    expect(sinCols.transferFeePct).toBe(5);
    // numeric puede llegar como string
    const conStrings = rowToSettings({ ...base, card_fee_pct: "6.29", transfer_fee_pct: "5.00" });
    expect(conStrings.cardFeePct).toBe(6.29);
    expect(conStrings.transferFeePct).toBe(5);
    // valores absurdos en DB → defaults
    const absurdo = rowToSettings({ ...base, card_fee_pct: 99, transfer_fee_pct: -1 });
    expect(absurdo.cardFeePct).toBe(7.7);
    expect(absurdo.transferFeePct).toBe(5);
  });

  it("clampea transferFeePct a cardFeePct si la fila llega invertida (editada a mano en SQL)", () => {
    const base = {
      nightly_aratiri: 1, nightly_aguaribay: 2,
      cleaning_fee: 4, base_guests: 5, extra_guest_fee: 6,
    };
    // El parser del form ya rechaza esta combinación, pero rowToSettings lee
    // cualquier fila: sin clamp, priceBreakdown mostraría líneas que no suman
    // el Total (ver bug reportado con card=2/transfer=9 en Aratirí).
    const s = rowToSettings({ ...base, card_fee_pct: 2, transfer_fee_pct: 9 });
    expect(s.cardFeePct).toBe(2);
    expect(s.transferFeePct).toBe(2);
  });

  it("clampea aunque la inversión se arme sola: card fuera de rango (→ default) y transfer válido pero mayor", () => {
    const base = {
      nightly_aratiri: 1, nightly_aguaribay: 2,
      cleaning_fee: 4, base_guests: 5, extra_guest_fee: 6,
    };
    // Nadie tocó un par a mano: card_fee_pct=99 es inválido (parsePct cae al
    // default 7,7) y transfer_fee_pct=20 es perfectamente válido por sí solo,
    // pero juntos invierten el orden igual.
    const s = rowToSettings({ ...base, card_fee_pct: 99, transfer_fee_pct: 20 });
    expect(s.cardFeePct).toBe(7.7);
    expect(s.transferFeePct).toBe(7.7);
  });
});

describe("parseRateSettingsInput", () => {
  it("acepta valores válidos y los convierte a enteros", () => {
    const r = parseRateSettingsInput(VALID);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual({
        nightly: { aratiri: 140000, aguaribay: 100000 },
        cleaningFee: 35000,
        baseGuests: 2,
        extraGuestFee: 15000,
        cardFeePct: 7.7,
        transferFeePct: 5,
      });
    }
  });

  it("acepta % con coma decimal y % en 0", () => {
    const r = parseRateSettingsInput({ ...VALID, card_fee_pct: "6,29", transfer_fee_pct: "0" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.cardFeePct).toBe(6.29);
      expect(r.value.transferFeePct).toBe(0);
    }
  });

  it.each(["-1", "31", "x", ""])("rechaza card_fee_pct=%s", (v) => {
    expect(parseRateSettingsInput({ ...VALID, card_fee_pct: v }).ok).toBe(false);
  });

  it("acepta limpieza y huésped extra en 0 (gratis)", () => {
    const r = parseRateSettingsInput({ ...VALID, cleaning_fee: "0", extra_guest_fee: "0" });
    expect(r.ok).toBe(true);
  });

  it.each([
    ["0", "nightly en 0"],
    ["-5000", "nightly negativo"],
    ["abc", "nightly no numérico"],
    ["130000.5", "nightly con decimales"],
    ["", "nightly vacío"],
  ])("rechaza nightly_aguaribay=%s (%s)", (v) => {
    expect(parseRateSettingsInput({ ...VALID, nightly_aguaribay: v }).ok).toBe(false);
  });

  it("rechaza limpieza negativa", () => {
    expect(parseRateSettingsInput({ ...VALID, cleaning_fee: "-1" }).ok).toBe(false);
  });

  it("rechaza montos absurdos (anti-tipeo)", () => {
    expect(parseRateSettingsInput({ ...VALID, nightly_aratiri: "999999999999" }).ok).toBe(false);
  });

  it.each(["0", "21", "2.5", "x"])("rechaza base_guests=%s", (v) => {
    expect(parseRateSettingsInput({ ...VALID, base_guests: v }).ok).toBe(false);
  });

  it("rechaza transferFeePct > cardFeePct: la transferencia no puede costar más que la tarjeta", () => {
    const r = parseRateSettingsInput({ ...VALID, card_fee_pct: "2", transfer_fee_pct: "9" });
    expect(r.ok).toBe(false);
  });

  it("acepta transferFeePct === cardFeePct: no es mayor, el descuento simplemente da 0", () => {
    const r = parseRateSettingsInput({ ...VALID, card_fee_pct: "5", transfer_fee_pct: "5" });
    expect(r.ok).toBe(true);
  });
});
