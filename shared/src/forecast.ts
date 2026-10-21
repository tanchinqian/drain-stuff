import { z } from "zod";

export const forecastLocation = {
  name: "Bandar Bukit Raja",
  latitude: 3.08495,
  longitude: 101.4313,
};
export const forecastUrl =
  "https://api.open-meteo.com/v1/forecast?" +
  new URLSearchParams({
    latitude: String(forecastLocation.latitude),
    longitude: String(forecastLocation.longitude),
    hourly:
      "temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    forecast_days: "8",
    timezone: "Asia/Kuala_Lumpur",
  });
const numbers = z.array(z.number().finite().nullable());
const schema = z.object({
  hourly: z.object({
    time: z.array(z.string()),
    temperature_2m: numbers,
    relative_humidity_2m: numbers,
    precipitation_probability: numbers,
    precipitation: numbers,
    weather_code: numbers,
    wind_speed_10m: numbers,
  }),
  daily: z.object({
    time: z.array(z.string()),
    weather_code: numbers,
    temperature_2m_max: numbers,
    temperature_2m_min: numbers,
  }),
});
export interface ForecastHour {
  start: string;
  temperature: number | null;
  humidity: number | null;
  probability: number | null;
  rainMm: number | null;
  code: number | null;
  windKmh: number | null;
}
export interface ForecastDay {
  date: string;
  code: number | null;
  high: number | null;
  low: number | null;
}
export interface ForecastData {
  available: true;
  fetchedAt: string;
  source: string;
  location: typeof forecastLocation;
  hours: ForecastHour[];
  days: ForecastDay[];
}
export type ForecastResponse = ForecastData | { available: false };
export interface ForecastPeriod {
  key: string;
  start: string;
  hours: ForecastHour[];
}
export interface ForecastImpact {
  asset: string;
  peakMm: number;
  overflowM3: number;
}
export function parseForecast(raw: unknown, now = new Date()): ForecastData {
  const data = schema.parse(raw),
    h = data.hourly;
  for (const values of Object.values(h))
    if (values.length !== h.time.length)
      throw new Error("Incomplete hourly forecast");
  for (const values of Object.values(data.daily))
    if (values.length !== data.daily.time.length)
      throw new Error("Incomplete daily forecast");
  const hours = h.time.map((end, i) => {
    // Precipitation is the sum for the hour ENDING at this timestamp.
    const date = new Date(end + "+08:00");
    if (!Number.isFinite(date.getTime()))
      throw new Error("Invalid forecast time");
    const start = new Date(date.getTime() - 3600000 + 8 * 3600000)
      .toISOString()
      .slice(0, 16);
    const rainMm = h.precipitation[i];
    if (rainMm !== null && rainMm < 0) throw new Error("Invalid rainfall");
    return {
      start,
      temperature: h.temperature_2m[i],
      humidity: h.relative_humidity_2m[i],
      probability: h.precipitation_probability[i],
      rainMm,
      code: h.weather_code[i],
      windKmh: h.wind_speed_10m[i],
    };
  });
  if (!hours.length || !data.daily.time.length)
    throw new Error("Empty forecast");
  return {
    available: true,
    fetchedAt: now.toISOString(),
    source: "https://open-meteo.com/",
    location: forecastLocation,
    hours,
    days: data.daily.time
      .slice(0, 7)
      .map((date, i) => ({
        date,
        code: data.daily.weather_code[i],
        high: data.daily.temperature_2m_max[i],
        low: data.daily.temperature_2m_min[i],
      })),
  };
}
export function forecastPeriods(
  data: ForecastData,
  date: string,
): ForecastPeriod[] {
  return Array.from({ length: 8 }, (_, i) => {
    const start = date + "T" + String(i * 3).padStart(2, "0") + ":00";
    return {
      key: start,
      start,
      hours: data.hours.filter(
        (h) =>
          h.start.slice(0, 10) === date &&
          Number(h.start.slice(11, 13)) >= i * 3 &&
          Number(h.start.slice(11, 13)) < i * 3 + 3,
      ),
    };
  }).filter((p) => p.hours.length === 3);
}
export function weatherCondition(code: number | null): {
  label: string;
  icon: string;
} {
  if (code === null) return { label: "Forecast unavailable", icon: "—" };
  if (code === 0) return { label: "Clear sky", icon: "☀️" };
  if (code <= 2) return { label: "Partly cloudy", icon: "⛅" };
  if (code === 3) return { label: "Overcast", icon: "☁️" };
  if ([45, 48].includes(code)) return { label: "Fog", icon: "🌫️" };
  if ([51, 53, 55, 56, 57].includes(code))
    return { label: "Drizzle", icon: "🌦️" };
  if ([61, 63, 65, 66, 67].includes(code)) return { label: "Rain", icon: "🌧️" };
  if ([71, 73, 75, 77].includes(code)) return { label: "Snow", icon: "🌨️" };
  if ([80, 81, 82].includes(code)) return { label: "Rain showers", icon: "🌦️" };
  if ([85, 86].includes(code)) return { label: "Snow showers", icon: "🌨️" };
  if ([95, 96, 99].includes(code))
    return { label: "Thunderstorms", icon: "⛈️" };
  return { label: "Unknown weather condition", icon: "—" };
}
