export function warningTitle(value: unknown) {
  if (!value || typeof value !== "object") return "Official weather warning";
  const row = value as Record<string, unknown>;
  return (
    [row.heading, row.warning_level, row.level, row.warning_type]
      .filter((v) => typeof v === "string")
      .join(" · ")
      .slice(0, 500) || "Official weather warning"
  );
}
export function warningScenario(
  warnings: unknown[],
): "moderate" | "heavy" | "extreme" | null {
  const text = warnings.map(warningTitle).join(" ").toLowerCase();
  if (/\b(bahaya|danger|extreme)\b/.test(text)) return "extreme";
  if (/\b(buruk|severe)\b/.test(text)) return "heavy";
  if (/\b(waspada|alert)\b/.test(text)) return "moderate";
  return null;
}
