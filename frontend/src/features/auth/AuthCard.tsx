"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthSidePanel } from "./AuthSidePanel";
import { SocialAuthButtons } from "./SocialAuthButtons";
import { ApiError } from "@/lib/api";

/** Shared email/password submit state: loading guard + announced errors. */
export function useAuthSubmit(action: () => Promise<void>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Request failed");
      setLoading(false);
    }
  };

  return { loading, error, submit };
}

export function AuthCard({
  title,
  switchText,
  switchLabel,
  switchHref,
  sideTitle,
  sideSubtitle,
  error,
  loading,
  submitLabel,
  submitPendingLabel,
  onSubmit,
  children,
}: {
  title: string;
  switchText: string;
  switchLabel: string;
  switchHref: string;
  sideTitle: string;
  sideSubtitle: string;
  error: string | null;
  loading: boolean;
  submitLabel: string;
  submitPendingLabel: string;
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-[980px] grid lg:grid-cols-[1.05fr_1fr] rounded-[20px] overflow-hidden bg-white border border-[#e6e8f2] shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
      <AuthSidePanel title={sideTitle} subtitle={sideSubtitle} />

      <div className="p-6 md:p-8 bg-white flex flex-col justify-evenly">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0b1220]">{title}</h1>
          <p className="mt-1 text-sm text-[#67708f]">
            {switchText}{" "}
            <Link href={switchHref} className="font-semibold text-[#5b5bf5]">
              {switchLabel}
            </Link>
          </p>
        </div>

        <SocialAuthButtons />

        <form className="space-y-4" onSubmit={onSubmit}>
          {children}
          {error && (
            <p role="alert" className="text-sm text-[#b91c1c]">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="w-full rounded-full bg-[#0b1220] py-3 text-sm font-bold text-white disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? submitPendingLabel : submitLabel}
          </button>
        </form>
      </div>
    </div>
  );
}
