# Search controls

Search extends the existing Map desk controls so operators can find choices and records within the local console.

## Use and scope

- All 19 dropdown call sites use `app/src/components/SearchableSelect.tsx`: Overview house and mapped-house choices; Sensor and Fault filters; allocation, batch checks, trial test and guardrail forms; model section axis; and the mobile model-part selector.
- Type in the adjacent search field to narrow options by displayed text or stored value. Matching ignores case and surrounding whitespace. Searching preserves the current selection, including when it does not match. Choosing another option clears the query. The Clear button or Escape restores all options; Enter in the search field does not submit the form.
- A status message reports matching options or no matches and explains when the current selection is kept. Disabled dropdowns also disable their search and Clear controls. Selection remains a native browser control with normal keyboard behavior.
- The desktop model-part list searches part names and displays an empty-result message. The Trial register searches feature, arm, soil, owner, batch and dose; the Batch ledger searches batch, bay, status, maturity gate and gate reason. These list searches ignore case and surrounding whitespace. Remove the query to restore rows. Filtering leaves the selected detail record and full-data exports intact; record-list queries remain after choosing a row.

## Design consistency

This is an ordinary extension of `PRODUCT.md`, `DESIGN.md` and `.impeccable/design.json`: native fields, Archivo typography, cream paper surfaces, brown text, thin borders, visible focus and the existing mobile stacking and contained table overflow. The shared dropdown groups its search and select with a small gap and inherits the established control styling. No new visual identity or token system is needed; the design document and sidecar are preserved.

## Evidence and limits

The implementation owner reports successful build and lint, three existing console browser checks, and two targeted search checks. `app/tests/search.spec.ts` covers option filtering with case/whitespace normalization, selection preservation, reset after choice, no matches, explicit Clear, mapped-house identifier lookup, Trial/Batch no-result recovery, and document overflow at 1440 px and 390 px. Escape, disabled controls and every individual form are supported by source but are not separately exercised by these targeted checks.

The initial `docs/search-review.md` identified missing Trial and Batch record searches. Both are now implemented in source; this note does not claim a subsequent reviewer verdict. The earlier detector failure (`cache_directory_failed`) remains a limitation, not a passed check. No checks were rerun solely for this documentation update.
