# Physics round 2 — staged implementation

User approved the physics brief with existing radar/cyan colours retained and no push. Work is local.

## Stage A: engine foundation

Added typed parameter provenance; design/uniform/drawn hyetographs; routed roof/paved/lawn runoff; a donor-limited node/link graph; partial circular Manning, gully and outfall hydraulics; head-dependent media, transition and gravel states; clogging, ET, seepage, overflow, and tailwater; configurations for all six features; conductivity-only comparisons; deterministic sensor overlays; a 12 × 8 thermal/moisture compost engine; Web Worker entry; CSV serialization; and quantity consistency checks.

The complete equations, scope, parameter register and 216-input inventory are linked from [PHYSICS_MODEL.md](PHYSICS_MODEL.md). Existing UI and seeded records remain on their previous implementation until integration. No Stage B–D visuals are claimed complete by this engine checkpoint.

## Conflicts resolved explicitly

- Retain radar/cyan under the direct user instruction.
- An inlet blockage raises upstream storage but can reduce downstream swale ponding. Test the relevant location, not a physically invalid everywhere-increases condition.
- Keep manual observations and maturity checks. A numerical low-oxygen signal does not establish rotten-egg smell, pests or gas concentration.
- Conductivity defaults are identical placeholders for S1/S2/S3. Only entered or explicitly loaded trial values may distinguish a controlled arm comparison.
- Missing historical values remain missing; offline sensors do not receive fabricated last-known readings.

## Still required after the engine checkpoint

Shared clock and live record overlay; default-run reconciliation across screens; physics-driven fault-rule connection; geometry factories and real-scale sensor mounts; detailed swale/inlet/tree-pit sections; network and Plan parity; moved-house routing; compost interface and allocation-depth connection; user-facing parameter/equation tables and CSV; reduced-motion integration; final accessibility checks and refreshed visual evidence. Human visual fault categories do not yet have explicit physical transport models.

## Verification

Production build and lint pass. All 42 unit tests pass, including 24 new physics checks and six deterministic scenario snapshots. The initial complete browser run passed all 13 tests, including the real Web Worker. After tightening thermal parameter validation and sensor-owner isolation, the final run passed 12 checks but encountered a transient OneDrive file-access error saving `sensors-desktop.png`; that screenshot/accessibility check passed on its isolated retry (all five desktop/mobile routes). No app assertion was relaxed. Browser coverage includes the existing map, parts, search, palette, compost forms, accessibility, storm and wheel-zoom checks. Captures still show the previous UI, not new physics-driven geometry. No GitHub push.
