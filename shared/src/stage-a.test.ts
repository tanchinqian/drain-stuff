import { expect, test } from "vitest";
import { faultConfig, boardConfig, confirmed } from "./physics/faults";
import { generateMock } from "./api/mock/seed";
import { retrieve } from "./retrieval";
import { runStorm } from "./physics/triage";
const state = generateMock(),
  base = boardConfig("S1");
test("confirmation, upkeep and sensor faults map only to configured effects", () => {
  const f = {
    ...state.faults[0],
    featureId: "S1",
    partId: "inlet" as const,
    type: "blockage" as const,
    workOrder: { state: "detected" as const },
  };
  expect(confirmed(f)).toBe(false);
  expect(faultConfig(base, [f], "installed")).toEqual(base);
  const checked = { ...f, workOrder: { state: "confirmed" as const } };
  expect(faultConfig(base, [checked], "installed").values.inletOpen.value).toBe(
    0.1,
  );
  expect(faultConfig(base, [checked], "cleared")).toEqual(base);
  expect(
    faultConfig(base, [{ ...checked, type: "sensor_suspect" }], "installed"),
  ).toEqual(base);
  expect(
    faultConfig(base, [{ ...checked, type: "sensor_offline" }], "installed"),
  ).toEqual(base);
  expect(faultConfig(base, [checked], "capacity")).toEqual(base);
});
test("retrieval is deterministic, structured and source preserving", () => {
  const item = {
    id: "c1",
    assetType: "inlet",
    part: "inlet",
    ruleId: "R",
    symptoms: "debris at inlet",
    sensorFlags: [],
    cause: "debris",
    stepsTaken: [],
    outcome: "checked",
    sourceLabel: "Guidance-based example",
    sourceUrl: "https://example.org/source",
    createdBy: "test",
  };
  const matches = retrieve(
    {
      text: "inlet debris",
      assetType: "inlet",
      part: "inlet",
      ruleId: "R",
      sensorFlags: [],
    },
    [item],
  );
  expect(matches[0].item.sourceUrl).toBe(item.sourceUrl);
  expect(matches[0].score).toBeGreaterThan(10);
});
test("typical asset uses existing inlet engine and robustness performs six perturbations", () => {
  expect(boardConfig("R1").kind).toBe("inlet");
  const run = runStorm(
    {
      custom: { peakMmHr: 20, durationMinutes: 1 },
      assets: ["R1"],
      options: {
        robustness: true,
        previewUnconfirmed: false,
        recoveryMinutes: 0,
      },
    },
    [],
  );
  expect(run.robustness.orders).toHaveLength(6);
  expect(run.rows[0].asInstalled.summary.maxRelativeError).toBeLessThan(1e-6);
});

test('server and browser share the same recorded-test conductivity input', () => {
 const trial=structuredClone(state.trials.find((t)=>t.featureId==='S1')!);
 trial.tests=[{t:'2026-10-16T00:00:00.000Z',phase:'retest',metric:'infiltration_mm_hr',value:7,unit:'mm/h',pointId:'S1-P1',n:2}];
 const run=runStorm({custom:{peakMmHr:20,durationMinutes:1},assets:['S1'],options:{robustness:false,previewUnconfirmed:false,recoveryMinutes:0}},[],[trial]);
 for(const mode of [run.rows[0].asInstalled,run.rows[0].ifCleared,run.rows[0].capacityLimit]){
  expect(mode.config.values.ks.value).toBe(7/3.6e6);expect(mode.config.values.ks.source).toBe('trial-record');expect(mode.config.sampleCount).toBe(2);
 }
});
