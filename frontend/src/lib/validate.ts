/**
 * Client-side mirrors of the backend Zod rules (backend/src/validators/kit.validator.ts):
 * text fields must be non-blank after trim, enums stay fixed sets.
 * Max lengths are frontend-only guards against absurd payloads.
 */

export const LIMITS = {
  prompt: 500,
  answerOutline: 3000,
  front: 300,
  back: 3000,
  requirement: 300,
  summary: 3000,
  whatTheyDo: 3000,
} as const;

/** Returns an error message, or null when the value is valid. */
export function textError(value: string, label: string, max: number): string | null {
  if (!value.trim()) return `${label} is required.`;
  if (value.trim().length > max)
    return `${label} must be under ${max} characters (now ${value.trim().length}).`;
  return null;
}
