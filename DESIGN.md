---
name: Drain Trial Console
description: A warm Map desk for drainage and compost pilot operations.
colors:
  ground: "#e9e4d8"
  panel: "#f2eee4"
  well: "#ddd6c6"
  well2: "#e2dccb"
  border: "#cfc7b4"
  ink: "#2f2b26"
  ink2: "#5e564b"
  ink3: "#6f665a"
  heat-0: "#e8dec6"
  heat-1: "#d8b978"
  heat-2: "#bc7a44"
  heat-3: "#8e3a2e"
  arm-control: "#7b4daf"
  arm-decompact: "#b07a12"
  arm-compost: "#b03a78"
  rain-bar: "#b2663a"
  radar-under-10: "#61cce9"
  radar-10-20: "#44bf65"
  radar-20-40: "#b9df38"
  radar-40-50: "#f3d431"
  radar-50-60: "#f28b27"
  radar-60-80: "#de452e"
  radar-over-80: "#aa40b6"
typography:
  display:
    fontFamily: "'Archivo Variable', Archivo, sans-serif"
    fontSize: "clamp(25px, 3vw, 33px)"
    fontWeight: 650
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "'Archivo Variable', Archivo, sans-serif"
    fontSize: "21px"
    fontWeight: 600
    lineHeight: 1.3
  title:
    fontFamily: "'Archivo Variable', Archivo, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.45
  body:
    fontFamily: "'Archivo Variable', Archivo, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "'Archivo Variable', Archivo, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.45
rounded:
  scene-label: "2px"
  field: "3px"
  button: "4px"
  panel: "5px"
spacing:
  controls: "7px"
  group: "12px"
  form: "14px"
  stack: "16px"
  grid: "18px"
  panel: "22px"
  canvas: "24px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.panel}"
    typography: "{typography.body}"
    rounded: "{rounded.button}"
    padding: "9px 13px"
  button-secondary:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.button}"
    padding: "9px 13px"
  button-secondary-hover:
    backgroundColor: "{colors.well2}"
  input:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "10px"
    width: "100%"
  select:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "10px"
    width: "100%"
  navigation:
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.button}"
    padding: "11px 16px"
  navigation-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.panel}"
  badge:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.field}"
    padding: "7px 10px"
  panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "22px"
  status:
    textColor: "{colors.ink}"
    size: "14px"
  feature-pin:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.panel}"
    rounded: "{rounded.scene-label}"
    padding: "7px 9px"
    size: "15px"
    height: "44px"
    width: "44px"
  feature-pin-hover:
    backgroundColor: "{colors.ink2}"
    textColor: "{colors.panel}"
  radar-legend:
    textColor: "{colors.ink}"
    typography: "{typography.label}"
---
# Design System: Drain Trial Console

## Overview

**Creative North Star: "Map desk"**

Map desk is a compact operator console with warm paper surfaces, brown ink, mapped site views and geometric assembly schematics. Archivo keeps headings firm and records readable. Thin borders, tonal wells and dark selected controls make the next inspection action easy to find.

Native controls, tabular numerals, explicit units and shape plus text states support practical inspection. The user-approved radar colours serve rainfall data and cyan serves physical water; the surrounding console retains cream and brown. Round 4 stabilises the work surface and record controls within this confirmed identity. Decorative gradients and glow remain excluded.

**Key Characteristics:**

- Warm cream ground, paper panels and brown ink.
- Compact Archivo hierarchy with tabular numerals.
- Flat record surfaces, thin borders and native controls.
- Wide responsive workspaces, shared tables and non-modal detail drawers.
- Shape plus text states, readable units and glossary help.
- Preserved seven-colour rainfall data and cyan model water.

This merge documents durable patterns in `app/src/styles.css`, current shared components, model geometry and `site/weather.ts`, with current Round 4 captures in `docs/screens/round4/` and historical Round 3 captures in `.impeccable/review/round3/`. Existing frontmatter primitives remain confirmed. The sidecar holds extensions and representative samples. Source remains the implementation authority.

## Colors

The palette resembles a working map on a cream desk; stronger colours identify measurements, trial arms and conditions. Round 3 excludes every proposed recolouring under the user's explicit exception.

### Primary

- **Brown ink** (`ink`): body text, selected actions and active navigation; paper text reverses on selected controls.
- **Rain copper** (`rain-bar`): rainfall bars.
- **Warm heat scale** (`heat-0` through `heat-3`): map, material and condition cues. Copper highlights selected pilot houses; brick marks faults/errors and overflow arrows.

