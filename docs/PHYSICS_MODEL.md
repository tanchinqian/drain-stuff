# Reduced-order physics model

Reduced-order model, placeholder parameters, not calibrated, not a design tool, not a forecast.

## Implementation boundary

Stage A supplies deterministic TypeScript modules in `app/src/simulation/physics/`. Stage B/B2 now runs S1/S2/S3/I1/T1/T2 in a shared Web Worker and exposes one feature-page timeline. Config-derived swale, inlet and tree-pit geometry, cyan water, live 2D sections, charts, CSV, eligible sensor overlays and temporary capacity alerts use these runs. Round 3 retains this engine and clock while replacing particles with short rain strokes, depth-following cyan water, equivalent wet-depth soil shading, local-head pipe fill and discharge-width arrows. A flow strip reports inlet through outfall/overflow. Overview/Plan now interpolate dated API zone rainfall; this is separate from the entered scenario hyetograph. Compost UI shows saved batch readings/checks and computed prompts, not a fully integrated thermal run. Saved records are not engine outputs. The current API contract is 3.0.0; see BACKEND_HANDOFF.md. Radar colours and cyan water are retained under the user's explicit exception to the brief.

All engine flows are m3/s, storage m3, distance m, and time s. Temperature uses degrees Celsius; thermal differences are kelvins. Rain display conversion is m/s multiplied by 3.6e6 for mm/h. Flow display conversion is m3/s multiplied by 60000 for L/min. The IDF shape calculation alone takes minutes and years explicitly.

## Equations and source labels

The complete typed [parameter register](PHYSICS_PARAMETERS.md) lists values, units, equations and source labels. All defaults are **placeholder**, including illustrative dimensions; none are falsely attributed to local guidance. Callers may supply measured trial conductivity with `source: trial-record` and sample count. Allocating compost cannot set conductivity.

### Rain and runoff

Alternating blocks are generated from incremental cumulative depth using `i=a T^b/(t+c)^d`, then ordered around the centre and scaled to the entered peak. Consequently the result is an **entered-peak normalized shape**, not a station IDF design event or a claimed return-period storm. Enter MSMA 2nd edition coefficients for the chosen station before any engineering application. Uniform and ordered user-drawn step patterns are supported. Drawn values are m/s and must start at zero time, be nonnegative and have increasing timestamps. Zone multipliers are 52/63, 68/63, 34/63 and 18/63; the default peak is 63 mm/h.

For roofs, paved surfaces and lawns separately, effective input is `C i A`. It first fills depression storage, then a linear reservoir with `Q=S/K`, where `K=to+td`. Times are entered placeholders requiring verification against MSMA; this is not an implementation of a site-specific sheet-flow formula. Runoff-coefficient losses fall outside the event ledger, whose boundary begins at effective runoff. Depression water stays in the ledger for this isolated event. A rain gauge counts 0.2 mm tips and reports tips in the preceding ten minutes.

### Network and tailwater

The initial feature catchment graph is roof outlet → downpipe → property drain → kerb → gully → manhole → feature inlet. Paved and lawn runoff join their corresponding downstream nodes. Links transfer simultaneously from pre-transfer donor storage. Circular pipe area is `D²(alpha-sin(alpha))/8`, wetted perimeter `D alpha/2`, with `alpha=2 acos(1-2y/D)`. Manning capacity is `A R^(2/3) sqrt(S)/n`. A travel reservoir limits discharge as well as capacity. Excess remains at the upstream node; there is no silent discard. Filling is a lumped volume ratio, not a solved longitudinal free-surface profile.

Gully capacity is `min(Cw P h^1.5, Co A sqrt(2 g h)) * inletOpen * sockOpen`. Blocked inlet and clogged sock therefore accumulate water at the **kerb upstream of the gully**, and may reduce ponding in the downstream swale. A global requirement that every location's ponding must rise under inlet blockage would be physically contradictory. Tests assert the upstream quantity.

Outfall tailwater reduces underdrain discharge by `clamp((h-tailwater)/h,0,1)` and raises the effective overflow crest. The inlet chamber uses an orifice with available head. This is a one-way, reduced-order boundary: it does not simulate river inflow, pressure waves, reverse flow or a dynamic-wave sewer network. Household-scale infiltration cannot resolve river flooding. The initial graph remains illustrative and is not a surveyed network derived from OSM. Houses are fixed in Round 3; no moved-house routing is exposed. `nearestConnection` remains a deterministic primitive, not an integrated neighbourhood solver.

### Swale and tree-pit layers

