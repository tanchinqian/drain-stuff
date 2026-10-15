// One real-time clock; the load instant anchors newly generated observations.
export const nowIso = () => new Date().toISOString();
export const loadedAt = nowIso();
export const today = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore' }).format(new Date());
export function rebaseDates<T>(value: T, from: string, to: string, preserveWrites = false): T {
  const delta = Date.parse(to) - Date.parse(from);
  const visit = (node: unknown, key = ''): unknown => {
    if (preserveWrites && ['history', 'checkHistory', 'actions'].includes(key)) return node;
    if (
      typeof node === 'string' &&
      /^\d{4}-\d{2}-\d{2}(?:T[\d:.]+Z)?$/.test(node) &&
      Number.isFinite(Date.parse(node))
    ) {
      if (
        preserveWrites &&
        Date.parse(node) > Date.parse(from) + (node.length === 10 ? 7 * 86400000 : 0)
      )
        return node;
      const shifted = new Date(Date.parse(node) + delta).toISOString();
      return node.length === 10 ? shifted.slice(0, 10) : shifted;
    }
    if (Array.isArray(node)) return node.map((v) => visit(v));
    if (node && typeof node === 'object')
      return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, visit(v, k)]));
    return node;
  };
  return visit(value) as T;
}