### Secondary

- **Control violet** (`arm-control`): control trial arm and offline diamond.
- **Decompaction ochre** (`arm-decompact`): loosened-soil arm and watch circle.
- **Compost magenta** (`arm-compost`): compost arm and recorded amendment layer.

### Tertiary

The seven approved radar tokens match `site/weather.ts`: light-rain cyan, rain green, lime, yellow, orange, red and purple. Written intervals express mm/h. The layer now draws dated zone samples rather than static procedural noise. Existing cyan (`radar-under-10`) is also used by the hydraulic water treatment; its preservation is explicit, not permission to recolour the console.

### Neutral

Desk cream (`ground`) grounds the interface; paper cream (`panel`) fills panels/controls. Recessed sand (`well`, `well2`) separates summaries and fields. Map border (`border`) divides records. Secondary and muted browns (`ink2`, `ink3`) support metadata, geometry and status markers.

**The State Readability Rule.** Pair each status colour with its geometric marker and a written label; colour alone never carries trust or fault state.

**The Data Colour Rule.** Retain the approved radar colours for rainfall and cyan for physical water. Keep controls and records in the established console palette, with trial colours identifying treatment and amendment.

## Typography

**Display and body font:** Archivo Variable, with Archivo and sans-serif fallbacks. The local package supplies the font; numeric records use tabular figures. Frontmatter follows h1, h2, h3, body and metadata. H1 uses 82% stretch; h2/brand use 88%. Tables, field labels and status use compact supporting text; mobile fields retain 16px type. Scene labels annotate geometry and have readable record alternatives.

About copy is limited to 72ch. Use sentence-case human names instead of raw enums; stable record IDs remain visible where meaningful. Format values by unit, keep values beside units and display relative plus Singapore absolute timestamps. Operator view omits model position controls; sensor positions belong in details.

## Layout

The main work surface is uncapped, with width `calc(100% - 48px)`, 24px gutters, a 12-column grid and 20px column gap. Main children span the grid; composed workspaces define their own columns. Panels retain 22px padding. Shared master-detail layouts use a **220px** sticky list plus flexible content, with a 20px gap. Asset rails group searchable features, compost bays and collapsed pilot houses. Their scroll is bounded to the viewport.

At desktop widths from 1100px, Overview uses a flexible map and 340px fault rail. Feature detail uses 180px / flexible / 340px columns; from 1700px these become 200px / flexible / 390px. Compost uses 165px / flexible / 320px, becoming 180px / flexible / 350px from 1700px. Existing 1100/800/580px rules still adapt model and chart layouts. At 760px the main width becomes `calc(100% - 24px)`, master-detail stacks and its asset rail becomes static with a 240px maximum height. At 580px panels use 16px padding, navigation wraps, native part selection replaces the desktop list and Plan retains native pilot/feature access.

Tables scroll horizontally within their panel, with no internal vertical height cap; rows remain in page flow. The flow strip scrolls horizontally within its own width. The document itself stays within the phone viewport. Drawers occupy at most 650px or 95vw, scroll independently and use 24px padding, reduced to 16px at 760px. Glossary popovers fit within the viewport and close through native popover behavior.

## Elevation & Depth

Record surfaces stay flat, separated by borders and paper tones. Non-modal drawers add a restrained structural edge shadow (`-12px 0 32px #2f2b261a`) to distinguish the overlay. This is an implemented exception to the older blanket no-shadow description. Open table filter/Columns menus use a small separation shadow (`0 6px 16px #2f2b2614`). Drawers have no blocking backdrop. Schematics use geometry, edge lines, translucent cyan water and material layers; rain strokes, soil shading and static flow-width arrows encode state.

**The Flat Surface Rule.** Keep record surfaces flat with existing paper tones and borders; reserve edge shadows for drawers and open table menus.

UI changes are immediate; no reusable transition scale is defined. Reduced motion disables animation, transitions and smooth scrolling, while timeline/minute controls retain model access.

## Shapes

Small practical corners remain: scene labels use `scene-label`; fields/badges use `field`; actions/navigation use `button`; panels/toasts use `panel`. Borders are one pixel. Status markers are square for OK, circle for Watch, triangle for Fault and diamond for Sensor offline, always with text. Severity chips add an icon, word and border treatment.

Separate boxes, cylinders, rings, grates and low polygon details form selectable model parts. Fixed house geometry has no movement controls. Debug part movement remains available within assembly controls and does not edit the site map.

## Components

### Buttons and navigation

