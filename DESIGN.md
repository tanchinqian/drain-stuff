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
---

# Design System: Drain Trial Console

## Overview

**Creative North Star: "Map desk"**

Map desk is a compact operator console with warm paper surfaces, brown ink and geometric site and assembly schematics. Archivo keeps headings firm and records readable. Thin borders, tonal wells and dark selected controls make the next inspection action easy to find.

The system serves practical inspection: operators move between a site view, model parts, sensor records and faults. Native controls, tabular numerals, explicit units and shape plus text states carry the information. The accepted world excludes blue and green, gradients, glow and decorative shadows.

**Key Characteristics:**

- Warm cream ground, paper panels and brown ink.
- Compact Archivo hierarchy with tabular numerals.
- Flat surfaces, thin borders and native controls.
- Geometric schematics with text alternatives and explicit limits.
- Shape plus text states, with color as a supporting cue.

This record is extracted from `app/src/styles.css`, `app/src/three/geometry.ts`, the current components and refreshed `docs/screens/` captures. Frontmatter records reused values; the sidecar carries focus, breakpoints and rendered component samples. Source remains the implementation authority.

## Colors

The palette resembles a working map on a cream desk; stronger colors identify measurements, trial arms and conditions.

### Primary

- **Brown ink** (`ink`): body text, selected actions and active navigation; paper text reverses on selected controls.
- **Rain copper** (`rain-bar`): rainfall bars.
- **Warm heat scale** (`heat-0` through `heat-3`): discrete rainfall intensity and schematic material cues, progressing from pale sand to brick. Brick also marks faults and errors.

### Secondary

- **Control violet** (`arm-control`): the control trial arm and offline diamond.
- **Decompaction ochre** (`arm-decompact`): the decompaction trial arm and watch circle.
- **Compost magenta** (`arm-compost`): the decompaction plus compost trial arm.

### Neutral

- **Desk cream** (`ground`): document background and 3D ground.
- **Paper cream** (`panel`): panels, controls, labels and reversed selected text.
- **Recessed sand** (`well`, `well2`): summary strips, notices and model fields.
- **Map border** (`border`): panel edges, controls, rows and separators.
- **Secondary brown** (`ink2`): supporting text, chart labels and normal status squares.
- **Muted brown** (`ink3`): schematic edges and secondary material details.

**The State Readability Rule.** Pair each status color with its geometric marker and a written label; color alone never carries trust or fault state.

## Typography

**Display and body font:** Archivo Variable, with Archivo and sans-serif fallbacks. The local package supplies the font. Numeric records use tabular figures.

The display, headline, title, body and label entries in frontmatter follow the implemented h1, h2, h3, body and supporting metadata. Headings compress the variable font: h1 uses 82% stretch; h2 and the brand use 88%. Body remains regular, while tables, field labels, segments and status text use a compact 14px supporting size. Scene labels use 12px with a 1.25 line height; they annotate geometry rather than replace the readable record panels.

About copy is limited to 72ch. Mobile fields use 16px type. Keep metric values adjacent to their units and retain the established plain case labels.

## Layout

The document is centered with a maximum width of 1484px and 24px outer padding. Desktop panels use 22px padding and an 18px grid gap. The Overview combines a flexible map with a 300px rail; the Detail combines a 155px part list, flexible model and 280px reading panel. Action groups wrap at their 7px gaps.

At 1100px, the Overview rail narrows to 250px and Detail readings move below the model. At 800px, Overview and trial layouts stack, the right rail becomes two columns, and charts use one column. At 580px, the page and panels use 16px padding; forms, rails, comparisons and models stack. Navigation wraps. A native part selector replaces the desktop part list, coordinate controls become one column and the assembly scene is 300px high. The site scene is 360px high.

Tables preserve complete records through horizontal overflow inside their panel. The sensor table has a 1080px minimum width. Phone reflow must keep the document itself within the viewport. The Plan SVG gives way to the existing house controls on small screens; sensor positions retain a keyboard list.

