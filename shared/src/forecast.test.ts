import { expect, test } from "vitest";
import { forecastPeriods, parseForecast, weatherCondition } from "./forecast";
import { forecastRain, forecastImpact } from "./forecastImpact";

export const forecastFixture = {
  hourly: {
    time: [
      "2026-10-18T00:00",
      "2026-10-18T01:00",
      "2026-10-18T02:00",
      "2026-10-18T03:00",
    ],
    temperature_2m: [24, 25, 26, 25],
    relative_humidity_2m: [90, 90, 90, 90],
    precipitation_probability: [70, 70, 70, 70],
    precipitation: [9, 1, 2, 3],
    weather_code: [95, 95, 95, 95],
    wind_speed_10m: [2, 2, 2, 2],
  },
  daily: {
    time: ["2026-10-18"],
    weather_code: [95],
    temperature_2m_max: [31],
    temperature_2m_min: [24],
  },
};
test("hour-ending rainfall aligns to the correct Malaysian period and conserves its total", () => {
  const data = parseForecast(forecastFixture);
  expect(data.hours[0].start).toBe("2026-10-17T23:00");
  const [period] = forecastPeriods(data, "2026-10-18");
  expect(period.hours.map((h) => h.rainMm)).toEqual([1, 2, 3]);
  const rain = forecastRain(period);
  expect(rain.map((p) => p.second)).toEqual([0, 3600, 7200]);
  expect(
    rain.reduce((total, p) => total + p.intensity * 3600 * 1000, 0),
  ).toBeCloseTo(6);
  expect(forecastPeriods(data, "2026-10-19")).toEqual([]);
});
test("missing rainfall is not interpreted as a dry forecast, and broken upstream data is rejected", () => {
  const raw = structuredClone(forecastFixture) as unknown as {
    hourly: { precipitation: (number | null)[] };
  };
  raw.hourly.precipitation[1] = null;
  expect(() =>
    forecastRain(forecastPeriods(parseForecast(raw), "2026-10-18")[0]),
  ).toThrow("missing");
  expect(() =>
    parseForecast({
      ...forecastFixture,
      hourly: { ...forecastFixture.hourly, precipitation: [1] },
    }),
  ).toThrow();
  expect(weatherCondition(null).label).toBe("Forecast unavailable");
  expect(weatherCondition(95).label).toBe("Thunderstorms");
});
test("forecast-driven drainage responds to rainfall without changing forecast inputs or saved simulation state", () => {
  const period = forecastPeriods(
    parseForecast(forecastFixture),
    "2026-10-18",
  )[0];
  const before = structuredClone(period);
  const wet = forecastImpact(period, [], []);
  const dry = forecastImpact(
    { ...period, hours: period.hours.map((h) => ({ ...h, rainMm: 0 })) },
    [],
    [],
  );
  expect(wet).toHaveLength(5);
  expect(wet.some((w) => w.peakMm > 0)).toBe(true);
  expect(dry.every((w) => w.peakMm === 0 && w.overflowM3 === 0)).toBe(true);
  expect(period).toEqual(before);
}, 15000);