Surface storage is `V=L(b h+z h²)`. Side slope defaults to 3 horizontal:1 vertical. Inlet chambers use vertical sides and no soil transport. Tree pits have smaller dimensions and catchments. Low-level defaults use equal conductivity and weather. The current SimulationDriver loads the latest trial re-test mean/sample count (baseline fallback) unless conductivity was manually overridden. Mock tests are generated records, not field calibration. The controlled comparison helper changes only Ks/provenance/sample count, but page configurations can differ through trials, parameter edits or scenarios; they are not automatically a controlled treatment experiment. The clogged-sock scenario affects S1. No treatment benefit is inferred from dose.

Media infiltration uses `Ks_eff (1+(h+psi)/Lmedia) A`, limited by surface donor water and media pore space. `Ks_eff=Ks(1-clog)`. Percolation is `Ks_eff exp(-HCO(phi-theta)) A`, allowed only above field capacity. Water passes through a finite transition reservoir to finite gravel void storage. The initial media is at residual/wilting moisture; only water above that residual is in the event ledger. This head-dependent approximation is not the full Green-Ampt wetting-front solution or a SWMM-equivalent solver.

Gravel seepage is `Ks_native A` limited by available water and disabled by a liner. Underdrain discharge is `C max(h-offset,0)^n` with the tailwater factor and donor limit. C has units `m^(3-n)/s` for total discharge; this differs from SWMM's per-area convention and must not be copied without conversion. ET is a constant potential demand, limited by event media water. Overflow follows `Cw L max(h-max(crest,tailwater),0)^1.5`, limited to volume above crest. There is no hard clipping of surface depth that would lose water.

Clogging rises with treated volume and prescribed forebay sediment depth, capped at 0.95. Sediment transport, erosion, check-dam routing and mulch transport are not solved yet. Those visual/human fault types must remain observations rather than fabricated physical measurements.

### Numerical scheme and water balance

Explicit sequential layer updates use donor and receiver capacity limits. Network transfers are simultaneous. Maximum step is `min(10 s, requested step, runoff K/4, link travel time/4)` and steps split exactly at rainfall changes and the run end. Configurations needing steps below 0.1 s are rejected. Donor limiting maintains nonnegative volumes; it is not an accuracy proof. Step refinement remains necessary for calibrated use. Default 120 s drain travel divided among six links yields a 5 s actual step.

At every output step: `effective input = total stored event water + outlet + overflow + native seepage + ET`. Stored water includes depression, runoff reservoirs, every network node, surface, media, transition and gravel. The engine reports signed residual m3 and relative residual using `max(input,1e-9)` as denominator. Unit tests require relative error below 1e-6 for all six feature configurations. Overflow is counted as leaving the feature boundary, not disappearing. Later network integration must add it to the receiving network and avoid double counting.

### Compost cross section

A 12 × 8 finite-difference grid has temperature, moisture (kg water/kg dry solids), volatile-solids fraction and oxygen factor. Heat generation is `k0 fT fM O2 VS`; fT is a bounded cardinal approximation with 10°C lower limit, 45°C rising plateau and 75°C upper limit. fM rises to 0.45 and declines above 0.60 to zero at 0.85. Conduction exchanges heat with neighbours. Exposed edges lose heat by convection and evaporation; evaporation removes water and latent heat. These shape constants are illustrative, not biological calibration.

Rain enters the top row only when uncovered. Water above holding capacity passes downward and reaches the sump; the water ledger includes sump and evaporation. Turning homogenizes temperature and restores the oxygen factor; VS declines by a first-order reaction. Oxygen decays between turns with greater depletion under excess moisture. Low oxygen is a model risk signal, **not a measured smell or a gas reading**. Human squeeze/smell checks are never overwritten. No pests, pathogens, nitrogen/ammonia chemistry or odour dispersion are simulated.

The thermal explicit step also obeys `dt <= 0.45/[alpha(1/dx²+1/dz²)]` and a convection storage bound. Outputs are recorded each minute; internal steps are at most ten seconds. Ambient-reached requires all cells within 2°C of ambient. No-reheat requires a completed 24-hour post-turn window with no rise above 2°C; it remains false before the window completes. Human maturity and release gates remain separate. Sump volume is unbounded storage at this stage, not a containment-capacity safety claim.

## Virtual inputs and history

The [216-input inventory](PHYSICS_SENSORS.md) classifies every existing ID as hydraulic, thermal, or human/seeded. `virtualInput` returns an immutable overlay and provenance, leaving original records intact. Rain feeds use ten-minute tipping-bucket totals. Soil moisture probes share a lumped media theta (no false depth resolution). Level noise is deterministic by sensor ID and time; bias/drift is explicit. Ultrasonic range is mount height minus level. Offline inputs retain their previous value/time, including null if no previous reading exists.

