// Los reveals de entrada se quitaron por pedido explícito: el contenido ya no
// "se va pintando" al scrollear, se renderiza visible de una. El componente
// queda como wrapper transparente para no tocar los ~26 call sites (y para que
// volver atrás sea un solo archivo). `delay` se sigue aceptando y se ignora.
export function Reveal({
  children,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}
