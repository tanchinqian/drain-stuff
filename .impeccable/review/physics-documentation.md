# Physics documentation audit

14 October 2026. Ordinary UI extension, bounded to documentation. DESIGN.md and .impeccable/design.json were read and preserved. No application source or design tokens were edited by this pass.

## Evidence checked

Read the Impeccable document reference, PRODUCT/README, physics model/input/stage records and incumbent design frontmatter/sidecar. Checked PhysicsControls, PhysicsPanel, PhysicsSection, ModelWorkspace, FeatureDetail, three/physicsGeometry, three/PhysicsOverlay, physics store/view/SimulationDriver and sensor adapter. Confirmed Sensors and compact reading provenance wiring and stylesheet class locations. Test and screenshot-review outcomes below are reported by the implementation owner/reviewer; this documentation pass did not independently run tests or inspect images.

The feature route uses the new panel, config geometry and shared playback. Matching feature hydraulic inputs and shared rain can be live; human, offline, house and unconnected thermal inputs retain records. Capacity faults are ephemeral feature outputs. Documentation now explains these distinctions and actual control labels.

## Incumbent comparison and drift

The extension continues the Map desk's cream/brown surfaces, Archivo inheritance, flat bordered panels, explicit units and text-supported states. Charts use incumbent brown, ochre, oxblood and purple. Section captions remain textual; hatching and earth tones describe physical layers.

The incumbent design document confines radar colours to rainfall and excludes blue/green interface accents. Cyan model water extends that written boundary but is explicitly retained by the user's current instruction. It is an approved data-visualization exception; no silent design rewrite or recolouring was performed. New playback/parameter/comparison surfaces are not catalogued in the preserved sidecar. That is documentation coverage drift, not authorization to replace the incumbent system.

## Review and remaining boundary

Owner-reported verification: final 46-unit-test rerun passed; full 14-browser-test run passed before visual fixes; final build/lint and five affected browser checks (three console, two physics) passed after fixes. The independent reviewer opened seven captures and returned ship for the four requested fixes: I1 depth/live 2D, mobile graphic labels, compact provenance and short speed options. This is a fix-list disposition only.

Default captures: docs/screens/detail-desktop.png and detail-mobile.png. Scenario evidence: .impeccable/review/physics-desktop.png, physics-mobile.png, physics-inlet-desktop.png, physics-inlet-2d-desktop.png and physics-inlet-2d-mobile.png. No detector ran: cache_directory_failed. No detector infrastructure repair was attempted.

Neighbourhood/Plan, moved-house routing, compost UI, remaining physical fault models and calibration remain outside this implemented feature stage. This documentation pass made no commit or push.
