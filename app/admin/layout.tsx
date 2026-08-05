import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { display, sans } from "@/lib/fonts";
import "../globals.css";

export const metadata = {
  title: "Panel — La Casa del Lago Urugua-í",
};

// Root layout independiente para /admin (fuera de [locale]): debe proveer <html>/<body>.
//
// El NextIntlClientProvider no es decorativo: /admin reusa componentes del sitio
// público que son client components y llaman a hooks de next-intl —hoy
// RangeCalendar, que pide useLocale() para el idioma del almanaque—. Sin
// provider ese hook tira "No intl context found" y la pantalla de reservas no
// carga. El layout de [locale] tiene el suyo; éste es un root layout aparte y
// no lo hereda.
//
// locale fijo en "es" y sin messages a propósito: el panel es monolingüe y nada
// de acá adentro usa useTranslations, así que no tiene sentido serializar el
// JSON de mensajes entero en el payload. Si alguna vez se agrega un componente
// del panel que traduzca, hay que pasarle `messages` también.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${sans.variable}`}>
      <body>
        <NextIntlClientProvider locale="es">
          <div
            style={{
              minHeight: "100vh",
              background: "#f8f5f0",
              fontFamily: "var(--font-sans)",
              color: "#1D1D1D",
            }}
          >
            {children}
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
