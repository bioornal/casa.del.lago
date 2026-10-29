import type { ReactNode } from "react";

// Encabezado de cada pantalla del panel. La navegación vive aparte (AdminNav,
// en el layout): antes este bloque oscuro con el menú adentro ocupaba toda la
// primera pantalla del celular antes de mostrar un solo dato.
export function AdminHeader({
  title,
  description,
  alert,
  actions,
}: {
  title: string;
  description?: string;
  /** Aviso que el dueño tiene que ver (sólo cuando algo anda mal). */
  alert?: ReactNode;
  /** Botón principal de la pantalla, a la derecha del título. */
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 md:mb-7">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="m-0 font-display text-[32px] font-normal leading-[1.05] text-carbon md:text-[42px]">{title}</h1>
          {description && <p className="mb-0 mt-1.5 max-w-[620px] text-[14px] leading-[1.5] text-[#6b665d]">{description}</p>}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      {alert && (
        <div role="alert" className="mt-4 rounded-[10px] border border-[#e9d6a8] bg-[#fef6e7] px-4 py-3 text-[14px] leading-[1.5] text-[#7a5a18]">
          {alert}
        </div>
      )}
    </div>
  );
}

/** Contenedor común de las pantallas del panel (deja aire para las pestañas de abajo). */
export const ADMIN_PAGE = "mx-auto max-w-[1200px] px-4 pb-[calc(96px+env(safe-area-inset-bottom))] pt-5 md:px-8 md:pb-24 md:pt-8";
