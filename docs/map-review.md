# Overview map finish review

Disposition: **ship** — the one material Plan marker overlap is resolved. This verdict covers the requested Overview extension and the reviewed interaction evidence.

## persistence

Reviewed the current `PRODUCT.md`, `DESIGN.md`, Impeccable craft floor, Overview, neighbourhood scene, Plan map, site layout, rainfall field, selected-house records and map-model documentation. This is an extension of the established cream/brown Archivo operator console. The accepted world is preserved, with radar colours confined to the rainfall data layer. No replacement concept, approved-comp comparison, raster build gate or concept tournament applies.

The scope is explicitly the Phase 1 Gamelan / Rodat housing window. The interface identifies 589 mapped footprints and 24 synthetic pilot assignments, names the OSM source and states that height, drainage locations and weather are illustrative. The selected mapped-house record distinguishes public geometry from a pilot record and provides its source footprint link. `docs/MAP_MODEL.md` explicitly limits the boundary and calls roofs illustrative. No surveyed installation or live radar claim is introduced.

## fidelity

Opened both required full-page captures from the absolute project path: `.impeccable/review/desktop.png` at 1440 × 2628 and `.impeccable/review/mobile.png` at 360 × 5500. Also opened `.impeccable/review/plan-desktop.png` and the supplied radar palette reference. These captures are usable evidence; recapture is not the disposition.

The desktop map shows connected terrace rows, their road network and restrained geometric roofs. The Plan capture makes the mapped footprint pattern clear. Both views use the same source layout and edited positions. The irregular coloured rainfall field replaces the rigid zone blocks; its 3D mesh is raised above the houses. Cloud opacity is visible and adjustable, and source excludes the cloud from hit testing in both views.

S1/S2/S3 have prominent native links and 44-pixel native 3D pins. The mobile capture stacks those links, keeps the rainfall controls readable and preserves direct pins without crowding them with secondary labels. Native house selectors provide keyboard access alongside the dense site view. The established type, paper tones, focus styling and control grammar remain coherent.

## ceiling

This review consumes the second and final self-QA round. Do not start another aesthetic variation or general polish loop. The Windows detector launcher was attempted once and failed with `The system cannot find the batch label specified - cache_directory_failed`; **no detector ran**.

I reviewed captures and source, without a live browser. The implementation agent reports passing axe/overflow checks on five pages; direct 3D S1/S2/S3 pin paths at 1440 and 360; a Canvas click selecting mapped house `OSM-1174511531` at x=-14.714, z=9.714; dragging, numeric editing and Reset layout; and corresponding Plan polygon movement. Those are reported browser results, not checks independently executed by this reviewer. The earlier `OSM-1174511415` house test used a point behind S3 and is superseded by the successful clear target. Individual Plan I1/T1/T2 hit targets were not initially exercised. The captured overlap below supplied defect evidence without treating that missing test as a failure.

## material_fixes

**P2 — separate the Plan I1/T1/T2 pins — resolved.** In the initial `plan-desktop.png`, since refreshed, the two tree-pit rectangles covered the lower portion and text of the inlet-chamber I1 pin. Its identity could not be read at a glance and much of its intended pointer target was intercepted by the later SVG elements. The initial `app/src/components/PlanMap.tsx:122` placed each 44 × 44 marker at its feature geometry and rendered them in sequence, producing the visible overlap. Native buttons below the map kept the record reachable, so this was a local inspection defect rather than a blocked application.

Use separated Plan callout positions and leader lines for those three secondary features while retaining their actual illustrative geometry. The existing 3D `featureCallouts` arrangement offers a consistent placement model. Preserve the requested prominence of S1/S2/S3, keep the current palette and native alternatives, and limit the repair to marker placement. No rebuild is warranted.

**Repair confirmation:** Opened the refreshed `plan-desktop.png` and checked the current Plan source only against this finding. I1, T1 and T2 are fully readable, separated dark markers. Plan now shares the 3D `featureCallouts` positions, and non-intercepting SVG leader lines retain the connection to the illustrative feature locations. The implementation agent reports that all six Plan pin rectangles have no overlap and that all five browser checks pass after this repair, covering direct house click/drag, reset, matching Plan edits, S1/S2/S3 at desktop/mobile sizes, zoom and axe/overflow. No new defect hunt was performed.

## keep

- The cream/brown Archivo console and existing page hierarchy.
- The directly selectable S1/S2/S3 links and native scene buttons, including their mobile presentation.
- The offline mapped roads, source footprints and terrace arrangement, with stable public source IDs.
- The irregular raised radar layer, opacity control, rainfall legend and click-through implementation.
- Explicit separation of mapped geometry, synthetic pilot assignments and illustrative roofs, heights, weather and drainage locations.
- Shared local house edits, Plan alignment, reset behavior and the existing sensor and trial records.

**Final verdict: ship.** The sole material finding is closed. The refreshed Plan capture and source support this closure; the reported browser checks support the reviewed interaction paths. Detector evidence remains unavailable as stated above. No broader whole-app claim is made.
