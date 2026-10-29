import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CalendarMonth, type CalendarStay, type CalendarUnit } from "@/app/admin/calendario/CalendarMonth";

const units: CalendarUnit[] = [
  { id: "aratiri", name: "Cabaña Aguaribay", short: "Aguaribay", color: "#A04B2A", soft: "#f6e3d9" },
  { id: "aguaribay", name: "Cabaña Aratirí", short: "Aratirí", color: "#1f6f78", soft: "#dcefef" },
];

const stay = (over: Partial<CalendarStay>): CalendarStay => ({
  id: "r1", unit_id: "aratiri", unit_name: "Cabaña Aguaribay", status: "confirmed",
  check_in: "2026-11-05", check_out: "2026-11-08", first_name: "Ana", last_name: "Paz",
  guests: 2, nights: 3, phone: null, ...over,
});

describe("CalendarMonth", () => {
  it("sin día elegido lista todas las reservas del mes", () => {
    render(<CalendarMonth year={2026} month={11} today="2026-10-29" stays={[stay({}), stay({ id: "r2", unit_id: "aguaribay", first_name: "Bruno", check_in: "2026-11-20", check_out: "2026-11-22" })]} units={units} />);
    expect(screen.getByText("Todo el mes")).toBeInTheDocument();
    expect(screen.getByText("Ana Paz")).toBeInTheDocument();
    expect(screen.getByText("Bruno Paz")).toBeInTheDocument();
  });

  it("al tocar un día muestra sólo lo de ese día, con llega / se va", () => {
    render(<CalendarMonth year={2026} month={11} today="2026-10-29" stays={[stay({})]} units={units} />);
    fireEvent.click(screen.getByRole("button", { name: "jue 5 nov" }));
    expect(screen.getByText("Llega")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "dom 8 nov" }));
    expect(screen.getByText("Se va")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "lun 9 nov" }));
    expect(screen.getByText("Las dos cabañas están libres ese día.")).toBeInTheDocument();
  });

  it("marca pendientes en la agenda", () => {
    render(<CalendarMonth year={2026} month={11} today="2026-10-29" stays={[stay({ status: "pending" })]} units={units} />);
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
  });
});
