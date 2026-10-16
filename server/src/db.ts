import Database from "better-sqlite3";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { createDataStore } from "../../shared/src/api/store";
import {
  generateMock,
  type Database as AppState,
} from "../../shared/src/api/mock/seed";
export class Repository {
  readonly uploadsDir: string;
  readonly sql: Database.Database;
  constructor(path: string) {
    this.uploadsDir = resolve(path === ':memory:' ? 'data' : dirname(path), 'uploads');
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.sql = new Database(path);
    this.sql.pragma("journal_mode = WAL");
    this.sql.pragma("foreign_keys = ON");
    this.sql.pragma("busy_timeout = 5000");
    this.sql.exec(
      "CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)",
    );
    const folder = new URL("../migrations/", import.meta.url);
    for (const file of readdirSync(folder)
      .filter((f) => /^\d+_.*\.sql$/.test(f))
      .sort()) {
      const version = Number(file.split("_")[0]);
      if (
        !this.sql
          .prepare("SELECT 1 FROM schema_migrations WHERE version=?")
          .get(version)
      )
        this.sql.transaction(() => {
          this.sql.exec(readFileSync(new URL(file, folder), "utf8"));
          this.sql
            .prepare("INSERT INTO schema_migrations VALUES (?, ?)")
            .run(version, new Date().toISOString());
        })();
    }
    this.sql
      .prepare(
        "UPDATE storm_runs SET status = 'failed', error = 'Server restarted before this run completed', updated_at = ? WHERE status IN ('queued','running')",
      )
      .run(new Date().toISOString());
  }
  seed() {
    if (this.sql.prepare("SELECT 1 FROM app_state WHERE id = 1").get()) {
      const state=this.load();
      if(!state.features.some(f=>f.id==='R1')) this.save(createDataStore(state,undefined,false).snapshot());
      return false;
    }
    this.save(createDataStore(generateMock()).snapshot());
    return true;
  }
  load(): AppState {
    const row = this.sql
      .prepare("SELECT body FROM app_state WHERE id = 1")
      .get() as { body: string } | undefined;
    if (!row) throw new Error("Database is not seeded. Run npm run seed.");
    return JSON.parse(row.body);
  }
  save(state: AppState) {
    this.sql
      .prepare(
        "INSERT INTO app_state VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET body=excluded.body, updated_at=excluded.updated_at",
      )
      .run(JSON.stringify(state), new Date().toISOString());
  }
  audit(
    actor: string,
    action: string,
    resource: string,
    note = "",
    detail: unknown = {},
  ) {
    this.sql
      .prepare("INSERT INTO audit VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(
        randomUUID(),
        new Date().toISOString(),
        actor,
        action,
        resource,
        note,
        JSON.stringify(detail),
      );
  }
  legacy(path: string, method: string, body: unknown, actor: string) {
    return this.sql.transaction(() => {
      const store = createDataStore(
        this.load(),
        (state) => this.save(state),
        false,
      );
      const result = store.request(path, method, body, actor);
      if (method === "POST")
        this.audit(actor, "Legacy update", path.split("?")[0], "", {
          request: body,
        });
      return result;
    })();
  }
  jsonRows<T>(table: "cases" | "guidance") {
    return (
      this.sql.prepare(`SELECT body FROM ${table} ORDER BY id`).all() as {
        body: string;
      }[]
    ).map((r) => JSON.parse(r.body) as T);
  }
  close() {
    this.sql.close();
  }
}
