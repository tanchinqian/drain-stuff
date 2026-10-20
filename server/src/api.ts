import { Hono } from "hono";
import { createFaultChat, FaultChatError, type OllamaConfig } from './faultChat';
import { faultChatInput } from '../../shared/src/faultChat';
import { forecastUrl, parseForecast, type ForecastResponse } from "../../shared/src/forecast";
import { cors } from "hono/cors";
import { bodyLimit } from "hono/body-limit";
import { secureHeaders } from "hono/secure-headers";
import { serveStatic } from "@hono/node-server/serve-static";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z, ZodError } from "zod";
import { Repository } from "./db";
import { StormQueue } from "./storms";
import {
  CONTRACT_VERSION,
  stormInput,
  overrideInput,
  lifecycleInput,
  caseInput,
  diagnosisInput,
  feedbackInput,
  escalationInput,
  type Escalation,
  type CaseRecord,
  type GuidanceRecord,
  type DiagnosisContext,
} from "../../shared/src/contract";
import { writeSchema, legacyReads } from "../../shared/src/api/validation";
export class ApiError extends Error {
  constructor(
    public status: 400 | 401 | 403 | 404 | 409 | 422 | 429 | 503,
    message: string,
  ) {
    super(message);
  }
}
const uuid = () => randomUUID();
import {
  stepLibrary,
  deterministicDiagnosis,
} from "../../shared/src/diagnosis";
import { transitions } from "../../shared/src/workflow";
import { deviceApi } from "./iot";
import { createDiagnosisService, type ProviderConfig } from "./diagnosis";
import { buildParts } from "../../shared/src/api/parts";
export interface ApiOptions {
  ollama?: OllamaConfig;
  ollamaFetch?: typeof fetch;
  llm?: ProviderConfig;
  diagnosisFetch?: typeof fetch;
  deviceSecret?: string;
  simSecret?: string;
  corsOrigins?: string[];
  seed?: boolean;
  warningsFetch?: typeof fetch;
  forecastFetch?: typeof fetch;
  rateLimit?: number;
}
export function createApi(repo: Repository, options: ApiOptions) {
  if (options.seed) repo.seed();
  const queue = new StormQueue(repo),
    app = new Hono<{ Variables: { actor: string } }>();
  const originAllowed = (origin: string, requestUrl: string) => {
    try {
      return (
        !origin ||
        (options.corsOrigins ?? []).includes(origin) ||
        new URL(origin).host === new URL(requestUrl).host
      );
    } catch {
      return false;
    }
  };
  app.use("*", secureHeaders());
  app.use(
    "/api/*",
    cors({
      origin: (origin, c) => (originAllowed(origin, c.req.url) ? origin : ""),
      allowHeaders: ["Content-Type", "X-Ingest-Key"],
      allowMethods: ["GET", "POST", "OPTIONS"],
      maxAge: 600,
    }),
  );
  app.use("/api/*", (c, next) =>
    bodyLimit({
      maxSize: c.req.path === "/api/v1/evidence" ? 7 * 1024 * 1024 : 128 * 1024,
      onError: (c) =>
        c.json(
          {
            error: {
              code: "PAYLOAD_TOO_LARGE",
              message: "Request exceeds the route's size limit.",
            },
          },
          413,
        ),
    })(c, next),
  );
  app.get("/health", (c) =>
    c.json({
      ok: true,
      contractVersion: CONTRACT_VERSION,
      seeded: !!repo.sql.prepare("SELECT 1 FROM app_state").get(),
    }),
  );
  app.use("/api/*", async (c, next) => {
    if (c.req.path === "/api/v1/ingest/lorawan") return next();
    const origin = c.req.header("Origin") ?? "";
    if (!originAllowed(origin, c.req.url))
      throw new ApiError(403, "Origin is not allowed");
    c.set("actor", "Demo visitor");
    await next();
  });
  const diagnosis = createDiagnosisService(
    options.llm ?? { provider: "none" },
    options.diagnosisFetch,
  );
  const faultChat = createFaultChat(options.ollama ?? { baseUrl: 'http://127.0.0.1:11434', model: 'llama3.2:latest' }, options.ollamaFetch);
  const iot = deviceApi(repo, {
    device: options.deviceSecret,
    simulated: options.simSecret,
  });
  app.route("/api/v1", iot.app);
  const buckets = new Map<string, { count: number; until: number }>();
  app.use("/api/v1/*", async (c, next) => {
    if (
      c.req.method === "POST" &&
      (/\/ai\//.test(c.req.path) || c.req.path.endsWith("/storm-runs"))
    ) {
      const key = c.req.path.includes("/ai/") ? "ai" : "storm",
        now = Date.now();
      const bucket = buckets.get(key);
      const value =
        bucket && bucket.until > now
          ? bucket
          : { count: 0, until: now + 60000 };
      buckets.set(key, value);
      if (++value.count > (options.rateLimit ?? (key === "storm" ? 6 : 20)))
        throw new ApiError(
          429,
          "Too many requests. Wait a minute and try again.",
        );
    }
    await next();
  });
  app.get('/api/v1/ai/fault-chat/status', async c => c.json(await faultChat.status()));
  app.post('/api/v1/ai/fault-chat', async c => {
    const input = faultChatInput.parse(await c.req.json());
    const saved = input.diagnosisId ? repo.sql.prepare("SELECT body FROM suggestions WHERE id=?").get(input.diagnosisId) as {body: string} | undefined : undefined;
    return c.json(await faultChat.answer(repo.load(), input, {
      cases: repo.jsonRows<CaseRecord>("cases"),
      guidance: repo.jsonRows<GuidanceRecord>("guidance"),
      diagnosis: saved ? JSON.parse(saved.body) : undefined,
    }));
  });
  const runOrThrow = (id: string, statusOnly = false) => {
    const run = queue.get(id, statusOnly);
    if (!run) throw new ApiError(404, "Storm run not found");
    return run;
  };
  app.post("/api/v1/storm-runs", async (c) =>
    c.json(
      queue.enqueue(
        stormInput.parse(await c.req.json()),
        repo.load().faults,
        c.get("actor"),
      ),
      202,
    ),
  );
  app.get("/api/v1/storm-runs/:id", (c) =>
    c.json(runOrThrow(c.req.param("id"), c.req.query("statusOnly") === "1")),
  );
  app.get("/api/v1/triage", (c) => {
    const run = runOrThrow(z.string().uuid().parse(c.req.query("stormRunId")));
    if (run.status !== "completed")
      throw new ApiError(409, "Wait for this storm run to finish");
    const overrides = repo.sql
      .prepare(
        "SELECT * FROM triage_overrides WHERE storm_run_id=? ORDER BY t,id",
      )
      .all(run.id) as {
      asset: string;
      position: number;
      reason: string;
      actor: string;
      t: string;
    }[];
    const rows = [...run.result!.rows];
    for (const override of overrides) {
      const index = rows.findIndex((r) => r.asset === override.asset);
      if (index >= 0)
        rows.splice(
          Math.min(override.position - 1, rows.length - 1),
          0,
          rows.splice(index, 1)[0],
        );
    }
    return c.json({
      stormRunId: run.id,
      rows: rows.map((r, i) => ({ ...r, rank: i + 1 })),
      robustness: run.result!.robustness,
      overrides: (
        overrides as ((typeof overrides)[number] & {
          id: string;
          storm_run_id: string;
        })[]
      ).map((r) => ({
        id: r.id,
        stormRunId: r.storm_run_id,
        asset: r.asset,
        position: r.position,
        reason: r.reason,
        actor: r.actor,
        t: r.t,
      })),
      label: "Relative ranking, not a prediction",
    });
  });
  app.post("/api/v1/triage/overrides", async (c) => {
    const input = overrideInput.parse(await c.req.json()),
      run = runOrThrow(input.stormRunId);
    if (
      !run.result?.rows.some((r) => r.asset === input.asset) ||
      input.position > run.result.rows.length
    )
      throw new ApiError(
        422,
        "Choose an asset and position in the completed run",
      );
    const id = uuid();
    repo.sql.transaction(() => {
      repo.sql
        .prepare("INSERT INTO triage_overrides VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run(
          id,
          run.id,
          input.asset,
          input.position,
          input.reason,
          c.get("actor"),
          new Date().toISOString(),
        );
      repo.audit(
        c.get("actor"),
        "Ranking overridden",
        input.asset,
        input.reason,
        input,
      );
    })();
    return c.json({ ok: true, id });
  });
  let forecastCache: { until: number; payload: ForecastResponse } | undefined;
  app.get("/api/v1/weather/forecast", async (c) => {
    if (forecastCache && forecastCache.until > Date.now()) return c.json(forecastCache.payload);
    try {
      const response = await (options.forecastFetch ?? fetch)(forecastUrl, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error("Forecast unavailable");
      const raw = await response.text();
      if (raw.length > 512000) throw new Error("Forecast too large");
      const payload = parseForecast(JSON.parse(raw));
      forecastCache = { until: Date.now() + 900000, payload };
      return c.json(payload);
    } catch {
      const payload = { available: false } as const;
      forecastCache = { until: Date.now() + 30000, payload };
      return c.json(payload);
    }
  });
  let warningCache: { until: number; payload: unknown } | undefined;
  app.get("/api/v1/weather/warnings", async (c) => {
    if (warningCache && warningCache.until > Date.now())
      return c.json(warningCache.payload as object);
    try {
      const response = await (options.warningsFetch ?? fetch)(
        "https://api.data.gov.my/weather/warning",
        { signal: AbortSignal.timeout(3000) },
      );
      if (!response.ok) throw new Error("Unavailable");
      const raw = await response.text();
      if (raw.length > 512000) throw new Error("Too large");
      const warnings = z
        .array(z.record(z.string(), z.unknown()))
        .max(1000)
        .parse(JSON.parse(raw));
      const payload = {
        available: true,
        warnings,
        source: "https://api.data.gov.my/weather/warning",
        fetchedAt: new Date().toISOString(),
      };
      warningCache = { until: Date.now() + 300000, payload };
      return c.json(payload);
    } catch {
      const payload = { available: false };
      warningCache = { until: Date.now() + 30000, payload };
      return c.json(payload);
    }
  });
  app.get("/api/v1/faults/:id/audit", (c) =>
    c.json(
      repo.sql
        .prepare(
          "SELECT id,t,actor,action,resource,note,detail FROM audit WHERE resource=? OR resource LIKE ? ORDER BY t,id",
        )
        .all(c.req.param("id"), "/faults/" + c.req.param("id") + "/%"),
    ),
  );
  app.post("/api/v1/faults/:id/:transition", async (c, next) => {
    const action = c.req.param("transition");
    if (
      !["confirm", "assign", "clear", "verify", "close", "reopen"].includes(
        action,
      )
    )
      return next();
    const input = lifecycleInput.parse(await c.req.json()),
      id = c.req.param("id");
    const initial = repo.load().faults.find((f) => f.id === id);
    if (!initial) throw new ApiError(404, "Fault not found");
    const transition = transitions[action],
      previous =
        initial.workOrder?.state ??
        (initial.status === "closed" ? "closed" : "detected");
    if (!transition.from.includes(previous))
      throw new ApiError(409, `Cannot ${action} a ${previous} fault`);
    if (action === "assign" && !input.assignee)
      throw new ApiError(422, "Name the crew or contractor");
    if (action === "assign") {
      const runs = repo.sql
        .prepare(
          "SELECT result,input FROM storm_runs WHERE status='completed' ORDER BY created_at DESC,id DESC",
        )
        .all() as { result: string; input: string }[];
      const latest = runs
        .filter((r) => !JSON.parse(r.input).options.previewUnconfirmed)
        .map((r) =>
          JSON.parse(r.result).rows.find(
            (row: { asset: string }) => row.asset === initial.featureId,
          ),
        )
        .find(Boolean);
      if (latest?.capacityLimited)
        throw new ApiError(
          409,
          "Capacity-limited asset. Escalate to the owner instead of assigning clearance.",
        );
    }
    let evidence: unknown = input.evidence;
    if (action === "verify") {
      if (!input.evidence)
        throw new ApiError(
          422,
          "Record a photo, sensor reading or storm re-run",
        );
      if (
        input.evidence.type === "photo" &&
        !existsSync(
          resolve(repo.uploadsDir, input.evidence.path.split("/").at(-1)!),
        )
      )
        throw new ApiError(422, "Upload the evidence photo first");
      if (input.evidence.type === "sensor") {
        const sensorId = input.evidence.sensorId,
          sensor = repo.load().sensors.find((s) => s.sensorId === sensorId);
        if (!sensor || sensor.ownerId !== initial.featureId)
          throw new ApiError(422, "Choose a registered sensor on this asset");
        if (sensor.status !== "ok" || input.evidence.unit !== sensor.unit)
          throw new ApiError(
            422,
            "Use a trusted sensor and its registered unit",
          );
      }
      if (input.evidence.type === "storm-rerun") {
        const run = runOrThrow(input.evidence.stormRunId),
          before = run.result?.rows.find((r) => r.asset === initial.featureId);
        if (!before || !before.faultIds.includes(id))
          throw new ApiError(
            422,
            "Choose a completed run that included this confirmed fault",
          );
        const stored = repo.sql
          .prepare("SELECT fault_snapshot FROM storm_runs WHERE id=?")
          .get(run.id) as { fault_snapshot: string };
        const snapshot = JSON.parse(stored.fault_snapshot) as
          | {
              faults: import("../../shared/src/api/types").Fault[];
              trials: import("../../shared/src/api/types").TrialDetail[];
            }
          | import("../../shared/src/api/types").Fault[];
        const originalFaults = Array.isArray(snapshot)
          ? snapshot
          : snapshot.faults;
        const originalTrials = Array.isArray(snapshot) ? [] : snapshot.trials;
        const after = await queue.calculate(
          {
            ...run.input,
            assets: [initial.featureId as "S1"],
            options: { ...run.input.options, robustness: false },
          },
          originalFaults.filter((f) => f.id !== id),
          undefined,
          originalTrials,
        );
        evidence = {
          ...input.evidence,
          before: before.asInstalled.summary,
          after: after.rows[0].asInstalled.summary,
        };
      }
    }
    const saved = repo.sql.transaction(() => {
      const state = repo.load(),
        fault = state.faults.find((f) => f.id === id)!;
      if ((fault.workOrder?.state ?? "detected") !== previous)
        throw new ApiError(
          409,
          "Fault changed while verification was running. Refresh and retry.",
        );
      fault.workOrder = {
        ...fault.workOrder,
        state: transition.to,
        ...(input.assignee ? { assignee: input.assignee } : {}),
        ...(action === "verify"
          ? { evidence: { type: input.evidence!.type, data: evidence } }
          : {}),
      };
      if (action === "reopen") fault.workOrder = { state: "detected" };
      fault.status =
        action === "close"
          ? "closed"
          : action === "reopen"
            ? "open"
            : "inspected";
      (fault.history ??= []).push({
        id: uuid(),
        t: new Date().toISOString(),
        user: c.get("actor"),
        action,
        note: input.note,
      });
      repo.save(state);
      repo.audit(c.get("actor"), action, id, input.note, {
        from: previous,
        to: transition.to,
        evidence,
      });
      return fault;
    })();
    return c.json(saved);
  });
  app.post("/api/v1/evidence", async (c) => {
    const input = z
      .object({ data: z.string().max(7 * 1024 * 1024) })
      .strict()
      .parse(await c.req.json());
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(input.data))
      throw new ApiError(422, "Choose a JPEG, PNG or WebP photo");
    const bytes = Buffer.from(input.data, "base64");
    const ext = bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      ? "png"
      : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        ? "jpg"
        : bytes.toString("ascii", 0, 4) === "RIFF" &&
            bytes.toString("ascii", 8, 12) === "WEBP"
          ? "webp"
          : null;
    if (!ext || bytes.length > 5 * 1024 * 1024)
      throw new ApiError(422, "Choose a JPEG, PNG or WebP photo under 5 MB");
    mkdirSync(repo.uploadsDir, { recursive: true });
    const name = uuid() + "." + ext;
    writeFileSync(resolve(repo.uploadsDir, name), bytes, { flag: "wx" });
    repo.audit(c.get("actor"), "Evidence uploaded", name, "", {
      bytes: bytes.length,
    });
    return c.json({ path: "/uploads/" + name }, 201);
  });
  app.get("/api/v1/evidence/:name", (c) => {
    const name = z
      .string()
      .regex(/^[a-f0-9-]{36}\.(png|jpg|webp)$/)
      .parse(c.req.param("name"));
    const path = resolve(repo.uploadsDir, name);
    if (!existsSync(path)) throw new ApiError(404, "Photo not found");
    return c.body(readFileSync(path), 200, {
      "Content-Type": name.endsWith(".jpg")
        ? "image/jpeg"
        : name.endsWith(".png")
          ? "image/png"
          : "image/webp",
      "Cache-Control": "private, no-store",
      "Content-Disposition": "inline",
    });
  });
  app.get("/api/v1/escalations", (c) =>
    c.json(
      (
        repo.sql.prepare("SELECT body FROM escalations").all() as {
          body: string;
        }[]
      ).map((r) => JSON.parse(r.body)),
    ),
  );
  app.post("/api/v1/escalations", async (c) => {
    const input = escalationInput.parse(await c.req.json()),
      run = runOrThrow(input.stormRunId);
    const row = run.result?.rows.find((r) => r.asset === input.asset);
    if (!row?.capacityLimited)
      throw new ApiError(
        422,
        "Choose a capacity-limited asset from a completed run",
      );
    const entry: Escalation = {
      ...input,
      id: uuid(),
      status: "recorded",
      evidence: row,
      actor: c.get("actor"),
      at: new Date().toISOString(),
      history: [],
    };
    repo.sql.transaction(() => {
      repo.sql
        .prepare("INSERT INTO escalations VALUES (?,?)")
        .run(entry.id, JSON.stringify(entry));
      repo.audit(
        c.get("actor"),
        "Escalated to owner",
        input.asset,
        input.note,
        {
          escalationId: entry.id,
          recipient: input.recipient,
          stormRunId: run.id,
        },
      );
    })();
    return c.json(entry, 201);
  });
  app.post("/api/v1/escalations/:id/status", async (c) => {
    const input = z
      .object({
        status: z.enum(["acknowledged", "resolved"]),
        note: z.string().trim().min(1).max(2000),
      })
      .strict()
      .parse(await c.req.json());
    const saved = repo.sql
      .prepare("SELECT body FROM escalations WHERE id=?")
      .get(c.req.param("id")) as { body: string } | undefined;
    if (!saved) throw new ApiError(404, "Escalation not found");
    const entry = JSON.parse(saved.body) as Escalation;
    if (entry.status === "resolved" || entry.status === input.status)
      throw new ApiError(409, "Choose the next escalation status");
    entry.status = input.status;
    entry.history.push({
      ...input,
      actor: c.get("actor"),
      at: new Date().toISOString(),
    });
    repo.sql.transaction(() => {
      repo.sql
        .prepare("UPDATE escalations SET body=? WHERE id=?")
        .run(JSON.stringify(entry), entry.id);
      repo.audit(
        c.get("actor"),
        "Escalation " + input.status,
        entry.asset,
        input.note,
        { escalationId: entry.id },
      );
    })();
    return c.json(entry);
  });
  app.get("/api/v1/cases", (c) => c.json(repo.jsonRows<CaseRecord>("cases")));
  app.get("/api/v1/cases/:id", (c) => {
    const row = repo
      .jsonRows<CaseRecord>("cases")
      .find((r) => r.id === c.req.param("id"));
    if (!row) throw new ApiError(404, "Case not found");
    return c.json(row);
  });
  app.post("/api/v1/cases", async (c) => {
    const input = caseInput.parse(await c.req.json()),
      state = repo.load(),
      fault = state.faults.find((f) => f.id === input.faultId);
    if (
      !fault ||
      fault.workOrder?.state !== "closed" ||
      !fault.workOrder.evidence
    )
      throw new ApiError(409, "Close a verified fault before adding its case");
    if (input.stepsTaken.some((id) => !stepLibrary[id]))
      throw new ApiError(422, "Choose steps from the draft library");
    const id = uuid(),
      item: CaseRecord = {
        id,
        assetType:
          state.features.find((f) => f.id === fault.featureId)?.kind ?? "inlet",
        part: fault.partId,
        ruleId: fault.ruleId,
        symptoms: fault.diagnosingInput,
        sensorFlags: Object.values(fault.sensorStatusesAtAlert),
        cause: input.cause,
        stepsTaken: input.stepsTaken,
        outcome: input.outcome,
        sourceLabel: fault.synthetic
          ? "Demo operator record"
          : "Operator record",
        sourceUrl: "/api/v1/cases/" + id,
        createdBy: c.get("actor"),
      };
    repo.sql.transaction(() => {
      repo.sql
        .prepare("INSERT INTO cases VALUES (?, ?, ?)")
        .run(id, fault.id, JSON.stringify(item));
      repo.audit(c.get("actor"), "Case recorded", fault.id, input.outcome, {
        caseId: id,
      });
    })();
    return c.json(item, 201);
  });
  app.get("/api/v1/guidance", (c) =>
    c.json(repo.jsonRows<GuidanceRecord>("guidance")),
  );
  app.get("/api/v1/ai/config", (c) =>
    c.json({
      promptVersion: diagnosis.version,
      model: options.llm?.model ?? null,
      configured: !!(options.llm?.provider !== 'none' && options.llm?.key && options.llm?.model),
      provider: diagnosis.provider,
      mode:
        options.llm?.key && options.llm.model && diagnosis.provider !== "none"
          ? "Provider adapter configured"
          : "Matched from cases",
    }),
  );
  app.get("/api/v1/ai/hints", (c) => {
    const state = repo.load();
    return c.json(
      Object.fromEntries(
        state.features.map((asset) => {
          const f = state.faults.find(
            (f) => f.featureId === asset.id && f.status !== "closed",
          );
          return [
            asset.id,
            f
              ? deterministicDiagnosis(
                  f,
                  asset.kind,
                  repo.jsonRows<CaseRecord>("cases"),
                  repo.jsonRows<GuidanceRecord>("guidance"),
                ).diagnosis
              : "No open fault for diagnosis",
          ];
        }),
      ),
    );
  });
  app.post("/api/v1/ai/diagnose", async (c) => {
    const { faultId, partContext } = diagnosisInput.parse(await c.req.json()),
      state = repo.load(),
      fault = state.faults.find((f) => f.id === faultId);
    if (!fault) throw new ApiError(404, "Fault not found");
    let context: DiagnosisContext | undefined;
    if (partContext) {
      if (partContext.ownerId !== fault.featureId || partContext.partId !== fault.partId)
        throw new ApiError(422, "The diagnosis must refer to the selected fault's asset and part.");
      const part = buildParts(fault.featureId, state.sensors, state.faults,
        state.batches.some((batch) => batch.id === fault.featureId))
        .find((part) => part.partId === fault.partId);
      if (!part) throw new ApiError(422, "Part not found for this asset.");
      context = { ownerId: fault.featureId, part: {
        name: part.name, purpose: part.purpose, typicalFailure: part.typicalFailure, installed: part.installed,
      }, model: partContext.model };
    }
    const suggestion = await diagnosis.diagnose(
      fault,
      state.features.find((f) => f.id === fault.featureId)?.kind ?? "inlet",
      repo.jsonRows<CaseRecord>("cases"),
      repo.jsonRows<GuidanceRecord>("guidance"),
      state.sensors,
      context,
    );
    repo.sql.transaction(() => {
      repo.sql
        .prepare("INSERT INTO suggestions VALUES (?, ?, ?, ?)")
        .run(
          suggestion.id,
          faultId,
          JSON.stringify(suggestion),
          new Date().toISOString(),
        );
      repo.audit(c.get("actor"), "Diagnosis requested", faultId, "", {
        suggestionId: suggestion.id,
      });
    })();
    return c.json(suggestion);
  });
  app.post("/api/v1/ai/feedback", async (c) => {
    const input = feedbackInput.parse(await c.req.json());
    const suggestion = repo.sql.prepare("SELECT fault_id FROM suggestions WHERE id=?").get(input.suggestionId) as {fault_id:string}|undefined;
    if (!suggestion) throw new ApiError(404,"Suggestion not found");
    if (input.choice !== 'accept' && !input.note.trim()) throw new ApiError(422,'Add a reason to edit or reject the suggestion');
    if (input.rankedStepIds?.some((id) => !stepLibrary[id]))
      throw new ApiError(422, "Only draft library step IDs are accepted");
    repo.sql.transaction(() => {
      repo.sql
        .prepare("INSERT INTO ai_feedback VALUES (?, ?, ?, ?, ?)")
        .run(
          uuid(),
          input.suggestionId,
          JSON.stringify(input),
          c.get("actor"),
          new Date().toISOString(),
        );
      repo.audit(
        c.get("actor"),
        "Diagnosis " + input.choice,
        suggestion.fault_id,
        input.note,
        {suggestionId: input.suggestionId},
      );
      const state = repo.load(), fault = state.faults.find(f => f.id === suggestion.fault_id);
      if (fault) {
        (fault.history ??= []).push({id:uuid(),t:new Date().toISOString(),user:c.get("actor"),action:"Diagnosis " + input.choice,note:input.note});
        repo.save(state);
      }
    })();
    return c.json({ ok: true });
  });
  app.all("/api/v1/*", async (c) => {
    const path = c.req.path.slice("/api/v1".length),
      method = c.req.method;
    if (method === "GET" && legacyReads.some((pattern) => pattern.test(path))) {
      if (path.startsWith("/sensors")) iot.refreshMissing();
      const query = c.req.query();
      for (const key of ["from", "to"])
        if (query[key] && !Number.isFinite(Date.parse(query[key])))
          throw new ApiError(422, "Use a valid date range");
      if (query.from && query.to && query.from > query.to)
        throw new ApiError(422, "Start must be before end");
      if (path === "/readings" && !query.featureId)
        throw new ApiError(422, "Choose a featureId");
      if (query.zone && !["A", "B", "C", "D"].includes(query.zone))
        throw new ApiError(422, "Unknown zone");
      if (
        query.status &&
        !(
          path === "/faults"
            ? ["open", "inspected", "closed"]
            : ["ok", "suspect", "offline"]
        ).includes(query.status)
      )
        throw new ApiError(422, "Unknown status");
      return c.json(
        repo.legacy(
          path + new URL(c.req.url).search,
          method,
          undefined,
          c.get("actor"),
        ) as object,
      );
    }
    const schema = writeSchema(path);
    if (method === "POST" && schema) {
      const body = schema.parse(await c.req.json()) as Record<string, unknown>;
      const id = path.split("/")[2];
      const fault = repo.load().faults.find((f) => f.id === id);
      if (
        path.endsWith("/status") &&
        body.status === "closed" &&
        fault?.workOrder?.state !== "verified"
      )
        throw new ApiError(
          409,
          "Verify the completed work before closing this fault",
        );
      if (path.endsWith("/actions") && body.action === "cleaned")
        throw new ApiError(
          409,
          "Record clearance and verification through the work-order lifecycle",
        );
      if (path === "/faults" || path.endsWith("/status"))
        body.user = c.get("actor");
      if (path.endsWith("/allocate")) body.appliedBy = c.get("actor");
      return c.json(repo.legacy(path, method, body, c.get("actor")) as object);
    }
    if (method === "POST" && path === "/batches")
      throw new ApiError(
        403,
        "Legacy demo batch creation is disabled on the server",
      );
    throw new ApiError(404, "Endpoint not found");
  });
  app.use("/*", serveStatic({ root: "./app/dist" }));
  app.get("*", async (c) => {
    if (c.req.path.startsWith("/api"))
      throw new ApiError(404, "Endpoint not found");
    return serveStatic({ path: "./app/dist/index.html" })(c, async () => {});
  });
  app.onError((error, c) => {
    if (error instanceof ZodError)
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: error.issues.map((i) => i.message).join("; "),
          },
        },
        422,
      );
    if (error instanceof FaultChatError)
      return c.json({ error: { code: 'OLLAMA_UNAVAILABLE', message: error.message } }, error.status);
    if (error instanceof ApiError)
      return c.json(
        { error: { code: "REQUEST_ERROR", message: error.message } },
        error.status,
      );
    if (error instanceof SyntaxError)
      return c.json(
        { error: { code: "INVALID_JSON", message: "Send valid JSON" } },
        400,
      );
    if (/not found|Record not found/.test(error.message))
      return c.json(
        { error: { code: "NOT_FOUND", message: error.message } },
        404,
      );
    if (/UNIQUE constraint/.test(error.message))
      return c.json(
        { error: { code: "CONFLICT", message: "This record already exists" } },
        409,
      );
    if (/queue is full/.test(error.message))
      return c.json({ error: { code: "BUSY", message: error.message } }, 503);
    if (
      /Enter |Choose |Record |Complete |Confirm |requires|locked|cap|guardrail|dose|arm|pending|contamination|maturity|before/.test(
        error.message,
      )
    )
      return c.json(
        { error: { code: "VALIDATION_ERROR", message: error.message } },
        422,
      );
    return c.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Request could not be completed. Check server setup.",
        },
      },
      500,
    );
  });
  return {
    app,
    queue,
    close: async () => {
      await queue.close();
      repo.close();
    },
  };
}
