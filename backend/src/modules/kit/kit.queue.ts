import { recoverStaleRunningJobs, claimNextQueuedKit, runKitGeneration } from "./kit.service.js";
import { Kit } from "../../models/kit.model.js";

const POLL_MS = 2000;
let started = false;
let loopRunning = false;

async function workerLoop() {
  if (loopRunning) return;
  loopRunning = true;
  try {
    for (;;) {
      await recoverStaleRunningJobs();
      const kit = await claimNextQueuedKit();
      if (!kit) break;
      console.log(`[kit-worker] processing ${kit._id.toString()} (owner ${kit.owner.toString()})`);
      try {
        await runKitGeneration(kit);
      } catch (err) {
        // Never let one kit kill the loop or strand the job as running:
        // mark failed only if still running (a conflicting writer may own it).
        console.error(`[kit-worker] generation threw for ${kit._id.toString()}:`, err);
        await Kit.updateOne(
          { _id: kit._id, "job.status": "running" },
          {
            $set: {
              "job.status": "failed",
              "job.error": "Generation crashed unexpectedly.",
            },
          }
        );
      }
    }
  } finally {
    loopRunning = false;
  }
}

function scheduleLoop() {
  void workerLoop();
}

/** Single global worker — one kit at a time, backed by MongoDB job status. */
export function startKitWorker() {
  if (started) return;
  started = true;
  console.log("[kit-worker] started (global queue, one kit at a time)");
  scheduleLoop();
  setInterval(scheduleLoop, POLL_MS).unref();
}

export function kickKitWorker() {
  scheduleLoop();
}
