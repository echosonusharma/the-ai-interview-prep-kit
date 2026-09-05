import { recoverStaleRunningJobs, claimNextQueuedKit, runKitGeneration } from "./kit.service.js";
import { logger } from "../../utils/logger.js";
import { Kit } from "../../models/kit.model.js";

const POLL_MS = 2000;
const DB_BACKOFF_MS = 10000;
let started = false;
let loopRunning = false;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function workerLoop() {
  if (loopRunning) return;
  loopRunning = true;
  try {
    for (;;) {
      let kit;
      try {
        await recoverStaleRunningJobs();
        kit = await claimNextQueuedKit();
      } catch (err) {
        // Back off and retry — an unhandled throw here would take the process down.
        logger.warn(
          `[kit-worker] queue poll failed, retrying in ${DB_BACKOFF_MS / 1000}s:`,
          err instanceof Error ? err.message : err
        );
        await sleep(DB_BACKOFF_MS);
        continue;
      }
      if (!kit) break;
      logger.info(`[kit-worker] processing ${kit._id.toString()} (owner ${kit.owner.toString()})`);
      try {
        await runKitGeneration(kit);
      } catch (err) {
        // Never let one kit kill the loop or strand the job as running:
        // mark failed only if still running (a conflicting writer may own it).
        logger.error(`[kit-worker] generation threw for ${kit._id.toString()}:`, err);
        try {
          await Kit.updateOne(
            { _id: kit._id, "job.status": "running" },
            {
              $set: {
                "job.status": "failed",
                "job.error": "Generation crashed unexpectedly.",
              },
            }
          );
        } catch (updateErr) {
          // Kit stays running; stale recovery requeues it once the DB is back.
          logger.error(`[kit-worker] failed-status write failed for ${kit._id.toString()}:`, updateErr);
        }
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
  logger.info("[kit-worker] started (global queue, one kit at a time)");
  scheduleLoop();
  setInterval(scheduleLoop, POLL_MS).unref();
}

export function kickKitWorker() {
  scheduleLoop();
}
