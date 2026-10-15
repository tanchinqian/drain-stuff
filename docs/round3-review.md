# Round 3 review and documentation record

## Approved scope

CODEX_ROUND3_PROMPT.md was approved except all colour changes: “other than the color the others can be included”. The established Operate Map desk identity, cream/brown Archivo, seven radar colours and cyan water are preserved. DESIGN.md and its sidecar are merged for durable implemented component/layout changes rather than replaced with a new world.

## Implementation and verification evidence

Local commits: `22f9c2b` (records/API/faults), `7b9e748` (map/charts), `13ceffa` (trials/compost), `f87629f` (water/details/final checks). The implementation owner reported build/lint passed, 50 unit tests across 9 files, all 23 browser checks, then all 8 targeted Round 3 checks following the final fault-count assertion and guidance capture update. Coverage included axe on eight pages × 1440/1920/360px, zoom on three models × two sizes, record writes and shared worker/clock/water behavior. These are executed implementation results, not new tests run by the documentation pass.

Review evidence is in `.impeccable/review/round3/`: overview, trials, batches, compost, sensors, faults, detail and about at 1440, 1920 and 360px (24 captures), plus `standing-water-review-1440.png` and `glossary-review-1440.png`. The documentation pass sampled Overview 1440, Trials 360 and Detail 1920 alongside current source, API handoff and existing design records.

Initial independent review scored two fixes: remaining standing-water copy and T2 click readiness. Both were corrected. The same 24 captures were refreshed and the expanded guidance evidence supplied. Final independent disposition: **SHIP; no remaining scored items**. This verdict is limited to those two fixes, not a fresh whole-app audit or complete accessibility certification.

The Impeccable context launcher failed with `cache_directory_failed`. Context was read directly; the detector did not run, and no launcher repair was attempted.

## Durable rules recorded

Wide 1760px/12-column surface; 220px master-detail list; shared DataTable search, multi-select, sort, saved columns, selection, 25-row pagination, density and CSV; non-modal drawers; native selects for fewer than eight options and one combobox for long lists; glossary popovers; formatted values and dated save/history feedback. Only pilot houses are selectable and all houses are fixed. Date/zone filters and API zone samples drive map/chart records. About owns the source notice.

Water uses short strokes, engine depth, equivalent soil shading, local-head partial pipe fill and discharge-width arrows; flow strip and recorded pink amendment remain. Model details has six collapsed parameter groups. Conductivity follows trial mean/sample count unless manually overridden, never dose. Sensors shows saved API latest readings/history; eligible feature virtual readings remain local scenario overlays. Contract 3.0.0 and backend responsibilities are recorded in BACKEND_HANDOFF.md.

## Material limits and unrecorded promises

No surveyed calibration, signed-off coefficients, deployed backend/probe integration, complete thermal compost UI or rainfall-grid endpoint is claimed. Dated zone interpolation is not live radar; historical rainfall is distinct from scenario weather. Forebay/sock share an upstream level; soil shading is not a resolved front and pipe fill is not a longitudinal solver. Manual observations stay human. No flood-reduction percentage, general compost efficacy or Lighthouse score is claimed.

No new identity, palette, motion scale or invented token ramp was canonized. Existing token primitive values are preserved; sidecar metadata/samples now reflect tables, status chips and non-modal drawers, including the implemented structural drawer shadow. Older stage records remain explicitly historical. This documentation pass made no UI/source edits, tests, commit or push and preserved the backend handoff/changelog/JSON examples.
