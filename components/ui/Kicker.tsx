export function Kicker({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`text-[11.5px] font-bold uppercase tracking-[0.2em] text-turquesa ${className}`}>
      {children}
    </span>
  );
}
