// El stagger de entrada del hero (kicker → título → subtítulo → buscador) se
// quitó junto al resto de las animaciones de aparición. Ver Reveal.tsx.
export function HeroReveal({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
