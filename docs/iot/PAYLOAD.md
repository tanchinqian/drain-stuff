# Payload v1 — 12 bytes

Design-level, bench test pending. All multi-byte fields are unsigned big-endian unless noted. Network receipt time is authoritative; local time is diagnostic, not a UTC clock.

| Byte(s) | Meaning | Range / unit |
|---|---|---|
| 0 | Version | 1 |
| 1 | Flags | bit0 float at crest; bit1 stuck; bit2 out of range; bit3 low battery; high bits rejected |
| 2–3 | Device-local minutes since boot | 0–65535, wraps; not used as absolute time |
| 4–5 | Ultrasonic distance | mm, 0–65535; device range separately validated |
| 6 | Temperature, signed int8 | rounded °C, −40 to 85 accepted |
| 7–8 | Battery | mV |
| 9–11 | Monotonic uplink counter | 24 bit; preserve across reboot; recommission before exhaustion |

`shared/src/iot.ts` is the canonical encoder/decoder/trust contract. [decoder.js](decoder.js) is a standalone TTN/ChirpStack `decodeUplink(input)` formatter. Its output is informative: the server decodes raw bytes itself and does not trust externally decoded values.

## Webhook

`POST /api/v1/ingest/lorawan`, header `X-Ingest-Key`. Real network credentials use `LORAWAN_INGEST_SECRET`; simulator uses a separate `LORAWAN_SIM_SECRET`. At least 24 characters; these are integration credentials, separate from the public demonstration UI. The matched integration determines immutable source provenance; a payload cannot choose it.

TTN v3: `end_device_ids.dev_eui`, `uplink_message.frm_payload` (base64), optional `received_at`. ChirpStack: `deviceInfo.devEui`, `data` (base64), optional `time`. A valid packet needs 12 bytes and a commissioned EUI. Counter idempotency is `(device ID, payload counter)`. An older counter is rejected; duplicates return success without a second reading. Timestamp must advance and be within one day of server receipt. [TTN formatters](https://www.thethingsindustries.com/docs/integrations/payload-formatters/javascript/uplink/), [ChirpStack event protocol](https://github.com/chirpstack/chirpstack/blob/master/api/go/integration/integration.pb.go).

The service stores raw decoded values plus source and trust, converts depth from commissioned mount/calibration, updates the registered sensor/history, and raises Detected faults. It never confirms a fault. Normal/event thresholds are provisional, editable at commissioning. Suspect readings remain visible and cannot verify clearance. Missed-uplink checks run on sensor/device reads; no background scheduler is claimed. Readings do not themselves forecast a storm or change board rain inputs.

Commercial sensors with their own proprietary payloads require a separate tested decoder; claiming this custom 12-byte format supports every commercial LoRa sensor would be incorrect.
