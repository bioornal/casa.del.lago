import { ADMIN_PAGE } from "@/components/admin/AdminHeader";

// Esqueleto mientras el servidor arma la pantalla. Sin esto, al tocar una
// pestaña no pasaba nada visible hasta tener todos los datos y el panel
// parecía colgado. Con un loading.tsx, Next además precarga este esqueleto
// para cada link, así que el cambio de pestaña es instantáneo.
export default function AdminLoading() {
  const bar = "rounded-[10px] bg-[#ebe5da] motion-safe:animate-pulse";
  return (
    <div className={ADMIN_PAGE} aria-busy="true" aria-label="Cargando">
      <div className={`${bar} mb-6 h-9 w-44`} />
      <div className={`${bar} mb-4 h-[52px] w-full`} />
      <div className="grid gap-3 lg:grid-cols-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-[14px] border border-[#E7E0D4] bg-white p-4">
            <div className="flex gap-3.5">
              <div className={`${bar} h-[58px] w-[52px] shrink-0`} />
              <div className="flex-1 space-y-2.5 pt-1">
                <div className={`${bar} h-4 w-2/3`} />
                <div className={`${bar} h-3.5 w-1/2`} />
                <div className={`${bar} h-3.5 w-5/6`} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
