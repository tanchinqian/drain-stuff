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

`PRODUCT.md` preserves the accepted specification. `DESIGN.md` and `.impeccable/design.json` document actual reused tokens and components from the current source, with no change to the app's visual world.
