import {
  stormInput,
  lifecycleInput,
  overrideInput,
  caseInput,
  diagnosisInput,
  feedbackInput,
  escalationInput, type Escalation,
  type StormResult,
  type CaseRecord,
  type Suggestion,
  type StormInput,
  type StormProgress,
} from "./contract";
import { runStorm } from "./physics/triage";
import {referenceCases,referenceGuidance} from './caseLibrary';
import { deterministicDiagnosis, stepLibrary } from "./diagnosis";
import { transitionAllowed } from "./workflow";
import type { Fault, TrialDetail } from "./api/types";
import type { createDataStore } from "./api/store";
export type StormCalculator = (
  input: StormInput,
  faults: Fault[],
  trials: TrialDetail[],
  onProgress?: (progress: StormProgress) => void,
) => Promise<StormResult>;
export function createOfflineApi(
  store: ReturnType<typeof createDataStore>,
  calculate: StormCalculator = async (...args) => runStorm(...args),
) {
  type Job = {
    id: string;
    status: string;
    input: ReturnType<typeof stormInput.parse>;
    result: StormResult | null;
    error: string | null;
    createdAt: string;
    actor: string;
    progress: StormProgress | null;
  };
  const caseFaultIds = new Set<string>();
  const escalations:Escalation[]=[];
  const snapshots = new Map<
    string,
    { faults: Fault[]; trials: TrialDetail[] }
  >();
  const jobs = new Map<string, Job>(),
    overrides: (ReturnType<typeof overrideInput.parse> & {
      id: string;
      actor: string;
      t: string;
    })[] = [],
    cases: CaseRecord[] = structuredClone(referenceCases),
    suggestions = new Map<string, Suggestion>();
  const clone = <T>(v: T) => structuredClone(v),
    now = () => new Date().toISOString(),
    id = () => crypto.randomUUID();
  const job = (value: string) => {
    const row = jobs.get(value);
    if (!row) throw new Error("Storm run not found");
    return row;
  };
  return async (
    path: string,
    method: string,
    raw?: unknown,
  ): Promise<unknown | undefined> => {
    const u = new URL(path, "https://mock.local"),
      p = u.pathname.split("/").filter(Boolean),
      actor = "Local operator";
    if(p[0]==='devices') {if(method==='GET')return [];throw new Error('Device commissioning requires the local API. Start npm run dev:all.');}
    if(p[0]==='evidence') throw new Error('Photo evidence requires the local API. Use a sensor check or storm rerun in local demo mode.');
    if(p[0]==='escalations') {
      if(method==='GET') return clone(escalations);
      if(p[1]) {
        const item=escalations.find(e=>e.id===p[1]); if(!item) throw new Error('Escalation not found');
        const input=raw as {status:string;note:string};
        if(!['acknowledged','resolved'].includes(input.status)||!input.note?.trim()||item.status==='resolved'||item.status===input.status) throw new Error('Choose the next escalation status and add a note');
        item.status=input.status as Escalation['status'];item.history.push({status:input.status,note:input.note,actor,at:now()});return clone(item);
      }
      const input=escalationInput.parse(raw),result=job(input.stormRunId).result?.rows.find(r=>r.asset===input.asset);
      if(!result?.capacityLimited) throw new Error('Choose a capacity-limited asset from a completed run');
      const entry:Escalation={...input,id:id(),status:'recorded',evidence:clone(result),actor,at:now(),history:[]};escalations.push(entry);return clone(entry);
    }
    if (method === "POST" && p[0] === "storm-runs") {
      const input = stormInput.parse(raw),
        row: Job = {
          id: id(),
          status: "queued",
          input,
          result: null,
          error: null,
          createdAt: now(),
          actor,
          progress: null,
        };
      if (jobs.size >= 8) {
        const oldest = jobs.keys().next().value!;
        jobs.delete(oldest);
        snapshots.delete(oldest);
      }
      jobs.set(row.id, row);
      const saved = store.snapshot(),
        snapshot = { faults: saved.faults, trials: saved.trials };
      snapshots.set(row.id, snapshot);
      setTimeout(async () => {
        try {
          row.status = "running";
          row.result = await calculate(input, snapshot.faults, snapshot.trials,
            (progress) => { row.progress = progress; });
          row.status = "completed";
          row.progress = null;
        } catch (e) {
          row.status = "failed";
          row.error = (e as Error).message;
        }
      }, 0);
      return clone(row);
    }
    if (method === "GET" && p[0] === "storm-runs") {
      const row = job(p[1]);
      return clone(u.searchParams.get("statusOnly") === "1" ? { ...row, result: null } : row);
    }
    if (method === "GET" && p[0] === "triage") {
      const row = job(u.searchParams.get("stormRunId") ?? "");
      if (!row.result) throw new Error("Wait for this storm run to finish");
      const saved = overrides.filter((o) => o.stormRunId === row.id),
        rows = clone(row.result.rows);
      for (const o of saved) {
        const at = rows.findIndex((r) => r.asset === o.asset);
        if (at >= 0) rows.splice(o.position - 1, 0, rows.splice(at, 1)[0]);
      }
      return {
        stormRunId: row.id,
        rows: rows.map((r, i) => ({ ...r, rank: i + 1 })),
        robustness: row.result.robustness,
        overrides: saved,
        label: "Relative ranking, not a prediction",
      };
    }
    if (method === "POST" && p[0] === "triage" && p[1] === "overrides") {
      const input = overrideInput.parse(raw),
        row = job(input.stormRunId);
      if (
        !row.result?.rows.some((r) => r.asset === input.asset) ||
        input.position > row.result.rows.length
      )
        throw new Error("Choose an asset and position in the completed run");
      const key = id();
      overrides.push({ ...input, id: key, actor, t: now() });
      return { ok: true, id: key };
    }
    if (method === "GET" && p[0] === "weather") return { available: false };
    if (p[0] === "faults" && p[2] === "audit" && method === "GET") {
      const fault = store.snapshot().faults.find((f) => f.id === p[1]);
      if (!fault) throw new Error("Fault not found");
      return (fault.history ?? []).map((h) => ({
        id: h.id,
        t: h.t,
        actor: h.user,
        action: h.action,
        resource: fault.id,
        note: h.note ?? "",
        detail: "{}",
      }));
    }
    if (
      p[0] === "faults" &&
      p[2] &&
      ["confirm", "assign", "clear", "verify", "close", "reopen"].includes(
        p[2],
      ) &&
      method === "POST"
    ) {
      const input = lifecycleInput.parse(raw),
        state = store.snapshot(),
        fault = state.faults.find((f) => f.id === p[1]);
      if (!fault) throw new Error("Fault not found");
      const { transition } = transitionAllowed(fault, p[2]);
      const originalFault = JSON.stringify(fault);
      if (p[2] === "assign" && !input.assignee)
        throw new Error("Name the crew or contractor");
      if (p[2] === "assign") {
        const latest = [...jobs.values()]
          .reverse()
          .filter(
            (j) =>
              j.status === "completed" && !j.input.options.previewUnconfirmed,
          )
          .map((j) => j.result!.rows.find((r) => r.asset === fault.featureId))
          .find(Boolean);
        if (latest?.capacityLimited)
          throw new Error("Capacity-limited asset. Escalate to the owner.");
      }
      let evidence: unknown = input.evidence;
      if (p[2] === "verify") {
        if (!input.evidence) throw new Error("Record verification evidence");
        if (input.evidence.type === "photo")
          throw new Error(
            "Upload the evidence photo through the local API first",
          );
        if (input.evidence.type === "sensor") {
          const sensorId = input.evidence.sensorId,
            sensor = state.sensors.find((s) => s.sensorId === sensorId);
          if (
            !sensor ||
            sensor.ownerId !== fault.featureId ||
            sensor.status !== "ok" ||
            sensor.unit !== input.evidence.unit
          )
            throw new Error("Use a trusted registered sensor and its unit");
        }
        if (input.evidence.type === "storm-rerun") {
          const before = job(input.evidence.stormRunId);
          if (!before.result)
            throw new Error("Wait for this storm run to finish");
          const original = before.result.rows.find(
            (r) => r.asset === fault.featureId,
          );
          if (!original || !original.faultIds.includes(fault.id))
            throw new Error(
              "Choose a completed run that included this confirmed fault",
            );
          const after = await calculate(
            {
              ...before.input,
              assets: [fault.featureId as "S1"],
              options: { ...before.input.options, robustness: false },
            },
            (snapshots.get(before.id)?.faults ?? []).filter(
              (f) => f.id !== fault.id,
            ),
            snapshots.get(before.id)?.trials ?? [],
          );
          evidence = {
            ...input.evidence,
            before: original.asInstalled.summary,
            after: after.rows[0].asInstalled.summary,
          };
        }
      }
      const current = store.snapshot();
      const index = current.faults.findIndex((f) => f.id === fault.id);
      if (index < 0 || JSON.stringify(current.faults[index]) !== originalFault)
        throw new Error("This fault changed while verification ran. Reopen it and try again.");
      fault.workOrder = {
        ...fault.workOrder,
        state: transition.to,
        ...(input.assignee ? { assignee: input.assignee } : {}),
        ...(p[2] === "verify"
          ? { evidence: { type: input.evidence!.type, data: evidence } }
          : {}),
      };
      if (p[2] === "reopen") fault.workOrder = { state: "detected" };
      fault.status =
        p[2] === "close" ? "closed" : p[2] === "reopen" ? "open" : "inspected";
      (fault.history ??= []).push({
        id: id(),
        t: now(),
        user: actor,
        action: p[2],
        note: input.note,
      });
      current.faults[index] = fault;
      store.replace(current);
      return clone(fault);
    }
    if (p[0] === "cases") {
      if (method === "GET")
        return p[1] ? clone(cases.find((c) => c.id === p[1])) : clone([...cases].sort((a,b)=>a.id.localeCompare(b.id)));
      if (method === "POST") {
        const input = caseInput.parse(raw),
          state = store.snapshot(),
          fault = state.faults.find((f) => f.id === input.faultId);
        if (
          !fault ||
          fault.workOrder?.state !== "closed" ||
          !fault.workOrder.evidence
        )
          throw new Error("Close a verified fault first");
        if (caseFaultIds.has(fault.id)) throw new Error("Case already exists");
        if (input.stepsTaken.some((s) => !stepLibrary[s]))
          throw new Error("Choose draft library step IDs");
        const key = id(),
          item: CaseRecord = {
            id: key,
            assetType:
              state.features.find((f) => f.id === fault.featureId)?.kind ??
              "inlet",
            part: fault.partId,
            ruleId: fault.ruleId,
            symptoms: fault.diagnosingInput,
            sensorFlags: Object.values(fault.sensorStatusesAtAlert),
            cause: input.cause,
            stepsTaken: input.stepsTaken,
            outcome: input.outcome,
            sourceLabel: "Demo operator record",
            sourceUrl: "/api/v1/cases/" + key,
            createdBy: actor,
          };
        cases.push(item);
        caseFaultIds.add(fault.id);
        return clone(item);
      }
    }
    if(p[0]==='ai'&&p[1]==='config')return {promptVersion:'offline-deterministic-v2',provider:'none',mode:'Matched from cases',model:null,configured:false};
    if(p[0]==='ai'&&p[1]==='hints') {
      const state=store.snapshot();return Object.fromEntries(state.features.map(asset=>{const f=state.faults.find(f=>f.featureId===asset.id&&f.status!=='closed');return [asset.id,f?deterministicDiagnosis(f,asset.kind,cases,referenceGuidance).diagnosis:'No open fault for diagnosis'];}));
    }
    if (p[0] === "guidance" && method === "GET") return clone(referenceGuidance);
    if (p[0] === "ai" && p[1] === "diagnose" && method === "POST") {
      const input = diagnosisInput.parse(raw),
        state = store.snapshot(),
        fault = state.faults.find((f) => f.id === input.faultId);
      if (!fault) throw new Error("Fault not found");
      const result = deterministicDiagnosis(
        fault,
        state.features.find((f) => f.id === fault.featureId)?.kind ?? "inlet",
        cases,
        referenceGuidance,
      );
      if (input.partContext && (input.partContext.ownerId !== fault.featureId || input.partContext.partId !== fault.partId))
        throw new Error('The diagnosis must refer to the selected fault\'s asset and part.');
      result.provider = {model: null, fallback: true, reason: 'backend_unavailable'};
      result.notes += ' Local demo fallback: start npm run dev:all to use the configured model and backend terminal logs.';
      console.warn('[diagnosis] FALLBACK backend_unavailable; browser-local matching only.');
      suggestions.set(result.id, result);
      return clone(result);
    }
    if (p[0] === "ai" && p[1] === "feedback" && method === "POST") {
      const input = feedbackInput.parse(raw);
      if (!suggestions.has(input.suggestionId))
        throw new Error("Suggestion not found");
      if (input.rankedStepIds?.some((s) => !stepLibrary[s]))
        throw new Error("Choose draft library step IDs");
      const suggestion = suggestions.get(input.suggestionId)!,
        state = store.snapshot(),
        fault = state.faults.find((f) => f.id === suggestion.faultId);
      if (fault) {
        (fault.history ??= []).push({
          id: id(),
          t: now(),
          user: actor,
          action: "Diagnosis " + input.choice,
          note: input.note,
        });
        store.replace(state);
      }
      return { ok: true };
    }
    return undefined;
  };
}
