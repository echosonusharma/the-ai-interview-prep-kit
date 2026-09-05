import { generateText as aiGenerateText, isStepCount } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { z } from "zod";
import { randomBytes } from "node:crypto";
import { salvageJsonOrThrow, type LlmClient, type ObjectPrompt } from "./client.js";
import { withModelGate } from "./gate.js";
import { env } from "../../config/env.js";
import { LLM_TOKEN_LIMITS } from "../../config/llm-tokens.js";
import { logStyle as s } from "../log.js";
import { logger } from "../../utils/logger.js";

if (typeof globalThis !== "undefined") {
  (globalThis as Record<string, unknown>).AI_SDK_LOG_WARNINGS = false;
}
process.env.AI_SDK_LOG_WARNINGS = "false";

const ZEN_BASE_URL = "https://opencode.ai/zen/v1";
const ZEN_API_KEY = env.OPENCODE_API_KEY;

function randomSuffix(len: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  return out;
}

const SESSION_ID = `ses_${randomSuffix(24)}`;
const PROJECT_ID = env.OPENCODE_PROJECT_ID;
const USER_AGENT = env.OPENCODE_USER_AGENT;

function zenFetch(input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]): Promise<Response> {
  const headers = new Headers((init?.headers as unknown as Record<string, string> | undefined) ?? undefined);
  headers.set("Authorization", `Bearer ${ZEN_API_KEY}`);
  headers.set("x-opencode-client", "cli");
  headers.set("x-opencode-project", PROJECT_ID);
  if (!headers.has("x-opencode-session")) headers.set("x-opencode-session", SESSION_ID);
  headers.set("x-opencode-request", `msg_${randomSuffix(26)}`);
  headers.set("User-Agent", USER_AGENT);
  if (!headers.has("content-type")) headers.set("content-type", "application/json");

  let body = init?.body;
  if (typeof body === "string" && body.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(body) as Record<string, unknown>;
      if (parsed.stream !== false) {
        parsed.stream = false;
        body = JSON.stringify(parsed);
      }
    } catch {
      /* leave body unchanged */
    }
  }

  return fetch(input, { ...init, headers, body });
}

function isMuseModel(model: string): boolean {
  return model.includes("muse-spark");
}

const JSON_ONLY_SUFFIX =
  "\n\nCRITICAL: Output must be raw JSON only — first character `{`, last character `}`. No markdown fences, no prose, no thinking, no explanation. Do not restate the schema or plan your answer. Emit the complete JSON object in one response.";

const BRIEF_ONLY_SUFFIX =
  "\n\nCRITICAL: Reply with ONLY two labeled sections — first line must be SUMMARY:, then WHAT_THEY_DO:. No thinking, no planning, no preamble. Write the complete answer in one response.";

function looksLikeProseOnly(text: string, instructions: string): boolean {
  if (!instructions.includes("# Extract")) return false;
  return !text.trim().startsWith("{");
}

/** Muse Responses API can spend most of the budget on reasoning — need a high ceiling. */
const MUSE_MIN_OUTPUT_TOKENS = LLM_TOKEN_LIMITS.MUSE_MIN;

type TextResult = Awaited<ReturnType<typeof aiGenerateText>>;

function extractResponseText(result: TextResult): string {
  if (result.text?.trim()) return result.text.trim();

  for (const step of result.steps ?? []) {
    if (step.text?.trim()) return step.text.trim();
    for (const block of step.content ?? []) {
      if (block.type === "text" && "text" in block && typeof block.text === "string" && block.text.trim()) {
        return block.text.trim();
      }
    }
  }

  for (const block of result.content ?? []) {
    if (block.type === "text" && "text" in block && typeof block.text === "string" && block.text.trim()) {
      return block.text.trim();
    }
  }

  return "";
}

function emptyResponseDetail(result: TextResult): string {
  const step = result.steps?.[0];
  const usage = step?.usage;
  const finish = step?.finishReason ?? "unknown";
  const reasoning = usage?.outputTokenDetails?.reasoningTokens;
  const textTok = usage?.outputTokenDetails?.textTokens;
  return `(empty response; finish=${finish}, textTokens=${textTok ?? "?"}, reasoningTokens=${reasoning ?? "?"})`;
}

