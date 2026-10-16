# Chamber node — design-level, bench test pending

No node has been fabricated, installed or measured. This is a reference design, not an approved installation.

## Measurement and placement

A downward ultrasonic head sits on a bracket installed from the cover. Record its height above the local depth datum. `depth = mounting height − measured distance + calibration offset`. Mount at least **0.3 m above the highest level to be measured**; a larger sensor-specific blind zone takes precedence. The JSN-SR04T family in the brief is a candidate with an approximately 25 cm minimum, but variants differ: obtain the exact purchased module's data sheet and bench-check it before procurement/commissioning. Commercial alternatives also vary: the Milesight EM400-UDL W050 lists 0.30–5 m, W100 0.50–10 m, C100 0.25–10 m. This design's default 0.3–5 m therefore applies to the W050-like envelope, not every probe. [Manufacturer data sheet](https://resource.milesight.com/milesight/iot/document/em400-udl-datasheet-en.pdf).

A float switch at the overflow level provides an independent binary crest signal. An optional capacitive soil probe is an indicator requiring a local calibration; it is not an infiltration measurement. The 12-byte protocol carries ultrasonic/float/temperature/battery; a future payload version is needed for optional soil values.

## Radio and sampling

ESP32 plus a 3.3 V SX1276-class radio, LoRaWAN Class A OTAA. Proposed normal interval 15 minutes; event interval 2 minutes when near crest or rising quickly. These intervals and thresholds are design inputs, not validated settings. Deep sleep between cycles; retain the monotonic payload counter across reboot. Check regional channel plan and time-on-air before enabling radio. A development board's USB interface, LEDs and regulator may dominate sleep current. [ESP32 data sheet](https://documentation.espressif.com/esp32_datasheet_en.html) describes chip-level modes; it does not establish whole-node consumption.

## Power budget — estimate, unmeasured

Assume a protected 3.2 V LiFePO4 pack of 4000 mAh and 70% usable capacity = 2800 mAh. All currents below are **assumed battery-side totals**, including conversion losses in the assumed values; they are not component specifications or measurements. Charging, temperature derating, self-discharge, retries, joining, radio spreading factor and enclosure leakage must be measured separately.

| State | Assumed current | Normal seconds / 900 s | Event seconds / 120 s |
|---|---:|---:|---:|
| Sleep, regulator and dividers | 0.08 mA | 893 | 113 |
| MCU plus switched ultrasonic measurement | 45 mA | 2 | 2 |
| Radio transmit and receive windows | 120 mA | 5 | 5 |

`Iavg = Σ(I × seconds) / period`. Normal: `(0.08×893 + 45×2 + 120×5)/900 = 0.846 mA`; `2800/0.846/24 ≈ 138 days`. Continuous event mode: `5.825 mA`, approximately `20 days`. **Both are estimates, unmeasured**, not a battery-life claim. Radio window time is a placeholder; low data rates/retries can invalidate it. Bench-log whole-node current before choosing a battery.

## Enclosure and installation

IP67 or better is a target for the complete enclosure, glands and connectors, not a certification of this assembly. Put electronics, battery and cable joins above maximum water; wall/cover bracket, downward clear beam, protected antenna, drip loops, breathable vent or desiccant and suitable conformal coating. Avoid a beam reflected by the pipe or wall. Do not seal a pressure/condensation trap around the ultrasonic head. Reference placement and protection remain subject to practitioner approval.

## Failure detection

| Failure | Current software response / limit |
|---|---|
| Identical distance for N reports | Suspect `stuck` after configured count; a stable real water surface can trigger it, so operator review is required. |
| Blind zone / range / impossible depth | Suspect `out_of_range`; preserve raw distance and converted value. |
| Condensation / slow drift | Float disagreement or reference calibration can expose it; no software claim of automatic drift diagnosis. |
| Debris echo / wrong wall echo | Rate-of-change and float disagreement flag suspicion; cannot identify the obstacle without inspection. |
| Low battery | Configured mV threshold or device flag → suspect. Threshold provisional. |
| Missed reports | More than three configured intervals → offline; checked during sensor/device reads. |
| Wrong mounting height | Two reference points and float agreement are required; software cannot independently know the true datum. |
| Counter reset / old packet | Duplicate ignored, lower counter rejected; preserve monotonic counter or commission a new EUI. |

Ingest raises only Detected faults. It never confirms a fault, dispatches a crew or changes physics merely because a sensor is suspect.
