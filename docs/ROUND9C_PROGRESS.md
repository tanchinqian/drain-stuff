# Round 9C — visible water physics

Approved 21 October 2026; deadline 22 October 2026 12:00 Asia/Singapore.
Branch: `codex/drain-trial-console`. Stage commits are pushed after checks.

The hydraulic engine remains authoritative. Water motion is drawn from the model's calculated flows. It is not a fluid simulation of the real site.

## Stage 0A — section scope and axis switching

Terrain no longer receives a clipping plane. Assembly clipping updates before paint; changing axes rebuilds cap passes. Each solid clears its stencil before counting and draws its cap in the same render queue. Horizontal sections include layer, inlet/outlet and obstacle outlines. Reset and both slider endpoints restore the assembly.

Checks: TypeScript passed; both browser cases passed (30 random switches and 10 positions per axis for each asset). Captures saved under docs/screens/round9c. These assert actual material clipping scope and non-empty SVG geometry; they do not prove every cap is watertight at pixel level.

Excavation/ground continuity is being handled with Stage 0B because both use the same street surface.

## Remaining stages

0C rain opening; 0B street continuity; 0D faults; 1 rain distribution; 3/3A flow path; 2 surface solver; remaining surroundings/material interactions and evidence.

## Stage 0C — visible opening rain
Fresh feature calculations open at 40% of rain duration, playing unless reduced motion is requested. Feature playback loops the full event including recovery; explicit seeking pauses. Saved replay clocks remain preserved. Rain status and four event markers are visible. TypeScript and the focused browser check passed.


## Stage 0B — ground continuity, first two items
Replaced the separate deep ground slab and oversized rectangular hole with a continuous surface and fitted excavation including inlet and outfall corridors, closed walls and a floor. Soil only appears within the pit; paving retains a supporting base. Two numerical geometry checks cover 10 radial directions and 89 distances each; both S1/R1 section browser checks pass again. The later surroundings/perspective work remains pending.