export class ZenClient implements LlmClient {
  readonly provider = "zen" as const;
  private readonly chatGateway = createOpenAICompatible({
    name: "opencode",
    baseURL: ZEN_BASE_URL,
    apiKey: ZEN_API_KEY,
    headers: {
      Authorization: `Bearer ${ZEN_API_KEY}`,
      "x-opencode-client": "cli",
      "x-opencode-project": PROJECT_ID,
      "x-opencode-session": SESSION_ID,
      "User-Agent": USER_AGENT,
    },
    fetch: zenFetch as unknown as typeof fetch,
  });
  private readonly responsesGateway = createOpenAI({
    baseURL: ZEN_BASE_URL,
    apiKey: ZEN_API_KEY,
    headers: {
      Authorization: `Bearer ${ZEN_API_KEY}`,
      "x-opencode-client": "cli",
      "x-opencode-project": PROJECT_ID,
      "x-opencode-session": SESSION_ID,
      "User-Agent": USER_AGENT,
    },
    fetch: zenFetch as unknown as typeof fetch,
    name: "opencode",
  });

  private modelHandle(model: string) {
    if (isMuseModel(model)) {
      return (this.responsesGateway as unknown as { responses: (id: string) => unknown }).responses(model);
    }
    return this.chatGateway.chatModel(model);
  }

  private requestBase(prompt: ObjectPrompt, model: string, systemSuffix = "") {
    const isMuse = isMuseModel(model);
    const requested = prompt.maxOutputTokens ?? LLM_TOKEN_LIMITS.DEFAULT;
    // Zen chat + muse both use instructions+prompt (not system+prompt — SDK rejects system in messages).
    return {
      model: this.modelHandle(model) as never,
      instructions: `${prompt.system}${systemSuffix}`,
      prompt: prompt.user,
      maxOutputTokens: isMuse ? Math.max(requested, MUSE_MIN_OUTPUT_TOKENS) : requested,
      stopWhen: isStepCount(1),
      providerOptions: {
        openaiCompatible: { stream: false },
        openai: { stream: false },
      },
      abortSignal: AbortSignal.timeout(90_000),
    };
  }

  async generateText(prompt: ObjectPrompt, model: string) {
    return withModelGate(model, env.LLM_MAX_CONCURRENT, async () => {
      const isBrief = prompt.system.includes("# Research — Company Brief");
      // @ts-ignore
      const result = await aiGenerateText(this.requestBase(prompt, model, isBrief ? BRIEF_ONLY_SUFFIX : ""));
      const text = extractResponseText(result);
      if (!text.trim()) {
        throw new Error(`Empty model response. Raw output:\n${emptyResponseDetail(result)}`);
      }
      if (env.LLM_DEBUG_RAW) {
        logger.debug(`${s.label(`[zen/${s.model(model)}]`)} ${s.detail(`raw response (${text.length} chars):`)}\n${s.raw(text.slice(0, 2000))}`);
      }
      return { text, model };
    });
  }

  async generateObject<T>(prompt: ObjectPrompt, schema: z.ZodType<T>, model: string) {
    return withModelGate(model, env.LLM_MAX_CONCURRENT, async () => {
      // @ts-ignore
      const result = await aiGenerateText(this.requestBase(prompt, model, JSON_ONLY_SUFFIX));
      const text = extractResponseText(result);
      if (!text.trim()) {
        throw new Error(`No parseable JSON in model response. Raw output:\n${emptyResponseDetail(result)}`);
      }
      const instructions = `${prompt.system}${JSON_ONLY_SUFFIX}`;
      if (looksLikeProseOnly(text, instructions)) {
        const preview = text.trim().slice(0, 400);
        throw new Error(`No parseable JSON in model response (prose-only). Raw output:\n${preview}`);
      }
      if (env.LLM_DEBUG_RAW) {
        logger.debug(`${s.label(`[zen/${s.model(model)}]`)} ${s.detail(`raw response (${text.length} chars):`)}\n${s.raw(text.slice(0, 2000))}`);
      }
      return { object: schema.parse(salvageJsonOrThrow(text)) as T, model };
    });
  }
}
