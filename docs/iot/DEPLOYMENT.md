# Node deployment plan — design-level, bench test pending

## Network and approvals

Plan a township-owned LoRaWAN gateway on a building with surveyed RF coverage and reliable backhaul, or obtain a written service/coverage confirmation from an operator. The brief cites a 2017 edotco/ATILZE Klang Valley announcement; **current availability/coverage is unverified**, including this site. There is no evidence here of Penang coverage.

LTE-M/NB-IoT is an alternative node variant: replace LoRa with a suitable modem/SIM, survey operator signal/PSM support, budget different transmit bursts and enclosure antenna clearance, and send the same decoded measurement contract through a separately authenticated adapter. The current endpoint implements LoRaWAN webhook shapes, not an untested cellular modem driver.

**Malaysian operating band, channel plan, transmit power and approvals are unverified, to be confirmed with MCMC and SIRIM before any deployment.** The [MCMC class-assignment page](https://www.mcmc.gov.my/en/spectrum/assignment-of-spectrum/class-assignment) and [SIRIM QAS](https://www.sirim-qas.com.my/) are starting points; automated access to the detailed approval pages was unavailable during preparation. No legal compliance determination is made.

## Commissioning

1. Approve installation from above using a cover bracket under the township's traffic/cover/ confined-space rules. No one enters a chamber to install this node; use trained authorised personnel and the site's access procedure.
2. Record EUI, asset, mounted part, datum, mounting height, maximum measured level and at least 0.3 m blind-zone clearance (or the probe's larger requirement).
3. Compare distance and converted depth with a tape measure at two safe reference levels. Record calibration offset, float switch level, beam clearance and timestamps.
4. Register the device on Sensors, set interval/range/rise/stuck/battery thresholds, confirm radio approvals and network credentials separately.
5. Set a distinct server integration secret, configure TTN/ChirpStack HTTPS webhook, send a known packet and check raw distance, depth, source, trust and Detected-only fault behavior.
6. Record battery baseline, enclosure ingress/condensation check, signal observations and maintenance owner. Bench test and an actual supervised site trial are still required.

## Maintenance

Inspect/clean the transducer, recheck against the same datum, replace batteries based on measured consumption/voltage, inspect glands/vent/desiccant, and investigate missing uplinks or float disagreement. Interval is a site maintenance decision, not inferred by this software. Do not recalibrate away an obstruction without checking it.

Local demonstration: run `npm run dev:all`, then `npm run sim:device`. The simulator registers a fresh R1 node and posts backdated two-minute samples immediately. Records are permanently tagged `source: simulated`; this provenance appears in About/docs, not as an operational badge. It sends no radio packets.
