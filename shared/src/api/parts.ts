import { repairSteps } from "./repairSteps";
import { bayParts, drainParts } from "./modelCatalog";
import type { Fault, Part, Sensor, Status } from "./types";

export function installedPart(ownerId: string, partId: string) {
  if (partId === "liner") return ownerId.startsWith("T");
  if (partId === "sock" && ownerId === "I1") return true;
  if (partId === "sock" || partId === "checkdam") return ownerId === "S1";
  if (partId === "energy") return ownerId === "S1" || ownerId === "S2";
  return true;
}
export function buildParts(
  ownerId: string,
  sensors: Sensor[],
  faults: Fault[],
  compost = false,
): Part[] {
  const definitions = compost
    ? bayParts
    : ownerId === "I1"
      ? drainParts
          .filter((p) =>
            [
              "inlet",
              "pretreat",
              "sock",
              "outfall",
              "overflow",
              "ponding",
            ].includes(p.partId),
          )
          .map((p) => ({
            ...p,
            name: (
              {
                inlet: "Inlet chamber and grate",
                pretreat: "Sediment sump",
                sock: "Trash screen",
                outfall: "Outlet pipe",
                overflow: "Bypass weir",
                ponding: "Chamber water",
              } as Record<string, string>
            )[p.partId],
          }))
      : ownerId.startsWith("T")
        ? drainParts
            .filter((p) => !["energy", "sock", "checkdam"].includes(p.partId))
            .map((p) => ({
              ...p,
              name:
                p.partId === "planting"
                  ? "Tree and root zone"
                  : p.partId === "liner"
                    ? "Root barrier"
                    : p.name,
            }))
        : drainParts;
  return definitions.map((definition) => {
    const installed = compost || installedPart(ownerId, definition.partId);
    const linked = sensors.filter(
      (s) =>
        s.ownerId === ownerId && s.linkedPartIds.includes(definition.partId),
    );
    const fault = faults.find(
      (f) =>
        f.featureId === ownerId &&
        f.partId === definition.partId &&
        f.status !== "closed",
    );
    const status: Status = !installed
      ? "ok"
      : fault?.type === "sensor_offline"
        ? "offline"
        : fault?.type === "sensor_suspect" || fault?.type === "standing_water"
          ? "watch"
          : fault
            ? "fault"
            : "ok";
    return {
      synthetic: true,
      ...definition,
      installed,
      status,
      sensorIds: linked.map((s) => s.sensorId),
      readings: [],
      issue: !installed
        ? "Not installed in this pilot configuration."
        : fault
          ? `${fault.type.replaceAll("_", " ")}. Diagnosing input: ${fault.diagnosingInput}.`
          : "No open fault recorded for this part.",
      steps: fault ? repairSteps[fault.type] : undefined,
    };
  });
}
