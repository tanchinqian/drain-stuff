import { Worker } from "node:worker_threads";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import type { StormInput, StormResult, StormProgress } from "../../shared/src/contract";
import type { Fault, TrialDetail } from "../../shared/src/api/types";
import type { Repository } from "./db";
export class StormQueue {
  private active = 0;
  private pending: { start: () => void; reject: (error: Error) => void }[] = [];
  private workers = new Set<Worker>();
  private closed = false;
  private progress = new Map<string, StormProgress>();
  constructor(
    private repo: Repository,
    private timeoutMs = 180000,
  ) {}
  async calculate(
    input: StormInput,
    faults: Fault[],
    onStart?: () => void,
    trials: TrialDetail[] = this.repo.load().trials,
    onProgress?: (progress: StormProgress) => void,
  ): Promise<StormResult> {
    if (this.closed || this.pending.length + this.active >= 5)
      throw new Error(
        "Storm queue is full. Try again after the current runs finish.",
      );
    return new Promise((resolve, reject) => {
      const start = () => {
        this.active++;
        onStart?.();
        const worker = new Worker(
          fileURLToPath(new URL("../dist/storm-worker.js", import.meta.url)),
          {
            workerData: { input, faults, trials },
            resourceLimits: { maxOldGenerationSizeMb: 384 },
          },
        );
        this.workers.add(worker);
        let done = false;
        const finish = (error?: Error, result?: StormResult) => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          this.workers.delete(worker);
          void worker.terminate();
          this.active--;
          if (error) reject(error);
          else resolve(result!);
          if (!this.closed) this.pending.shift()?.start();
        };
        const timer = setTimeout(
          () => finish(new Error("Storm calculation timed out")),
          this.timeoutMs,
        );
        worker.on("message", (m) => {
          if (done) return;
          if (m.progress) onProgress?.(m.progress);
          else finish(m.error ? new Error(m.error) : undefined, m.result);
        });
        worker.once("error", (error) => finish(error));
        worker.once("exit", (code) => {
          if (!done) finish(new Error(`Storm worker stopped (${code})`));
        });
      };
      if (this.active < 1) start();
      else this.pending.push({ start, reject });
    });
  }
  enqueue(input: StormInput, faults: Fault[], actor: string) {
    if (this.closed || this.pending.length + this.active >= 5)
      throw new Error("Storm queue is full.");
    const trials = this.repo.load().trials;
    const id = randomUUID(),
      now = new Date().toISOString();
    this.repo.sql
      .prepare(
        "INSERT INTO storm_runs VALUES (?, ?, ?, ?, NULL, NULL, ?, ?, ?)",
      )
      .run(
        id,
        "queued",
        JSON.stringify(input),
        JSON.stringify({ faults, trials }),
        actor,
        now,
        now,
      );
    this.repo.audit(actor, "Storm requested", id, "", { input });
    void this.calculate(
      input,
      faults,
      () =>
        this.repo.sql
          .prepare("UPDATE storm_runs SET status='running' WHERE id=?")
          .run(id),
      trials,
      (progress) => this.progress.set(id, progress),
    )
      .then((result) => {
        this.progress.delete(id);
        if (!this.closed)
          this.repo.sql
            .prepare(
              "UPDATE storm_runs SET status='completed', result=?, updated_at=? WHERE id=?",
            )
            .run(JSON.stringify(result), new Date().toISOString(), id);
      })
      .catch((error) => {
        this.progress.delete(id);
        if (!this.closed)
          this.repo.sql
            .prepare(
              "UPDATE storm_runs SET status='failed', error=?, updated_at=? WHERE id=?",
            )
            .run(error.message, new Date().toISOString(), id);
      });
    return this.get(id)!;
  }
  get(id: string, statusOnly = false) {
    const row = this.repo.sql
      .prepare(statusOnly
        ? "SELECT id,status,input,NULL AS result,error,created_at,actor FROM storm_runs WHERE id=?"
        : "SELECT * FROM storm_runs WHERE id=?")
      .get(id) as Record<string, string> | undefined;
    return row
      ? {
          id,
          status: row.status,
          input: JSON.parse(row.input) as StormInput,
          result: row.result ? (JSON.parse(row.result) as StormResult) : null,
          error: row.error,
          createdAt: row.created_at,
          actor: row.actor,
          progress: this.progress.get(id) ?? null,
        }
      : undefined;
  }
  async close() {
    this.closed = true;
    for (const job of this.pending)
      job.reject(new Error("Server stopped before this run started"));
    this.pending = [];
    this.progress.clear();
    await Promise.all([...this.workers].map((w) => w.terminate()));
  }
}
