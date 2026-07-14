import { useTranslations } from "next-intl";
import type { Dispatch } from "react";
import type { State, Action, GuestField } from "@/lib/reservation/reducer";

const inputCls =
  "block w-full rounded-[4px] border border-borde-medio bg-white font-sans text-[15px] text-carbon outline-none transition-colors duration-200 focus:border-lago";
const inputStyle: React.CSSProperties = {
  padding: "13px 16px",
};
const labelCls =
  "mb-[7px] block text-[11px] uppercase tracking-[0.16em] text-muted";

interface StepDatosProps {
  state: State;
  dispatch: Dispatch<Action>;
}

export function StepDatos({ state, dispatch }: StepDatosProps) {
  const t = useTranslations("reservas");
  const ph = t.raw("ph") as Record<string, string>;

  const AUTOCOMPLETE: Record<GuestField, string> = {
    firstName: "given-name",
    lastName: "family-name",
    email: "email",
    phone: "tel",
  };
  // El placeholder hace de nombre accesible (aria-label) ya que no hay <label> visible.
  const field = (f: GuestField, label: string) => ({
    value: state[f],
    "aria-label": label,
    autoComplete: AUTOCOMPLETE[f],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      dispatch({ type: "SET_GUEST_FIELD", field: f, value: e.target.value }),
  });

  return (
    <div>
      <h3
        className="font-display"
        style={{
          fontWeight: 500,
          fontSize: 26,
          margin: "0 0 24px",
        }}
      >
        {t("yourData")}
      </h3>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <label className="block">
          <span className={labelCls}>{ph.nombre}</span>
          <input type="text" placeholder={ph.nombre} className={inputCls} style={inputStyle} {...field("firstName", ph.nombre)} />
        </label>
        <label className="block">
          <span className={labelCls}>{ph.apellido}</span>
          <input type="text" placeholder={ph.apellido} className={inputCls} style={inputStyle} {...field("lastName", ph.apellido)} />
        </label>
        <label className="block">
          <span className={labelCls}>{ph.email}</span>
          <input type="email" placeholder={ph.email} className={inputCls} style={inputStyle} {...field("email", ph.email)} />
        </label>
        <label className="block">
          <span className={labelCls}>{ph.phone}</span>
          <input type="tel" placeholder={ph.phone} className={inputCls} style={inputStyle} {...field("phone", ph.phone)} />
        </label>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          marginTop: 18,
          fontSize: 12,
          color: "#6b665d",
        }}
      >
        <span style={{ color: "#9A7B4F" }}>🔒</span> {t("paySecure")}
      </div>
    </div>
  );
}
