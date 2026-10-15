import type { PhysicsConfig } from './config';
import { circularSection, manning, orifice, weir } from './hydraulics';
export interface NetworkNode {
  id: string;
  area: number;
  volume: number;
}
export interface NetworkLink {
  id: string;
  from: string;
  to: string;
  kind: 'pipe' | 'gully' | 'open';
  diameter: number;
  length: number;
  slope: number;
  travel: number;
}
export interface Network {
  nodes: NetworkNode[];
  links: NetworkLink[];
}
export interface LinkReading {
  id: string;
  discharge: number;
  capacity: number;
  filling: number;
  surcharge: boolean;
}
export function createNetwork(c: PhysicsConfig): Network {
  const v = c.values;
  const ids = [
    'roof outlet',
    'downpipe',
    'property drain',
    'kerb flow',
    'gully inlet',
    'manhole',
    'swale inlet',
  ];
  return {
    nodes: ids.map((id) => ({ id, area: v.nodeArea.value, volume: 0 })),
    links: ids.slice(0, -1).map((id, i) => ({
      id: `${id} to ${ids[i + 1]}`,
      from: id,
      to: ids[i + 1],
      kind: i === 3 ? 'gully' : i === 2 ? 'open' : 'pipe',
      diameter: v.pipeDiameter.value,
      length: v.pipeLength.value,
      slope: v.pipeSlope.value,
      travel: Math.max(10, v.drainTime.value / 6),
    })),
  };
}
// Simultaneous donor-limited transfers; junction storage retains all surcharge.
export function stepNetwork(
  network: Network,
  c: PhysicsConfig,
  dt: number,
  inputs: Record<string, number>,
) {
  const v = c.values,
    nodes = new Map(network.nodes.map((n) => [n.id, n]));
  for (const [id, volume] of Object.entries(inputs)) {
    const node = nodes.get(id);
    if (!node) throw new Error(`Missing network node: ${id}`);
    node.volume += volume;
  }
  const remaining = new Map(network.nodes.map((n) => [n.id, n.volume]));
  const transfers = network.links.map((link) => {
    const node = nodes.get(link.from),
      target = nodes.get(link.to);
    if (!node || !target) throw new Error('Network link has missing endpoint');
    const available = remaining.get(node.id)!,
      head = available / node.area;
    const pipeVolume = circularSection(link.diameter, 1).area * link.length;
    const filling = Math.min(1, available / Math.max(pipeVolume, 1e-9));
    const capacity =
      link.kind === 'gully'
        ? Math.min(
            weir(v.cw.value, v.inletPerimeter.value, head),
            orifice(v.co.value, v.inletArea.value, head, v.gravity.value),
          ) *
          v.inletOpen.value *
          v.sockOpen.value
        : link.kind === 'open'
          ? available / link.travel
          : manning(link.diameter, filling, link.slope, v.manningN.value);
    const volume = Math.min(available, capacity * dt, (available * dt) / link.travel);
    remaining.set(node.id, available - volume);
    return {
      node,
      target,
      volume,
      reading: {
        id: link.id,
        discharge: volume / dt,
        capacity,
        filling,
        surcharge: link.kind === 'gully' ? head > 0.1 : available > pipeVolume,
      },
    };
  });
  for (const { node, target, volume } of transfers) {
    node.volume -= volume;
    target.volume += volume;
  }
  const outlet = nodes.get('swale inlet')!;
  const delivered = Math.min(
    outlet.volume,
    (outlet.volume * dt) / Math.max(10, v.drainTime.value / 6),
  );
  outlet.volume -= delivered;
  return { delivered, links: transfers.map((t) => t.reading) };
}
export function nearestConnection(
  position: { x: number; y: number },
  gullies: { id: string; x: number; y: number }[],
) {
  if (!gullies.length) throw new Error('At least one gully is required');
  return gullies.reduce((best, g) =>
    Math.hypot(position.x - g.x, position.y - g.y) <
    Math.hypot(position.x - best.x, position.y - best.y)
      ? g
      : best,
  ).id;
}
