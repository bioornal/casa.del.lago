export function KenBurns({ children, className = "" }:
  { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={className}
      style={{ animation: "lago-kb 9s ease-out forwards" }}
    >
      {children}
    </div>
  );
}
