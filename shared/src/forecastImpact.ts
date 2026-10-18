import type { ForecastImpact, ForecastPeriod } from "./forecast";
import type { Fault, TrialDetail } from "./api/types";
import { assets } from "./contract";
import { boardConfig, faultConfig } from "./physics/faults";
import { simulatePhysics } from "./physics/engine";
import { result } from "./physics/triage";
import { testMean } from "./trialMetrics";

export function forecastRain(period: ForecastPeriod) {
  if (
    period.hours.length !== 3 ||
    period.hours.some(
      (h) => h.rainMm === null || !Number.isFinite(h.rainMm) || h.rainMm < 0,
    )
  )
    throw new Error("Rainfall is missing for this period");
  return period.hours.map((hour, i) => ({
    second: i * 3600,
    intensity: hour.rainMm! / 3.6e6,
  }));
}
export function forecastImpact(
  period: ForecastPeriod,
  faults: Fault[],
  trials: TrialDetail[],
): ForecastImpact[] {
  const rain = forecastRain(period);
  return assets.map((asset) => {
    const config = boardConfig(asset),
      trial = trials.find((t) => t.featureId === asset);
    const mean = trial
      ? (testMean(trial.tests, "retest") ?? testMean(trial.tests, "baseline"))
      : null;
    if (mean && config.kind !== "inlet")
      config.values.ks.value = mean.value / 3.6e6;
    config.values.peak.value = Math.max(...rain.map((p) => p.intensity));
    config.values.duration.value = 10800;
    config.values.recovery.value = 0;
    const summary = result(
      simulatePhysics(
        faultConfig(config, faults, "installed"),
        "drawn",
        rain,
        false,
      ),
    ).summary;
    return {
      asset,
      peakMm: summary.peakPondingM * 1000,
      overflowM3: summary.overflowM3,
    };
  });
}
