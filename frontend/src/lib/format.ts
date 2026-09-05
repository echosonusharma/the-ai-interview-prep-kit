/** Human-friendly durations. Raw minutes stay backend-internal. */
export function formatDuration(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes) || totalMinutes < 0) return "-";
  const mins = Math.round(totalMinutes);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** Focus strings from generation embed raw minutes ("… · 300 min"). Strip for display. */
export function cleanFocus(focus: string): string {
  return focus
    .replace(/\s*[·•\-–—]\s*\d+\s*min(utes)?\s*$/i, "")
    .trim();
}

