# Phase 1 household map

Overview displays a bounded Gamelan / Rodat housing window in Bandar Bukit Raja Phase 1, using an offline OpenStreetMap extract retrieved on 13 October 2026. Google Maps was inspected to compare the surrounding streets. This describes current Round 3 behavior; moving houses and static weather are superseded.

## Geometry and records

- 589 mapped footprints and 111 road ways retain OSM IDs. Plan preserves polygons; 3D approximates them with oriented buildings/gable roofs and illustrative heights.
- Twenty-four generated pilot IDs occupy fixed footprints. Zones A–D and S1/S2/S3/I1/T1/T2 are monitoring assignments, not surveyed installations or identified participants.
- Only the **24 pilot houses** have hover, selection and records. Context houses have no selection, editing, pilot readings or invented sensors. Six feature pins/links remain destinations; optional sensor markers have their own interaction layer.
- Both views use fixed placement. Move houses, position fields and Reset layout are removed. Reset view restores the camera. Migration refreshes positions while preserving checks, faults, tests, allocations, calibration and trust.
- One model unit is 20 metres relative to 3.08495° N, 101.43130° E, using a local approximation rather than survey projection. The 1.32 km × 560 m window is not the full Phase 1 boundary/inventory.

## Selection and filtering

Pilot houses have hover highlight, selected outline/copper treatment and legend. A long-list combobox provides keyboard selection. The non-modal drawer shows drain, up to five relevant readings, faults and nearest feature, with More access. Close, Esc, map background or another selection dismisses/changes it. Native feature links and Plan controls preserve phone/keyboard access.

All / A / B / C / D scopes house choices, faults and charts and outlines the zone. Water after 6 h remains independent; zone filtering does not activate it. Fixed map geometry does not establish hydraulic connectivity; feature workers retain illustrative catchments/network graphs.

## Dated rainfall layer

Overview requests `/rainfall/zones?from&to`, `/rainfall?from&to&step=10m`, field readings and faults for Last storm, 7 days or 8 weeks. Unresolved faults carry across windows; closed faults are date-filtered. Zone labels show mm/h. Playback maps the selected history window onto the shared clock duration and chooses each zone's latest sample at/before that time. Historical rainfall and the entered scenario hyetograph are separate inputs, not asserted identical.

Both views render inverse-distance interpolation between dated zone samples with bounded edge coverage. Procedural sine noise and the static peak field are removed. This display is not a forecast, real radar, full gridded product or neighbourhood solver. Optional `/rainfall/grid` is not implemented/requested.

All seven radar colours remain approved. Rainfall layer opacity is 0–75% in 5% steps, default 55%; the wrapping legend labels mm/h bins. Clouds permit pointer access through to the map. Mock samples are generated ten-minute rainfall scaled by zone peaks, ending at fixed `dataThrough` 12 October 2026, 09:40 Singapore. A configured API can supply the same contract; source notice belongs on About.

## Provenance and rebuild

[Map location](https://www.openstreetmap.org/#map=17/3.08495/101.43130) · [Google Maps comparison](https://www.google.com/maps/@3.08495,101.43130,16z) · [OSM extract](https://api.openstreetmap.org/api/0.6/map?bbox=101.426,3.082,101.440,3.091)

The database is available under ODbL 1.0; see `app/src/site/LICENSE.md`. Geometry reads committed JSON offline with no map-network request. Rainfall uses the shared API client/fallback described in BACKEND_HANDOFF.md; no external radar service is integrated.

To rebuild, download bounded XML to ignored `app/site-source-osm.xml` and run `app/scripts/import-site.py` with Python. Conversion retains outlines, roads, mapped water/park areas and IDs, clips roads and records generated pilot assignments. Attribution remains beside the map.
