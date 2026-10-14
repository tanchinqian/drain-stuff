# Drain Trial Console

## Purpose and users

An operator console for a small drainage and compost pilot. Operators inspect houses, drainage parts, compost bays, sensor trust and faults, then record checks and compare the control, decompaction and decompaction plus compost trial arms.

## Accepted scope

- Local React app in `app/`, with browser-local synthetic data by default.
- Selected design direction: Map desk, with cream and brown surfaces, Archivo typography, readable native controls and geometric 3D schematics.
- Overview with selectable and movable houses, a plan alternative and sensor layers.
- An offline map of the Phase 1 Gamelan / Rodat housing window, with mapped footprints,
  synthetic pilot assignments and adjustable radar-coloured rainfall clouds. Radar colours
  are approved for the rainfall data layer; the surrounding console keeps its cream/brown palette.
- Sixteen separate drainage parts, including explicit states for optional parts that are not installed.
- Eight compost-bay parts with the same selection, explode, section, movement, isolation and reset controls.
- Every sensor and human input has a stable ID, a position marker and a row on the Sensors page. Readings include metric, unit, timestamp, calibration or method-check date, drift, trust state, proxy/reference role and fault-rule links.
- Fault records identify the diagnosing inputs and their trust states when the alert opened.
- Manual squeeze and smell logs, photo checklists and fixed-point infiltration tests remain human records.

## Boundaries and evidence

Operational readings, trials and fault records are labelled synthetic. Mapped footprints and roads use credited public map data; pilot assignments, heights and drainage geometry are illustrative. The models are not surveys or design drawings. Geometry and layer defaults require confirmation against MSMA and the local authority. Foreign inspection guidance provides prompts, not Malaysian proof of the compost trial. Soil and compost moisture are indirect or relative proxies; manual reference checks and calibration remain necessary.

The console supports local ponding and drain upkeep claims only. Trial allocation requires mature compost, a baseline, a labelled dose and the existing guardrails. Oxygen and ammonia gas probes are excluded for the reasons stated in the accepted addendum, with human smell checks retained.

## Current work authorization

Apply `CODEX_ADDENDUM.md` to the local React app in stages. The separately published visualization is an exact copy of the supplied attachment and has separate source and hosting identity.

Physics round 2 is authorized in stages under `CODEX_PHYSICS_PROMPT.md`, with radar colours and cyan water retained and no GitHub push. The first checkpoint adds an isolated reduced-order engine; UI/shared-clock integration remains outstanding. All coefficients are placeholders unless explicitly sourced. Engine outputs must remain distinguishable from seeded history and human observations; compost allocation must not alter conductivity. See `docs/PHYSICS_MODEL.md` and `docs/fix-round-2.md` for current coverage and limits.
