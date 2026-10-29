import { getSsrClient } from "@/lib/supabase/ssr";

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}

export type AdminUser = { email: string };

/**
 * Email del admin para MOSTRARLO en pantallas de sólo lectura (Ajustes).
 * Verifica el token localmente con getClaims, sin ida y vuelta a Supabase; el
 * acceso ya lo controló el middleware. Para acciones que cambian datos se usa
 * getAdminUser, que consulta al servidor de Auth.
 */
export async function getAdminEmailForDisplay(): Promise<string | null> {
  const supabase = await getSsrClient();
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims?.email;
  return typeof email === "string" && isAdminEmail(email) ? email : null;
}

/** Devuelve el admin autenticado (email en la allowlist), o null. */
export async function getAdminUser(): Promise<AdminUser | null> {
  const supabase = await getSsrClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email || !isAdminEmail(data.user.email)) return null;
  return { email: data.user.email };
}
