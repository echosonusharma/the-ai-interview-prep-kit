import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const dir = join(dirname(fileURLToPath(import.meta.url)));

function load(name: string): string {
  return readFileSync(join(dir, name), "utf8").trim();
}

export const PROMPTS = {
  gate: load("gate.system.md"),
  extractMeta: load("extract-meta.system.md"),
  extractReqs: load("extract-requirements.system.md"),
  brief: load("brief.system.md"),
  flashcards: load("flashcards.system.md"),
  questions: {
    technical: load("questions-technical.system.md"),
    behavioural: load("questions-behavioural.system.md"),
    "system-design": load("questions-system-design.system.md"),
    "company-fit": load("questions-company-fit.system.md"),
  } as const,
};
