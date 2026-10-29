import { describe, it, expect } from "vitest";
import { guestWhatsAppLink, guestTelLink, formatStayDate } from "@/lib/admin/guest-contact";

describe("guestWhatsAppLink", () => {
  it("número argentino local de 10 dígitos → agrega 549", () => {
    expect(guestWhatsAppLink("3757 44-6156")).toBe("https://wa.me/5493757446156");
  });

  it("respeta el código de país cuando viene con +", () => {
    expect(guestWhatsAppLink("+55 45 99999-8888")).toBe("https://wa.me/5545999998888");
  });

  it("quita el 0 de larga distancia y el 15 del celular argentino", () => {
    expect(guestWhatsAppLink("03757 15 446156")).toBe("https://wa.me/5493757446156");
  });

  it("ya internacional sin + (54...) queda igual", () => {
    expect(guestWhatsAppLink("5493757446156")).toBe("https://wa.me/5493757446156");
  });

  it("vacío o sin dígitos suficientes → null", () => {
    expect(guestWhatsAppLink("")).toBeNull();
    expect(guestWhatsAppLink(null)).toBeNull();
    expect(guestWhatsAppLink("123")).toBeNull();
  });
});

describe("guestTelLink", () => {
  it("deja sólo dígitos y el + inicial", () => {
    expect(guestTelLink("+54 9 3757 44-6156")).toBe("tel:+5493757446156");
    expect(guestTelLink("3757 446156")).toBe("tel:3757446156");
  });

  it("vacío → null", () => {
    expect(guestTelLink("  ")).toBeNull();
  });
});

describe("formatStayDate", () => {
  it("formatea YYYY-MM-DD como día corto en español sin correrse por zona horaria", () => {
    expect(formatStayDate("2026-11-05")).toBe("jue 5 nov");
    expect(formatStayDate("2026-01-01")).toBe("jue 1 ene");
  });

  it("si no es una fecha válida devuelve el texto tal cual", () => {
    expect(formatStayDate("cualquiera")).toBe("cualquiera");
  });
});
