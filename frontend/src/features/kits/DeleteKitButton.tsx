"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { buttonStyles } from "@/components/ui/Button";

interface DeleteKitButtonProps {
  kitId: string;
  status: string;
  variant?: "icon" | "button";
  onDeleted?: (id: string) => void;
}

/**
 * Two-click delete: first click arms ("Confirm?"), second click deletes.
 * Queued/running kits are blocked server-side (409) so the button stays
 * disabled until generation settles.
 */
export function DeleteKitButton({ kitId, status, variant = "icon", onDeleted }: DeleteKitButtonProps) {
  const [armed, setArmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (armTimer.current) clearTimeout(armTimer.current);
    };
  }, []);

  const busy = status === "queued" || status === "running";

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy || deleting) return;
    if (!armed) {
      setArmed(true);
      setError(null);
      if (armTimer.current) clearTimeout(armTimer.current);
      armTimer.current = setTimeout(() => setArmed(false), 4000);
      return;
    }
    if (armTimer.current) clearTimeout(armTimer.current);
    setDeleting(true);
    setError(null);
    try {
      await api.deleteKit(kitId);
      onDeleted?.(kitId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setArmed(false);
    } finally {
      setDeleting(false);
    }
  };

  if (variant === "button") {
    return (
      <span className="inline-flex items-center gap-2">
        <button
          type="button"
          onClick={handleClick}
          disabled={busy || deleting}
          title={
            busy
              ? "Wait until generation finishes before deleting"
              : armed
                ? "Click again to confirm deletion"
                : "Delete this kit"
          }
          className={buttonStyles("secondary", "lg", armed ? "border-[#fecaca] text-[#dc2626] hover:bg-[#fef2f2]" : "")}
        >
          {deleting ? (
            <Loader2 size={15} aria-hidden className="animate-spin" />
          ) : (
            <Trash2 size={15} aria-hidden />
          )}
          {deleting ? "Deleting…" : armed ? "Confirm delete" : "Delete"}
        </button>
        {error && (
          <span role="alert" className="text-xs font-semibold text-[#dc2626]">
            {error}
          </span>
        )}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy || deleting}
      aria-label={
        busy ? "Cannot delete while generating" : armed ? `Confirm deletion` : `Delete kit`
      }
      title={
        error ?? (busy ? "Wait until generation finishes before deleting" : armed ? "Click again to confirm" : "Delete kit")
      }
      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full transition-all focus-ring ${
        armed
          ? "bg-[#fef2f2] text-[#dc2626] opacity-100"
          : "text-[#a0a6c2] opacity-0 hover:bg-[#fef2f2] hover:text-[#dc2626] group-hover:opacity-100 focus-visible:opacity-100"
      } ${error ? "opacity-100 text-[#dc2626]" : ""} disabled:opacity-40`}
    >
      {deleting ? (
        <Loader2 size={14} aria-hidden className="animate-spin" />
      ) : (
        <Trash2 size={14} aria-hidden />
      )}
    </button>
  );
}
