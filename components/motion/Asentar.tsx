// El "asentado" de las tarjetas (rotación mínima + desplazamiento con desfase)
// se quitó junto al resto de las animaciones de entrada. Ver Reveal.tsx.
//
// El componente SIGUE SIENDO la grilla: `className` va en su propio div y los
// children quedan como hijos directos. Envolverlos individualmente los sacaría
// de la grilla y rompería el layout de spans.
export function Asentar({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}
