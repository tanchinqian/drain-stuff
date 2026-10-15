# Addendum implementation stages

> Historical record: sections before Round 3 describe the implementation and checks at that time. Round 3 below and PRODUCT.md, DESIGN.md, MAP_MODEL.md, PHYSICS_MODEL.md and BACKEND_HANDOFF.md supersede conflicting claims about data badges, moving houses, static rainfall, contract 2.0.0, control patterns, particle water and Sensors playback overlays.

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

## S1 storm extension

S1 now includes adjustable rain intensity (0–120 mm/h), duration (5–120 minutes), outlet blockage (0–100%), playback and a timeline extending 180 minutes after rain. A schematic follows water from houses through the inlet, soil layers and outlet, with numerical flow, ponding and cumulative overflow. The detailed drainage assembly remains below, reached directly through **Inspect drainage parts**. [STORM_SIMULATION.md](STORM_SIMULATION.md) records operation, storage assumptions and limits.

The implementation owner reports build, lint, all 16 unit tests and one targeted browser check at 1440 px and 390 px passed. The new unit coverage checks water balance, bounded storage, zero rainfall and a meaningful blocked-versus-clear ponding difference at minute 180. This storm pass does not claim a full browser-suite rerun. The [desktop](../.impeccable/review/storm-desktop.png) and [mobile](../.impeccable/review/storm-mobile.png) captures show the fully blocked scenario at minute 45 and the preserved assembly. The independent [storm review](storm-review.md) records **Ship** on source and screenshot evidence; the design detector remained unavailable with `cache_directory_failed`.

The extension preserves the established cream/brown Archivo console and reuses existing cyan for physical water data. DESIGN.md and `.impeccable/design.json` remain unchanged. Their rainfall-only color wording and shared breakpoint inventory do not yet describe this water use and the local 600 px storm stacking rule; those differences are recorded in the storm document without a design-system rewrite. The model is illustrative and uncalibrated, and its outputs do not change sensor or trial records.

## Review round 1 — current local refinement

The user approved `CODEX_FIX_PROMPT.md` except colour tasks 1 and 2 and explicitly requested no push. Earlier stages and their verification counts above remain historical records. The current refinement preserves the cream/brown console, seven-colour rainfall field and cyan storm water.

| Completed stage | Result |
| --- | --- |
| Overview and model controls | Open faults lead on phones; desktop keeps map and fault rail side by side. One searchable house selector, collapsed secondary charts, model before the collapsed storm, and simpler Operator controls with advanced settings in Debug. |
| Fault evidence and repair prompts | Shape, patterned outlines and written states identify flagged parts; provenance explains inputs and triggers. Fault-specific repair drafts retain manual follow-up and local safety responsibilities. |
| Compost and clarity | Keyboard-accessible Model, Readings and Checks tabs, retained unsaved form values, labelled photo controls, and inline proxy/calibration explanations. |
| Verification and finish review | Final production build and lint passed, with all 18 unit tests and all 12 browser tests. Fresh desktop/mobile captures cover Overview, drainage detail and all three compost tabs. Independent manual review returned **Ship**, with no material fixes in supplied captures and sampled source. |

The detector remained unavailable with `cache_directory_failed` and did not run. The manual disposition is limited to its reviewed evidence. The current source has 17 searchable dropdown call sites following house-selector consolidation and section-axis buttons; earlier search documents record their original 19-site stage. [The fix-round record](fix-round-1.md) records decisions, review scope and design-document drift. `DESIGN.md` and `.impeccable/design.json` remain preserved; this documentation handoff made no source or test changes and performed no commit or push.

## Round 3 — current approved implementation

The user approved CODEX_ROUND3_PROMPT.md except **all colour changes**. Cream/brown Archivo, seven radar colours and cyan water remain. This is a system component/layout refinement within Map desk, not a replacement identity. Earlier stage counts and behavior above remain historical.

| Local commit | Result |
| --- | --- |
| `22f9c2b` | Shared records, API discovery/fallback, contract 3.0.0, sensor detail/history, fault registry/manual reports/status audit and feedback. |
| `7b9e748` | Fixed pilot-only house interaction, zone/range-driven records, dated zone rainfall interpolation, chart legends/labels and non-modal house detail. |
| `13ceffa` | Five trial records, readiness/actions/safety drawers, batch/compost master-detail, computed prompts, segmented human checks and history. |
| `f87629f` | Water strokes/shading/pipe fill/flow strip, recorded amendment and Model details, final checks and the two scored finish fixes. |

Final implementation verification reported production build/lint passed, 50 unit tests across 9 files and all 23 browser checks. Browser coverage includes eight-page axe/overflow at 1440/1920/360px, three-model zoom at two sizes, shared worker/clock/water and record flows. All 8 targeted Round 3 checks then passed after adding the Overview fault-count assertion and expanded guidance capture. No new tests were run for this documentation merge.

Independent initial review of 24 captures identified two scored items: remaining standing-water copy and T2 click readiness. Both were fixed. Re-review of the same 24 refreshed captures plus expanded standing-water/glossary guidance returned **SHIP**, with no remaining items. This final verdict covers the two scored fixes, not a fresh whole-app audit. See [round3-review.md](round3-review.md).

The context launcher reported `cache_directory_failed`; the detector did not run and was not repaired. No push occurred. Contract docs describe a local mock plus optional API transport, not a deployed backend. Optional rainfall grid, surveyed calibration and fully integrated compost thermal UI are not implemented. Current saved/API sensor records remain separate from feature virtual readings; dose never changes conductivity. Mock dataThrough stays fixed while new writes use wall-clock time and due status uses today's Singapore calendar day.
