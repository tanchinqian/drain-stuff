export function warningTitle(value: unknown) {
  if (!value || typeof value !== "object") return "Official weather warning";
  const row = value as Record<string, unknown>;
  const issue = row.warning_issue && typeof row.warning_issue === "object"
    ? row.warning_issue as Record<string, unknown> : {};
  const title = [row.heading_en, issue.title_en, row.heading_bm, issue.title_bm]
    .find((v) => typeof v === "string" && v.trim());
  if (typeof title === "string") return title.slice(0, 500);
  return (
    [row.heading, row.warning_level, row.level, row.warning_type]
      .filter((v) => typeof v === "string")
      .join(" · ")
      .slice(0, 500) || "Official weather warning"
  );
}
export function warningText(value: unknown) {
  if (!value || typeof value !== "object") return "";
  const row = value as Record<string, unknown>;
  return [row.text_en, row.text_bm]
    .find((v): v is string => typeof v === "string" && !!v.trim()) ?? "";
}
export function warningValidity(value: unknown) {
  if (!value || typeof value !== "object") return "";
  const row = value as Record<string, unknown>;
  const format = (value: unknown) => {
    if (typeof value !== "string") return "";
    // The feed's timestamps without an offset are Malaysian local time.
    const date = new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : value + "+08:00");
    return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("en-MY", {
      timeZone: "Asia/Kuala_Lumpur", day: "numeric", month: "short", year: "numeric",
      hour: "numeric", minute: "2-digit",
    }).format(date);
  };
  const from = format(row.valid_from), to = format(row.valid_to);
  return from && to ? `Valid ${from} – ${to} MYT` : to ? `Valid until ${to} MYT` : "";
}
export function warningScenario(
  warnings: unknown[],
): "moderate" | "heavy" | "extreme" | null {
  const text = warnings.map((value) => {
    const row = value && typeof value === "object" ? value as Record<string, unknown> : {};
    return [warningTitle(value), row.warning_level, row.level, row.warning_type]
      .filter((v) => typeof v === "string").join(" ");
  }).join(" ").toLowerCase();
  if (/\b(bahaya|danger|extreme)\b/.test(text)) return "extreme";
  if (/\b(buruk|severe)\b/.test(text)) return "heavy";
  if (/\b(waspada|alert)\b/.test(text)) return "moderate";
  return null;
}
