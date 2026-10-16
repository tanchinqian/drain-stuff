import type { BatchChecks, BatchReading, Config, RuleOutput } from "../types";
export function maturityReason(
  checks: BatchChecks,
  latestTemp?: number,
  tolerance = 2,
): string | null {
  if (!checks.intakeChecked) return "Complete the intake contamination check.";
  if (checks.plasticsFound || checks.glassFound)
    return "Remove and re-check contamination before release.";
  if (!checks.ambientReached) return "Temperature has not returned to ambient.";
  if (!Number.isFinite(checks.ambientTempC))
    return "Record the measured ambient temperature.";
  if (
    latestTemp === undefined ||
    Math.abs(latestTemp - checks.ambientTempC) > tolerance
  )
    return "Record a current temperature close to the measured ambient before release.";
  if (!checks.didNotReheat)
    return "Confirm the batch did not reheat after turning.";
  if (!checks.manualMaturity) return "Manual maturity checks are pending.";
  return null;
}
export function evaluateRules(
  readings: BatchReading[],
  checks: BatchChecks,
  config: Config,
): RuleOutput[] {
  const latest = readings.at(-1);
  const outputs: RuleOutput[] = [];
  const add = (
    rule: string,
    action: string,
    why: string,
    severity: 1 | 2 | 3,
  ) => outputs.push({ rule, action, why, severity, synthetic: true });
  if (latest) {
    if (latest.tempC < config.temperature.turnBelow && !checks.ambientReached) {
      const lastGood = readings
        .map((r) => r.tempC >= config.temperature.turnBelow)
        .lastIndexOf(true);
      const start = readings[lastGood + 1]?.t ?? latest.t;
      const days = Math.max(
        0,
        (Date.parse(latest.t) - Date.parse(start)) / 86400000,
      );
      if (days >= config.temperature.days)
        add(
          "Low temperature",
          "Turn pile",
          `Temperature ${latest.tempC} °C, below ${config.temperature.turnBelow} °C for ${days.toFixed(1)} days (target ${config.temperature.days} days).`,
          2,
        );
    }
    if (latest.tempC > config.temperature.coolAbove)
      add(
        "High temperature",
        "Turn or spread to cool",
        `Temperature ${latest.tempC} °C exceeds ${config.temperature.coolAbove} °C.`,
        3,
      );
    const goodDays = new Set(
      readings
        .filter(
          (r) =>
            r.tempC >= config.temperature.goodMin &&
            r.tempC <= config.temperature.goodMax,
        )
        .map((r) => r.t.slice(0, 10)),
    ).size;
    if (goodDays >= config.temperature.days)
      add(
        "Temperature history",
        "Temperature band recorded",
        `${config.temperature.goodMin}–${config.temperature.goodMax} °C recorded on ${goodDays} days (target ${config.temperature.days}); maturity checks are still needed.`,
        1,
      );
    if (latest.moisturePct < config.moisture.min)
      add(
        "Dry pile",
        "Add water while turning",
        `Moisture ${latest.moisturePct}% is below ${config.moisture.min}%.`,
        2,
      );
    if (latest.moisturePct > config.moisture.max)
      add(
        "Wet pile",
        "Add dry carbon",
        `Moisture ${latest.moisturePct}% is above ${config.moisture.max}%.`,
        2,
      );
  }
  if (checks.rainExpected && (!checks.bayCovered || !checks.sumpChecked))
    add(
      "Leachate guard",
      "Cover bay, hold turning, check sump",
      `Rain expected; cover ${checks.bayCovered ? "checked" : "not checked"}, sump ${checks.sumpChecked ? "checked" : "not checked"} (level ${checks.sumpLevelCm} cm; watch threshold ${config.inspection.sumpWatchCm} cm).`,
      3,
    );
  if (checks.sumpLevelCm > config.inspection.sumpWatchCm)
    add(
      "Sump level",
      "Check and empty the sump",
      `Sump ${checks.sumpLevelCm} cm exceeds ${config.inspection.sumpWatchCm} cm.`,
      3,
    );
  return outputs;
}
