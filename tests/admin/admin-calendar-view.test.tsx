import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdminCalendarView } from "@/app/admin/calendario/AdminCalendarView";
import type { CalendarStay, CalendarUnit } from "@/app/admin/calendario/CalendarMonth";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
  }),
}));

const units: CalendarUnit[] = [
  { id: "aratiri", name: "Cabaña Aguaribay", short: "Aguaribay", color: "#A04B2A", soft: "#f6e3d9" },
  { id: "aguaribay", name: "Cabaña Aratirí", short: "Aratirí", color: "#1f6f78", soft: "#dcefef" },
];

const stay = (over: Partial<CalendarStay>): CalendarStay => ({
  id: "r1",
  unit_id: "aratiri",
  unit_name: "Cabaña Aguaribay",
  status: "confirmed",
  check_in: "2026-11-05",
  check_out: "2026-11-08",
  first_name: "Ana",
  last_name: "Paz",
  guests: 2,
  nights: 3,
  phone: "5491112345678",
  ...over,
});

describe("AdminCalendarView", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("en versión mobile (<768px) muestra 1 solo mes", () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(
      <AdminCalendarView
        initialRef={{ year: 2026, month: 11 }}
        today="2026-10-29"
        stays={[stay({})]}
        units={units}
      />,
    );

    expect(screen.getByText("Noviembre 2026")).toBeInTheDocument();
    expect(screen.queryByText("Diciembre 2026")).not.toBeInTheDocument();
  });

  it("en versión desktop (>=768px) muestra múltiples meses a la par (por defecto 3)", () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(
      <AdminCalendarView
        initialRef={{ year: 2026, month: 11 }}
        today="2026-10-29"
        stays={[
          stay({}),
          stay({ id: "r2", check_in: "2026-12-10", check_out: "2026-12-14", first_name: "Carlos" }),
          stay({ id: "r3", check_in: "2027-01-05", check_out: "2027-01-09", first_name: "Elena" }),
        ]}
        units={units}
      />,
    );

    // Muestra el rango en el título principal
    expect(screen.getByText("Noviembre 2026 – Enero 2027")).toBeInTheDocument();

    // Muestra los 3 meses en las tarjetas
    expect(screen.getByText("Noviembre 2026")).toBeInTheDocument();
    expect(screen.getByText("Diciembre 2026")).toBeInTheDocument();
    expect(screen.getByText("Enero 2027")).toBeInTheDocument();

    // Ofrece botones para cambiar entre 1, 2, 3 o 4 meses
    expect(screen.getByRole("button", { name: "1 mes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2 meses" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "3 meses" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "4 meses" })).toBeInTheDocument();
  });

  it("permite ampliar (zoom) un mes específico y luego volver", () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(
      <AdminCalendarView
        initialRef={{ year: 2026, month: 11 }}
        today="2026-10-29"
        stays={[
          stay({}),
          stay({ id: "r2", check_in: "2026-12-10", check_out: "2026-12-14", first_name: "Carlos" }),
        ]}
        units={units}
      />,
    );

    // Tocamos "Ampliar" en Diciembre 2026
    const zoomButtons = screen.getAllByRole("button", { name: /ampliar/i });
    expect(zoomButtons.length).toBeGreaterThan(0);
    fireEvent.click(zoomButtons[1]); // Diciembre

    // Ahora estamos en modo ampliado
    expect(screen.getByText("Modo ampliado")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /volver a vista de 3 meses/i })).toBeInTheDocument();

    // Volver a la vista múltiple
    fireEvent.click(screen.getByRole("button", { name: /volver a vista de 3 meses/i }));
    expect(screen.queryByText("Modo ampliado")).not.toBeInTheDocument();
    expect(screen.getByText("Noviembre 2026 – Enero 2027")).toBeInTheDocument();
  });

  it("permite seleccionar un día y filtrar la agenda", () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(
      <AdminCalendarView
        initialRef={{ year: 2026, month: 11 }}
        today="2026-10-29"
        stays={[stay({})]}
        units={units}
      />,
    );

    // Tocamos el día 5 de nov
    const dayBtn = screen.getByRole("button", { name: "jue 5 nov" });
    fireEvent.click(dayBtn);

    expect(screen.getByText("Agenda del jue 5 nov")).toBeInTheDocument();
    expect(screen.getByText("Llega")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver todo el período" })).toBeInTheDocument();

    // Limpiamos selección
    fireEvent.click(screen.getByRole("button", { name: "Ver todo el período" }));
    expect(screen.getByText("Reservas del período visible")).toBeInTheDocument();
  });

  it("cambiar la vista a 2 meses persiste en localStorage", () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(
      <AdminCalendarView
        initialRef={{ year: 2026, month: 11 }}
        today="2026-10-29"
        stays={[stay({})]}
        units={units}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "2 meses" }));
    expect(localStorage.getItem("cdl-admin-cal-view")).toBe("2");
    expect(screen.getByText("Noviembre – Diciembre 2026")).toBeInTheDocument();
  });
});
