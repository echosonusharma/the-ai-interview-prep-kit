import * as React from "react";

export function Card({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-2xl bg-white border border-[#e6e8f2] shadow-sm ${className}`} {...props} />;
}
export function CardSoft({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-2xl bg-[#f6f7fb] border border-[#e6e8f2] ${className}`} {...props} />;
}
