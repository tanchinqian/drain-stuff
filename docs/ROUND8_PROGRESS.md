# Round 8 implementation progress

The owner authorised continuing through the remaining stages without routine approval on 16 October 2026. Local-first remains the deployment requirement. Stage A is committed as `fc63e21`.

## Stage B — storm board

- Done: presets/custom peak and duration, worker job progress/errors, three calculated modes for five assets, confirmed/unconfirmed chips, assignment state, peak ponding, time above a surface limit, overflow bars, ranked map selection, reason-required logged override, sensitivity orders and relative-ranking labels.
- Done: R1 typical roadside inlet/channel configuration and location. T1/T2 are excluded from both board and observation maps. Observation history remains available separately.
- Done: scenario seed has one explicitly confirmed illustrative inlet blockage. Existing saved faults are not auto-confirmed. Heavy scenario inputs yield S1 fixable, S2 capacity-limited, R1 clear. This is a demonstration, not observed performance.
- Engine correction: board scenarios use an entered upstream spill level (S1 0.05 m; others 0.15 m) for property-drain, kerb-flow and gully nodes. Removed upstream volume is counted in overflow and water balance. Existing standalone models default to no upstream spill until a board replay is loaded. Summary peak/time covers the basin and upstream surface limits; these are not inundation predictions. The illustrative catchments are explicitly entered in shared configuration.
- Official warning data is optional, cached, and can select Heavy; it never supplies numeric rainfall.
- 3D mode replay, typical section and fidelity labels are integrated in Stage B2 next.
- Verification: 35 backend/shared tests pass, including all three demo conditions and water-balance error below 1e-5; app TypeScript build passes. Browser checks are recorded under Stage F.

## Subsequent stages

B2, C, G, D, E and F are in progress in that order. This log is updated at each stage commit. No cloud deployment is claimed.
