import { Fraunces, Manrope, Caveat } from "next/font/google";

export const display = Fraunces({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
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
