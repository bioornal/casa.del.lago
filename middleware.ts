import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { routing } from "./lib/i18n/routing";

const intl = createMiddleware(routing);

function isAdminPath(pathname: string): boolean {
  return pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
}

async function guardAdmin(req: NextRequest): Promise<NextResponse> {
  // /admin/login es público (el formulario).
  if (req.nextUrl.pathname === "/admin/login") return NextResponse.next();

  const res = NextResponse.next();
  // Sin las variables no hay forma de verificar la sesión. Cortamos con un
  // error que nombra lo que falta en vez de dejar que Supabase tire el suyo,
  // que no dice cuál de las dos es. Falla cerrado: nadie entra al panel.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    throw new Error(
      "Falta NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en el entorno (.env.local en desarrollo). El panel de admin no puede verificar la sesión.",
    );
  }
  const supabase = createServerClient(
    supabaseUrl,
    anonKey,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (toSet) => toSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
      },
    },
  );
  // getClaims y no getUser: el proyecto firma los tokens con claves
  // asimétricas (ES256), así que la firma se verifica acá con la clave pública
  // (que queda en memoria) y no hace falta ir al servidor de Auth en cada
  // navegación del panel (~250 ms cada vez). Si el token venció, lo renueva y
  // escribe las cookies nuevas por setAll, igual que getUser.
  const { data } = await supabase.auth.getClaims();
  const claimEmail = data?.claims?.email;
  const email = typeof claimEmail === "string" ? claimEmail.trim().toLowerCase() : undefined;
  const allow = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  const ok = !!email && allow.includes(email);

  if (ok) return res;
  if (req.nextUrl.pathname.startsWith("/api/admin")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  return NextResponse.redirect(url);
}

export default function middleware(req: NextRequest) {
  if (isAdminPath(req.nextUrl.pathname)) return guardAdmin(req);
  return intl(req);
}

export const config = {
  // El patrón general SIGUE excluyendo /api (para no correr next-intl sobre /api/payments, etc.),
  // pero NO excluye /admin → así /admin/* entra al middleware y lo desvía guardAdmin.
  // /api/admin se agrega explícito como segunda entrada.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)", "/api/admin/:path*"],
};
