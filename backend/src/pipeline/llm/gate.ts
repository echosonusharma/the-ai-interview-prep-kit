/** One in-flight request per model; optional global cap across all models. */
const activeByModel = new Map<string, number>();
const waitersByModel = new Map<string, Array<() => void>>();
let globalActive = 0;
const globalWaiters: Array<() => void> = [];

function releaseGlobal() {
  globalActive = Math.max(0, globalActive - 1);
  globalWaiters.shift()?.();
}

function releaseModel(model: string) {
  const next = Math.max(0, (activeByModel.get(model) ?? 1) - 1);
  activeByModel.set(model, next);
  waitersByModel.get(model)?.shift()?.();
}

export async function withModelGate<T>(model: string, globalMax: number, fn: () => Promise<T>): Promise<T> {
  const limit = Math.max(1, globalMax);
  if (globalActive >= limit) {
    await new Promise<void>((resolve) => globalWaiters.push(resolve));
  }
  if ((activeByModel.get(model) ?? 0) >= 1) {
    await new Promise<void>((resolve) => {
      const q = waitersByModel.get(model) ?? [];
      q.push(resolve);
      waitersByModel.set(model, q);
    });
  }
  globalActive += 1;
  activeByModel.set(model, (activeByModel.get(model) ?? 0) + 1);
  try {
    return await fn();
  } finally {
    releaseModel(model);
    releaseGlobal();
  }
}