Paper secondary actions have a thin border and brown ink; hover uses `well2`. Primary, active navigation and pressed controls reverse paper onto ink; pressed styling takes precedence over hover. Standard actions have a 44px minimum height. Disabled actions use opacity 0.65 and a native unavailable cursor. Focus is a 2px ink outline with 3px offset. Navigation wraps; a skip link appears on focus. Small glossary triggers and table sort controls have their own compact dimensions.

### Shared record table

`DataTable` supplies an icon-led search field, checkbox multi-select filters with selected counts/carets, sortable sentence-case headers, saved column visibility, loading/empty states, row actions and comfortable/compact density. Filter and Columns menus use native `details` with a shared name so only one opens at a time. Desktop toolbar controls are 36px tall; mobile actions are 40px. IDs are plain monospace text with a dedicated detail action. Rows are 40px comfortable or 32px compact. Pagination offers 10, 20 or 25 rows, starting at 10. There are no selection checkboxes. CSV exports filtered/sorted visible columns. Preferences and pagination are client-local.

### Chips, panels and feedback

Chips combine icon, word and border. Watch uses a dashed border; fault uses brick. Paper panels retain existing radius/padding, with wrapping headings/actions. Charts keep their own legend/direct labels, table alternative and export. “No reading” stays explicit rather than becoming zero. Saves show a dated toast with a destination. Record audit uses a collapsed history section, latest five distinct entries by default and Show all for the remaining entries. Repeated action/note/user entries are grouped for display; original saved history remains the data responsibility. The persistent synthetic-data badge is removed; source notice belongs on About only.

### Fields and help

Inputs, selects and textareas retain native behavior, paper backgrounds, thin borders and visible labels/units. Standard fields have a 44px minimum height. Fewer than eight options use a plain select or segmented controls; long lists use one keyboard combobox with listbox, arrow navigation, Enter and Esc. Squeeze/smell use segmented choices. Glossary triggers open shared native popovers with plain definitions and close controls.

### Non-modal drawers

The shared detail drawer is an `aside` with dialog semantics and `aria-modal=false`. It focuses Close when opened, closes with Esc/Close and restores the previous focus; it does not trap focus or block the page. Pilot-house selection also closes on map background or changes with another selection. Sensor, fault/rule, trial logging, allocations and Model details use the same pattern.

### Model workspace

Part selection drives readings and fault context. Operator controls lead with model inspection; advanced settings stay in Debug. Shared storm playback sits beneath the model. Short rain strokes, an engine-depth cyan surface/waterline, soil moisture shading, partial pipe fill and discharge-width arrows replace particle droplets and visual depth exaggeration. The flow strip labels inlet through outfall/overflow. The pink amendment layer reflects recorded depth/dose. Model details groups Rainfall, Catchment, Surface, Soil, Drain and Overflow in collapsed sections, with equations and a source footer.

Compost defaults to the model and uses small Model / Readings / Checks modes inside the bay workspace. Part sensors use a compact Input / Value / Role / Status table. Latest bay temperature, moisture and human checks appear beneath the model. Trial comparisons use paired horizontal Before / Latest bars on a shared scale with recorded counts, units and readiness progress.

### Site map

All six feature links and labelled pins provide destinations. Only pilot houses have hover/selection and a record drawer; context footprints are plain geometry. Houses are fixed. Zone controls outline/scoped selections; “Water after 6 h” remains an independent display control. Rainfall opacity ranges from 0% to 75% in 5% steps, default 55%. Both map views draw the same dated zone interpolation and labelled radar bins, with numeric zone mm/h. Clouds permit pointer access through to geometry; attribution remains beside the map.

## Do's and Don'ts

### Do:

- **Do** preserve the cream/brown Map desk palette, Archivo and approved radar/cyan data colours.
- **Do** reuse the shared table, native short-list controls, long-list combobox and non-modal drawer.
- **Do** pair state/trust colours with shapes and explicit words.
- **Do** retain visible focus, sentence-case labels, readable units, dated saves and glossary help.
- **Do** preserve mobile stacking and panel-contained table/flow overflow.
- **Do** distinguish saved records, human checks and current model scenarios; keep data-source notice on About.

### Don't:

- **Don't** recolour approved data layers or add blue/green console accents, glow or decorative gradients.
- **Don't** make colour the sole indicator of status or selection.
- **Don't** restore movable map houses, particle droplets or the persistent data badge.
- **Don't** present schematic geometry, generated records or model scenarios as surveyed/calibrated evidence.
