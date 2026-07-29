import { Fraunces, Manrope, Caveat } from "next/font/google";

// Sin `weight` next/font sirve la VARIABLE, que es lo que habilita el eje `opsz`
// (el diseño la pide como `ital,opsz,wght@0,9..144,300..600`). Con pesos
// discretos se cargaban instancias estáticas y `font-optical-sizing: auto` no
// tenía nada que variar: el título de 104px se dibujaba con el corte de texto,
// bastante más ancho y menos contrastado que el corte display.
export const display = Fraunces({
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  variable: "--font-display-loaded",
  display: "swap",
});

export const sans = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans-loaded",
  display: "swap",
});

export const accent = Caveat({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-accent-loaded",
  display: "swap",
});
