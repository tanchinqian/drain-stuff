# Water visibility documentation — 14 October 2026

## Scope

Bounded Impeccable documenter pass for the complaint that the storm started without visible water and felt too abstract. Read the document reference, `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json`, `PhysicsOverlay.tsx`, `PhysicsControls.tsx` and the relevant stylesheet rules. This pass records an ordinary extension; it does not regenerate the design system or change application code.

The correction adds rain and illustrative flow particles, a wetting tint above decorative mulch, double-sided calculated ponding with a section cap, plain-language water states and **Jump to peak water**. The tint and particles do not add solver storage or change calculated depth. Reduced motion keeps particles still and retains timeline/minute controls. State and numerical depth remain readable without relying on cyan alone.

## Evidence and review limits

- Implementation-owner report: three targeted browser checks, production build/lint, desktop/mobile axe and reduced-motion checks passed. These are reported results, not reruns by this documentation pass.
- Early default state: minute 2 rain without a visible pool. Reviewed default peak: 73.1 mm.
- Capture files present: `water-early-desktop.png`, `water-peak-desktop.png`, `water-peak-mobile.png` in this directory. This pass confirmed their presence; the independent reviewer supplied the visual assessment.
- Fresh independent reviewer returned **ship for the narrow water-visibility correction**, with no material fixes requested. Source changed only through formatting after review, according to the implementation owner.
- No detector ran successfully: `cache_directory_failed`; no detector score or clean result is claimed.
- This is not a whole-surface review, a complete accessibility assessment, physical validation, or a completion verdict for the remaining physics stages. No tests, Git operations or push were performed by this documentation pass.

## Design drift and disposition

The correction retains the Map desk typography, cream/brown controls and readable native actions. Cyan remains a physics data cue already authorized by `PRODUCT.md`; it is not a new interface accent. The state block uses a simple divider and text rather than a new card or decorative effect.

The existing `DESIGN.md` and sidecar describe radar colours more narrowly than the later authorization for cyan physics water, and their no-motion description predates conditional particle playback. These are known documentation gaps, not a new visual identity. The state divider also uses a local border colour (`#c9c0ad`) rather than the global border token; record it as a local variation, not a new reusable token. Preserve both design files in this bounded pass. A future expressly scoped design refresh can reconcile the physics data and motion descriptions without changing their established UI palette or inventing a motion scale.

The implementation notes were appended to `docs/fix-round-2.md`. No durable product-scope change or design-system replacement is implied.