The current `useLiveSensors` adapter overlays eligible inputs on feature pages without writing saved history. The Sensors register and sensor-detail endpoints show saved API latest readings/history, not playback overlays. Rain references in feature views use the shared run. Saved timestamps and current model minute remain distinct. Geometry-linked mounts use model dimensions where mapped; the inventory retains original schematic coordinates. House sensors still need their own routed node and remain seeded. Compost thermal sensors need their matching bay run and remain seeded; soil temperature has no thermal model. The consistency scanner compares the same owner, quantity, time, units and provenance; it does not pretend historical observations and current simulations are interchangeable. `frameRecords` supplies canonical live quantities. `drainDown` reports a censored result if water remains at the simulation window end, rather than inventing a drain-down duration.

## Scenario and fault coverage

| Cause | Engine representation | Current boundary |
|---|---|---|
| Blocked inlet | Inlet open fraction 0.1 | Upstream kerb storage |
| Clogged sock | Sock multiplier 0.1 | Lumped inlet loss |
| Silted underdrain | Drain C × 0.05 | Gravel head and discharge |
| High tailwater | 0.8 m downstream head | One-way throttling only |
| Sensor drift | 0.05 m bias + 1e-6 m/s | Measurement overlay; physical run unchanged |
| Sediment | Entered depth and clog coefficient | No sediment transport |
| Standing water | Node/feature storage trace | Temporary overflow capacity alert; not a duration diagnosis |
| Sensor offline | Existing trust flag and last known value | No change to physical engine |
| Too wet / leachate | Grid moisture, oxygen and sump | Human smell/puddle confirmation stays human |
| Not heating | Thermal trace, initial moisture and geometry | Rule wiring still pending |
| Scour, mulch loss, sparse planting, joint leak, missing cap, pests, putrid/ammonia smell | Existing human/seeded inputs | No solved causal transport/biology; do not assert engine reproduction |

## Worker and export

`worker.ts` accepts a version-local typed request with request ID, config and hydraulic/thermal options; it returns a result or an error. It has no DOM or mock DB dependency. The browser test exercises the actual worker. `SimulationDriver` calculates all six hydraulic runs, terminates superseded workers, reports errors and offers retry. The shared store resets playback when inputs change. `runCsv` exports inputs, parameter provenance, rain series, every hydraulic state/flux, balance, and network nodes/links through **Export run CSV**. Playback respects reduced motion by using manual timeline/minute controls; flow arrows are static and their width represents flow.

Feature-page alerts are ephemeral scenario outputs for inlet/sock capacity, overflow, silted-drain conditions and sensor trust. They do not overwrite seeded fault history or solve sediment transport, scour, joint leaks, odour or other visual/human categories. The current section is illustrative: dimensions come from uncalibrated parameters and RL is a local datum. The current view removes depth exaggeration; water follows engine depth. Inlet, forebay and sock reuse one upstream path level, not separate routed chambers. Soil shading is equivalent wet depth from bulk moisture, not a resolved front. Pipe fill uses local hydraulic head, not a longitudinal profile. The pink amendment layer uses allocated batch, dose and depth; dose never sets conductivity. I1 chamber depth uses the crest parameter, and its 2D section shows live water without invented soil layers.

## Primary references

- [DID Malaysia, MSMA 2nd edition](https://www.water.gov.my/jps/resources/MSMA2ndEdition_august_2012.pdf): local framework for runoff and drainage. No station coefficients were supplied or inferred.
- [EPA SWMM manuals and source](https://www.epa.gov/water-research/storm-water-management-model-swmm): reference context for layered storage and hydraulic equations. This app does not run SWMM and makes no equivalence claim.
- [EPA SWMM 5.2 user manual](https://nepis.epa.gov/Exe/ZyPURL.cgi?Dockey=P10145M6.TXT): drain coefficient/exponent conventions. The implementation uses total SI flow with explicitly different coefficient units.

No field calibration, survey, local design approval or thermal biological validation has been performed.

## Round 3 controls, records and configuration

Model details is a non-modal drawer with six initially collapsed groups: Rainfall, Catchment, Surface, Soil, Drain and Overflow, plus equations/balance and a provenance footer. Values convert to readable units; internal SI equations remain unchanged. Scenario controls, charts, water balance and CSV remain in the expandable storm section. Particle droplets and the x5 water-depth control are superseded.

All numerical defaults, six-hour target, fault thresholds, dose cap and minimum re-test count remain provisional placeholders pending local confirmation. Operator copy shows plain targets; status belongs here, in PHYSICS_PARAMETERS.md and BACKEND_HANDOFF.md. Source notice is confined to About. Mock seed/observation horizon remains 12 October 2026; new tests/checks/audits use wall-clock time. Batch prompt snapshots derive from recorded readings/checks; authoritative evaluation and durable audit belong to the production server. The thermal equations above remain an engine foundation, not a live thermal UI claim.
