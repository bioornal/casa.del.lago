import { getServiceClient } from "@/lib/supabase/server";
import {
  rowToTestimonio,
  rowToAggregate,
  isMostrable,
  DEFAULT_AGGREGATE,
  type AggregateRow,
  type ReviewsAggregate,
  type Testimonio,
  type TestimonioRow,
  type TestimonioValues,
} from "./testimonios";

// Solo debe importarse desde código server. No agregar "server-only" para
// mantener el módulo testeable en Vitest, igual que availability.server.ts.
//
// FAIL-SOFT: la lectura pública nunca tira. Si Supabase no responde o la tabla
// todavía no existe, devolvemos lista vacía y la sección Opiniones degrada al
// puntaje agregado. Una caída de la DB no puede voltear la home — y sobre todo
// no puede hacer que aparezca contenido que no está aprobado.
//
// Las escrituras SÍ propagan el error: el admin tiene que enterarse de que no
// se guardó, no quedarse con un "listo" falso.

const TTL_MS = 30_000;
let memo: { at: number; value: Testimonio[] } | null = null;

const COLUMNS = "id,author,body,lang,rating,date_label,position,published";

export function invalidateTestimoniosCache(): void {
  memo = null;
}

/** Todos, publicados o no, en orden de pantalla. Para el panel. */
export async function listTestimonios(): Promise<Testimonio[]> {
  if (memo && Date.now() - memo.at < TTL_MS) return memo.value;
  try {
    const { data, error } = await getServiceClient()
      .from("testimonials")
      .select(COLUMNS)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const value = ((data ?? []) as TestimonioRow[]).map(rowToTestimonio);
    memo = { at: Date.now(), value };
    return value;
  } catch {
    return [];
  }
}

/** Los que ve el público: publicados y con texto y autor. */
export async function getPublishedTestimonios(): Promise<Testimonio[]> {
  return (await listTestimonios()).filter((t) => t.published && isMostrable(t));
}

export async function createTestimonio(values: TestimonioValues): Promise<void> {
  // Al final de la lista: agregar uno no debería reordenar lo que ya estaba.
  const actuales = await listTestimonios();
  const position = actuales.reduce((max, t) => Math.max(max, t.position), 0) + 1;

  const { error } = await getServiceClient().from("testimonials").insert({
    author: values.author,
    body: values.body,
    lang: values.lang,
    rating: values.rating,
    date_label: values.dateLabel,
    position,
  });
  if (error) throw new Error(`createTestimonio: ${error.message}`);
  invalidateTestimoniosCache();
}

export async function updateTestimonio(id: string, values: TestimonioValues): Promise<void> {
  const { error } = await getServiceClient()
    .from("testimonials")
    .update({
      author: values.author,
      body: values.body,
      lang: values.lang,
      rating: values.rating,
      date_label: values.dateLabel,
    })
    .eq("id", id);
  if (error) throw new Error(`updateTestimonio: ${error.message}`);
  invalidateTestimoniosCache();
}

export async function setTestimonioPublished(id: string, published: boolean): Promise<void> {
  const { error } = await getServiceClient()
    .from("testimonials")
    .update({ published })
    .eq("id", id);
  if (error) throw new Error(`setTestimonioPublished: ${error.message}`);
  invalidateTestimoniosCache();
}

export async function deleteTestimonio(id: string): Promise<void> {
  const { error } = await getServiceClient().from("testimonials").delete().eq("id", id);
  if (error) throw new Error(`deleteTestimonio: ${error.message}`);
  invalidateTestimoniosCache();
}

// ---- Agregado de la ficha (columnas de site_settings, fila id=1) -----------

export async function getReviewsAggregate(): Promise<ReviewsAggregate> {
  try {
    const { data, error } = await getServiceClient()
      .from("site_settings")
      .select("reviews_rating,reviews_count")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? rowToAggregate(data as AggregateRow) : DEFAULT_AGGREGATE;
  } catch {
    return DEFAULT_AGGREGATE;
  }
}

export async function saveReviewsAggregate(a: ReviewsAggregate): Promise<void> {
  // UPDATE y no upsert: la fila id=1 ya existe y tiene el booking_mode, que no
  // es asunto de esta pantalla y no se puede pisar desde acá.
  const { error } = await getServiceClient()
    .from("site_settings")
    .update({ reviews_rating: a.rating, reviews_count: a.count })
    .eq("id", 1);
  if (error) throw new Error(`saveReviewsAggregate: ${error.message}`);
}

/**
 * Sube o baja un testimonio intercambiando `position` con su vecino.
 * Se hace sobre la lista ya ordenada y no sobre los valores crudos de
 * `position`: si dos filas quedaron con el mismo número —posible si alguna vez
 * se editan por SQL— el intercambio a ciegas no movería nada. Reescribimos las
 * dos posiciones con los índices de la lista, que siempre son distintos.
 */
export async function moveTestimonio(id: string, dir: "up" | "down"): Promise<void> {
  const lista = await listTestimonios();
  const i = lista.findIndex((t) => t.id === id);
  if (i === -1) throw new Error("moveTestimonio: no existe ese testimonio.");
  const j = dir === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= lista.length) return; // ya está en la punta: no es un error

  const client = getServiceClient();
  const [a, b] = [lista[i], lista[j]];
  const results = await Promise.all([
    client.from("testimonials").update({ position: j }).eq("id", a.id),
    client.from("testimonials").update({ position: i }).eq("id", b.id),
  ]);
  const fallo = results.find((r) => r.error);
  if (fallo?.error) throw new Error(`moveTestimonio: ${fallo.error.message}`);
  invalidateTestimoniosCache();
}
