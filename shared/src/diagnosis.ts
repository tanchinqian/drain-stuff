import { repairSteps } from "./api/repairSteps";
import { retrieve } from "./retrieval";
import type { Fault } from "./api/types";
import type { CaseRecord, GuidanceRecord, Suggestion } from "./contract";
export const stepLibrary = Object.fromEntries(
  Object.entries(repairSteps).flatMap(([type, steps]) =>
    steps.map((text, i) => [`STEP-${type}-${i + 1}`, text]),
  ),
);
export const draftBanner =
  "Draft repair library. Practitioner review required. Do not enter a chamber or lift a cover alone.";
export function deterministicDiagnosis(
  fault: Fault,
  assetType: string,
  cases: CaseRecord[],
  guidance: GuidanceRecord[],
): Suggestion {
  const query = {
    text: fault.diagnosingInput,
    assetType,
    part: fault.partId,
    ruleId: fault.ruleId,
    sensorFlags: Object.values(fault.sensorStatusesAtAlert),
  };
  const matched = retrieve(query, cases),
    passages = retrieve(query, guidance);
  const insufficient =
    !matched.length || matched[0].score < 6 || fault.diagnosingInput.trim().length < 10 ||
    Object.values(fault.sensorStatusesAtAlert).some((s) => s !== "ok");
  return {
    id: crypto.randomUUID(),
    faultId: fault.id,
    diagnosis: insufficient
      ? "Not enough information. Record a trusted inspection and a sourced comparable case."
      : "Comparable sourced cases suggest checking the recorded drainage condition. Confirm the cause with an independent inspection.",
    confidence: "low",
    rankedStepIds: insufficient
      ? []
      : [...new Set(matched.flatMap((r) => r.item.stepsTaken))].filter(
          (id) => !!stepLibrary[id],
        ),
    citedCaseIds: matched.map((r) => r.item.id),
    citedGuidanceIds: passages.map((r) => r.item.id),
    insufficientInformation: insufficient,
    notes:
      "Deterministic retrieval from a small, partly guidance-based library. This is supporting evidence, not a verified diagnosis or dispatch decision.",
    mode: "Matched from cases",
    promptVersion: "offline-deterministic-v2",
    sources: [...matched.map((r) => r.item), ...passages.map((r) => r.item)],
    draftBanner,
  };
}
