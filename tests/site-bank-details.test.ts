import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const KEYS = [
  "NEXT_PUBLIC_CDL_BRUBANK_ALIAS",
  "NEXT_PUBLIC_CDL_BRUBANK_HOLDER",
] as const;

const ORIGINAL = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));

beforeEach(() => vi.resetModules());

afterEach(() => {
  for (const key of KEYS) {
    if (ORIGINAL[key] === undefined) delete process.env[key];
    else process.env[key] = ORIGINAL[key];
  }
});

describe("BRUBANK_DETAILS", () => {
  it("usa el alias y titular de la cuenta para transferencias", async () => {
    process.env.NEXT_PUBLIC_CDL_BRUBANK_ALIAS = "jmhbank";
    process.env.NEXT_PUBLIC_CDL_BRUBANK_HOLDER = "Juan Manuel Hambley";
    const { BRUBANK_DETAILS } = await import("@/lib/site");
    expect(BRUBANK_DETAILS.bank).toBe("Brubank");
    expect(BRUBANK_DETAILS.alias).toBe("jmhbank");
    expect(BRUBANK_DETAILS.holder).toBe("Juan Manuel Hambley");
  });

  it("mantiene los datos reales por defecto", async () => {
    delete process.env.NEXT_PUBLIC_CDL_BRUBANK_ALIAS;
    delete process.env.NEXT_PUBLIC_CDL_BRUBANK_HOLDER;
    const { BRUBANK_DETAILS } = await import("@/lib/site");
    expect(BRUBANK_DETAILS.alias).toBe("jmhbank");
    expect(BRUBANK_DETAILS.holder).toBe("Juan Manuel Hambley");
  });
});
