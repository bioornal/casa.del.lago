import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente SSR para autenticación del panel admin (sesión en cookies).
export async function getSsrClient() {
  const cookieStore = await cookies();
  // Chequeo explícito en vez de `!`: la aserción le miente al compilador y, si
  // la variable falta, el error que sale es el genérico de Supabase ("Your
  // project's URL and Key are required"), que no dice CUÁL falta ni dónde
  // ponerla. Mismo criterio que getServiceClient en ./server.ts.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Falta NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en el entorno (.env.local en desarrollo). Sin ellas no hay sesión de admin.",
    );
  }
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Component sin permiso de escritura de cookies: el middleware refresca la sesión.
        }
      },
    },
  });
}
