import * as React from "react";

type Variant = "primary" | "secondary" | "ghost" | "gradient";
type Size = "sm" | "md" | "lg";

export function buttonStyles(
  variant: Variant = "primary",
  size: Size = "md",
  className = ""
): string {
  const base =
    "inline-flex items-center justify-center gap-2 font-semibold tracking-tight rounded-full transition-colors focus-ring disabled:opacity-50 disabled:pointer-events-none";
  const sizes = {
    sm: "px-3.5 py-1.5 text-xs",
    md: "px-4 py-2 text-xs",
    lg: "px-5 py-2.5 text-sm",
  };
  const variants = {
    primary: "bg-[#0b1220] text-white hover:bg-[#1a2744] shadow-sm",
    secondary: "bg-white border border-[#e6e8f2] text-[#0b1220] hover:bg-[#f6f7fb]",
    ghost: "bg-transparent text-[#67708f] hover:bg-[#eef0ff] hover:text-[#0b1220]",
    gradient:
      "bg-gradient-to-br from-[#ff7eb0] via-[#ff8fa0] to-[#ffcc6a] text-white shadow-sm hover:opacity-90",
  };
  return `${base} ${sizes[size]} ${variants[variant]} ${className}`;
}

export function Button({
  variant = "primary",
  size = "md",
  type = "button",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button type={type} className={buttonStyles(variant, size, className)} {...props} />;
}
