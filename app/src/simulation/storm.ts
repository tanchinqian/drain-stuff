export interface StormSettings {
  rain: number;
  duration: number;
  blockage: number;
}
export interface StormFrame {
  minute: number;
  rain: number;
  runoff: number;
  infiltration: number;
  outlet: number;
  ponding: number;
  media: number;
  overflow: number;
  input: number;
  discharged: number;
}
// Illustrative catchment and storage; replace with surveyed dimensions and calibrated rates.
export const stormAssumptions = {
  catchment: 120,
  runoffFraction: 0.85,
  bedArea: 18,
  pondingLimit: 0.25,
  mediaCapacity: 1.8,
};
export function simulateStorm(settings: StormSettings): StormFrame[] {
  const rain = Math.max(0, Math.min(120, settings.rain));
  const duration = Math.max(5, Math.min(120, Math.round(settings.duration)));
  const blockage = Math.max(0, Math.min(100, settings.blockage));
  const a = stormAssumptions;
  let surface = 0,
    media = 0,
    overflow = 0,
    input = 0,
    discharged = 0;
  const frames: StormFrame[] = [
    {
      minute: 0,
      rain: 0,
      runoff: 0,
      infiltration: 0,
      outlet: 0,
      ponding: 0,
      media: 0,
      overflow: 0,
      input: 0,
      discharged: 0,
    },
  ];
  for (let minute = 1; minute <= duration + 180; minute++) {
    const intensity = minute <= duration ? rain : 0;
    const runoff = ((intensity / 1000) * a.catchment * a.runoffFraction) / 60;
    surface += runoff;
    input += runoff;
    const outlet = Math.min(media, (0.9 / 60) * (1 - blockage / 100));
    media -= outlet;
    discharged += outlet;
    const infiltration = Math.min(surface, ((60 / 1000) * a.bedArea) / 60, a.mediaCapacity - media);
    surface -= infiltration;
    media += infiltration;
    const spill = Math.max(0, surface - a.bedArea * a.pondingLimit);
    surface -= spill;
    overflow += spill;
    frames.push({
      minute,
      rain: intensity,
      runoff: runoff * 1000,
      infiltration: infiltration * 1000,
      outlet: outlet * 1000,
      ponding: (surface / a.bedArea) * 1000,
      media,
      overflow,
      input,
      discharged,
    });
  }
  return frames;
}
