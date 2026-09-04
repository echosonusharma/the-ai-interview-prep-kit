import type { IKit } from "../../types/kit.types.js";
import { activeStage } from "./kit.progress.js";

export interface KitSummary {
  id: string;
  status: IKit["job"]["status"];
  progress: number;
  step: string | null;
  stage: string;
  company: string;
  role: string;
  companyUrl: string;
  days: number;
  queuePosition: number | null;
  error: IKit["job"]["error"];
  createdAt: string;
  updatedAt: string;
}

export interface KitDetail extends KitSummary {
  kit: Record<string, unknown> | null;
  warnings?: string[];
}

export function serializeKitSummary(kit: IKit, queuePosition: number | null = null): KitSummary {
  return {
    id: kit._id.toString(),
    status: kit.job.status,
    progress: kit.job.progress,
    step: kit.job.step,
    stage: activeStage(kit.job.step),
    company: kit.source.company || kit.input.companyUrl,
    role: kit.role.title || "Untitled role",
    companyUrl: kit.input.companyUrl,
    days: kit.input.days,
    queuePosition,
    error: kit.job.error,
    createdAt: kit.createdAt.toISOString(),
    updatedAt: kit.updatedAt.toISOString(),
  };
}

export function serializeKitDetail(kit: IKit, queuePosition: number | null = null): KitDetail {
  const summary = serializeKitSummary(kit, queuePosition);
  return {
    ...summary,
    kit: kit.job.status === "done" ? kit.toAppendixJSON() : null,
  };
}
