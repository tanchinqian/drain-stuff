# Drain Trial Console

## Purpose and users

An operator console for a small drainage and compost pilot. Operators inspect houses, drainage parts, compost bays, sensor trust and faults, then record checks and compare the control, decompaction and decompaction plus compost trial arms.

## Accepted scope

- Local React app in `app/`, with browser-local synthetic data by default.
- Selected design direction: Map desk, with cream and brown surfaces, Archivo typography, readable native controls and geometric 3D schematics.
- Overview with selectable and movable houses, a plan alternative and sensor layers.
- Sixteen separate drainage parts, including explicit states for optional parts that are not installed.
- Eight compost-bay parts with the same selection, explode, section, movement, isolation and reset controls.
- Every sensor and human input has a stable ID, a position marker and a row on the Sensors page. Readings include metric, unit, timestamp, calibration or method-check date, drift, trust state, proxy/reference role and fault-rule links.
- Fault records identify the diagnosing inputs and their trust states when the alert opened.
- Manual squeeze and smell logs, photo checklists and fixed-point infiltration tests remain human records.

## Boundaries and evidence

Every displayed record is labelled synthetic. The models are schematics, not surveys or design drawings. Geometry and layer defaults require confirmation against MSMA and the local authority. Foreign inspection guidance provides prompts, not Malaysian proof of the compost trial. Soil and compost moisture are indirect or relative proxies; manual reference checks and calibration remain necessary.

The console supports local ponding and drain upkeep claims only. Trial allocation requires mature compost, a baseline, a labelled dose and the existing guardrails. Oxygen and ammonia gas probes are excluded for the reasons stated in the accepted addendum, with human smell checks retained.

## Current work authorization

Apply `CODEX_ADDENDUM.md` to the local React app in stages. The separately published visualization is an exact copy of the supplied attachment and has separate source and hosting identity.