## Elevation & Depth

Interface surfaces have no shadows. Thin borders and tonal differences separate the desk, panel and well. Modal backdrops use translucent brown ink. The schematics convey depth through geometry, rough materials and edge lines; translucent ponding and liner parts reveal layers. Explode, section, orbit, isolate and movement express spatial relationships.

**The Flat Surface Rule.** Separate interface layers with the existing paper tones and borders, without gradients, glow or decorative shadows.

UI state changes are immediate; the stylesheet defines no reusable transition durations. Reduced motion disables animation, transitions and smooth scrolling. Do not invent a motion scale for an ordinary extension.

## Shapes

Corners are small and practical: scene labels use the `scene-label` radius; inputs and badges use `field`; actions, navigation and notices use `button`; panels and toasts use `panel`. Borders are one pixel. The status vocabulary is a square for OK, circle for Watch, triangle for Fault and diamond for Sensor offline. These CSS geometric markers always sit beside text.

The models use separate boxes, cylinders, rings, grates and low polygon material details. Stable part groups are selectable and movable. Default dimensions remain schematic, with the displayed local confirmation label.

## Components

### Buttons

Paper secondary actions have a thin map border and dark ink. Hover moves to the lighter well tone. Primary and pressed actions reverse paper text onto brown ink; the pressed treatment takes precedence over hover. Controls use the frontmatter padding and a minimum height of 44px. Disabled buttons reduce opacity to 0.65 and use the native unavailable cursor.

Keyboard focus uses a 2px ink outline with 3px offset on buttons, links and fields. Icons are SVG assets, accompanied by meaningful text or accessible names.

### Badges and status labels

Badges are small bordered paper labels, including the persistent synthetic data badge. Status labels combine an 8px gap, 14px text and a geometric marker. Sensor trust reuses this shape plus text vocabulary while displaying its own explicit trust, drift, calibration and proxy/reference information.

### Panels and records

Panels use the documented paper, border, radius and padding. Headings and action groups wrap instead of crowding. Rows use thin separators, with numeric values aligned right where appropriate. Notices use the deeper well tone; errors use brick text. Chart explanations and table alternatives remain close to the chart.

### Inputs and fields

Inputs, selects and textareas retain native behavior. Paper backgrounds, thin map borders and the field radius match the buttons. Standard fields fill their available width and have a minimum height of 44px. Checkboxes are 18px squares; ranges retain native interaction. Labels, units, field notes and validation remain visible.

### Navigation

Text links wrap into additional rows as needed. The active route uses the same dark ink and paper reversal as pressed buttons. Link hover underlines; keyboard focus remains explicit. A skip link appears on focus.

### Model workspace and sensor records

The same control grammar serves the sixteen drainage parts and eight compost parts. A selected part drives the reading panel, sensor list and relevant fault information. Optional parts display “Not installed” explicitly. Assembly mode, section axis and position, explode, sensor layer, labels, move, isolate, hide, reset and numeric position controls remain native controls beside the scene.

Site and assembly markers link stable sensor IDs to the register; a keyboard list offers the same records. Popups use paper and ink with readable metadata. Measurements retain metric, unit, time and trust context rather than becoming decorative chart labels.

## Do's and Don'ts

### Do:

- **Do** preserve the warm cream and brown Map desk palette and Archivo hierarchy.
- **Do** pair status and trust colors with geometric shapes and explicit text.
- **Do** keep native controls, visible focus outlines and readable metric units.
- **Do** preserve mobile stacking, the native part selector and panel-contained table overflow.
- **Do** keep stable part and sensor IDs, keyboard record access and schematic/synthetic labels visible.

### Don't:

- **Don't** introduce blue or green, gradients, glow or decorative interface shadows.
- **Don't** use color as the only signal for a fault, trust state or selected record.
- **Don't** replace practical controls with ornamental interactions or illegible model annotations.
- **Don't** present schematic dimensions or synthetic readings as surveyed geometry or validated field evidence.
