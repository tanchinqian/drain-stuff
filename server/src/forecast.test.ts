import { expect, test, vi } from "vitest";
import { Repository } from "./db";
import { createApi } from "./api";
const forecastFixture = {
  hourly: {
    time: ["2026-10-18T00:00", "2026-10-18T01:00"],
    temperature_2m: [24, 25],
    relative_humidity_2m: [90, 90],
    precipitation_probability: [70, 70],
    precipitation: [0, 1],
    weather_code: [95, 95],
    wind_speed_10m: [2, 2],
  },
  daily: {
    time: ["2026-10-18"],
    weather_code: [95],
    temperature_2m_max: [31],
    temperature_2m_min: [24],
  },
};

test("forecast endpoint validates and caches the upstream response without creating storm runs", async () => {
  const upstream = vi.fn(
    async () => new Response(JSON.stringify(forecastFixture)),
  ) as unknown as typeof fetch;
  const repo = new Repository(":memory:");
  const api = createApi(repo, { seed: true, forecastFetch: upstream });
  try {
    const before = repo.sql
      .prepare("SELECT COUNT(*) AS count FROM storm_runs")
      .get();
    const response = await api.app.request("/api/v1/weather/forecast");
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.available).toBe(true);
    expect(data.location.name).toBe("Bandar Bukit Raja");
    expect(data.hours[1].start).toBe("2026-10-18T00:00");
    await api.app.request("/api/v1/weather/forecast");
    expect(upstream).toHaveBeenCalledTimes(1);
    expect(
      repo.sql.prepare("SELECT COUNT(*) AS count FROM storm_runs").get(),
    ).toEqual(before);
  } finally {
    await api.close();
  }
});
test("upstream errors and invalid responses produce unavailable rather than invented weather", async () => {
  for (const forecastFetch of [
    async () => {
      throw new Error("offline");
    },
    async () => new Response("{}"),
  ]) {
    const api = createApi(new Repository(":memory:"), {
      seed: true,
      forecastFetch: forecastFetch as typeof fetch,
    });
    try {
      const response = await api.app.request("/api/v1/weather/forecast");
      expect(await response.json()).toEqual({ available: false });
    } finally {
      await api.close();
    }
  }
});
