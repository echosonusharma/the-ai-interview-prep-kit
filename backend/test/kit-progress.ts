import assert from "node:assert";
import { stepToProgress, activeStage } from "../src/modules/kit/kit.progress.js";

assert.equal(stepToProgress("research").progress, 8);
assert.equal(stepToProgress("extract:done", "12 reqs").detail, "12 reqs");
assert.equal(stepToProgress("done").progress, 100);
assert.equal(activeStage("questions:done"), "questions");
assert.equal(activeStage(null), "research");

console.log("kit progress mapping checks passed");
