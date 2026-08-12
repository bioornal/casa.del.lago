import { describe, it, expect, vi, beforeEach } from "vitest";

// Mismo hueco que en configuracion/actions.ts y tarifas/actions.ts: el
// middleware guarda por path, no por Server Action (ver middleware.ts). Las
// seis acciones de este archivo comparten el guard vía requireAdmin(); un solo
// caso por acción alcanza para cubrir el patrón (no hace falta duplicar los
// nueve tests, según el pedido del review).
const getAdminUser = vi.fn();
vi.mock("@/lib/admin/auth", () => ({
  getAdminUser: (...a: unknown[]) => getAdminUser(...a),
}));

const createTestimonio = vi.fn();
const updateTestimonio = vi.fn();
const deleteTestimonio = vi.fn();
const setTestimonioPublished = vi.fn();
const moveTestimonio = vi.fn();
const saveReviewsAggregate = vi.fn();
vi.mock("@/lib/reviews/testimonios.server", () => ({
  createTestimonio: (...a: unknown[]) => createTestimonio(...a),
  updateTestimonio: (...a: unknown[]) => updateTestimonio(...a),
  deleteTestimonio: (...a: unknown[]) => deleteTestimonio(...a),
  setTestimonioPublished: (...a: unknown[]) => setTestimonioPublished(...a),
  moveTestimonio: (...a: unknown[]) => moveTestimonio(...a),
  saveReviewsAggregate: (...a: unknown[]) => saveReviewsAggregate(...a),
}));

import {
  crearTestimonio,
  editarTestimonio,
  alternarPublicado,
  moverTestimonio,
  borrarTestimonio,
  guardarAgregado,
  type ActionState,
} from "@/app/admin/opiniones/actions";

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
}

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

const VALID_TESTIMONIO = { author: "Ana", body: "Excelente estadía", lang: "es", rating: "5", date_label: "2026" };

const CASES: Array<[string, Action, FormData, ReturnType<typeof vi.fn>]> = [
  ["crearTestimonio", crearTestimonio, fd({ ...VALID_TESTIMONIO }), createTestimonio],
  ["editarTestimonio", editarTestimonio, fd({ id: "1", ...VALID_TESTIMONIO }), updateTestimonio],
  ["alternarPublicado", alternarPublicado, fd({ id: "1", published: "true" }), setTestimonioPublished],
  ["moverTestimonio", moverTestimonio, fd({ id: "1", dir: "up" }), moveTestimonio],
  ["borrarTestimonio", borrarTestimonio, fd({ id: "1" }), deleteTestimonio],
  ["guardarAgregado", guardarAgregado, fd({ rating: "4.8", count: "20" }), saveReviewsAggregate],
];

beforeEach(() => {
  vi.clearAllMocks();
  getAdminUser.mockResolvedValue(null);
});

describe("las seis acciones de opiniones exigen sesión de admin", () => {
  it.each(CASES)("%s no persiste sin admin y devuelve error", async (_name, action, formData, persistFn) => {
    const res = await action(undefined, formData);
    expect(res).toEqual({ error: expect.any(String) });
    expect(persistFn).not.toHaveBeenCalled();
  });
});
