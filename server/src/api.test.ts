import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { Repository } from "./db";
import { createApi } from "./api";
import { createDataStore } from "../../shared/src/api/store";
const token = "test-operator-token-with-32-characters";
let repo: Repository, api: ReturnType<typeof createApi>;
const auth = {
  Authorization: "Bearer " + token,
  "X-Operator-Name": "Test coordinator",
};
beforeEach(() => {
  repo = new Repository(":memory:");
  api = createApi(repo, {
    token,
    seed: true,
    rateLimit: 100,
    warningsFetch: vi.fn(async () => {
      throw new Error("offline");
    }) as typeof fetch,
  });
});
afterEach(async () => {
  await api.close();
});
async function request(
  path: string,
  body?: unknown,
  headers: Record<string, string> = auth,
) {
  const response = await api.app.request("/api/v1" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...headers,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { response, data: (await response.json()) as any };
}
const shape = (value: any): unknown =>
  value === null
    ? "null"
    : Array.isArray(value)
      ? value.length
        ? [shape(value[0])]
        : []
      : typeof value === "object"
        ? Object.fromEntries(
            Object.entries(value).map(([k, v]) => [k, shape(v)]),
          )
        : typeof value;
const fixtures = JSON.parse(
  readFileSync("docs/contract-examples.v3.json", "utf8"),
);
const paths = Object.keys(fixtures)
  .filter((key) => key.startsWith("GET "))
  .map((key) => key.slice(4));
for (const path of paths)
  test("legacy GET contract: " + path, async () => {
    const mock = createDataStore(repo.load());
    const { response, data } = await request(path);
    expect(response.status).toBe(200);
    expect(shape(data)).toEqual(
      shape(JSON.parse(JSON.stringify(mock.request(path)))),
    );
    const original = fixtures["GET " + path];
    // Version 4 adds optional workOrder, while retaining every version-3 field shape.
    const required = (actual: any, sample: any) => {
      if (sample === null) return;
      if (Array.isArray(sample)) {
        if (sample.length && actual.length) required(actual[0], sample[0]);
        return;
      }
      if (typeof sample === "object")
        for (const key of Object.keys(sample)) {
          expect(actual).toHaveProperty(key);
          required(actual[key], sample[key]);
        }
      else expect(typeof actual).toBe(typeof sample);
    };
    required(data, original);
  });
test("auth, actor, CORS, malformed JSON and request limit", async () => {
  expect((await request("/config", undefined, {})).response.status).toBe(401);
  expect(
    (await request("/config", undefined, { Authorization: token })).response
      .status,
  ).toBe(401);
  expect(
    (await request("/faults", {}, { Authorization: "Bearer " + token }))
      .response.status,
  ).toBe(422);
  expect(
    (
      await request("/config", undefined, {
        ...auth,
        Origin: "https://evil.example",
      })
    ).response.status,
  ).toBe(403);
  expect(
    (
      await api.app.request("/api/v1/faults", {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: "{",
      })
    ).status,
  ).toBe(400);
  expect(
    (await request("/ai/diagnose", { faultId: "x".repeat(140000) })).response
      .status,
  ).toBe(413);
  expect((await request("/sensors?zone=Z")).response.status).toBe(422);
  expect((await request("/absent")).response.status).toBe(404);
  expect((await api.app.request("/health")).status).toBe(200);
});
test("legacy writes all persist and audit the header actor", async () => {
  const state = repo.load(),
    batch = state.batches[0],
    trial = state.trials.find((t) => t.baselineDone)!;
  const calls: [string, unknown][] = [
    [
      "/faults",
      {
        featureId: "S1",
        partId: "inlet",
        type: "blockage",
        severity: 3,
        note: "Visible debris",
        user: "Forged name",
      },
    ],
    ["/faults/F-001/status", { status: "inspected", user: "Forged name" }],
    ["/faults/F-001/actions", { action: "inspected" }],
    ["/faults/F-001/actions", { action: "work_order" }],
    [
      "/trials/" + trial.featureId + "/tests",
      {
        phase: "retest",
        metric: "infiltration_mm_hr",
        value: 20,
        pointId: trial.featureId + "-P1",
        n: 1,
      },
    ],
    ["/trials/" + trial.featureId + "/checks", trial.guardrails],
    ["/trials/" + trial.featureId + "/guardrails", trial.guardrails],
    ["/batches/" + batch.id + "/readings", { tempC: 30, moisturePct: 50 }],
    ["/batches/" + batch.id + "/checks", batch.checks],
  ];
  for (const [path, body] of calls) {
    const result = await request(path, body);
    expect(result.response.status, JSON.stringify(result.data)).toBe(200);
  }
  expect(repo.sql.prepare("SELECT count(*) AS n FROM audit").get()).toEqual({
    n: calls.length,
  });
  expect(
    repo.sql
      .prepare("SELECT count(*) AS n FROM audit WHERE actor='Forged name'")
      .get(),
  ).toEqual({ n: 0 });
  expect(
    (await request("/faults/F-001/status", { status: "closed", user: "Test" }))
      .response.status,
  ).toBe(409);
  expect(
    (await request("/faults/F-001/actions", { action: "cleaned" })).response
      .status,
  ).toBe(409);
  expect((await request("/batches", {})).response.status).toBe(403);
});
test("allocation enforces maturity, dose and recorded actor", async () => {
  const state = repo.load(),
    batch = state.batches[0],
    trial = state.trials.find((t) => t.featureId === "S1")!;
  batch.checks = {
    ...batch.checks,
    intakeChecked: true,
    plasticsFound: false,
    glassFound: false,
    ambientReached: true,
    ambientTempC: 30,
    didNotReheat: true,
    manualMaturity: true,
  };
  batch.readings.push({
    t: new Date().toISOString(),
    tempC: 30,
    moisturePct: 50,
  });
  trial.guardrails.noOpenDrainContact = true;
  repo.save(state);
  const input = {
    featureId: "S1",
    doseLabel: "Pilot dose B",
    lPerM2: 15,
    amendedDepthM: 0.15,
    appliedBy: "Forged name",
  };
  expect(
    (await request("/batches/" + batch.id + "/allocate", input)).response
      .status,
  ).toBe(200);
  expect(repo.load().trials.find((t) => t.featureId === "S1")!.appliedBy).toBe(
    "Test coordinator",
  );
  expect(
    (
      await request("/batches/" + batch.id + "/allocate", {
        ...input,
        lPerM2: 40,
      })
    ).response.status,
  ).toBe(422);
});
async function storm() {
  const response = await request("/storm-runs", {
    custom: { peakMmHr: 100, durationMinutes: 2 },
    assets: ["S1"],
    options: { robustness: false, recoveryMinutes: 0 },
  });
  expect(response.response.status).toBe(202);
  for (let i = 0; i < 200; i++) {
    const job = (await request("/storm-runs/" + response.data.id)).data;
    if (job.status === "completed") return job;
    if (job.status === "failed") throw new Error(job.error);
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error("Storm worker did not finish");
}
test("worker storm, ranked three modes, override and warning fallback", async () => {
  const job = await storm();
  const { data: board, response } = await request(
    "/triage?stormRunId=" + job.id,
  );
  expect(response.status).toBe(200);
  expect(board.rows).toHaveLength(1);
  expect(Object.keys(board.rows[0])).toEqual(
    expect.arrayContaining([
      "asInstalled",
      "ifCleared",
      "capacityLimit",
      "capacityLimited",
    ]),
  );
  expect(board.rows[0].asInstalled.summary.maxRelativeError).toBeLessThan(1e-6);
  expect(
    (
      await request("/triage/overrides", {
        stormRunId: job.id,
        asset: "S1",
        position: 1,
        reason: "Crew already on this street",
      })
    ).response.status,
  ).toBe(200);
  expect(
    (await request("/triage?stormRunId=" + job.id)).data.overrides,
  ).toHaveLength(1);
  expect((await request("/weather/warnings")).data).toEqual({
    available: false,
  });
  expect((await request("/storm-runs/no-such-id")).response.status).toBe(404);
  expect(
    (await request("/storm-runs", { preset: "heavy", assets: ["T1"] })).response
      .status,
  ).toBe(422);
});
test("six-state lifecycle, evidence, audit, case, fallback diagnosis and feedback", async () => {
  const { data: fault } = await request("/faults", {
    featureId: "S1",
    partId: "inlet",
    type: "blockage",
    severity: 3,
    note: "Debris visible at opening",
  });
  expect(fault.workOrder.state).toBe("detected");
  expect(
    (await request("/faults/" + fault.id + "/close", { note: "No proof" }))
      .response.status,
  ).toBe(409);
  expect(
    (
      await request("/faults/" + fault.id + "/confirm", {
        note: "Checked from surface",
      })
    ).data.workOrder.state,
  ).toBe("confirmed");
  const run = await storm();
  expect(run.result.rows[0].asInstalled.config.values.inletOpen.value).toBe(
    0.1,
  );
  expect(run.result.rows[0].ifCleared.config.values.inletOpen.value).toBe(1);
  expect(
    (
      await request("/faults/" + fault.id + "/assign", {
        note: "Named crew",
        assignee: "Crew A",
      })
    ).data.workOrder.state,
  ).toBe("assigned");
  expect(
    (
      await request("/faults/" + fault.id + "/clear", {
        note: "Crew recorded clearance",
      })
    ).data.workOrder.state,
  ).toBe("cleared");
  expect(
    (await request("/faults/" + fault.id + "/verify", { note: "No evidence" }))
      .response.status,
  ).toBe(422);
  const verified = await request("/faults/" + fault.id + "/verify", {
    note: "Same-storm re-run recorded",
    evidence: { type: "storm-rerun", stormRunId: run.id },
  });
  expect(verified.response.status, JSON.stringify(verified.data)).toBe(200);
  expect(verified.data.workOrder.evidence.data).toHaveProperty("before");
  expect(verified.data.workOrder.evidence.data).toHaveProperty("after");
  expect(
    (
      await request("/faults/" + fault.id + "/close", {
        note: "Verification reviewed",
      })
    ).data.workOrder.state,
  ).toBe("closed");
  expect((await request("/faults/" + fault.id + "/audit")).data).toHaveLength(
    5,
  );
  const recorded = await request("/cases", {
    faultId: fault.id,
    cause: "Inlet debris",
    outcome: "Cleared and checked",
    stepsTaken: ["STEP-blockage-1"],
  });
  expect(recorded.response.status).toBe(201);
  expect(recorded.data.sourceUrl).toContain("/cases/");
  expect((await request("/cases")).data).toHaveLength(10);
  expect((await request("/cases/" + recorded.data.id)).response.status).toBe(
    200,
  );
  expect((await request("/guidance")).data).toHaveLength(3);
  const suggestion = await request("/ai/diagnose", { faultId: fault.id });
  expect(suggestion.response.status).toBe(200);
  expect(suggestion.data.mode).toBe("Matched from cases");
  expect(suggestion.data.citedCaseIds).toContain(recorded.data.id);
  expect(
    (
      await request("/ai/feedback", {
        suggestionId: suggestion.data.id,
        choice: "accept",
        note: "Reviewed",
      })
    ).response.status,
  ).toBe(200);
  expect(
    (
      await request("/ai/feedback", {
        suggestionId: suggestion.data.id,
        choice: "edit",
        note: "Invalid step",
        rankedStepIds: ["invented"],
      })
    ).response.status,
  ).toBe(422);
  expect(
    (
      await request("/faults/" + fault.id + "/reopen", {
        note: "New observation",
      })
    ).data.workOrder.state,
  ).toBe("detected");
});
test("rate limits, safety of missing diagnosis and failed writes", async () => {
  const suggestion = await request("/ai/diagnose", { faultId: "F-002" });
  expect(suggestion.data.insufficientInformation).toBe(true);
  expect(suggestion.data.rankedStepIds).toEqual([]);
  expect(
    (
      await request("/faults", {
        featureId: "S1",
        partId: "inlet",
        type: "blockage",
        severity: 2.5,
        note: "Invalid",
      })
    ).response.status,
  ).toBe(422);
  const before = repo.load();
  expect(
    (
      await request("/trials/S1/tests", {
        phase: "retest",
        metric: "infiltration_mm_hr",
        value: -1,
        pointId: "S1-P1",
        n: 1,
      })
    ).response.status,
  ).toBe(422);
  expect(repo.load()).toEqual(before);
  await api.close();
  repo = new Repository(":memory:");
  api = createApi(repo, { token, seed: true, rateLimit: 1 });
  expect(
    (await request("/ai/diagnose", { faultId: "F-001" })).response.status,
  ).toBe(200);
  expect(
    (await request("/ai/diagnose", { faultId: "F-001" })).response.status,
  ).toBe(429);
});
test("SQLite survives restart and audit cannot be edited", async () => {
  const dir = mkdtempSync(join(tmpdir(), "drain-api-")),
    path = join(dir, "state.sqlite");
  const disk = new Repository(path);
  disk.seed();
  disk.audit("Operator", "Test", "S1");
  const state = disk.load();
  state.faults[0].diagnosingInput = "Persisted check";
  disk.save(state);
  disk.close();
  const reopened = new Repository(path);
  expect(reopened.seed()).toBe(false);
  expect(reopened.load().faults[0].diagnosingInput).toBe("Persisted check");
  expect(() => reopened.sql.prepare("DELETE FROM audit").run()).toThrow(
    "append-only",
  );
  reopened.close();
  expect(dirname(resolve(dir))).toBe(resolve(tmpdir()));
  expect(basename(dir).startsWith("drain-api-")).toBe(true);
  rmSync(dir, { recursive: true, force: true });
});

test("new endpoints keep the same JSON shapes in the offline adapter", async () => {
  const { createOfflineApi } = await import("../../shared/src/offlineApi");
  const offline = createOfflineApi(createDataStore(repo.load()));
  const input = {
    custom: { peakMmHr: 40, durationMinutes: 1 },
    assets: ["I1"],
    options: { robustness: false, recoveryMinutes: 0 },
  };
  const wire = (v: unknown) => shape(JSON.parse(JSON.stringify(v)));
  const remote = (await request("/storm-runs", input)).data,
    local = (await offline("/storm-runs", "POST", input)) as any;
  expect(wire(remote)).toEqual(wire(local));
  for (let i = 0; i < 200; i++) {
    const r = (await request("/storm-runs/" + remote.id)).data,
      l = (await offline("/storm-runs/" + local.id, "GET")) as any;
    if (r.status === "completed" && l.status === "completed") {
      expect(wire(r)).toEqual(wire(l));
      break;
    }
    if (i === 199) throw new Error("Parity storm did not complete");
    await new Promise((r) => setTimeout(r, 20));
  }
  const override = { asset: "I1", position: 1, reason: "Crew availability" };
  const rOverride = (
    await request("/triage/overrides", { ...override, stormRunId: remote.id })
  ).data;
  const lOverride = await offline("/triage/overrides", "POST", {
    ...override,
    stormRunId: local.id,
  });
  expect(wire(rOverride)).toEqual(wire(lOverride));
  expect(wire((await request("/triage?stormRunId=" + remote.id)).data)).toEqual(
    wire(await offline("/triage?stormRunId=" + local.id, "GET")),
  );
  for (const path of ["/cases", "/guidance", "/weather/warnings"])
    expect(wire((await request(path)).data)).toEqual(
      wire(await offline(path, "GET")),
    );
  const a = (await request("/ai/diagnose", { faultId: "F-001" })).data,
    b = (await offline("/ai/diagnose", "POST", { faultId: "F-001" })) as any;
  expect(wire(a)).toEqual(wire(b));
  expect(
    wire(
      (
        await request("/ai/feedback", {
          suggestionId: a.id,
          choice: "reject",
          note: "Need inspection",
        })
      ).data,
    ),
  ).toEqual(
    wire(
      await offline("/ai/feedback", "POST", {
        suggestionId: b.id,
        choice: "reject",
        note: "Need inspection",
      }),
    ),
  );
});
test("sensor/photo evidence checks cannot be skipped", async () => {
  const { data: fault } = await request("/faults", {
    featureId: "S1",
    partId: "inlet",
    type: "blockage",
    severity: 2,
    note: "Debris",
  });
  const path = "/faults/" + fault.id;
  for (const action of ["confirm", "assign", "clear"])
    expect(
      (
        await request(path + "/" + action, {
          note: "Recorded",
          ...(action === "assign" ? { assignee: "Crew A" } : {}),
        })
      ).response.status,
    ).toBe(200);
  expect(
    (
      await request(path + "/verify", {
        note: "Photo missing",
        evidence: { type: "photo", path: "/uploads/missing.jpg" },
      })
    ).response.status,
  ).toBe(422);
  expect(
    (
      await request(path + "/verify", {
        note: "Wrong asset",
        evidence: {
          type: "sensor",
          sensorId: "missing",
          value: 1,
          unit: "mm/h",
        },
      })
    ).response.status,
  ).toBe(422);
  const sensor = repo
    .load()
    .sensors.find(
      (s) => s.ownerId === "S1" && s.status === "ok" && s.lastValue !== null,
    )!;
  expect(
    (
      await request(path + "/verify", {
        note: "Compared registered reading",
        evidence: {
          type: "sensor",
          sensorId: sensor.sensorId,
          value: sensor.lastValue!,
          unit: sensor.unit,
        },
      })
    ).response.status,
  ).toBe(200);
});
test("warning proxy validates and caches a successful upstream response", async () => {
  await api.close();
  repo = new Repository(":memory:");
  const upstream = vi.fn(
    async () =>
      new Response(
        JSON.stringify([{ heading: "Test warning", issued: "2026-10-16" }]),
      ),
  );
  api = createApi(repo, {
    token,
    seed: true,
    warningsFetch: upstream as typeof fetch,
  });
  const result = await request("/weather/warnings");
  expect(result.data.available).toBe(true);
  expect(result.data.warnings).toHaveLength(1);
  await request("/weather/warnings");
  expect(upstream).toHaveBeenCalledTimes(1);
});

test("server reads preserve saved sensor values and observation times", async () => {
  const state = repo.load();
  state.sensors[0].lastValue = 123.45;
  state.sensors[0].lastAt = "2026-01-01T00:00:00.000Z";
  repo.save(state);
  const saved = await request("/sensors/" + state.sensors[0].sensorId);
  expect(saved.data.lastValue).toBe(123.45);
  expect(saved.data.lastAt).toBe("2026-01-01T00:00:00.000Z");
  expect(repo.load().faults.map(f=>f.workOrder?.state)).toEqual(state.faults.map(f=>f.workOrder?.state));
});
test('photo evidence stores bounded images and rejects active content',async()=>{
  expect((await request('/evidence',{data:Buffer.from('<svg/>').toString('base64')})).response.status).toBe(422);
  const image='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jO1sAAAAASUVORK5CYII=';
  const saved=await request('/evidence',{data:image});
  expect(saved.response.status).toBe(201);
  const name=saved.data.path.split('/').at(-1),path=resolve(repo.uploadsDir,name);
  expect(dirname(path)).toBe(repo.uploadsDir);
  try { const photo=await api.app.request('/api/v1/evidence/'+name,{headers:auth});expect(photo.status).toBe(200);expect(photo.headers.get('Content-Type')).toBe('image/png'); }
  finally { rmSync(path); }
});
test('capacity escalation stores evidence, recipient and auditable status',async()=>{
  const {runStorm}=await import('../../shared/src/physics/triage');
  const input={preset:'heavy' as const,assets:['S2' as const],options:{robustness:false,previewUnconfirmed:false,recoveryMinutes:0}},state=repo.load();
  const result=runStorm(input,state.faults,state.trials),id=crypto.randomUUID(),now=new Date().toISOString();
  repo.sql.prepare('INSERT INTO storm_runs VALUES (?,?,?,?,?,?,?,?,?)').run(id,'completed',JSON.stringify(input),'[]',JSON.stringify(result),null,'Test',now,now);
  const saved=await request('/escalations',{stormRunId:id,asset:'S2',recipient:'Owner',note:'Capacity review'});
  expect(saved.response.status).toBe(201);expect(saved.data.evidence.capacityLimited).toBe(true);
  expect((await request('/escalations')).data).toHaveLength(1);
  expect((await request('/escalations/'+saved.data.id+'/status',{status:'acknowledged',note:'Review received'})).data.status).toBe('acknowledged');
  expect((await request('/escalations/'+saved.data.id+'/status',{status:'resolved',note:'Review complete'})).data.history).toHaveLength(2);
  expect(repo.sql.prepare("SELECT COUNT(*) n FROM audit WHERE action LIKE 'Escala%'").get()).toMatchObject({n:3});
});
