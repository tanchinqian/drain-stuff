import site from "./bandar-bukit-raja.json";
import type { ZoneId } from "../api/types";

export { site };
export type MapHouse = (typeof site.houses)[number];
export const mapBounds = { x: 33, z: 14 };
export const featureCallouts: Record<string, [number, number]> = {
  S1: [-22, -11],
  S2: [10, -10],
  S3: [-22, 12],
  I1: [24, -5],
  T1: [7, 12],
  T2: [21, 9],
};
export const mappedHouses = new Map(site.houses.map((h) => [h.id, h]));
export const pilotBuildings = site.pilots as Record<string, string>;
export const pilotByBuilding = new Map(
  Object.entries(pilotBuildings).map(([id, osm]) => [osm, id]),
);
export const zoneCentres = Object.fromEntries(
  (["A", "B", "C", "D"] as ZoneId[]).map((zone) => {
    const houses = Object.entries(pilotBuildings)
      .filter(([id]) => id.startsWith(zone))
      .map(([, osm]) => mappedHouses.get(osm)!);
    return [
      zone,
      [
        houses.reduce((n, h) => n + h.x, 0) / 6,
        houses.reduce((n, h) => n + h.z, 0) / 6,
      ],
    ];
  }),
) as Record<ZoneId, [number, number]>;

// shortcut: trial locations are illustrative assignments, replace with surveyed pilot locations.
export function featurePosition(id: string): [number, number] {
  const zone = (
    { S1: "A", S2: "B", S3: "C", I1: "B", T1: "D", T2: "D" } as const
  )[id as "S1" | "S2" | "S3" | "I1" | "T1" | "T2"];
  const centre = zoneCentres[zone];
  return [
    centre[0] + (id === "T1" ? 2 : id === "T2" ? -2 : 0),
    centre[1] + (id === "I1" ? 2.8 : -1.6),
  ];
}

export const roadLabels = [
  "Jalan Gamelan 4",
  "Jalan Gamelan 1E",
  "Jalan Rodat 17/KU6",
  "Persiaran Sungai Keramat",
]
  .map((name) => site.roads.find((r) => r.name === name))
  .filter((r) => r !== undefined);

export function planPoint(x: number, z: number) {
  return [425 + x * 12, 240 + z * 12];
}
