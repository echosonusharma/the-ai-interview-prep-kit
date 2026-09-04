import pc from "picocolors";

/** Semantic helpers for pipeline / evaluate output. */
export const logStyle = {
  bold: pc.bold,
  dim: pc.dim,
  step: pc.blue,
  elapsed: pc.gray,
  caseTag: (s: string) => pc.bold(pc.cyan(s)),
  ok: pc.green,
  fail: pc.red,
  warn: pc.yellow,
  info: pc.cyan,
  label: pc.magenta,
  model: pc.cyan,
  provider: pc.blue,
  detail: pc.gray,
  raw: pc.dim,
};
