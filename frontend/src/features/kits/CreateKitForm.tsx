"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarClock,
  Check,
  FileText,
  FileUp,
  Globe,
  LoaderCircle,
  Package,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";

const DAY_PRESETS = [1, 3, 5, 7, 14, 30];
const MIN_JD_CHARS = 500;
const MAX_JD_CHARS = 5000;

export function CreateKitForm() {
  const router = useRouter();
  const [rawJd, setRawJd] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [days, setDays] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [batchFile, setBatchFile] = useState<File | null>(null);

  const submitSingle = async () => {
    if (loading) return;
    if (!jdReady || !urlReady) {
      setError(
        `Add a job description between ${MIN_JD_CHARS}-${MAX_JD_CHARS} characters and a valid company URL.`
      );
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const kit = await api.createKit({ rawJd, companyUrl, days });
      router.push(`/kits/${kit.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to create kit");
    } finally {
      setLoading(false);
    }
  };

  const submitBatch = async () => {
    if (!batchFile) return;
    setLoading(true);
    setError(null);
    try {
      const text = await batchFile.text();
      const parsed: unknown = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error("Batch file must be a JSON array");
      const cases = parsed
        .filter((c): c is Record<string, unknown> => typeof c === "object" && c !== null)
        .map((c) => ({
          rawJd: typeof c.rawJd === "string" ? c.rawJd : typeof c.jd === "string" ? c.jd : "",
          companyUrl:
            typeof c.companyUrl === "string"
              ? c.companyUrl
              : typeof c.company_url === "string"
                ? c.company_url
                : "",
          days: typeof c.days === "number" ? c.days : 5,
        }))
        .filter((c) => c.rawJd.trim() && c.companyUrl.trim());
      if (cases.length === 0) throw new Error("No valid rows: each needs jd and company_url");
      const { kits, errors } = await api.createKitBatch(cases);
      if (kits.length === 0) {
        setError(errors.map((e) => `#${e.index}: ${e.message}`).join("; ") || "No kits created");
        return;
      }
      if (errors.length) {
        setError(`Created ${kits.length} kit(s). ${errors.length} failed.`);
      }
      router.push(`/kits/${kits[0]!.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Invalid batch file");
    } finally {
      setLoading(false);
    }
  };

  const jdChars = rawJd.trim().length;
  const jdTooLong = jdChars > MAX_JD_CHARS;
  const jdReady = jdChars >= MIN_JD_CHARS && jdChars <= MAX_JD_CHARS;
  const urlReady = /^https?:\/\/.+\..+/.test(companyUrl.trim());

  return (
    <div className="fade-up relative overflow-hidden rounded-3xl border border-[#e6e8f2] bg-white shadow-[0_20px_60px_-24px_rgba(91,91,245,0.35)]">
      {/* gradient crown */}
      <div aria-hidden className="h-1.5 bg-gradient-to-r from-[#5b5bf5] via-[#ff7eb0] to-[#ffb86a]" />
      <div className="p-6 sm:p-7">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#5b5bf5] to-[#b07cff] text-white shadow-md">
            <Sparkles size={19} aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-[#0b1220]">Create interview prep kit</h2>
            <p className="text-xs text-[#67708f]">Paste a JD + company URL. Research runs itself.</p>
          </div>
        </div>

        {/* mode switch */}
        <div className="mt-5 grid grid-cols-2 gap-1 rounded-full bg-[#f1f2f9] p-1 text-xs font-bold">
          {(
            [
              { label: "Single role", Icon: Sparkles, active: !batchMode, onClick: () => setBatchMode(false) },
              { label: "Batch upload", Icon: Package, active: batchMode, onClick: () => setBatchMode(true) },
            ] as const
          ).map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={t.onClick}
              aria-pressed={t.active}
              className={`inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 transition-all ${
                t.active ? "bg-white text-[#0b1220] shadow-sm" : "text-[#8a8fa8] hover:text-[#0b1220]"
              }`}
            >
              <t.Icon size={13} aria-hidden />
              {t.label}
            </button>
          ))}
        </div>

        {batchMode ? (
          <div className="fade-up mt-5 space-y-3">
            <label
              htmlFor="batch-file"
              className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
                batchFile ? "border-[#86efac] bg-[#f0fdf4]" : "border-[#d6d9eb] bg-[#f6f7fb] hover:border-[#a5b4fc]"
              }`}
            >
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-[#eef0ff] text-[#4f46e5]">
                {batchFile ? <FileText size={18} aria-hidden /> : <FileUp size={18} aria-hidden />}
              </span>
              <span className="mt-2 text-sm font-bold text-[#0b1220]">
                {batchFile ? batchFile.name : "Drop a JSON file or click to browse"}
              </span>
              <span className="mt-0.5 text-[11px] text-[#8a8fa8]">Array of {"{ jd, company_url, days }"}</span>
              <input
                id="batch-file"
                type="file"
                accept=".json,application/json"
                className="sr-only"
                onChange={(e) => setBatchFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <Button onClick={() => void submitBatch()} disabled={loading || !batchFile} className="w-full">
              {loading ? "Uploading…" : (<>Queue batch <ArrowRight size={14} aria-hidden /></>)}
            </Button>
          </div>
        ) : (
          <form
            noValidate
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submitSingle();
            }}
          >
            <label className="block">
              <span className="flex items-center justify-between text-xs font-bold text-[#0b1220]">
                <span className="inline-flex items-center gap-1.5">
                  <FileText size={13} className="text-[#8a8fa8]" aria-hidden /> Job description
                </span>
                <span className={`inline-flex items-center gap-1 font-semibold ${jdReady ? "text-[#059669]" : jdTooLong ? "text-[#b91c1c]" : "text-[#a0a6c2]"}`}>
                  {jdChars} chars
                  {jdReady ? (<><Check size={12} strokeWidth={3} aria-hidden /> ready</>) : jdTooLong ? `· ${MAX_JD_CHARS} max` : `· ${MIN_JD_CHARS}+ needed`}
                </span>
              </span>
              <textarea
                required
                minLength={MIN_JD_CHARS}
                maxLength={MAX_JD_CHARS}
                rows={8}
                value={rawJd}
                onChange={(e) => {
                  setRawJd(e.target.value);
                  setError(null);
                }}
                placeholder="Paste the full job posting… responsibilities, requirements, nice-to-haves"
                className="focus-ring mt-1.5 w-full resize-y rounded-2xl border border-[#e6e8f2] bg-[#f6f7fb] px-3.5 py-2.5 text-sm text-[#0b1220] outline-none transition-colors placeholder:text-[#a0a6c2] focus:border-[#5b5bf5] focus:bg-white"
              />
            </label>
            <label className="block">
              <span className="flex items-center justify-between text-xs font-bold text-[#0b1220]">
                <span className="inline-flex items-center gap-1.5">
                  <Globe size={13} className="text-[#8a8fa8]" aria-hidden /> Company website
                </span>
                {urlReady && (
                  <span className="inline-flex items-center gap-1 font-semibold text-[#059669]">
                    <Check size={12} strokeWidth={3} aria-hidden /> looks good
                  </span>
                )}
              </span>
              <input
                required
                type="url"
                value={companyUrl}
                onChange={(e) => {
                  setCompanyUrl(e.target.value);
                  setError(null);
                }}
                placeholder="https://company.com"
                className="focus-ring mt-1.5 w-full rounded-2xl border border-[#e6e8f2] bg-[#f6f7fb] px-3.5 py-2.5 text-sm text-[#0b1220] outline-none transition-colors placeholder:text-[#a0a6c2] focus:border-[#5b5bf5] focus:bg-white"
              />
            </label>
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0b1220]">
                <CalendarClock size={13} className="text-[#8a8fa8]" aria-hidden /> Days until interview
              </span>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {DAY_PRESETS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDays(d)}
                    aria-pressed={days === d}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                      days === d
                        ? "bg-[#0b1220] text-white shadow-sm"
                        : "bg-[#f1f2f9] text-[#67708f] hover:bg-[#e6e8f2]"
                    }`}
                  >
                    {d}d
                  </button>
                ))}
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={days}
                  aria-label="Custom days until interview"
                  onChange={(e) => setDays(Math.min(60, Math.max(1, Number(e.target.value) || 1)))}
                  className="focus-ring w-16 rounded-full border border-[#e6e8f2] bg-[#f6f7fb] px-2.5 py-1.5 text-center text-xs font-bold text-[#0b1220] outline-none focus:border-[#5b5bf5] focus:bg-white"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading}
              variant="gradient"
              size="lg"
              className="w-full text-sm disabled:opacity-60"
            >
              {loading ? (
                <>
                  <LoaderCircle size={15} className="animate-spin" aria-hidden /> Queuing…
                </>
              ) : (
                <>Generate kit <ArrowRight size={15} aria-hidden /></>
              )}
            </Button>
            <p className="text-center text-[11px] font-semibold text-[#a0a6c2]">
              One kit generates at a time · watch live progress on your kit page
            </p>
          </form>
        )}

        {error && (
          <p role="alert" className="fade-up mt-4 flex items-start gap-2 rounded-2xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm font-semibold text-[#b91c1c]">
            <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
