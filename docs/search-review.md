# Search extension — finish review

## Scope and evidence

Fresh manual review of SearchableSelect.tsx, all 19 call sites across nine consuming files, ModelWorkspace.tsx, related CSS, Trials.tsx, Batches.tsx, search.spec.ts, and the Impeccable craft floor. Opened `.impeccable/review/search-desktop.png` (1440 px wide) and `search-mobile.png` (390 px wide). These show the Sensors filter controls after choosing Compost filter sock and clearing the query.

Follow-up review inspected the two requested record-list fixes and register-search CSS. Opened all four refreshed captures: `search-trials-1440.png` (1440 × 3141), `search-trials-390.png` (390 × 6074), `search-batches-1440.png` (1440 × 2465), and `search-batches-390.png` (390 × 3886), under `.impeccable/review/`. Reopened mobile captures at original detail to inspect search labels, spacing, and focus outlines.

The implementation owner reports successful build, lint, four earlier browser checks covering search and existing operator/accessibility/sensor flows, and both targeted search browser tests after the fixes. This reviewer read the focused tests but did not rerun checks or conduct a live browser audit. The detector remains unavailable after the earlier `cache_directory_failed`; no new detector run or pass is claimed.

## Findings and priorities

No unresolved material findings in the reviewed scope.

| Item | Priority | Status | Evidence |
| --- | --- | --- | --- |
| Trial register lacked record search | P2 | Resolved | Labelled Search trials input filters feature, arm, soil, owner, batch and dose; clear no-results recovery text; active detail derives from the original collection. |
| Batch ledger lacked record search | P2 | Resolved | Labelled Search batches input filters identifier, bay, status, maturity gate and reason; clear no-results recovery text; active detail derives from the original collection. |
| Dropdown conversion | — | Ship | All 19 callers use the shared component; desktop/mobile sensor captures are coherent. |

Both new record searches normalize case and surrounding whitespace. Filtering affects the selectable rows while retaining the active detail and existing exports. The source and captures close the previous coverage finding without material layout regressions.

The shared dropdown search matches labels and values, preserves the current selection outside matches, and resets after selection. Clear and Escape restore options. Disabled state reaches both controls, and status text explains empty results and preserved selection. Current callers use supported ordinary options or fragments.

## Craft floor

The captures retain the established cream/brown surfaces and Archivo typography. Search is adjacent to its corresponding selector or directly above the relevant register. Desktop uses the existing grid, and mobile keeps controls within their panels. The new register labels and placeholders fit at 390 px; focus outlines remain visible with room around them. Tables retain their existing horizontal scrolling inside the panel.

Source confirms 44 px minimum input targets, 6 px dropdown grouping gaps, 16 px vertical separation around register searches, brown focus outlines, explicit accessible names, inherited themed selection, and brown placeholder text at full opacity. No new decorative scaffold, gradient, halo, typography system, or unnecessary animation appears. The extension inherits existing control hover and disabled treatment. Empty-state behavior is supported by source and the owner's reported browser checks; captures show the cleared query state. Computed styles and independent keyboard behavior were not remeasured in this review.

## Request coverage

All 19 native dropdown call sites use SearchableSelect: overview house/map-house choices; Sensor and Fault filters; allocation, checks, trial, and guardrail forms; model section axis; and mobile model parts. A source search found the sole native select implementation inside the shared component. The desktop model-parts list has a labelled search input and empty result message. Trial and Batch record selectors now also have search and empty-result recovery.

The focused dropdown test covers case/whitespace normalization, narrowed options, preserved selection, choice/reset, no matches, explicit Clear, viewport overflow at 1440/390, and mapped-house identifier search. The new record-list test covers no-results recovery on both routes and page overflow at both widths. Successful matching and active-detail preservation in the new record lists were reviewed in source rather than independently exercised by this reviewer. No claim is made that every converted form received an individual interaction test.

## Disposition

**Ship.** The two P2 coverage findings are resolved. The dropdowns and reviewed related record selectors now provide search within the established design. No additional visual fix, recapture, or rebuild is required for this extension. This disposition rests on source inspection, six opened captures, and the implementation owner's reported checks. The unavailable detector remains an evidence limitation, not a passed check.
