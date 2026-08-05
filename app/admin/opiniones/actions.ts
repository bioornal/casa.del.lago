"use server";

import { revalidatePath } from "next/cache";
import { routing } from "@/lib/i18n/routing";
import { parseTestimonioInput, parseAggregateInput } from "@/lib/reviews/testimonios";
import {
  createTestimonio,
  updateTestimonio,
  deleteTestimonio,
  setTestimonioPublished,
  moveTestimonio,
  saveReviewsAggregate,
} from "@/lib/reviews/testimonios.server";

export type ActionState =
  | {
      ok?: boolean;
      error?: string;
      /**
       * Valor distinto en cada alta exitosa. El formulario lo usa de `key` para
       * remontarse y quedar vacío. Va acá y no en un useState del cliente
       * porque un setState dentro de un efecto encadena renders (y lo prohíbe
       * la regla react-hooks/set-state-in-effect).
       */
      token?: string;
    }
  | undefined;

/** Mensaje típico cuando falta correr el bloque de setup.sql. */
const SIN_TABLA =
  "No se pudo guardar en Supabase. ¿Corriste el bloque de testimonials del setup.sql en el SQL Editor?";

/**
 * La home es estática: sin revalidar seguiría sirviendo el HTML con los
 * testimonios viejos. Sólo la home — la sección Opiniones no aparece en otras
 * páginas.
 */
function revalidarHome(): void {
  for (const locale of routing.locales) revalidatePath(`/${locale}`);
}

function leerInput(formData: FormData) {
  return {
    author: String(formData.get("author") ?? ""),
    body: String(formData.get("body") ?? ""),
    lang: String(formData.get("lang") ?? ""),
    rating: String(formData.get("rating") ?? ""),
    date_label: String(formData.get("date_label") ?? ""),
  };
}

export async function crearTestimonio(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseTestimonioInput(leerInput(formData));
  if (!parsed.ok) return { error: parsed.error };
  try {
    await createTestimonio(parsed.value);
  } catch {
    return { error: SIN_TABLA };
  }
  revalidarHome();
  return { ok: true, token: crypto.randomUUID() };
}

export async function editarTestimonio(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Falta el id del testimonio." };
  const parsed = parseTestimonioInput(leerInput(formData));
  if (!parsed.ok) return { error: parsed.error };
  try {
    await updateTestimonio(id, parsed.value);
  } catch {
    return { error: SIN_TABLA };
  }
  revalidarHome();
  return { ok: true };
}

export async function alternarPublicado(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  // El checkbox manda el estado que HAY; la acción guarda el contrario.
  const publicado = String(formData.get("published") ?? "") === "true";
  if (!id) return { error: "Falta el id del testimonio." };
  try {
    await setTestimonioPublished(id, !publicado);
  } catch {
    return { error: SIN_TABLA };
  }
  revalidarHome();
  return { ok: true };
}

export async function moverTestimonio(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const dir = String(formData.get("dir") ?? "");
  if (!id) return { error: "Falta el id del testimonio." };
  if (dir !== "up" && dir !== "down") return { error: "Dirección inválida." };
  try {
    await moveTestimonio(id, dir);
  } catch {
    return { error: SIN_TABLA };
  }
  revalidarHome();
  return { ok: true };
}

export async function borrarTestimonio(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Falta el id del testimonio." };
  // Se borra de verdad: para sacarlo de la home sin perderlo está "despublicar",
  // que es lo que ofrece la pantalla por defecto.
  try {
    await deleteTestimonio(id);
  } catch {
    return { error: SIN_TABLA };
  }
  revalidarHome();
  return { ok: true };
}

export async function guardarAgregado(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseAggregateInput({
    rating: String(formData.get("rating") ?? ""),
    count: String(formData.get("count") ?? ""),
  });
  if (!parsed.ok) return { error: parsed.error };
  try {
    await saveReviewsAggregate(parsed.value);
  } catch {
    return {
      error:
        "No se pudo guardar en Supabase. ¿Corriste el ALTER de site_settings del setup.sql en el SQL Editor?",
    };
  }
  revalidarHome();
  return { ok: true };
}
