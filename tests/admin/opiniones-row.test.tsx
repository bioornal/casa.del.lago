import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Testimonio } from "@/lib/reviews/testimonios";

// Las server actions no se pueden importar en jsdom: se reemplazan por stubs
// que devuelven el mismo shape que la acción real.
vi.mock("@/app/admin/opiniones/actions", () => ({
  alternarPublicado: vi.fn(async () => ({ ok: true })),
  moverTestimonio: vi.fn(async () => ({ ok: true })),
  borrarTestimonio: vi.fn(async () => ({ ok: true })),
  crearTestimonio: vi.fn(async () => ({ ok: true })),
  editarTestimonio: vi.fn(async () => ({ ok: true })),
}));

const { TestimonioRow } = await import("@/app/admin/opiniones/TestimonioRow");

const BASE: Testimonio = {
  id: "t1",
  author: "Ana P.",
  body: "Todo impecable, volvemos.",
  lang: "es",
  rating: 4,
  dateLabel: "hace 2 meses",
  position: 0,
  published: true,
};

function renderRow(over: Partial<Testimonio> = {}, pos: { primero?: boolean; ultimo?: boolean } = {}) {
  return render(
    <TestimonioRow
      t={{ ...BASE, ...over }}
      primero={pos.primero ?? false}
      ultimo={pos.ultimo ?? false}
    />,
  );
}

describe("TestimonioRow", () => {
  it("muestra autor, fecha, estrellas y el texto entre comillas", () => {
    renderRow();
    expect(screen.getByText("Ana P.")).toBeInTheDocument();
    expect(screen.getByText("hace 2 meses")).toBeInTheDocument();
    // 4 de 5: si se rompe el conteo, la fila miente sobre la reseña.
    expect(screen.getByText("★★★★☆")).toBeInTheDocument();
    expect(screen.getByText(/“Todo impecable, volvemos.”/)).toBeInTheDocument();
  });

  it("pone el lang de la reseña en la cita, no el del panel", () => {
    renderRow({ lang: "pt", body: "Muito bom" });
    expect(screen.getByText(/Muito bom/).closest("blockquote")).toHaveAttribute("lang", "pt");
  });

  it("ofrece ocultar cuando está publicado y publicar cuando no", () => {
    const { unmount } = renderRow({ published: true });
    expect(screen.getByRole("button", { name: "Ocultar de la home" })).toBeInTheDocument();
    unmount();
    renderRow({ published: false });
    expect(screen.getByRole("button", { name: "Publicar" })).toBeInTheDocument();
    expect(screen.getByText("Oculto")).toBeInTheDocument();
  });

  it("desactiva subir en el primero y bajar en el último", () => {
    const { unmount } = renderRow({}, { primero: true });
    expect(screen.getByTitle("Subir")).toBeDisabled();
    expect(screen.getByTitle("Bajar")).toBeEnabled();
    unmount();
    renderRow({}, { ultimo: true });
    expect(screen.getByTitle("Subir")).toBeEnabled();
    expect(screen.getByTitle("Bajar")).toBeDisabled();
  });

  it("el formulario de edición aparece recién al tocar Editar, con el texto cargado", () => {
    renderRow();
    expect(screen.queryByLabelText(/Texto de la reseña/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    expect(screen.getByLabelText(/Texto de la reseña/)).toHaveValue("Todo impecable, volvemos.");
  });
});
