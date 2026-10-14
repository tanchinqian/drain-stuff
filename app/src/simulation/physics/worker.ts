import { simulatePhysics } from './engine';
import { simulateCompost, type CompostOptions } from './compost';
import type { PhysicsConfig } from './config';
import type { Pattern, RainPoint } from './rainfall';
export type RunRequest = { id: number; config: PhysicsConfig } & (
  | { kind: 'hydraulic'; pattern: Pattern; drawn?: RainPoint[] }
  | { kind: 'compost'; options: CompostOptions }
);
// Worker has no DOM, store or mock DB dependency. Request IDs allow stale results to be ignored.
self.onmessage = (event: MessageEvent<RunRequest>) => {
  const request = event.data;
  try {
    const result =
      request.kind === 'hydraulic'
        ? simulatePhysics(request.config, request.pattern, request.drawn)
        : simulateCompost(request.config, request.options);
    self.postMessage({ id: request.id, ok: true, result });
  } catch (error) {
    self.postMessage({
      id: request.id,
      ok: false,
      error: error instanceof Error ? error.message : 'Simulation failed',
    });
  }
};
