import { describe, it, expect } from "vitest";
import {
  monthGrid,
  parseMonth,
  shiftMonth,
  occupiedNight,
  monthOccupancy,
  overlapsDay,
  addMonthsToRef,
  getMonthsSequence,
  formatMonthRange,
  rangeOccupancy,
  multiMonthDateBounds,
} from "@/lib/admin/calendar";

describe("parseMonth", () => {
  it("lee ?mes=YYYY-MM y cae al mes de hoy si falta o es inválido", () => {
    expect(parseMonth("2026-12", "2026-10-29")).toEqual({ year: 2026, month: 12 });
    expect(parseMonth(undefined, "2026-10-29")).toEqual({ year: 2026, month: 10 });
    expect(parseMonth("2026-13", "2026-10-29")).toEqual({ year: 2026, month: 10 });
  });
});

describe("shiftMonth", () => {
  it("cruza el año", () => {
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toBe("2027-01");
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toBe("2025-12");
  });
});

describe("monthGrid", () => {
  it("semanas que empiezan en lunes y cubren el mes completo", () => {
    // Noviembre 2026: el 1 es domingo → la primera semana arranca el lunes 26/10.
    const weeks = monthGrid(2026, 11);
    expect(weeks[0][0]).toEqual({ iso: "2026-10-26", day: 26, inMonth: false });
    expect(weeks[0][6]).toEqual({ iso: "2026-11-01", day: 1, inMonth: true });
    const last = weeks[weeks.length - 1];
    expect(last[6].iso >= "2026-11-30").toBe(true);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
  });
});

const res = (check_in: string, check_out: string, unit_id = "aratiri", status: "pending" | "confirmed" = "confirmed") =>
  ({ id: check_in, unit_id, status, check_in, check_out });

describe("occupiedNight", () => {
  it("ocupa desde la llegada hasta la noche anterior a la salida, marcando puntas", () => {
    const r = [res("2026-11-05", "2026-11-08")];
    expect(occupiedNight(r, "aratiri", "2026-11-04")).toBeNull();
    expect(occupiedNight(r, "aratiri", "2026-11-05")).toMatchObject({ start: true, end: false });
    expect(occupiedNight(r, "aratiri", "2026-11-06")).toMatchObject({ start: false, end: false });
    expect(occupiedNight(r, "aratiri", "2026-11-07")).toMatchObject({ start: false, end: true });
    // El día de salida queda libre (check-out exclusivo).
    expect(occupiedNight(r, "aratiri", "2026-11-08")).toBeNull();
    expect(occupiedNight(r, "aguaribay", "2026-11-06")).toBeNull();
  });
});

describe("overlapsDay", () => {
  it("incluye el día de salida: ese día el dueño también tiene algo que hacer", () => {
    const r = res("2026-11-05", "2026-11-08");
    expect(overlapsDay(r, "2026-11-08")).toBe(true);
    expect(overlapsDay(r, "2026-11-09")).toBe(false);
    expect(overlapsDay(r, "2026-11-04")).toBe(false);
  });
});

describe("monthOccupancy", () => {
  it("cuenta sólo las noches dentro del mes, por cabaña", () => {
    const r = [res("2026-10-30", "2026-11-03"), res("2026-11-28", "2026-12-02"), res("2026-11-10", "2026-11-12", "aguaribay")];
    expect(monthOccupancy(r, 2026, 11)).toEqual({ nights: 30, byUnit: { aratiri: 5, aguaribay: 2 } });
  });
});

describe("addMonthsToRef & getMonthsSequence", () => {
  it("suma meses cruzando de año", () => {
    expect(addMonthsToRef({ year: 2026, month: 11 }, 2)).toEqual({ year: 2027, month: 1 });
    expect(addMonthsToRef({ year: 2026, month: 3 }, -1)).toEqual({ year: 2026, month: 2 });
  });

  it("genera secuencia de N meses consecutivos", () => {
    const seq = getMonthsSequence({ year: 2026, month: 11 }, 3);
    expect(seq).toEqual([
      { year: 2026, month: 11 },
      { year: 2026, month: 12 },
      { year: 2027, month: 1 },
    ]);
  });
});

describe("formatMonthRange", () => {
  it("formatea 1 mes", () => {
    expect(formatMonthRange([{ year: 2026, month: 11 }])).toBe("Noviembre 2026");
  });

  it("formatea varios meses del mismo año", () => {
    expect(
      formatMonthRange([
        { year: 2026, month: 10 },
        { year: 2026, month: 11 },
        { year: 2026, month: 12 },
      ]),
    ).toBe("Octubre – Diciembre 2026");
  });

  it("formatea meses cruzando año", () => {
    expect(
      formatMonthRange([
        { year: 2026, month: 11 },
        { year: 2026, month: 12 },
        { year: 2027, month: 1 },
      ]),
    ).toBe("Noviembre 2026 – Enero 2027");
  });
});

describe("rangeOccupancy", () => {
  it("suma las noches y ocupación de los meses dados", () => {
    const r = [
      res("2026-11-01", "2026-11-04"), // 3 noches en nov
      res("2026-12-01", "2026-12-05", "aguaribay"), // 4 noches en dic
    ];
    const months = [
      { year: 2026, month: 11 }, // 30 noches
      { year: 2026, month: 12 }, // 31 noches
    ];
    const occ = rangeOccupancy(r, months);
    expect(occ.nights).toBe(61);
    expect(occ.byUnit).toEqual({ aratiri: 3, aguaribay: 4 });
  });
});

describe("multiMonthDateBounds", () => {
  it("abarca desde la primera semana del primer mes hasta la última del último", () => {
    const bounds = multiMonthDateBounds([
      { year: 2026, month: 11 },
      { year: 2026, month: 12 },
    ]);
    expect(bounds.fromIso).toBe("2026-10-26");
    expect(bounds.toIso).toBe("2027-01-03");
  });
});
