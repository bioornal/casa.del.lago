// Sin la máscara animada ya no hace falta el `overflow-hidden` — ni el par
// pb-2/mb-[-8px] que le daba aire al clip para no decapitar las descendentes
// (la "g" de "lago", la coma). El título se renderiza visible y sin recorte.
// Ver el comentario en Reveal.tsx sobre por qué queda como wrapper.
export function RevealTitle({
  children,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}
