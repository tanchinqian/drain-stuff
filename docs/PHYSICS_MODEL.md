# Reduced-order physics model

## Current Round 6 soil and rendering model

This section supersedes the bulk-media, equivalent wet-depth, static rain/arrow and fixed observation-clock descriptions below. Historical sections remain for equation provenance. The mock observation clock is load-relative (BACKEND_HANDOFF.md).

`design.ts` supplies the shared [DrainDesign](DRAIN_DESIGN_SPEC.md). `richards.ts` solves the mixed form `d(theta)/dt = div(K(h) grad(h+z))` with cell-centred finite volumes, diagonal/lumped storage and modified Picard iteration. Internally depth increases downward, so face flux is `Kface * (1 - (hbelow-habove)/dz)`. Arithmetic face conductivity and van Genuchten–Mualem curves are used. Vertical Thomas line solves and lateral line iteration solve asymmetric fields. Uniform transverse forcing/initial conditions preserve symmetry exactly and are solved in that invariant subspace before expansion to the full cached 48 × 32 grid. Nonconverged steps bisect to 0.02 s before reporting an error; engine steps split at rainfall changes and minute boundaries.

Top flux switches between ponded head and available-water-limited supply. Direct bed rainfall is added explicitly to input/surface storage, alongside external catchment runoff. The domain spans bed width, media/transition/gravel and 0.3 m native soil unless lined. Bank infiltration is not separately solved. A distributed underdrain sink at pipe depth uses the existing gravel-head discharge relation, tailwater factor and available-water limit. Bottom flux is free drainage K(h), or zero when lined; side boundaries are no flux. Media Ks remains trial-record/entered conductivity. Compost dose never changes a hydraulic parameter.

All layers initialize at pressure head -3 m through their retention curves. Event soil storage is **change from the initialized field**, including native soil. Small background drainage can therefore make zero-rain storage change negative, balanced by seepage. ET is a donor-limited top-cell sink. The nonlinear residual is reported, never silently forced to zero. `soilResidual` accumulates Richards residuals; the combined ledger retains its 1e-6 relative-error acceptance check.

Every output minute caches Float32 theta/S fields, grid metadata and surface wetness memory; worker buffers are transferred. Playback samples cached output. Inlet chambers have no soil field. Probes at 10 and 30 cm sample different field rows. Underdrain/chamber discharge enters a finite pipe reservoir, with donor/capacity limits. Its stored volume determines circular-segment y/D. Outfall release is limited by partial-pipe Manning capacity, a travel reservoir and tailwater; the actual release gives `pipeVelocity=Qoutfall/A(y/D)`. Pipe storage participates in the event ledger. This is a single lumped conduit, not a longitudinal/dynamic-wave solution.

WebGL2 renders closed depression/layer solids and stencil caps. A linearly filtered DataTexture maps S to albedo `dry*(1-0.5S)` and roughness 0.9→0.35; the 2D section uses the same samples. The optical endpoint and 30-minute surface drying memory are illustrative. Physical water material uses transmission, attenuation, sky Fresnel response and procedural normal perturbations; low quality omits transmission. Jittered instanced rain falls at about 7 m/s in real rendering time; count follows engine rain and terrain/water ray intersections place impacts. Pipe motion follows Q/A and stops at Q=0; seepage/overflow are flow-gated. Reduced motion uses static samples. A low-quality control and automatic slow-render fallback are available.

This field is **uncalibrated, 2D, isothermal, without hysteresis or macropores**. No surveyed heterogeneity, reverse river flow, sediment transport or separate forebay/sock chamber solution is supplied. See [Round 6 results](ROUND6_WATER_REALISM.md) for acceptance and limits.

