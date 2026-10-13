# Review round 1 — local revision

The user approved CODEX_FIX_PROMPT.md except its colour changes and explicitly asked not to push. Work is saved in local commits on `codex/drain-trial-console`; the GitHub destination remains `tanchinqian/drain-stuff`.

## Changes by task

1. **Rainfall colour replacement — excluded by the user.** Existing seven-colour radar clouds, Plan raster, bins and legend remain. Numeric zone rainfall is visible in a separate non-overlapping zone selector.
2. **Storm colour replacement — excluded by the user.** Cyan water and existing simulation colours and behaviour remain.
3. **Overview.** Plain title, open-fault attention count, compact fault links, map on the left and faults on the right on desktop, faults first on mobile. One searchable house control covers pilot and mapped houses. Rainfall and infiltration remain visible; other charts and the fault-type table are under More charts. Charts without usable data show an explicit empty state. Zone selectors no longer overlap projected map labels.
4. **Detail.** The part model precedes the collapsed, explicitly illustrative S1 storm. Operator mode hides movement, numeric shifts, section axes, cut coordinates and raw sensor positions. Debug has X/Y/Z section buttons. Sensor markers start off and show only the selected part unless Debug is active. Sensor rows have Details disclosures; diagnosing input appears once.
5. **Highlights.** Flagged mesh edges use solid oxblood fault outlines with hatching, dashed ochre watch outlines or dotted ink-grey sensor outlines. Numbered triangle, circle and diamond markers accompany the treatments; the part list uses the same displayed status. Healthy parts fade to 40% in Troubleshoot. Uninstalled/unmonitored parts have no fault outline and explain the need for visual checking. The provenance box shows inputs, rule, time and either a configured placeholder threshold or an explicit non-numeric trigger. This does not claim that every visual or human fault is an automatically measured condition.
6. **Repair prompts.** Fault-specific draft steps cover all current fault types. They retain surface-only access, owner/trained-operator responsibility, sensor verification, maturity gates and local procedures. Technical terms such as filter sock, underdrain and leachate are explained. Manual follow-up replaces the supplied example's unsupported claim that the console automatically performs a field re-test.
7. **Compost.** Model, Readings and Checks tabs support arrow/Home/End keyboard navigation. Unsaved form values survive tab switches. Photo controls use labelled buttons, show filenames, and keep file type/size checks. Model view settings reset when its tab is reopened; saved records are retained.
8. **Clarity.** Proxy readings carry inline explanations; compost moisture entry/history explains relative wetness and manual calibration. Sensor suspect/offline shapes are diamonds. Limits explain the simulation, alerts and manual checks. Existing navigation already matches the requested names. No Sock index label exists in the current React source, so no invented score was added.
9. **Evidence.** Tests cover mobile attention order, model/storm order, Debug visibility, fault treatments, compost tabs, proxy/form accessibility, uploads and preservation of the approved palette. Desktop/mobile screenshots are refreshed in `docs/screens/`.

## Decisions and limits

- The requested global blue/green/cyan rejection test and brown legend allowlist would contradict the user's colour exception. They are replaced with checks preserving the approved radar colours.
- The API contract remains 2.0.0 and `app/src/api/types.ts` is unchanged. Mock records, attribution, synthetic labels and allocation gates remain.
- Fault age uses the fixed demo clock. Search does not change a selected record. Show all and Reset parts remain available as recovery controls in Operator mode.
- All thresholds and geometry are illustrative, not surveyed or calibrated. No physical probes, touch hardware, flood prediction or authority-approved repair procedure was validated.
- The Impeccable detector remains unavailable after its earlier Windows launcher failure (`cache_directory_failed`); manual capture review is used, not a claimed detector pass.

## Verification

Each completed functional stage ran production build, lint, unit tests and the browser suite before its local commit. The final run passed the production build, lint, all 18 unit tests and all 12 browser tests, including wheel zoom at desktop and mobile sizes. Fresh screenshots cover Overview, drainage detail and all three compost tabs. The fresh independent finish review returned **Ship**, with no material fixes on the supplied desktop/mobile captures and sampled source. This is a scoped manual review, not an exhaustive interaction audit or detector pass; the detector did not run because of `cache_directory_failed`.

## Design-system handoff

This is an ordinary refinement of the incumbent Map desk system. Source sampling checked `app/src/styles.css`, `Overview.tsx`, `ModelWorkspace.tsx` and `PartHighlight.tsx` against `PRODUCT.md`, `DESIGN.md` and `.impeccable/design.json`. Cream surfaces, brown ink, Archivo sizes, small corners, native fields and shape-plus-text status remain in use. The approved radar rainfall palette and cyan storm water remain intentional exceptions to the rejected colour tasks. `DESIGN.md` and its sidecar are preserved.

Recorded drift remains explicit: the design record describes separate House/Map house selectors and a native section-axis selector, while the current implementation uses one house selector and X/Y/Z buttons in Debug. There are now **17 SearchableSelect call sites**; the 19-site count in the earlier search documents is historical. The design record also predates the current attention-first mobile order, Operator/Debug separation, compost tabs and patterned fault outlines. Its rainfall-only colour wording and breakpoint inventory already omitted cyan storm water and the local 600px storm rule; current source also has local 600px zone and 900px attention layout rules. These task-specific differences are recorded here without rewriting the incumbent system or turning a local refinement into a global design rule.
