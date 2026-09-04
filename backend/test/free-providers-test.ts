import { z } from "zod";
import { ZenClient } from "../src/pipeline/llm/zen.js";
import { getZenModels } from "../src/config/env.js";

const schema = z.object({ answer: z.string().min(1) });
const prompt = {
  system: "You are a test assistant. Reply JSON only.",
  user: 'Say hello in JSON: {"answer":"hello world"}',
  maxOutputTokens: 500,
};

async function test(name: string, client: ZenClient, model: string) {
  console.log(`\n--- Testing ${name} (${model}) ---`);
  const t0 = Date.now();
  try {
    const { object } = await client.generateObject(prompt, schema, model);
    console.log(`✓ ${name} ok in ${Date.now() - t0}ms:`, object);
  } catch (e) {
    console.error(`✗ ${name} failed in ${Date.now() - t0}ms:`, e instanceof Error ? e.message.slice(0, 500) : e);
    if (e instanceof Error && (e as any).cause) console.error("cause:", String((e as any).cause).slice(0, 300));
  }
}

const zen = new ZenClient();
const models = getZenModels();

console.log(`Testing ${models.length} Zen model(s): ${models.join(", ")}`);
for (const model of models) {
  await test(`Zen:${model}`, zen, model);
}

console.log("\nDone");
