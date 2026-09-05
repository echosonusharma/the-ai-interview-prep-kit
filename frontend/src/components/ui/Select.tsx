"use client";

import { useEffect, useId, useRef, useState } from "react";

export type SelectOption = { value: string; label: string };

/**
 * Theme-aware dropdown. Native <select> popups render with OS styling
 * (unthemed list, light-blue highlight) so we render the list ourselves
 * using the app's surface tokens, which already have dark overrides.
 */
export function FieldSelect({
  label,
  value,
  onChange,
  options,
  disabled = false,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(() =>
    Math.max(0, options.findIndex((o) => o.value === value)),
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open ]);

  const toggleOpen = () => {
    if (disabled) return;
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen((v) => !v);
  };

  const choose = (v: string) => {
    onChange(v);
    setOpen(false);
    btnRef.current?.focus();
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={toggleOpen}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!open) toggleOpen();
            else choose(options[active]?.value ?? value);
          } else if (e.key === "Escape") {
            setOpen(false);
          } else if (open && (e.key === "ArrowUp")) {
            e.preventDefault();
            setActive((a) => (a - 1 + options.length) % options.length);
          }
        }}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-[#e6e8f2] bg-white px-2.5 py-2 text-xs font-semibold text-[#0b1220] disabled:opacity-50"
      >
        <span className="truncate">{selected?.label}</span>
        <svg
          aria-hidden
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          className={`shrink-0 text-[#a0a6c2] transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute inset-x-0 top-full z-30 mt-1.5 overflow-hidden rounded-xl border border-[#e6e8f2] bg-white py-1 shadow-lg"
        >
          {options.map((opt, i) => {
            const isSelected = opt.value === value;
            return (
              <li key={opt.value} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => choose(opt.value)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex w-full items-center gap-2 px-2.5 py-2 text-left text-xs font-semibold transition-colors ${
                    i === active
                      ? "bg-[#eef0ff] text-[#4f46e5]"
                      : isSelected
                        ? "text-[#4f46e5]"
                        : "text-[#0b1220] hover:bg-[#fafbff]"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`grid h-4 w-4 shrink-0 place-items-center rounded-full ${
                      isSelected ? "bg-[#eef0ff] text-[#4f46e5]" : "text-transparent"
                    }`}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
                    </svg>
                  </span>
                  {opt.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
