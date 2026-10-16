import type { Fault, WorkState } from "./api/types";
export const transitions: Record<string, { from: WorkState[]; to: WorkState }> =
  {
    confirm: { from: ["detected"], to: "confirmed" },
    assign: { from: ["confirmed"], to: "assigned" },
    clear: { from: ["assigned"], to: "cleared" },
    verify: { from: ["cleared"], to: "verified" },
    close: { from: ["verified"], to: "closed" },
    reopen: { from: ["closed", "cleared", "verified"], to: "detected" },
  };
export function transitionAllowed(fault: Fault, action: string) {
  const previous =
      fault.workOrder?.state ??
      (fault.status === "closed" ? "closed" : "detected"),
    transition = transitions[action];
  if (!transition || !transition.from.includes(previous))
    throw new Error(`Cannot ${action} a ${previous} fault`);
  return { previous, transition };
}
