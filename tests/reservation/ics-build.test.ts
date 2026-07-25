import { describe, it, expect } from "vitest";
import { buildBookingIcs } from "@/lib/reservation/ics-build";

const INPUT = {
  code: "CDL-2026-AB12",
  unitName: "Cabaña Aratiri",
  checkIn: "2026-07-02",
  checkOut: "2026-07-05",
};

describe("buildBookingIcs", () => {
  it("genera un VEVENT de día completo con las fechas de la reserva", () => {
    const ics = buildBookingIcs(INPUT);
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("DTSTART;VALUE=DATE:20260702");
    expect(ics).toContain("DTEND;VALUE=DATE:20260705");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("usa METHOD:PUBLISH, no REQUEST", () => {
    expect(buildBookingIcs(INPUT)).toContain("METHOD:PUBLISH");
  });

  it("deriva el UID del código", () => {
    expect(buildBookingIcs(INPUT)).toContain("UID:CDL-2026-AB12@lacasadellagouruguai.com");
  });

  it("termina las líneas en CRLF, como exige RFC 5545", () => {
    const ics = buildBookingIcs(INPUT);
    expect(ics).toContain("\r\n");
    expect(ics.split("\r\n").some((l) => l.endsWith("\n"))).toBe(false);
  });

  it("incluye un DTSTAMP con formato UTC válido", () => {
    expect(buildBookingIcs(INPUT)).toMatch(/DTSTAMP:\d{8}T\d{6}Z/);
  });

  it("escapa las comas del nombre de la unidad", () => {
    const ics = buildBookingIcs({ ...INPUT, unitName: "Cabaña Aratiri, planta alta" });
    expect(ics).toContain("SUMMARY:La Casa del Lago Urugua-í — Cabaña Aratiri\\, planta alta");
  });
});
