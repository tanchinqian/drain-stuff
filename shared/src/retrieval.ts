import type { CaseRecord, GuidanceRecord } from "./contract";
const words = (s: string): string[] =>
  s.toLowerCase().match(/[a-z0-9]+/g) ?? [];
export function retrieve<T extends CaseRecord | GuidanceRecord>(
  query: {
    text: string;
    assetType: string;
    part: string;
    ruleId: string;
    sensorFlags: string[];
  },
  library: T[],
) {
  const tokens = [...new Set(words(query.text))];
  return library
    .map((item) => {
      const body =
        "symptoms" in item
          ? item.symptoms + " " + item.cause
          : item.title + " " + item.passage;
      const terms = words(body),
        counts = new Map<string, number>();
      terms.forEach((term) => counts.set(term, (counts.get(term) ?? 0) + 1));
      const textScore = tokens.reduce((sum, term) => {
        const df = library.filter((row) =>
          words(
            "symptoms" in row
              ? row.symptoms + " " + row.cause
              : row.title + " " + row.passage,
          ).includes(term),
        ).length;
        return (
          sum +
          ((counts.get(term) ?? 0) / Math.max(1, terms.length)) *
            (Math.log((library.length + 1) / (df + 1)) + 1)
        );
      }, 0);
      const structured =
        "cause" in item
          ? Number(item.assetType === query.assetType) * 3 +
            Number(item.part === query.part) * 3 +
            Number(item.ruleId === query.ruleId) * 4 +
            item.sensorFlags.filter((f) => query.sensorFlags.includes(f)).length
          : Number(item.appliesTo.includes(query.part)) * 3;
      return { item, score: structured + textScore };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id))
    .slice(0, 3);
}
