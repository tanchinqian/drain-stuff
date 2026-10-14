# Input driver inventory

216 existing inputs, classified by potential driver. Stage B/B2 overlays eligible hydraulic inputs for S1/S2/S3/I1/T1/T2 in feature views and the Sensors register. The shared timeline drives values and live-minute provenance; the adapter does not write stored history. Rain reference feeds use the shared rainfall run. This inventory is not a claim that every row is live.

Coordinates below are original schematic coordinates, not surveyed mounts. The live adapter positions mapped feature mounts from model dimensions; other mounts retain schematic coordinates. House hydraulic inputs need per-house network frames and remain seeded. Compost thermal inputs remain seeded until matching bay runs are connected to the UI. Soil temperature has no thermal model. Human smell, inspection and maturity checks remain human. Offline inputs retain their last known value/time, including null. Soil probes share lumped media moisture, not depth-resolved measurements. Deterministic noise and explicit drift affect the measurement overlay, not hydraulic storage.
| ID | Type | Driver | Existing x/y/z (schematic) | Unit |
|---|---|---|---|---|
| S1-INLET | Ultrasonic inlet level | hydraulic | -3 / 0.8 / 0 | cm |
| S1-OUTLET | Underdrain outlet level | hydraulic | 3.9 / -0.55 / 0 | cm |
| S1-SEDIMENT | Manual sediment inspection | human/seeded | -2.6 / 0.3 / 0.6 | mm |
| S1-MOIST-10 | Soil moisture at 10 cm | hydraulic | -0.5 / -0.2 / 0.65 | % vol |
| S1-TEMP-10 | Soil temperature at 10 cm | human/seeded | -0.5 / -0.2 / 0.85 | °C |
| S1-MOIST-30 | Soil moisture at 30 cm | hydraulic | -0.1 / -0.4 / 0.65 | % vol |
| S1-TEMP-30 | Soil temperature at 30 cm | human/seeded | -0.1 / -0.4 / 0.85 | °C |
| S1-POND | Ultrasonic ponding depth | hydraulic | 0 / 0.9 / 0 | cm |
| S1-RISER | Ultrasonic overflow-riser level | hydraulic | 1.65 / 1.05 / -0.7 | cm |
| S1-WELL | Observation-well level | hydraulic | 1.3 / 0.8 / 0.9 | cm |
| S1-INF-P1 | Manual fixed-point ring infiltration test | human/seeded | -0.5 / 0.35 / -0.8 | mm/h |
| S1-INF-P2 | Manual fixed-point ring infiltration test | human/seeded | 0.2 / 0.35 / -0.8 | mm/h |
| S1-INF-P3 | Manual fixed-point ring infiltration test | human/seeded | 0.9 / 0.35 / -0.8 | mm/h |
| S1-POND-DURATION | Manual post-rain elapsed-time log | human/seeded | 0.5 / 0.65 / 0.3 | h |
| S1-VIS-inlet | Manual visual inspection | human/seeded | -1.8 / 0.5 / 1.1 | human log |
| S1-VIS-energy | Manual visual inspection | human/seeded | -1.1 / 0.5 / 1.1 | human log |
| S1-VIS-pretreat | Manual visual inspection | human/seeded | -0.4 / 0.5 / 1.1 | human log |
| S1-VIS-sock | Manual visual inspection | human/seeded | 0.3 / 0.5 / 1.1 | human log |
| S1-VIS-checkdam | Manual visual inspection | human/seeded | 1 / 0.5 / 1.1 | human log |
| S1-VIS-ponding | Manual visual inspection | human/seeded | -1.8 / 0.5 / 1.1 | human log |
| S1-VIS-mulch | Manual visual inspection | human/seeded | -1.1 / 0.5 / 1.1 | human log |
| S1-VIS-planting | Manual visual inspection | human/seeded | -0.4 / 0.5 / 1.1 | human log |
| S1-VIS-media | Manual visual inspection | human/seeded | 0.3 / 0.5 / 1.1 | human log |
| S1-VIS-transition | Manual visual inspection | human/seeded | 1 / 0.5 / 1.1 | human log |
| S1-VIS-drainage | Manual visual inspection | human/seeded | -1.8 / 0.5 / 1.1 | human log |
| S1-VIS-underdrain | Manual visual inspection | human/seeded | -1.1 / 0.5 / 1.1 | human log |
| S1-VIS-cleanout | Manual visual inspection | human/seeded | -0.4 / 0.5 / 1.1 | human log |
| S1-VIS-overflow | Manual visual inspection | human/seeded | 1 / 0.5 / 1.1 | human log |
| S1-VIS-outfall | Manual visual inspection | human/seeded | -1.8 / 0.5 / 1.1 | human log |
| S2-INLET | Ultrasonic inlet level | hydraulic | -3 / 0.8 / 0 | cm |
| S2-OUTLET | Underdrain outlet level | hydraulic | 3.9 / -0.55 / 0 | cm |
| S2-SEDIMENT | Manual sediment inspection | human/seeded | -2.6 / 0.3 / 0.6 | mm |
| S2-MOIST-10 | Soil moisture at 10 cm | hydraulic | -0.5 / -0.2 / 0.65 | % vol |
| S2-TEMP-10 | Soil temperature at 10 cm | human/seeded | -0.5 / -0.2 / 0.85 | °C |
| S2-MOIST-30 | Soil moisture at 30 cm | hydraulic | -0.1 / -0.4 / 0.65 | % vol |
| S2-TEMP-30 | Soil temperature at 30 cm | human/seeded | -0.1 / -0.4 / 0.85 | °C |
| S2-POND | Ultrasonic ponding depth | hydraulic | 0 / 0.9 / 0 | cm |
| S2-RISER | Ultrasonic overflow-riser level | hydraulic | 1.65 / 1.05 / -0.7 | cm |
| S2-WELL | Observation-well level | hydraulic | 1.3 / 0.8 / 0.9 | cm |
| S2-INF-P1 | Manual fixed-point ring infiltration test | human/seeded | -0.5 / 0.35 / -0.8 | mm/h |
| S2-INF-P2 | Manual fixed-point ring infiltration test | human/seeded | 0.2 / 0.35 / -0.8 | mm/h |
| S2-INF-P3 | Manual fixed-point ring infiltration test | human/seeded | 0.9 / 0.35 / -0.8 | mm/h |
| S2-POND-DURATION | Manual post-rain elapsed-time log | human/seeded | 0.5 / 0.65 / 0.3 | h |
| S2-VIS-inlet | Manual visual inspection | human/seeded | -1.8 / 0.5 / 1.1 | human log |
| S2-VIS-energy | Manual visual inspection | human/seeded | -1.1 / 0.5 / 1.1 | human log |
| S2-VIS-pretreat | Manual visual inspection | human/seeded | -0.4 / 0.5 / 1.1 | human log |
| S2-VIS-ponding | Manual visual inspection | human/seeded | -1.8 / 0.5 / 1.1 | human log |
| S2-VIS-mulch | Manual visual inspection | human/seeded | -1.1 / 0.5 / 1.1 | human log |
| S2-VIS-planting | Manual visual inspection | human/seeded | -0.4 / 0.5 / 1.1 | human log |
| S2-VIS-media | Manual visual inspection | human/seeded | 0.3 / 0.5 / 1.1 | human log |
| S2-VIS-transition | Manual visual inspection | human/seeded | 1 / 0.5 / 1.1 | human log |
| S2-VIS-drainage | Manual visual inspection | human/seeded | -1.8 / 0.5 / 1.1 | human log |
| S2-VIS-underdrain | Manual visual inspection | human/seeded | -1.1 / 0.5 / 1.1 | human log |
| S2-VIS-cleanout | Manual visual inspection | human/seeded | -0.4 / 0.5 / 1.1 | human log |
| S2-VIS-overflow | Manual visual inspection | human/seeded | 1 / 0.5 / 1.1 | human log |
| S2-VIS-outfall | Manual visual inspection | human/seeded | -1.8 / 0.5 / 1.1 | human log |
| S3-INLET | Ultrasonic inlet level | hydraulic | -3 / 0.8 / 0 | cm |
| S3-OUTLET | Underdrain outlet level | hydraulic | 3.9 / -0.55 / 0 | cm |
| S3-SEDIMENT | Manual sediment inspection | human/seeded | -2.6 / 0.3 / 0.6 | mm |
| S3-MOIST-10 | Soil moisture at 10 cm | hydraulic | -0.5 / -0.2 / 0.65 | % vol |
| S3-TEMP-10 | Soil temperature at 10 cm | human/seeded | -0.5 / -0.2 / 0.85 | °C |
| S3-MOIST-30 | Soil moisture at 30 cm | hydraulic | -0.1 / -0.4 / 0.65 | % vol |
| S3-TEMP-30 | Soil temperature at 30 cm | human/seeded | -0.1 / -0.4 / 0.85 | °C |
| S3-POND | Ultrasonic ponding depth | hydraulic | 0 / 0.9 / 0 | cm |
| S3-RISER | Ultrasonic overflow-riser level | hydraulic | 1.65 / 1.05 / -0.7 | cm |
| S3-WELL | Observation-well level | hydraulic | 1.3 / 0.8 / 0.9 | cm |
| S3-INF-P1 | Manual fixed-point ring infiltration test | human/seeded | -0.5 / 0.35 / -0.8 | mm/h |
| S3-INF-P2 | Manual fixed-point ring infiltration test | human/seeded | 0.2 / 0.35 / -0.8 | mm/h |
| S3-INF-P3 | Manual fixed-point ring infiltration test | human/seeded | 0.9 / 0.35 / -0.8 | mm/h |
| S3-POND-DURATION | Manual post-rain elapsed-time log | human/seeded | 0.5 / 0.65 / 0.3 | h |
| S3-VIS-inlet | Manual visual inspection | human/seeded | -1.8 / 0.5 / 1.1 | human log |
| S3-VIS-pretreat | Manual visual inspection | human/seeded | -0.4 / 0.5 / 1.1 | human log |
| S3-VIS-ponding | Manual visual inspection | human/seeded | -1.8 / 0.5 / 1.1 | human log |
| S3-VIS-mulch | Manual visual inspection | human/seeded | -1.1 / 0.5 / 1.1 | human log |
| S3-VIS-planting | Manual visual inspection | human/seeded | -0.4 / 0.5 / 1.1 | human log |
| S3-VIS-media | Manual visual inspection | human/seeded | 0.3 / 0.5 / 1.1 | human log |
| S3-VIS-transition | Manual visual inspection | human/seeded | 1 / 0.5 / 1.1 | human log |
| S3-VIS-drainage | Manual visual inspection | human/seeded | -1.8 / 0.5 / 1.1 | human log |
| S3-VIS-underdrain | Manual visual inspection | human/seeded | -1.1 / 0.5 / 1.1 | human log |
| S3-VIS-cleanout | Manual visual inspection | human/seeded | -0.4 / 0.5 / 1.1 | human log |
| S3-VIS-overflow | Manual visual inspection | human/seeded | 1 / 0.5 / 1.1 | human log |
| S3-VIS-outfall | Manual visual inspection | human/seeded | -1.8 / 0.5 / 1.1 | human log |
| I1-INLET | Ultrasonic inlet level | hydraulic | -3 / 0.8 / 0 | cm |
| I1-OUTLET | Underdrain outlet level | hydraulic | 3.9 / -0.55 / 0 | cm |
| I1-SEDIMENT | Manual sediment inspection | human/seeded | -2.6 / 0.3 / 0.6 | mm |
| T1-INLET | Ultrasonic inlet level | hydraulic | -3 / 0.8 / 0 | cm |
| T1-OUTLET | Underdrain outlet level | hydraulic | 3.9 / -0.55 / 0 | cm |
| T1-SEDIMENT | Manual sediment inspection | human/seeded | -2.6 / 0.3 / 0.6 | mm |
| T1-MOIST-10 | Soil moisture at 10 cm | hydraulic | -0.5 / -0.2 / 0.65 | % vol |
| T1-TEMP-10 | Soil temperature at 10 cm | human/seeded | -0.5 / -0.2 / 0.85 | °C |
| T1-MOIST-30 | Soil moisture at 30 cm | hydraulic | -0.1 / -0.4 / 0.65 | % vol |
| T1-TEMP-30 | Soil temperature at 30 cm | human/seeded | -0.1 / -0.4 / 0.85 | °C |
| T1-POND | Ultrasonic ponding depth | hydraulic | 0 / 0.9 / 0 | cm |
| T1-RISER | Ultrasonic overflow-riser level | hydraulic | 1.65 / 1.05 / -0.7 | cm |
| T1-WELL | Observation-well level | hydraulic | 1.3 / 0.8 / 0.9 | cm |
| T1-INF-P1 | Manual fixed-point ring infiltration test | human/seeded | -0.5 / 0.35 / -0.8 | mm/h |
| T1-INF-P2 | Manual fixed-point ring infiltration test | human/seeded | 0.2 / 0.35 / -0.8 | mm/h |
| T1-INF-P3 | Manual fixed-point ring infiltration test | human/seeded | 0.9 / 0.35 / -0.8 | mm/h |
| T1-POND-DURATION | Manual post-rain elapsed-time log | human/seeded | 0.5 / 0.65 / 0.3 | h |
| T1-VIS-inlet | Manual visual inspection | human/seeded | -1.8 / 0.5 / 1.1 | human log |
| T1-VIS-pretreat | Manual visual inspection | human/seeded | -0.4 / 0.5 / 1.1 | human log |
| T1-VIS-ponding | Manual visual inspection | human/seeded | -1.8 / 0.5 / 1.1 | human log |
| T1-VIS-mulch | Manual visual inspection | human/seeded | -1.1 / 0.5 / 1.1 | human log |
| T1-VIS-planting | Manual visual inspection | human/seeded | -0.4 / 0.5 / 1.1 | human log |
| T1-VIS-media | Manual visual inspection | human/seeded | 0.3 / 0.5 / 1.1 | human log |
| T1-VIS-transition | Manual visual inspection | human/seeded | 1 / 0.5 / 1.1 | human log |
| T1-VIS-drainage | Manual visual inspection | human/seeded | -1.8 / 0.5 / 1.1 | human log |
| T1-VIS-underdrain | Manual visual inspection | human/seeded | -1.1 / 0.5 / 1.1 | human log |
| T1-VIS-cleanout | Manual visual inspection | human/seeded | -0.4 / 0.5 / 1.1 | human log |
| T1-VIS-overflow | Manual visual inspection | human/seeded | 1 / 0.5 / 1.1 | human log |
| T1-VIS-outfall | Manual visual inspection | human/seeded | -1.8 / 0.5 / 1.1 | human log |
| T2-INLET | Ultrasonic inlet level | hydraulic | -3 / 0.8 / 0 | cm |
| T2-OUTLET | Underdrain outlet level | hydraulic | 3.9 / -0.55 / 0 | cm |
| T2-SEDIMENT | Manual sediment inspection | human/seeded | -2.6 / 0.3 / 0.6 | mm |
| T2-MOIST-10 | Soil moisture at 10 cm | hydraulic | -0.5 / -0.2 / 0.65 | % vol |
| T2-TEMP-10 | Soil temperature at 10 cm | human/seeded | -0.5 / -0.2 / 0.85 | °C |
| T2-MOIST-30 | Soil moisture at 30 cm | hydraulic | -0.1 / -0.4 / 0.65 | % vol |
| T2-TEMP-30 | Soil temperature at 30 cm | human/seeded | -0.1 / -0.4 / 0.85 | °C |
| T2-POND | Ultrasonic ponding depth | hydraulic | 0 / 0.9 / 0 | cm |
| T2-RISER | Ultrasonic overflow-riser level | hydraulic | 1.65 / 1.05 / -0.7 | cm |
| T2-WELL | Observation-well level | hydraulic | 1.3 / 0.8 / 0.9 | cm |
| T2-INF-P1 | Manual fixed-point ring infiltration test | human/seeded | -0.5 / 0.35 / -0.8 | mm/h |
| T2-INF-P2 | Manual fixed-point ring infiltration test | human/seeded | 0.2 / 0.35 / -0.8 | mm/h |
| T2-INF-P3 | Manual fixed-point ring infiltration test | human/seeded | 0.9 / 0.35 / -0.8 | mm/h |
| T2-POND-DURATION | Manual post-rain elapsed-time log | human/seeded | 0.5 / 0.65 / 0.3 | h |
| T2-VIS-inlet | Manual visual inspection | human/seeded | -1.8 / 0.5 / 1.1 | human log |
| T2-VIS-pretreat | Manual visual inspection | human/seeded | -0.4 / 0.5 / 1.1 | human log |
| T2-VIS-ponding | Manual visual inspection | human/seeded | -1.8 / 0.5 / 1.1 | human log |
| T2-VIS-mulch | Manual visual inspection | human/seeded | -1.1 / 0.5 / 1.1 | human log |
| T2-VIS-planting | Manual visual inspection | human/seeded | -0.4 / 0.5 / 1.1 | human log |
| T2-VIS-media | Manual visual inspection | human/seeded | 0.3 / 0.5 / 1.1 | human log |
| T2-VIS-transition | Manual visual inspection | human/seeded | 1 / 0.5 / 1.1 | human log |
| T2-VIS-drainage | Manual visual inspection | human/seeded | -1.8 / 0.5 / 1.1 | human log |
| T2-VIS-underdrain | Manual visual inspection | human/seeded | -1.1 / 0.5 / 1.1 | human log |
| T2-VIS-cleanout | Manual visual inspection | human/seeded | -0.4 / 0.5 / 1.1 | human log |
| T2-VIS-overflow | Manual visual inspection | human/seeded | 1 / 0.5 / 1.1 | human log |
| T2-VIS-outfall | Manual visual inspection | human/seeded | -1.8 / 0.5 / 1.1 | human log |
| A01-D-OUTLET | House-drain outlet level | hydraulic | 3.9 / -0.55 / 0 | cm |
| A02-D-OUTLET | House-drain outlet level | hydraulic | 3.9 / -0.55 / 0 | cm |
| A03-D-OUTLET | House-drain outlet level | hydraulic | 3.9 / -0.55 / 0 | cm |
| A04-D-OUTLET | House-drain outlet level | hydraulic | 3.9 / -0.55 / 0 | cm |
| A05-D-OUTLET | House-drain outlet level | hydraulic | 3.9 / -0.55 / 0 | cm |
| A06-D-OUTLET | House-drain outlet level | hydraulic | 3.9 / -0.55 / 0 | cm |
| B01-D-OUTLET | House-drain outlet level | hydraulic | 3.9 / -0.55 / 0 | cm |
| B02-D-OUTLET | House-drain outlet level | hydraulic | 3.9 / -0.55 / 0 | cm |
| B03-D-OUTLET | House-drain outlet level | hydraulic | 3.9 / -0.55 / 0 | cm |
| B04-D-OUTLET | House-drain outlet level | hydraulic | 3.9 / -0.55 / 0 | cm |
| B05-D-OUTLET | House-drain outlet level | hydraulic | 3.9 / -0.55 / 0 | cm |
| B06-D-OUTLET | House-drain outlet level | hydraulic | 3.9 / -0.55 / 0 | cm |
| C01-D-OUTLET | House-drain outlet level | hydraulic | 3.9 / -0.55 / 0 | cm |
| C02-D-OUTLET | House-drain outlet level | hydraulic | 3.9 / -0.55 / 0 | cm |
| C03-D-OUTLET | House-drain outlet level | hydraulic | 3.9 / -0.55 / 0 | cm |
| C04-D-OUTLET | House-drain outlet level | hydraulic | 3.9 / -0.55 / 0 | cm |
| C05-D-OUTLET | House-drain outlet level | hydraulic | 3.9 / -0.55 / 0 | cm |
| C06-D-OUTLET | House-drain outlet level | hydraulic | 3.9 / -0.55 / 0 | cm |
| D01-D-OUTLET | House-drain outlet level | hydraulic | 3.9 / -0.55 / 0 | cm |
| D02-D-OUTLET | House-drain outlet level | hydraulic | 3.9 / -0.55 / 0 | cm |
| D03-D-OUTLET | House-drain outlet level | hydraulic | 3.9 / -0.55 / 0 | cm |
| D04-D-OUTLET | House-drain outlet level | hydraulic | 3.9 / -0.55 / 0 | cm |
| D05-D-OUTLET | House-drain outlet level | hydraulic | 3.9 / -0.55 / 0 | cm |
| D06-D-OUTLET | House-drain outlet level | hydraulic | 3.9 / -0.55 / 0 | cm |
| SITE-RAIN | Site rain gauge | hydraulic | 0 / 1.2 / 0 | mm / 10 min |
| B-01-TEMP-10 | Pile temperature probe, shallow | thermal | -0.8 / 0.65 / -0.25 | °C |
| B-01-TEMP-50 | Pile temperature probe, deep | thermal | -0.4 / 0.8 / 0.2 | °C |
| B-01-AIR | Air temperature probe | thermal | 3.2 / 1.1 / -0.9 | °C |
| B-01-MOIST | Capacitive pile moisture sensor | thermal | -1 / 0.55 / 0.25 | relative % |
| B-01-MANUAL | Manual squeeze and smell log | human/seeded | -0.3 / 1.1 / 0.45 | human log |
| B-01-SCALE | Intake scale | human/seeded | -3.4 / 0.55 / -0.8 | kg |
| B-01-PHOTO | Intake photo and human checklist | human/seeded | -3.4 / 1 / -0.5 | checklist |
| B-01-SUMP | Leachate sump level | thermal | 1.6 / -0.15 / 1.5 | cm |
| B-01-CURING | Curing temperature probe | thermal | 2.4 / 0.45 / 0.1 | °C |
| B-01-RAIN | Rain gauge reference feed | hydraulic | 3.2 / 1.2 / -0.55 | mm / 10 min |
| B-01-VIS-intake | Manual visual / stock check | human/seeded | -3.4 / 0.5 / 1.05 | human log |
| B-01-VIS-bay | Manual visual / stock check | human/seeded | -2.55 / 0.5 / 1.05 | human log |
| B-01-VIS-bulking | Manual visual / stock check | human/seeded | -1.7 / 0.5 / 1.05 | human log |
| B-01-VIS-cover | Manual visual / stock check | human/seeded | -0.85 / 0.5 / 1.05 | human log |
| B-01-VIS-base | Manual visual / stock check | human/seeded | 0 / 0.5 / 1.05 | human log |
| B-01-VIS-sump | Manual visual / stock check | human/seeded | 0.85 / 0.5 / 1.05 | human log |
| B-01-VIS-curing | Manual visual / stock check | human/seeded | 1.7 / 0.5 / 1.05 | human log |
| B-01-VIS-weather | Manual visual / stock check | human/seeded | 2.55 / 0.5 / 1.05 | human log |
| B-02-TEMP-10 | Pile temperature probe, shallow | thermal | -0.8 / 0.65 / -0.25 | °C |
| B-02-TEMP-50 | Pile temperature probe, deep | thermal | -0.4 / 0.8 / 0.2 | °C |
| B-02-AIR | Air temperature probe | thermal | 3.2 / 1.1 / -0.9 | °C |
| B-02-MOIST | Capacitive pile moisture sensor | thermal | -1 / 0.55 / 0.25 | relative % |
| B-02-MANUAL | Manual squeeze and smell log | human/seeded | -0.3 / 1.1 / 0.45 | human log |
| B-02-SCALE | Intake scale | human/seeded | -3.4 / 0.55 / -0.8 | kg |
| B-02-PHOTO | Intake photo and human checklist | human/seeded | -3.4 / 1 / -0.5 | checklist |
| B-02-SUMP | Leachate sump level | thermal | 1.6 / -0.15 / 1.5 | cm |
| B-02-CURING | Curing temperature probe | thermal | 2.4 / 0.45 / 0.1 | °C |
| B-02-RAIN | Rain gauge reference feed | hydraulic | 3.2 / 1.2 / -0.55 | mm / 10 min |
| B-02-VIS-intake | Manual visual / stock check | human/seeded | -3.4 / 0.5 / 1.05 | human log |
| B-02-VIS-bay | Manual visual / stock check | human/seeded | -2.55 / 0.5 / 1.05 | human log |
| B-02-VIS-bulking | Manual visual / stock check | human/seeded | -1.7 / 0.5 / 1.05 | human log |
| B-02-VIS-cover | Manual visual / stock check | human/seeded | -0.85 / 0.5 / 1.05 | human log |
| B-02-VIS-base | Manual visual / stock check | human/seeded | 0 / 0.5 / 1.05 | human log |
| B-02-VIS-sump | Manual visual / stock check | human/seeded | 0.85 / 0.5 / 1.05 | human log |
| B-02-VIS-curing | Manual visual / stock check | human/seeded | 1.7 / 0.5 / 1.05 | human log |
| B-02-VIS-weather | Manual visual / stock check | human/seeded | 2.55 / 0.5 / 1.05 | human log |
| B-03-TEMP-10 | Pile temperature probe, shallow | thermal | -0.8 / 0.65 / -0.25 | °C |
| B-03-TEMP-50 | Pile temperature probe, deep | thermal | -0.4 / 0.8 / 0.2 | °C |
| B-03-AIR | Air temperature probe | thermal | 3.2 / 1.1 / -0.9 | °C |
| B-03-MOIST | Capacitive pile moisture sensor | thermal | -1 / 0.55 / 0.25 | relative % |
| B-03-MANUAL | Manual squeeze and smell log | human/seeded | -0.3 / 1.1 / 0.45 | human log |
| B-03-SCALE | Intake scale | human/seeded | -3.4 / 0.55 / -0.8 | kg |
| B-03-PHOTO | Intake photo and human checklist | human/seeded | -3.4 / 1 / -0.5 | checklist |
| B-03-SUMP | Leachate sump level | thermal | 1.6 / -0.15 / 1.5 | cm |
| B-03-CURING | Curing temperature probe | thermal | 2.4 / 0.45 / 0.1 | °C |
| B-03-RAIN | Rain gauge reference feed | hydraulic | 3.2 / 1.2 / -0.55 | mm / 10 min |
| B-03-VIS-intake | Manual visual / stock check | human/seeded | -3.4 / 0.5 / 1.05 | human log |
| B-03-VIS-bay | Manual visual / stock check | human/seeded | -2.55 / 0.5 / 1.05 | human log |
| B-03-VIS-bulking | Manual visual / stock check | human/seeded | -1.7 / 0.5 / 1.05 | human log |
| B-03-VIS-cover | Manual visual / stock check | human/seeded | -0.85 / 0.5 / 1.05 | human log |
| B-03-VIS-base | Manual visual / stock check | human/seeded | 0 / 0.5 / 1.05 | human log |
| B-03-VIS-sump | Manual visual / stock check | human/seeded | 0.85 / 0.5 / 1.05 | human log |
| B-03-VIS-curing | Manual visual / stock check | human/seeded | 1.7 / 0.5 / 1.05 | human log |
| B-03-VIS-weather | Manual visual / stock check | human/seeded | 2.55 / 0.5 / 1.05 | human log |
