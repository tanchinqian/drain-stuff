import { test, expect } from "vitest";
import { warningScenario, warningTitle, warningText, warningValidity } from "./warnings";
test("recognised warning levels select a scenario without inventing rainfall", () => {
  expect(warningScenario([{ warning_level: "Waspada" }])).toBe("moderate");
  expect(warningScenario([{ level: "Buruk" }])).toBe("heavy");
  expect(warningScenario([{ heading: "Bahaya" }])).toBe("extreme");
  expect(warningScenario([{ heading: "Thunderstorms" }])).toBe(null);
  expect(warningTitle(null)).toBe("Official weather warning");
});
test("government feed fields provide readable titles, affected areas and Malaysian validity", () => {
  const warning = {
    warning_issue: { title_en: "Thunderstorms Warning" },
    heading_en: "THUNDERSTORMS WARNING",
    text_en: "Thunderstorms are expected over Kedah and Pahang.",
    valid_from: "2026-10-18T20:00:00",
    valid_to: "2026-10-19T01:00:00",
  };
  expect(warningTitle(warning)).toBe("THUNDERSTORMS WARNING");
  expect(warningText(warning)).toContain("Kedah and Pahang");
  expect(warningValidity(warning)).toContain("MYT");
  expect(warningValidity(warning)).toMatch(/1:00/);
  expect(warningScenario([warning])).toBe(null);
  expect(warningTitle({ warning_issue: { title_en: "No Advisory" } })).toBe("No Advisory");
  expect(warningTitle({ heading_bm: "AMARAN RIBUT PETIR" })).toBe("AMARAN RIBUT PETIR");
  expect(warningText({ text_bm: "Ribut petir" })).toBe("Ribut petir");
  expect(warningValidity({ valid_to: "invalid" })).toBe("");
});
test("marine danger text does not invent a rainfall severity", () => {
  expect(warningScenario([{ heading_en: "Strong Winds and Rough Seas", text_en: "This is dangerous to small boats." }])).toBe(null);
  expect(warningScenario([{ heading_en: "Continuous rain", warning_level: "Bahaya" }])).toBe("extreme");
});
