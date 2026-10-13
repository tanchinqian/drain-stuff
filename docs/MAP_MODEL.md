# Phase 1 household map

The local Overview now displays a bounded Gamelan / Rodat housing window in Bandar
Bukit Raja Phase 1, using an offline OpenStreetMap extract retrieved on 13 October
2026. Google Maps was inspected to compare the surrounding Gamelan, Makyong,
Rodat and Persiaran Sungai Keramat street pattern.

## Geometry and records

- 589 mapped house footprints and 111 road ways, with original OSM IDs.
- Plan polygons retain the source footprints. The 3D view approximates each footprint
  with an oriented building and gable roof; building heights are illustrative.
- Twenty-four existing synthetic pilot household IDs are assigned to mapped footprints.
  Zones A–D and S1/S2/S3/I1/T1/T2 remain synthetic monitoring assignments. They do not
  identify surveyed installations or real participating households.
- Other mapped houses have source geometry and local position editing only. No pilot
  readings, ownership claims or sensor records are generated for them.
- Both views use the same placement and local edits. Reset layout restores the map.
- Existing browser-local checks, faults, trial tests, allocations, calibration and sensor
  trust records survive the geometry refresh.
- One model unit represents 20 metres relative to 3.08495° N, 101.43130° E. Coordinates
  use a local approximation, not a survey projection. The window is 1.32 km by 560 m;
  it does not represent the complete Phase 1 boundary or every building in the area.

## Rainfall and interaction

S1, S2 and S3 have direct trial links and large scene pins. All houses can be selected
through the map or native selectors. In Move houses, select a house and drag the
highlighted building, or edit its position fields. Changes affect the local display.

The rainfall view uses an irregular raised weather surface in 3D and the same raster
field in Plan. Radar colours are explicitly authorized by the user for this data layer.
Cloud opacity can be set from 0% to 75%. The field is a deterministic illustrative
interpolation of synthetic zone peak values with spatial variation. It is not live
radar, a forecast, a storm time sequence or a hydrological simulation. Clouds do not
intercept clicks. Water after 6 h highlights only the relevant pilot households.

## Data provenance and rebuild

[Map location](https://www.openstreetmap.org/#map=17/3.08495/101.43130) ·
[Google Maps comparison](https://www.google.com/maps/@3.08495,101.43130,16z) ·
[OSM extract](https://api.openstreetmap.org/api/0.6/map?bbox=101.426,3.082,101.440,3.091)

The exported map database is available under ODbL 1.0; see `app/src/site/LICENSE.md`.
The app reads the committed JSON offline and makes no map or weather network request.
To rebuild the extract, download the bounded OSM XML to `app/site-source-osm.xml`
and run `app/scripts/import-site.py` with Python. The raw input is a local ignored cache.
The conversion retains house outlines, road segments, mapped water/park areas and
source IDs, clips roads to the window and records the synthetic pilot assignments.
