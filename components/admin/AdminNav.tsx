"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { signOut } from "@/app/admin/login/actions";

// Navegación del panel, montada una sola vez en app/admin/layout.tsx.
// El dueño opera desde el celular: ahí la navegación es una barra de pestañas
// fija abajo, al alcance del pulgar, como en cualquier app. En pantallas
// grandes las mismas pestañas van en la barra superior.

type Item = { href: string; label: string; icon: ReactNode; match: (p: string) => boolean };

const ICON = "h-[22px] w-[22px]";

const ITEMS: Item[] = [
  {
    href: "/admin/reservas",
    label: "Reservas",
    match: (p) => p.startsWith("/admin/reservas"),
    icon: (
      <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
        <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
      </svg>
    ),
  },
  {
    href: "/admin/tarifas",
    label: "Tarifas",
    match: (p) => p.startsWith("/admin/tarifas"),
    icon: (
      <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3.5 12.6V4.5a1 1 0 0 1 1-1h8.1a1 1 0 0 1 .7.3l7.4 7.4a1 1 0 0 1 0 1.4l-8.1 8.1a1 1 0 0 1-1.4 0l-7.4-7.4a1 1 0 0 1-.3-.7Z" />
        <circle cx="8.5" cy="8.5" r="1.4" />
      </svg>
    ),
  },
  {
    href: "/admin/opiniones",
    label: "Opiniones",
    match: (p) => p.startsWith("/admin/opiniones"),
    icon: (
      <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden>
        <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5Z" />
      </svg>
    ),
  },
  {
    href: "/admin/configuracion",
    label: "Ajustes",
    match: (p) => p.startsWith("/admin/configuracion") || p.startsWith("/admin/pago-prueba"),
    icon: (
      <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
        <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
        <circle cx="16" cy="7" r="2.2" />
        <circle cx="8" cy="17" r="2.2" />
      </svg>
    ),
  },
];

export function AdminNav() {
  const pathname = usePathname() ?? "";
  if (pathname.startsWith("/admin/login")) return null;

  return (
    <>
      {/* Barra superior: marca + (desktop) pestañas + salir */}
      <header className="sticky top-0 z-30 border-b border-[#E7E0D4] bg-[#f8f5f0]/95 backdrop-blur">
        <div className="mx-auto flex h-[58px] max-w-[1200px] items-center gap-4 px-4 md:px-8">
          <Link href="/admin/reservas" className="flex min-w-0 items-center gap-2.5 no-underline">
            <img src="/isotipo-lago.png" alt="" aria-hidden className="h-7 w-auto" />
            <span className="truncate font-display text-[19px] leading-none text-carbon">
              Casa del Lago <span className="text-[#8a8170]">· Panel</span>
            </span>
          </Link>

          <nav aria-label="Secciones del panel" className="ml-6 hidden items-center gap-1 md:flex">
            {ITEMS.map((it) => {
              const active = it.match(pathname);
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-[40px] items-center rounded-full px-4 text-[14px] no-underline transition-colors ${
                    active ? "bg-[#183d43] font-semibold text-marfil" : "text-[#4b473f] hover:bg-[#ece5d8]"
                  }`}
                >
                  {it.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <a
              href="/es"
              target="_blank"
              rel="noopener"
              className="inline-flex min-h-[40px] items-center rounded-full px-3 text-[13.5px] text-[#4b473f] no-underline hover:bg-[#ece5d8]"
            >
              Ver web ↗
            </a>
            <form action={signOut} className="hidden md:block">
              <button type="submit" className="min-h-[40px] rounded-full px-3 text-[13.5px] text-[#8a3b1d] hover:bg-[#f6e6df]">
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Pestañas al pie (mobile) */}
      <nav
        aria-label="Secciones del panel"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E7E0D4] bg-white/97 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <div className="grid grid-cols-4">
          {ITEMS.map((it) => {
            const active = it.match(pathname);
            return (
              <Link
                key={it.href}
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-[62px] flex-col items-center justify-center gap-1 text-[11.5px] no-underline ${
                  active ? "font-semibold text-[#183d43]" : "text-[#8a8170]"
                }`}
              >
                <span className={`flex h-7 w-12 items-center justify-center rounded-full ${active ? "bg-[#d9eee4]" : ""}`}>
                  {it.icon}
                </span>
                {it.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
