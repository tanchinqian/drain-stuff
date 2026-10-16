import type { TestResult } from "./api/types";
export function testMean(tests: TestResult[], phase: "baseline" | "retest") {
  const rows = tests.filter(
    (t) => t.phase === phase && t.metric === "infiltration_mm_hr",
  );
  const latest = rows.at(-1)?.t;
  const measured =
    phase === "retest" ? rows.filter((t) => t.t === latest) : rows;
  if (!measured.length) return null;
  return {
    value: measured.reduce((sum, t) => sum + t.value, 0) / measured.length,
    n: measured.reduce((sum, t) => sum + t.n, 0),
  };
}
