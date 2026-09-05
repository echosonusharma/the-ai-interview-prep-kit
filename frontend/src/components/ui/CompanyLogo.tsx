"use client";

import { useEffect, useState } from "react";
import { domainOf, logoSourcesFor } from "@/lib/companyLogo";

const TILE_GRADIENTS = [
  "from-[#6d5cff] to-[#b07cff]",
  "from-[#ff7eb0] to-[#ffcc6a]",
  "from-[#10b981] to-[#34d399]",
  "from-[#f59e0b] to-[#fbbf24]",
  "from-[#0ea5e9] to-[#6366f1]",
];

function gradientFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return TILE_GRADIENTS[h % TILE_GRADIENTS.length];
}

export function CompanyLogo({
  company,
  url,
  size = 56,
}: {
  company: string;
  url?: string | null;
  size?: number;
}) {
  const domain = domainOf(url);
  const sources = logoSourcesFor(domain);
  const [idx, setIdx] = useState(0);
  const exhausted = idx >= sources.length;

  useEffect(() => {
    setIdx(0);
  }, [company, url]);

  const initial = (company.trim()[0] ?? "?").toUpperCase();
  const style = { width: size, height: size } as const;

  if (exhausted) {
    return (
      <div
        style={style}
        aria-hidden
        className={`shrink-0 grid place-items-center rounded-2xl bg-gradient-to-br ${gradientFor(company)} text-white font-extrabold shadow-md shadow-[#0b1220]/10`}
      >
        <span style={{ fontSize: size * 0.42 }}>{initial}</span>
      </div>
    );
  }

  return (
    <div
      style={style}
      className="shrink-0 overflow-hidden rounded-2xl border border-[#e6e8f2] bg-white shadow-sm grid place-items-center"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- Remote logo fallbacks are dynamic and may not be configured for next/image. */}
      <img
        src={sources[idx]}
        alt={`${company} logo`}
        width={size}
        height={size}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setIdx((i) => i + 1)}
        className="h-[68%] w-[68%] object-contain"
      />
    </div>
  );
}
