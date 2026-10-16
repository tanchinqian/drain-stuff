import { Hono } from "hono";
import { createHash, timingSafeEqual, randomUUID } from "node:crypto";
import { z } from "zod";
import type { Repository } from "./db";
import {
  deviceInput,
  decodeUplink,
  readingTrust,
  sensorMountPosition,
  type Device,
} from "../../shared/src/iot";
import { boardConfig } from "../../shared/src/physics/faults";
import { buildParts } from "../../shared/src/api/parts";
import { ApiError } from "./api";
export function deviceApi(
  repo: Repository,
  secrets: { device?: string; simulated?: string },
) {
  const app = new Hono<{ Variables: { actor: string } }>();
  const devices = () =>
    (
      repo.sql.prepare("SELECT body FROM devices ORDER BY id").all() as {
        body: string;
      }[]
    ).map((r) => JSON.parse(r.body) as Device);
  function refreshMissing() {
    const state = repo.load();
    let changed = false;
    for (const d of devices())
      if (
        d.lastAt &&
        Date.now() - Date.parse(d.lastAt) > d.intervalSeconds * 3000
      ) {
        if (d.status !== "offline") changed = true;
        d.status = "offline";
        d.trustReasons = ["missed_uplinks"];
        repo.sql
          .prepare("UPDATE devices SET body=? WHERE id=?")
          .run(JSON.stringify(d), d.id);
        for (const s of state.sensors.filter((s) => s.deviceId === d.id))
          if (s.status !== "offline") {
            s.status = "offline";
            changed = true;
          }
        detect(state, d, "sensor_offline", "Missed uplinks");
      }
    if (changed) repo.save(state);
  }
  app.get("/devices", (c) => {
    refreshMissing();
    return c.json(devices());
  });
  app.post("/devices", async (c) => {
    const input = deviceInput.parse(await c.req.json());
    if (repo.sql.prepare("SELECT 1 FROM devices WHERE id=?").get(input.id))
      throw new ApiError(
        409,
        "Device already registered. Commission a new ID to reset counters",
      );
    const state = repo.load(),
      asset = state.features.find((f) => f.id === input.assetId);
    if (
      !asset ||
      !buildParts(input.assetId, [], []).some(
        (p) => p.partId === input.part && p.installed,
      )
    )
      throw new ApiError(422, "Choose an installed part on this asset");
    const d: Device = {
      ...input,
      commissionedBy: c.get("actor"),
      commissionedAt: new Date().toISOString(),
      status: "active",
    };
    repo.sql.transaction(() => {
      repo.sql
        .prepare("INSERT INTO devices VALUES (?,?)")
        .run(d.id, JSON.stringify(d));
      const s = {
        sensorId: "DEV-" + d.id,
        deviceId: d.id,
        type: "Ultrasonic level",
        ownerId: d.assetId,
        scope: "drainage" as const,
        zone: asset.zone,
        partId: d.part,
        linkedPartIds: [d.part],
        location: { x: 0, y: d.mountingHeightM, z: 0 },
        siteLocation: { x: asset.x, y: 0, z: asset.y },
        metric: "water_level_cm",
        unit: "cm",
        role: "reference" as const,
        proxyFor: "Distance converted using commissioned mounting height",
        mountHeightM: d.mountingHeightM,
        lastValue: null,
        lastAt: d.commissionedAt,
        calibratedAt: d.commissionedAt,
        drift: "none" as const,
        status: "offline" as const,
        usedByRules: ["sensor_trust", "persistent_ponding"],
      };
      s.location = sensorMountPosition(
        boardConfig(d.assetId),
        d.part,
        d.mountingHeightM,
      );
      state.sensors.push(s);
      repo.save(state);
      repo.audit(c.get("actor"), "Device commissioned", d.id, "", {
        device: d,
      });
    })();
    return c.json(d, 201);
  });
  app.post("/ingest/lorawan", async (c) => {
    const supplied = c.req.header("X-Ingest-Key") ?? "",
      hash = (s: string) => createHash("sha256").update(s).digest();
    const source = (["device", "simulated"] as const).find(
      (s) =>
        secrets[s] &&
        secrets[s]!.length >= 24 &&
        timingSafeEqual(hash(supplied), hash(secrets[s]!)),
    );
    if (!source) throw new ApiError(401, "Integration secret required");
    const raw = await c.req.json();
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
      throw new ApiError(422, "Use a TTN or ChirpStack uplink object");
    const wire = raw.uplink_message
      ? {
          id: raw.end_device_ids?.dev_eui,
          data: raw.uplink_message.frm_payload,
          at: raw.received_at,
        }
      : { id: raw.deviceInfo?.devEui, data: raw.data, at: raw.time };
    const input = z
      .object({
        id: z.string().regex(/^[a-fA-F0-9]{16}$/),
        data: z.string().regex(/^[A-Za-z0-9+/]{16}$/),
        at: z.string().datetime({ offset: true }).optional(),
      })
      .parse(wire);
    const id = input.id.toLowerCase(),
      stored = repo.sql
        .prepare("SELECT body FROM devices WHERE id=?")
        .get(id) as { body: string } | undefined;
    if (!stored) throw new ApiError(404, "Commission the device first");
    const d = JSON.parse(stored.body) as Device;
    let u: ReturnType<typeof decodeUplink>;
    try {
      u = decodeUplink(Buffer.from(input.data, "base64"));
    } catch (e) {
      throw new ApiError(422, (e as Error).message);
    }
    if (
      repo.sql
        .prepare(
          "SELECT 1 FROM device_readings WHERE device_id=? AND counter=?",
        )
        .get(id, u.counter)
    )
      return c.json({ ok: true, duplicate: true });
    const previous = repo.sql
      .prepare(
        "SELECT body,at,counter FROM device_readings WHERE device_id=? ORDER BY counter DESC LIMIT 30",
      )
      .all(id) as { body: string; at: string; counter: number }[];
    if (previous[0] && u.counter < previous[0].counter)
      throw new ApiError(
        409,
        "Old uplink counter: preserve counters across reboot or recommission",
      );
    const at = input.at ?? new Date().toISOString();
    if (Math.abs(Date.parse(at) - Date.now()) > 86400000)
      throw new ApiError(422, "Uplink time must be within one day of receipt");
    if (previous[0] && Date.parse(at) <= Date.parse(previous[0].at))
      throw new ApiError(422, "Uplink time must follow the previous reading");
    const trust = readingTrust(
        d,
        u,
        previous.map((r) => ({
          distanceMm: JSON.parse(r.body).distanceMm,
          at: r.at,
        })),
        at,
      ),
      entry = { ...u, ...trust, at, source };
    repo.sql.transaction(() => {
      repo.sql
        .prepare("INSERT INTO device_readings VALUES (?,?,?,?,?)")
        .run(id, u.counter, at, source, JSON.stringify(entry));
      d.lastAt = at;
      d.status = "active";
      d.trustReasons = trust.reasons;
      repo.sql
        .prepare("UPDATE devices SET body=? WHERE id=?")
        .run(JSON.stringify(d), id);
      const state = repo.load(),
        sensor = state.sensors.find((s) => s.deviceId === id)!;
      sensor.lastValue = trust.depthM * 100;
      sensor.lastAt = at;
      sensor.status = trust.status;
      sensor.readingSource = source;
      (state.readings[d.assetId] ??= []).push({
        t: at,
        metric: "water_level_cm",
        value: trust.depthM * 100,
        unit: "cm",
        sensorId: sensor.sensorId,
        source,
      });
      if (trust.reasons.length)
        detect(state, d, "sensor_suspect", trust.reasons.join(", "));
      if (trust.status === "ok" && u.flags & 1)
        detect(
          state,
          d,
          "standing_water",
          "Float switch and level at overflow crest",
        );
      repo.save(state);
    })();
    return c.json({ ok: true, ...entry });
  });
  return { app, refreshMissing };
}
function detect(
  state: ReturnType<Repository["load"]>,
  d: Device,
  type: "sensor_suspect" | "sensor_offline" | "standing_water",
  reason: string,
) {
  if (
    state.faults.some(
      (f) =>
        f.featureId === d.assetId &&
        f.partId === d.part &&
        f.type === type &&
        f.status !== "closed",
    )
  )
    return;
  const zone = state.features.find((f) => f.id === d.assetId)!.zone;
  state.faults.push({
    id: "F-" + String(state.faults.length + 1).padStart(3, "0"),
    featureId: d.assetId,
    partId: d.part,
    zone,
    type,
    severity: 2,
    openedAt: new Date().toISOString(),
    status: "open",
    raisedBy: "rule",
    workOrder: { state: "detected" },
    history: [
      {
        id: randomUUID(),
        t: new Date().toISOString(),
        user: "Sensor ingest",
        action: "Detected",
        note: reason,
      },
    ],
    ruleId: type === "standing_water" ? "persistent_ponding" : "sensor_trust",
    sensorIds: ["DEV-" + d.id],
    sensorStatusesAtAlert: {
      ["DEV-" + d.id]:
        type === "standing_water"
          ? "ok"
          : type === "sensor_offline"
            ? "offline"
            : "suspect",
    },
    diagnosingInput: reason,
  });
}
