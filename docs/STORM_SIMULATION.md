# S1 illustrative storm simulation

The S1 detail page (`/feature/S1`) adds **Try a storm at S1** above its existing drainage assembly. It demonstrates how rain, finite storage and outlet blockage affect ponding. It is not a flood forecast, calibrated hydraulic model or evidence of compost treatment performance. S2 and S3 retain their existing detail views.

## Use the controls

| Control | Range and step | Initial value |
| --- | --- | --- |
| Rain intensity | 0–120 mm/h, steps of 5 | 60 mm/h |
| Rain duration | 5–120 minutes, steps of 5 | 45 minutes |
| Outlet blockage | 0–100%, steps of 10 | 0% |

1. Choose the three settings. Changing any setting pauses playback and returns to minute zero with empty storage.
2. Select **Play storm**. Each 150 ms of playback advances one simulated minute. **Pause storm** holds that frame; **Reset storm** returns to minute zero while keeping your settings.
3. Drag the **Storm timeline** to inspect a minute directly; scrubbing pauses playback. The timeline ends 180 minutes after the selected rain duration, even if water remains. At the end, **Replay storm** starts the same scenario again.
4. Compare clear and blocked outlets at the same elapsed minute. For example, keep 60 mm/h and 45 minutes, then inspect minute 180 with 0% and 100% blockage. Changing blockage resets time, so scrub back to minute 180 for each comparison.
5. Select **Inspect drainage parts** to jump to the detailed assembly below. Its part selection, exploded/assembled/cross-section views, sensor records and inspection actions remain available.

Water beads identify active runoff, infiltration and outlet paths; their positions follow the selected minute. Cyan surface volume depicts ponding with visually exaggerated depth. Read the numerical values for quantities: runoff, infiltration and outlet are L/min, ponding is mm, and **Total overflow** is cumulative litres. The initial frame is dry and marked Ready. Rain continues through the selected final rain minute; the next minute begins the draining interval.

## Model assumptions

| Assumption | Implemented value |
| --- | --- |
| Household catchment | 120 m² |
| Runoff fraction | 85% |
| Bed area | 18 m² |
| Maximum surface ponding | 250 mm, equivalent to 4,500 L |
| Media storage | 1,800 L |
| Maximum infiltration into media | 60 mm/h over the bed, equivalent to 18 L/min |
| Clear outlet capacity | 15 L/min |
| Initial storage | Empty surface and media |
| Time step | One minute |

For each minute, uniform rainfall contributes runoff to surface storage. The outlet first removes available water from media at its capacity multiplied by the unblocked fraction. Surface water then enters media, limited by available surface water, infiltration capacity and remaining media space. Surface water above the ponding limit leaves as overflow. Input equals surface storage plus media storage plus cumulative discharge plus cumulative overflow, within numerical precision. This conservation rule does not establish conservative flood-risk predictions.

Full blockage prevents outlet discharge. Media can continue filling until its capacity limits infiltration; retained surface water may therefore persist after rain stops. There is no separate evaporation, deep drainage, groundwater exchange, sediment transport, surveyed routing or calibrated soil response. Overflow leaves the model and is not routed downstream. The three house shapes and layer geometry are explanatory schematics, not surveyed catchment boundaries or construction dimensions.

The scenario uses local component state and does not write sensor readings, fault records, trial allocation or field observations. It does not use the Overview's static synthetic radar field as its rainfall input. Local design checks against MSMA and the authority, field measurements and calibration are still required for engineering conclusions.

## Design consistency and documentation drift

Source and the desktop/mobile captures retain the cream and brown Map desk surfaces, Archivo hierarchy, native controls, thin borders, readable units and geometric scene materials. Labels and numerical readings supplement color. The controls stack on phones; the scene is 340 px high on desktop and 260 px at widths up to 600 px. The detailed assembly remains below the preview in both captures.

The physical water reuses the existing light-rain cyan value (`#61cce9`); this extension introduces no new interface palette. There is a narrow semantic difference from the current DESIGN.md and sidecar wording, which confines radar colors to rainfall clouds and their legend. The storm also has a local 600 px stacking breakpoint beyond the sidecar's recorded shared breakpoints. These extension details are recorded here without rewriting DESIGN.md or `.impeccable/design.json`. No new global design tokens or motion scale are claimed.

## Evidence and scope

The implementation owner reports a successful production build, lint, all 16 unit tests and one targeted browser check at 1440 px desktop and 390 px mobile. The storm unit cases cover storage bounds and water balance, blocked-versus-clear ponding, and a dry zero-rain scenario. The blocked-versus-clear assertion requires more than 30 mm additional ponding at minute 180. The targeted browser check covers storm controls and response, with mobile overflow checks; this is not a report of rerunning the full browser suite.

Reviewed captures show 60 mm/h rain, a 45-minute duration and 100% blockage at minute 45, plus the preserved detailed assembly:

- [Desktop capture](../.impeccable/review/storm-desktop.png), 1440 × 3074.
- [Mobile capture](../.impeccable/review/storm-mobile.png), 390 × 4606.

The independent [finish review](storm-review.md) records **Ship**, with no material P0–P2 findings in its screenshot and source scope. It did not rerun tests or perform a fresh browser accessibility audit. The design detector was unavailable because its launcher failed with `cache_directory_failed`; no detector pass is claimed. This documentation pass inspected the source, design records, review and both captures and did not rerun implementation checks.
