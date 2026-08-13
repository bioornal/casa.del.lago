import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/admin/login/actions";

type AdminSection = "reservas" | "tarifas" | "opiniones" | "configuracion" | "pago-prueba";

const NAV: Array<{ key: AdminSection; href: string; label: string }> = [
  { key: "reservas", href: "/admin/reservas", label: "Reservas" },
  { key: "tarifas", href: "/admin/tarifas", label: "Tarifas" },
  { key: "opiniones", href: "/admin/opiniones", label: "Opiniones" },
  { key: "configuracion", href: "/admin/configuracion", label: "Configuración" },
  { key: "pago-prueba", href: "/admin/pago-prueba", label: "Pago de prueba" },
];

export function AdminHeader({
  current,
  eyebrow = "Panel de operaciones",
  title,
  description,
  status,
  children,
}: {
  current: AdminSection;
  eyebrow?: string;
  title: string;
  description: string;
  status?: { label: string; ok?: boolean };
  children?: ReactNode;
}) {
  return (
    <header className="mb-8 rounded-[12px] bg-[#183d43] px-6 py-6 text-marfil shadow-[0_22px_55px_-42px_rgba(21,45,55,.8)] md:px-8">
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[.26em] text-[#a9cbd5]">{eyebrow}</div>
          <h1 className="m-0 font-display text-[clamp(34px,5vw,52px)] font-normal leading-none">{title}</h1>
          <p className="mb-0 mt-3 max-w-[620px] text-[13px] leading-[1.6] text-[#c7dde3]">{description}</p>
        </div>
        {status && (
          <div className={`rounded-full px-3 py-2 text-center text-[11px] font-semibold ${status.ok ? "bg-[#d9eee4] text-[#245c3c]" : "bg-[#f8e4c1] text-[#805b1c]"}`}>
            {status.label}
          </div>
        )}
      </div>
      <nav className="mt-6 flex flex-wrap items-center gap-2 border-t border-white/15 pt-5">
        {NAV.map((item) => {
          const active = item.key === current;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`rounded-[4px] border px-3.5 py-2 text-[12px] no-underline transition-colors ${active ? "border-[#d9eee4] bg-[#d9eee4] font-semibold text-[#245c3c]" : "border-white/20 bg-transparent text-[#dcebed] hover:bg-white/10"}`}
            >
              {item.label}
            </Link>
          );
        })}
        {children}
        <form action={signOut} className="ml-auto">
          <button type="submit" className="rounded-[4px] border border-white/20 bg-transparent px-3.5 py-2 text-[12px] text-[#dcebed] transition-colors hover:bg-white/10">
            Cerrar sesión
          </button>
        </form>
      </nav>
    </header>
  );
}
