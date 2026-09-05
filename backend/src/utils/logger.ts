type Level = "debug" | "info" | "warn" | "error";

const order: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };

function minLevel(): Level {
  const v = (process.env.LOG_LEVEL ?? "").toLowerCase();
  if (v === "debug" || v === "info" || v === "warn" || v === "error") return v;
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

function format(level: Level, msg: string, extra: unknown[]): string {
  const parts = extra.map((e) => (e instanceof Error ? (e.stack ?? e.message) : typeof e === "string" ? e : JSON.stringify(e)));
  return `${new Date().toISOString()} [${level}] ${msg}${parts.length ? " " + parts.join(" ") : ""}`;
}

function emit(level: Level, msg: string, extra: unknown[]) {
  if (order[level] < order[minLevel()]) return;
  const line = format(level, msg, extra);
  if (level === "error") process.stderr.write(line + "\n");
  else process.stdout.write(line + "\n");
}

export const logger = {
  debug: (msg: string, ...extra: unknown[]) => emit("debug", msg, extra),
  info: (msg: string, ...extra: unknown[]) => emit("info", msg, extra),
  warn: (msg: string, ...extra: unknown[]) => emit("warn", msg, extra),
  error: (msg: string, ...extra: unknown[]) => emit("error", msg, extra),
};
