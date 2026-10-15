# Round 4 stabilisation

Implemented locally on `codex/drain-trial-console`. No push or deployment. Scope: the supplied Round 4 brief, with the user's explicit instruction to retain the existing colours. Archivo, the cream/brown interface, seven radar colours and cyan water remain.

## Item-by-item result

| Item | Status | Result / reason |
| --- | --- | --- |
| A1 Full-width shell | Done | No page max-width; 24px desktop gutters shared by header/navigation/content. Mobile uses 12px. About prose retains its readable measure inside the full-width main. |
| A2 History | Done | Removed global Save history. Collapsed per-trial, per-fault and batch check history; specific action/note/user/time, duplicate grouping, latest five and Show all. |
| A3 Tables | Done | Plain sortable headings, monospace record links, centred cells, hairlines and 40/32px rows, including batch action links. |
| A4 Clipping | Done | Removed internal vertical height cap; 10/20/25-row pagination below the table. Narrow screens scroll tables horizontally within their container. |
| A5 Toolbars | Done | 36px search/buttons, search icons/placeholders, carets, active filter counts, columns, density and export. No unused row selection. Filter/column menus close one another. |
| A6 Asset lists | Done | Searchable, grouped, sticky viewport-height rails; Houses collapsed; singular input grammar. |
| A7 Clock | Done | Fresh fixtures anchored to real load time; writes and age checks use real time. Legacy timestamps migrate once; persisted operator writes/audit history retain their actual dates. Trial deadlines use Singapore calendar-day boundaries. |
| A8 Empty space | Done | One-line empty chart note; enlarged compost framing and balanced model/detail layout. |
| B1 Palette replacement | Not done — user override | Existing radar colours and cyan water explicitly retained. |
| B2 Rainfall consistency | Done | Map values and rainfall chart derive from the same zone observations, with selected instant and chart period labelled. |
| B3 Duplicate map controls | Done | Removed feature tiles and pilot-house dropdown; direct map pins/houses select the detail. |
| B4 Map size | Done | Taller viewport-responsive map, with a mobile height allowance. |
| B5 Default/severity | Done | All zones on entry; realistic High/Medium/Low fault spread. Existing valid defaults retained and checked. |
| B6 Charts | Done | Short storm-axis times, date in heading, aligned plot heights and one-line no-data treatment. Longer ranges use date ticks. |
| C1 Duplicate site list | Done | Trials register is the main selection surface; duplicate sidebar removed. |
| C2 Comparisons/counts | Done | Labelled Before/Latest bars with shared scale. Actual fixtures contain **3 marked points and 24 re-tests per treatment**, rather than inventing the brief's example of six. Replicates are defined separately. |
| C3 Minimum progress | Done | Check icon and labelled “24 of 12 re-tests needed · Minimum met” progress. |
| C4 Trial status | Done | Shared tested status/deadline functions; T2 is Overdue, with its effective due date shown consistently. Due day remains On track until Singapore midnight. |
| C5 Allocation | Done | Opened from trial record in a drawer; baseline/maturity/safety gates retained. |
| C6 Source | Done | Labelled Data source row. |
| D1 Model balance | Done | Parts/model/details rebalanced; latest readings/check summary below model. |
| D2 Tabs/modes | Done | One Model/Readings/Checks tab row; small internal Operator/Debug/Troubleshoot switch; CAD assembly label removed. |
| D3 Sensor prose | Done | Compact name/value-with-unit/role/status table, with sensor detail links. |
| D4 Batch fixtures | Done | Three distinct input weights and start dates. Existing saved operator records are preserved. |
| E1 Sensors | Done | Shared table/rail fixes and adjoining desktop detail drawer. Small screens use the accessible overlay drawer. |
| E2 Faults | Done | Single status-cell control, mixed Open/Inspected/Closed fixtures, Faults/Rules tabs and specific audit messages. Closed records can appear on a later page. |
| E3 Rule links | Done | Plain text links opening rule detail, with full label available when truncated. |
| F Layout/accessibility automation | Done | Eight routes at 1440, 1920 and 360px: main widths 1392/1872/336px, no document overflow, no vertically clipped table rows, no axe WCAG A/AA violations. Mobile table scrolling is contained. |
| F Hue exclusion | Not done — user override | Replaced the requested hue ban with a regression check preserving the user's seven-colour radar palette. |
| F History/clock automation | Done | Record-specific history/status-flow checks and unit checks for seed migration, real clock, readiness and due-day boundary. |
| F Screenshots | Done | Before: eight routes at both desktop sizes. After: eight routes at both desktop sizes and 360px. Stored in `docs/screens/round4/before` and `after`. |
| F Summary | Done | This ledger records every item and intentional exception. |

## Verification and review

- Full browser suite: **28 passed**. Final focused Round 4 suite after reviewer corrections: **5 passed**, including 40/32px batch row checks and refreshed captures.
- Unit checks: **54 passed** across ten files, including the new Singapore due-day boundary test.
- Production build and lint passed.
- Two independent critique assessments preceded layout and polish; archived in `.impeccable/review/round4/critique.md`.
- Parent visual review used one batched inspection and one confirmation. A fresh finish reviewer inspected all 24 after and 16 before captures plus relevant source. Its two material findings were corrected; no remaining material defect was found in that manual scope.
- The Impeccable detector could not run (`cache_directory_failed`); there is no automated detector verdict. The finish reviewer had screenshot/source access, not a live browser.
- `.impeccable/review/round4/after-layout.json` is the **first-pass** measurement archive. Its 53px batch rows predate the final action-link correction; final 40/32px batch row sizing is asserted in `app/tests/round4.spec.ts`.
- Checks use local mock data. They do not validate live hardware, field calibration or a production backend.

## Local page commits

`a5cc52a` shared shell/clock; `617d8ec` Overview; `98a7609` Trials; `c99f826` Sensors; `1e32acd` Faults; `fbfdad6` feature detail; `c7b287e` batches/compost. Final correction and evidence commits follow these page commits. Nothing was pushed.
