# Physics round 2 — staged implementation

User approved the physics brief with radar/cyan colours retained and no push. Work is local. This record covers Stage A and feature integration B/B2, not the entire physics brief.

## Implemented scope

Stage A provides parameter provenance; design/uniform/drawn rain; roof/paved/lawn runoff; a donor-limited network; partial circular Manning, gully and outfall hydraulics; media, transition and gravel storage; clogging, ET, seepage, overflow and tailwater; six configurations; controlled conductivity comparisons; sensor adapters; a 12 × 8 compost thermal/moisture engine; worker execution; CSV; and quantity checks.

Stage B/B2 connects S1/S2/S3/I1/T1/T2 to one worker-driven clock. Config-derived swale, inlet and tree-pit geometry includes hatching, dimensions and live cyan water. Feature pages and Sensors overlay eligible live hydraulic readings. Temporary capacity alerts remain distinct from seeded fault history. Charts, tables, balance, searchable parameter/equation/source fields, seeded trial-Ks loading, CSV, live 2D sections and reduced-motion manual controls are available.

Open `/feature/S1` (or S2/S3/I1/T1/T2), then **Play storm** below the model. Expand **Storm settings, charts and model parameters** for inputs, outputs and export. Parameter edits recalculate on leaving the field; changed inputs restart playback. The optional 3D water-depth x5 display changes no numerical reading.

## Limits and remaining stages

- Equations and coefficients are uncalibrated reduced-order placeholders: no survey, design-tool, forecast or treatment-validation claim. See [model](PHYSICS_MODEL.md), [parameters](PHYSICS_PARAMETERS.md) and [216-input inventory](PHYSICS_SENSORS.md).
- S1/S2/S3 start with equal conductivity and weather. Other parameter edits or scenario overrides can confound comparison. Loaded trial re-tests remain seeded synthetic values. Compost allocation does not alter conductivity.
- Neighbourhood/Plan retain earlier implementation. Network/Plan parity, actual context connections and moved-house routing remain Stage C work; house sensors remain seeded.
- Compost UI, matching thermal bay runs and allocation-depth integration remain later work. The thermal engine foundation does not make compost UI readings live.
- Human checks, offline last-known records and seeded history remain intact. Ephemeral capacity/trust alerts do not solve every visual fault. Blockage can raise upstream kerb storage while lowering downstream ponding; overflow is not a duration diagnosis.
- Sediment transport, scour, mulch movement, leaks, pests, gas chemistry and smell are not solved. Low oxygen is not measured odour or gas concentration.

## Verification and review, 14 October 2026

The implementation owner reports a final 46-unit-test rerun passing and a full 14-test browser run passing before four visual-review fixes. After those fixes, production build/lint and five affected browser checks passed: three console and two physics checks. The inlet 2D water assertion uses High tailwater at minute 25; an initially dry normal-minute-1 setup was corrected. This does not claim a complete browser-suite rerun after the fixes.

The independent reviewer returned **ship at the four-item fix-list scope** after opening seven captures. Resolved: I1 chamber depth/live 2D fallback; readable mobile chart/section labels outside scaled SVG; compact reading provenance; short speed options. This bounded fix review is not a new whole-surface review or completion verdict for later stages.

Default feature captures: `docs/screens/detail-desktop.png` and `detail-mobile.png`. Scenario captures: `.impeccable/review/physics-desktop.png`, `physics-mobile.png`, `physics-inlet-desktop.png`, `physics-inlet-2d-desktop.png` and `physics-inlet-2d-mobile.png`. Checks do not establish complete accessibility or physical validity. No detector ran because of `cache_directory_failed`; no detector result is claimed. No GitHub push.

## Water visibility correction, 14 October 2026

The storm now shows rain and illustrative inlet, outlet, overflow and infiltration particles. A cyan wetting tint sits above decorative mulch, while double-sided water and a section cap make calculated ponding easier to see. Plain-language state text explains early rain without pooling, and **Jump to peak water** seeks the selected feature's calculated peak. The solver is unchanged; tint and droplets are explicitly illustrative, and the numerical depth remains the calculated level.

The implementation owner reports three targeted browser checks, production build/lint, desktop/mobile axe checks and reduced-motion checks passing. The default reviewed peak was 73.1 mm; minute 2 showed rain without a pool. A fresh independent reviewer returned **ship for this narrow correction**, with no material fixes requested. Only formatting followed that review. Captures: `.impeccable/review/water-early-desktop.png`, `water-peak-desktop.png` and `water-peak-mobile.png`. These checks do not establish full accessibility, physical validity or completion of later stages. No detector result is available (`cache_directory_failed`), and no GitHub push is included. See [water documentation](../.impeccable/review/water-documentation.md) for scope and design drift.