Sources: [Celia, Bouloutas & Zarba (1990)](https://agupubs.onlinelibrary.wiley.com/doi/10.1029/WR026i007p01483); [EPA RETC report, Carsel & Parrish texture table](https://nepis.epa.gov/Exe/ZyPURL.cgi?Dockey=30000I52.txt); [Lekner & Dorf (1988), wet-surface optics](https://opg.optica.org/ao/abstract.cfm?uri=ao-27-7-1278); [three.js stencil clipping](https://threejs.org/examples/webgl_clipping_stencil.html).

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


## Round 8 Stage A server ownership

The numerical source now lives in `shared/src/physics`; former app paths re-export it. The API runs it in a bounded Node worker thread. Three independent modes use the same entered storm and baseline asset config, using the shared latest-trial mean for conductivity when a record exists: installed with confirmed/assigned fault mappings, cleared with upkeep mappings removed, capacity with all mapped faults removed. Sensor suspect/offline flags never change physics. Optional detected-fault preview is explicit. Sort overflow volume first, then time above the entered crest limit; every result is relative ranking, not a prediction. Sensitivity applies 0.75/1.25 to conductivity, outlet conductance/capacity and rainfall peak, one parameter group at a time. These perturbations are not uncertainty probabilities.

Verification replays the original storm and original fault/trial-input snapshot with the target confirmed fault removed. Soil arrays are not serialized as numeric-key JSON: persisted results keep light frame timelines, input config and summaries. Uncalibrated/schematic limits remain. The typical roadside config R1 reuses the inlet engine with equivalent circular Manning capacity; a surveyed rectangular-channel solver is not claimed. Its UI belongs to Stage B/B2.

## Current Round 8 board/replay

Board configs explicitly enter S1 catchment roof/paved areas 200/100 m² with upstream spill level 0.05 m, S2 1000/500 m² with 0.15 m, and typical defaults for other assets. These are illustrative scenario inputs, not surveyed catchment areas. Excess volume above the property-drain, kerb-flow and gully-node spill levels leaves as overflow and remains in the water ledger. Summary peak/time compares basin crest and upstream surface limit; it is not an inundation map. Standalone historical configs default to no upstream spill until a saved board scenario is loaded.

As installed/If cleared replay loads the exact saved mode config and rainfall into the same shared engine/worker and clock. Recorded fault effects change inlet admission, sock restriction, sediment or conductance; registered sensor trust alone does not. R1 uses existing concrete inlet geometry and section with equivalent circular Manning capacity, not a surveyed rectangular open-channel solver. Registered sensor positions use the same mounted-part/datum mapping as the registry.

Board runs now reuse identical configurations within a run and omit soil contour snapshots from their scalar summaries. The solver itself is unchanged; 3D replay retains full soil frames. Browser fallback runs and verification use a dedicated worker. Both API and browser workers report actual comparison progress. See `STORM_PERFORMANCE.md` for the measured local scope and limits.

Overview cloud playback now uses the saved configuration's canonical alternating-block curve and the same clock as asset replay. Material colour/opacity and a Plan mask follow intensity; cached cloud coverage also drifts as a playback cue. That motion is illustrative: no wind or spatial storm-front physics is introduced. The clock survives tab/asset navigation, pauses during requested asset-model preparation, and continues through the saved recovery period after the cloud clears. Only requested asset models are computed on feature pages; valid cached runs can be reused. Standalone/fresh direct asset views retain peak-water opening. See `STORM_PLAYBACK.md` for controls and scoped evidence.

Illustrative trial tests are archived separately; only entered test records or explicit temporary parameters set conductivity. Dose and compost allocation never set it. Original snapshot verification is unchanged by later edits or other changing faults. Soil contour/pipe fill descriptions in earlier historical rounds are superseded by the Round 6/7 saturation-field and pipe-volume implementation.


## Round 9C representative rainfall

Visible rain uses Marshall–Palmer's exponential drop distribution, Lambda = 4.1 R^-0.21 mm^-1, with R in mm/h. The rendered samples are **conditioned to 0.6–5.8 mm** (not the complete physical drop population); this is the stated range of the Atlas fall-speed fit, v = 9.65 - 10.3 exp(-0.6 D) m/s for D in mm. The inverse conditional CDF is sampled deterministically. These are representative streaks, not a volumetric precipitation measurement. Their count is quality-scaled and diameter magnified on screen. Engine rainfall is unchanged.

Sources: [Rees & Garrett (2021), AMT, exponential rain distribution](https://amt.copernicus.org/articles/14/7681/2021/); [Atlas, Srivastava & Sekhon (1973), Doppler radar characteristics of precipitation at vertical incidence](https://agupubs.onlinelibrary.wiley.com/doi/10.1029/RG011i001p00001). The published speed relation and its useful diameter range are also reproduced in [NASA precipitation study (1983)](https://ntrs.nasa.gov/api/citations/19830016998/downloads/19830016998.pdf).

Streak length uses a 1/45 s exposure; fall motion uses elapsed real seconds, never the storm playback multiplier. Intensity changes the density and size distribution. Downward collision rays sample the actual opaque street and assembly meshes, cached at stable sample positions. A live pond level raises the impact surface. Rain is outside the assembly clipping group. A dry frame renders no streaks, impacts, splashes or mist. Heavy-rain mist starts above 40 mm/h. Impact rings and hard-surface ballistic specks are representative, not added ledger water. The surface solver consumes capped impact impulses when enabled.


## Round 9C pipe and catchment conveyance
The outlet water segment follows the drawn pipe invert and its actual rendered length (R1/I1 1.4 m, swales 1.5 m). Partial fill uses the circular segment at engine y/D; underdrain water follows the configured pipe slope. At y/D >= 0.999 the strip states that the pipe is full and suppresses free-surface ripples. Texture travel follows engine velocity. Free-surface ripple amplitude scales with v/sqrt(g depth); a motionless, rainless pond receives no ongoing wave motion.

For a free outlet, x=v t and y=y0-g t²/2; radius is sqrt(Q/(pi v)) and landing time sqrt(2 drop/g). Zero Q or zero velocity emits no jet. Tailwater covering the drawn jet centre suppresses it (a conservative partial-submergence display rule), and the pool rises instead. Inlet sheets and lip falls use the inlet flux; overflow is gated by positive engine overflow. Gravel pore streaks require both positive drain flux and local Richards saturation >=0.85. This is an illustrative visibility threshold, not a new drainage law. The stage strip reports zero underdrain flow honestly.

The roof route has shared segment endpoints: roof, eaves gutter, bracketed downpipe and shoe, 225 mm half-round frontage lot drain, sump, covered crossing, 375 mm street gutter, kerb opening and forebay. Each segment displays the same engine `roof outlet to downpipe` discharge; a zero roof-area scenario has no roof discharge. The highlight shows the otherwise buried crossing. Source for typical dimensions, **not a current specification or site survey**: [Ghani (2000), Feasibility of a Concealed Drainage Systems for Housing Projects in Malaysia, p.2](https://www.prres.org/uploads/481/1083/Ghani_Feasibility_of_a_Concealed_Drainage_Systems_For_Housing_Projects_In_Malaysia.pdf). Path endpoints are tested within 2 mm. Sources and transfers are visualised, not added again to the hydraulic ledger.


## Round 9C display surface solver

The surface view now uses first-order finite volumes for the 2D Saint–Venant equations (h, hu, hv). Interfaces use local Lax–Friedrichs/Rusanov fluxes with **hydrostatic reconstruction** and the matching bed-pressure correction. Manning resistance is applied semi-implicitly. See [Audusse, Bouchut, Bristeau, Klein & Perthame (2004), A Fast and Stable Well-Balanced Scheme with Hydrostatic Reconstruction for Shallow Water Flows](https://doi.org/10.1137/S1064827503431090). This implementation is not claimed to be the Kurganov–Petrova scheme.

The primary implementation runs fragment passes between WebGL2 RGBA32F render targets. High uses 256×128 cells, Low 128×64 and Record 384×192. If floating-point render targets are unavailable, a 64×32 worker runs the same numerical flux. A global CFL bound is computed from the readback state; GPU batches use half that bound and at most 24 substeps. The CPU checks CFL each step. Available-depth limiting prevents sinks removing more water than exists. Reflecting outer walls retain water for conservation tests. Hidden tabs stop stepping.

The terrain includes road crossfall (2%), configured gutter slope (visually capped at 2%), the swale cross-section, installed dam crests, the sock, dissipator roughness and a restriction-dependent inlet width (at least two cells). The road wearing surface uses the same elevation function. Engine inlet transfer is applied as a gutter sink and bed source; the two storage regions do not additionally exchange through numerical interfaces. Rain is distributed over exposed cells. Roof discharge and upstream routing enter the gutter; the local rain and roof contribution are subtracted from the upstream source to avoid duplicating them. Engine infiltration is distributed over wet bed cells, bounded by available water. Inlet-type assets remove outlet flow from the downstream bed; overflow is another downstream sink.

**Time and reconciliation:** this is a local display simulation in real animation seconds, not a second site-scale storm predictor. At every new engine frame (and at least every 0.1 real seconds), the bed and gutter stores are reconciled separately to `cell.surface` and the `kerb flow` node volume. Dry seeks set both stores to exact zero; wet seeks initialise a level surface. The engine reference cell is anchored to the engine ponding elevation, then other wet depths are scaled to the remaining region volume with momentum scaled consistently. This can be a large adjustment on a seek or rapidly changing playback frame. The correction is external forcing, not claimed as numerical conservation. The closed-domain conservation tests run without reconciliation.

The live Debug overlay reports post-correction bed/gutter volume error and reference error, CPU solver/readback time and GPU timer time when the extension is available. Rain and particle times are CPU animation costs. No GPU time is inferred from a CPU stopwatch. The grid is depth-displaced and shaded with local gradient normals, velocity-aligned micro-detail, depth/turbidity tint, Fresnel sky reflection, shoreline fade and Froude-driven foam. Capped, zero-net rain impulses create waves in wet cells. Folded leaf meshes sample the grid velocity and rest on its surface. Visual roughness/obstacle parameters remain illustrative.

Validation to date: CPU tests cover conservation within 0.1%, lake-at-rest, nonnegative depth, overtopping, bounded sinks, rain impulse volume and all playback-scale seeks. A real WebGL2 test repeats still-lake and wet/dry conservation. Live browser checks for both GPU and worker at minutes 0, 18, 45 and 165 meet <3% bed/gutter volume error and <1 mm reference error. Final visual review and Firefox/Chromium performance evidence are recorded separately.
