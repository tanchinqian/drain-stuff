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
    !matched.length ||
    Object.values(fault.sensorStatusesAtAlert).some((s) => s !== "ok");
  return {
    id: crypto.randomUUID(),
    faultId: fault.id,
    diagnosis: insufficient
      ? "Not enough information. Record a trusted inspection and a sourced comparable case."
      : matched[0].item.cause,
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
      "Stage A deterministic retrieval. Provider explanations and the sourced example library are scheduled for Stage D.",
    mode: "Matched from cases",
    promptVersion: "stage-a-deterministic-v1",
    sources: [...matched.map((r) => r.item), ...passages.map((r) => r.item)],
    draftBanner,
  };
}
