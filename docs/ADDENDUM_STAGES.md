# Addendum implementation stages

The accepted `CODEX_ADDENDUM.md` was applied to the local React app in three stages, preserving the existing cream and brown Archivo Map desk console. The separately published Sites visualization is an exact uploaded attachment and has separate source and hosting identity.

| Completed stage | Result | Commit |
| --- | --- | --- |
| 1. Sensor contract, register and rules | Contract 2.0.0, stable sensor and human input IDs, positions, readings and units, calibration/method checks, drift, trust and proxy/reference roles; filterable `/sensors`; linked inspection rules and browser-local migration. | `b439cdc` |
| 2. Full drainage and compost models | Sixteen separate drainage groups and eight compost groups at `/feature/:id` and `/batches/:bay`; shared selection, explode, section, movement, isolation, hiding and reset controls; explicit “Not installed” optional parts. | `2ef910a` |
| 3. Sensor layers, fault provenance and limits | Sensor layer toggles, site/assembly markers and keyboard lists; selected-part readings; diagnosing input IDs and trust at alert; suspect sensor warning; About limits and excluded sensors; unit and browser coverage. | `6ec34b4` |

## Verification record

- Strict production build and lint passed.
- All twelve unit tests passed across two files, including the regression for repaired cached sensor units with retained trust, calibration and drift.
- All three Playwright checks passed: existing operator/allocation flow; sensor row and site marker coverage, filters and sixteen/eight model parts; compost human checks and sensor fault provenance.
- Axe WCAG A/AA checks passed on Overview, Detail, Compost, Sensors and Faults. Document overflow checks passed at 360px. Ten refreshed desktop/mobile captures are in `docs/screens/`; Overview, Detail and Compost captures are full page, while Sensors and Faults capture the first viewport.
- The independent finish reviewer requested symbol/encoding repairs, readable mobile coordinate controls and durable PRODUCT context. The refreshed review records all three resolved and `disposition: ship`. Its final verdict covers those three fixes, not a fresh audit of the entire app; see `docs/addendum-review.md`.
- The Impeccable detector did not run because its Windows launcher reported `The system cannot find the batch label specified - cache_directory_failed`.

## Evidence boundaries

The browser checks and review validate the implemented synthetic console within their stated scope. They do not test real probes, hardware calibration, field measurements, surveyed geometry or Malaysian treatment outcomes. No Lighthouse score is claimed. Schematic dimensions, layer depths, thresholds and practitioner prompts remain subject to local confirmation; manual squeeze/smell logs, photos and fixed-point infiltration tests are human records.

`PRODUCT.md` preserves the accepted specification. `DESIGN.md` and `.impeccable/design.json` document actual reused tokens and components from the current source. The map extension adds the user-approved seven-colour radar palette for simulated rainfall clouds and their legend; the surrounding cream and brown Archivo console remains established.

## Wheel zoom correction

The first wheel movement previously clamped the fitted camera to an absolute maximum zoom of 3.5, making the models tiny. The shared camera component now keeps zoom between 0.6 and 3.5 times each viewport's fitted zoom. Scroll speed is reduced, and Reset view restores the fitted scale.

All four browser checks passed after the fix. The new regression covers the household, drainage and compost views at 1440px and 360px, including the first wheel movement, repeated scrolling to both limits and Reset view. Physical trackpad gestures were not tested.

## Household map extension

Overview now uses the bounded Phase 1 Gamelan / Rodat map with direct S1/S2/S3 trial links, separated feature callouts, native pilot and mapped-house selectors, local selected-house movement and adjustable simulated rainfall clouds. Source attribution, geometry limits and synthetic assignment boundaries are recorded in [MAP_MODEL.md](MAP_MODEL.md). The radar palette exception and implemented map controls are recorded in `DESIGN.md` and `.impeccable/design.json`.

The strict production build, lint and all fourteen unit tests passed after the final Plan callout correction. All five browser checks passed. The map-specific check covers direct Canvas selection and dragging of `OSM-1174511531`, numeric position changes and reset, all six Plan pins without overlap, Plan polygon updates and S1/S2/S3 selection at desktop and mobile sizes. The suite also retains the existing operator/allocation, sensor/register/model, axe and zoom-limit checks.

The independent map finish review records `disposition: ship`; its final scope is the Plan secondary callout overlap correction. See [map-review.md](map-review.md).
