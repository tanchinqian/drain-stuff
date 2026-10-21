/** Visible representative drops: Marshall–Palmer conditioned to Atlas' 0.6–5.8 mm range. */
export const rainLambda = (mmHr: number) => 4.1 * Math.max(0.001, mmHr) ** -0.21;
export function dropDiameter(mmHr: number, u: number) {
  const lambda = rainLambda(mmHr),
    lo = 0.6,
    hi = 5.8;
  return (
    lo -
    Math.log(1 - Math.min(1 - 1e-12, Math.max(0, u)) * (1 - Math.exp(-lambda * (hi - lo)))) / lambda
  );
}
export const terminalSpeed = (diameterMm: number) => 9.65 - 10.3 * Math.exp(-0.6 * diameterMm);
export const rainPhase = (seconds: number, diameterMm: number, height: number, seed: number) =>
  ((seconds * terminalSpeed(diameterMm)) / height + seed) % 1;
export const mistStrength = (rain: number) =>
  Math.max(0, Math.min(0.12, (rain * 3.6e6 - 40) / 500));
