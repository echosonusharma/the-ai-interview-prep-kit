export function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-[#eef0ff] text-[#4f46e5] px-2.5 py-1 text-[11px] font-bold tracking-wide ${className}`}
    >
      {children}
    </span>
  );
}
export function Pill({ active, children }: { active?: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-xs font-medium border ${
        active ? "bg-[#0b1220] text-white border-[#0b1220] shadow-sm" : "bg-white border-[#e6e8f2] text-[#67708f]"
      }`}
    >
      {children}
    </span>
  );
}
export function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[9px] font-semibold tracking-[0.16em] text-[#a0a6c2]">{children}</div>;
}
