/** Escapa texto para interpolarlo en el HTML de un email. */
export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!),
  );
}

/** Total en pesos, con separadores de miles es-AR. */
export function money(total: number): string {
  return `$${new Intl.NumberFormat("es-AR").format(total)}`;
}
