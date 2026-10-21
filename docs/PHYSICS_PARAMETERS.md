# Physics parameter register

All values are placeholders. SI engine values are shown; IDF shape coefficients explicitly use minutes and years. No conductivity default is evidence of an arm effect.

## Round 6 retention functions

Texture means follow Carsel & Parrish (1988), as tabulated in the [EPA RETC report](https://nepis.epa.gov/Exe/ZyPURL.cgi?Dockey=30000I52.txt). These are **placeholder texture classes**, not measured local properties. Transition/gravel use sand retention as a proxy; saturated contents use the entered layer porosities. Media Ks always uses trial-record/entered conductivity, native Ks uses entered native conductivity. Class Ks values below are references, never automatic treatment assignments.

| Class / role | alpha (1/m) | n | theta-r | theta-s class | Ks class (m/s) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Sandy loam / media | 7.5 | 1.89 | 0.065 | 0.41 | 1.228e-5 |
| Sand / transition and gravel proxy | 14.5 | 2.68 | 0.045 | 0.43 | 8.25e-5 |
| Loam / native soil | 3.6 | 1.56 | 0.078 | 0.43 | 2.889e-6 |

`m=1-1/n`; `Se=[1+(alpha*abs(h))^n]^-m` for h<0, otherwise 1; `theta=theta-r+(theta-s-theta-r)Se`; `K=Ks sqrt(Se)[1-(1-Se^(1/m))^m]^2`. Transition uses class sand Ks; gravel Ks is an illustrative 0.001 m/s. Initial pressure head is -3 m; native depth 0.3 m; grid 48 Ã— 32; nonlinear theta tolerance 1e-9 and pressure tolerance 1e-5 m; minimum adaptive substep 0.02 s. Capacity has a numerical floor. These choices require calibration/sensitivity analysis for engineering use.

Wet albedo factor `1-0.5S`, roughness 0.9â†’0.35 and surface wet-memory decay 1800 s are **illustrative rendering parameters**, motivated by [Lekner & Dorf](https://opg.optica.org/ao/abstract.cfm?uri=ao-27-7-1278), not a universal measured halving law. Visual rain speed is about 7 m/s, independent of playback.

Legacy suction/HCO/field-capacity controls below no longer drive Richards transport; wilting is retained for legacy/inlet display rather than the new retention residual. Compost thermal parameters are unchanged.

| Parameter | Value | Unit | Source | Equation |
|---|---:|---|---|---|
| step | 10 | s | placeholder | explicit finite-volume update |
| peak | 0.0000175 | m/s | placeholder | hyetograph peak |
| duration | 2700 | s | placeholder | hyetograph duration |
| recovery | 21600 | s | placeholder | post-rain simulation window |
| idfA | 90 | mm/h | placeholder | i=a T^b/(t+c)^d; t in minutes, T in years |
| idfB | 0.15 | 1 | placeholder | IDF |
| idfC | 5 | min | placeholder | IDF |
| idfD | 0.65 | 1 | placeholder | IDF |
| returnPeriod | 2 | year | placeholder | IDF shape only; peak normalized to entered intensity |
| roofArea | 120 | m2 | placeholder | C i A |
| pavedArea | 60 | m2 | placeholder | C i A |
| lawnArea | 40 | m2 | placeholder | C i A |
| roofC | 0.95 | 1 | placeholder | C i A |
| pavedC | 0.8 | 1 | placeholder | C i A |
| lawnC | 0.25 | 1 | placeholder | C i A |
| roofDepression | 0.0005 | m | placeholder | initial depression storage |
| pavedDepression | 0.001 | m | placeholder | initial depression storage |
| lawnDepression | 0.003 | m | placeholder | initial depression storage |
| overlandTime | 120 | s | placeholder | tc=to+td; verify against MSMA |
| drainTime | 120 | s | placeholder | tc=to+td; K=tc |
| length | 6 | m | placeholder | trapezoid stage storage |
| width | 3 | m | placeholder | trapezoid stage storage |
| sideSlope | 3 | m/m | placeholder | V=L(b h+z h^2) |
| crest | 0.25 | m | placeholder | overflow weir crest |
| mediaDepth | 0.6 | m | placeholder | media storage |
| transitionDepth | 0.1 | m | placeholder | transition storage |
| gravelDepth | 0.18 | m | placeholder | gravel storage |
| porosity | 0.45 | m3/m3 | placeholder | media pore volume |
| fieldCapacity | 0.2 | m3/m3 | placeholder | percolation threshold |
| wilting | 0.1 | m3/m3 | placeholder | initial residual moisture |
| gravelVoid | 0.4 | m3/m3 | placeholder | gravel pore volume |
| transitionVoid | 0.35 | m3/m3 | placeholder | transition pore volume |
| ks | 0.000006111111111111111 | m/s | placeholder | Ks_eff=Ks(1-clog) |
| nativeKs | 5.555555555555555e-7 | m/s | placeholder | native seepage |
| suction | 0.12 | m | placeholder | head-dependent infiltration |
| hco | 8 | 1 | placeholder | K(theta)=Ks exp(-HCO(phi-theta)) |
| et | 2.3148148148148148e-8 | m/s | placeholder | ET demand |
| liner | 0 | 0 or 1 | placeholder | liner disables native seepage |
| drainC | 0.001 | m^(3-n)/s | placeholder | Q=C max(h-offset,0)^n |
| drainN | 0.5 | 1 | placeholder | underdrain exponent |
| drainOffset | 0.02 | m | placeholder | underdrain offset |
| pipeDiameter | 0.1 | m | placeholder | partial circular Manning |
| pipeSlope | 0.005 | m/m | placeholder | Manning |
| manningN | 0.013 | s/m^(1/3) | placeholder | Manning |
| pipeLength | 10 | m | placeholder | travel storage |
| inletArea | 0.035 | m2 | placeholder | orifice |
| inletPerimeter | 0.8 | m | placeholder | weir |
| inletOpen | 1 | 1 | placeholder | blockage multiplier |
| sockOpen | 1 | 1 | placeholder | sock multiplier |
| cw | 1.7 | m^0.5/s | placeholder | Q=Cw L h^1.5 |
| co | 0.62 | 1 | placeholder | Q=Co A sqrt(2g h) |
| gravity | 9.81 | m/s2 | placeholder | orifice |
| overflowLength | 0.6 | m | placeholder | overflow weir |
| nodeArea | 2 | m2 | placeholder | surface node storage |
| outfallInvert | 0 | m datum | placeholder | tailwater head |
| tailwater | 0 | m datum | placeholder | no reverse flow; downstream throttling |
| sediment | 0 | m | placeholder | forebay sediment |
| clogPerVolume | 0.0005 | 1/m3 | placeholder | cumulative treated volume |
| sedimentClog | 2 | 1/m | placeholder | sediment clog contribution |
| sensorNoise | 0.001 | m | placeholder | seeded uniform measurement noise |
| sensorBias | 0 | m | placeholder | virtual sensor bias |
| sensorDrift | 0 | m/s | placeholder | virtual sensor drift |
| mountHeight | 1 | m | placeholder | ultrasonic distance=mount-level |
| compostDx | 0.15 | m | placeholder | 2D finite differences |
| compostDepth | 1.2 | m | placeholder | 8-cell cross section |
| ambient | 30 | degC | placeholder | thermal boundary |
| initialTemperature | 35 | degC | placeholder | initial condition |
| initialMoisture | 0.5 | kg/kg dry solids | placeholder | initial condition |
| density | 400 | kg/m3 | placeholder | bulk dry density |
| heatCapacity | 2500 | J/(kg K) | placeholder | thermal storage |
| thermalK | 0.25 | W/(m K) | placeholder | conduction |
| convection | 5 | W/(m2 K) | placeholder | surface heat exchange |
| heatRate | 0.12 | W/kg | placeholder | k0 f(T) f(M) f(O2) VS |
| tempMin | 10 | degC | placeholder | cardinal lower temperature |
| tempOptimum | 45 | degC | placeholder | cardinal rising plateau |
| tempPlateauEnd | 55 | degC | placeholder | cardinal falling plateau |
| tempMax | 75 | degC | placeholder | cardinal upper temperature |
| moistureOptimum | 0.45 | kg/kg dry solids | placeholder | moisture reaction factor |
| moisturePlateauEnd | 0.6 | kg/kg dry solids | placeholder | moisture reaction factor |
| moistureMax | 0.85 | kg/kg dry solids | placeholder | moisture reaction factor |
| oxygenWetThreshold | 0.55 | kg/kg dry solids | placeholder | wet oxygen depletion |
| oxygenWetMultiplier | 5 | kg dry solids/kg | placeholder | wet oxygen depletion |
| lowOxygenThreshold | 0.2 | 1 | placeholder | low oxygen risk flag |
| maturityTolerance | 2 | K | placeholder | ambient and reheat comparison |
| maturityWindow | 86400 | s | placeholder | post-turn observation window |
| vsDecay | 2e-7 | 1/s | placeholder | VS decay |
| oxygenDecay | 0.00001 | 1/s | placeholder | oxygen depletion |
| evaporation | 1e-7 | kg/(m2 s K) | placeholder | surface evaporation |
| latentHeat | 2260000 | J/kg | placeholder | evaporation cooling |
| holding | 0.65 | kg/kg dry solids | placeholder | leachate drainage |
| covered | 1 | 0 or 1 | placeholder | rain interception |
| sumpArea | 0.25 | m2 | placeholder | sump level |


### Round 9C rain visuals — illustrative rendering parameters
- Visible diameter interval: 0.6–5.8 mm; conditional Marshall–Palmer samples.
- Screen diameter magnification: 4×; streak exposure 1/45 s; wind lean 0.08 m per metre fallen.
- High density remains 28 streaks per mm/h, capped at 2,048; Record 60 capped at 4,096; Low 10 capped at 512. These are representative counts, not a sampled water volume.
- Heavy mist starts at 40 mm/h, opacity capped at 0.12. Collision sampling is spread over frames (128 new rays/frame); unsampled drops remain hidden.
