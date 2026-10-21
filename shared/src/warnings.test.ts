import { test, expect } from "vitest";
import { warningScenario, warningTitle } from "./warnings";
test("recognised warning levels select a scenario without inventing rainfall", () => {
  expect(warningScenario([{ warning_level: "Waspada" }])).toBe("moderate");
  expect(warningScenario([{ level: "Buruk" }])).toBe("heavy");
  expect(warningScenario([{ heading: "Bahaya" }])).toBe("extreme");
  expect(warningScenario([{ heading: "Thunderstorms" }])).toBe(null);
  expect(warningTitle(null)).toBe("Official weather warning");
});
