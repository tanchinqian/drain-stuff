import { parentPort, workerData } from "node:worker_threads";
import { runStorm } from "../../shared/src/physics/triage";
try {
  parentPort!.postMessage({
    result: runStorm(workerData.input, workerData.faults, workerData.trials,
      (progress) => parentPort!.postMessage({ progress })),
  });
} catch (error) {
  parentPort!.postMessage({
    error: error instanceof Error ? error.message : "Simulation failed",
  });
}
