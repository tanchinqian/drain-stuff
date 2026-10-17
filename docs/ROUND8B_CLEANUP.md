# Round 8B cleanup — 17 October 2026

The owner approved the full cleanup brief after completion of the selected-part AI integration (`ae60bf4`). The existing Map desk design, radar palette and honesty rules are retained. Each numbered section receives its own commit. No live model verification is claimed.

## Progress

| Section | Status | Evidence / next work |
|---|---|---|
| 0 Verification and stale docs | Done | Build and lint pass. Backend/shared 57/57, frontend 67/67. Full browser baseline: 20/43; updated run 35/43, remaining eight checks pass in targeted reruns (6/8 then 2/2). A final full suite will follow the UI changes. |
| 1 Shared drawers | Done | Native shared modal: dimmed scrim, outside/Escape/Back, dirty guard, focus trap/return, scroll lock, 540px desktop and full-height mobile. Shared footer for measurement/allocation/safety/report/commissioning. Three browser checks pass, including axe and saves. |
| 2 Fault layout | Done | Status and asset/source header, six-step lifecycle, explicit note helper, sticky next action, summary/evidence sections and newest-first audit timeline. Three drawer/lifecycle browser checks pass. Three-viewport captures follow in section 8. |
| 3 Suggested diagnosis | Done | Cached automatic retrieval, Refresh, concise state/mode chips, deduplicated numbered draft steps and source chips, collapsed citations/production details, amber insufficient state, reasoned edit/reject and timestamped feedback. Four browser checks and 57 backend/shared checks pass. |
| 4 Board fixable case | Done | Local DB F-001 was the older untouched detected fixture. Only that untouched fixture is upgraded; entered lifecycle history is preserved. Heavy physics test confirms S1 fixable, S2 capacity-limited and S3 clear. Computed differences, three bar styles/legend and stale-confirmation notice added. Two new unit checks pass. |
| 5 R1 / 3D framing | Not started | Fit, controls, stage readings and device labels. |
| 6 Page structure | Not started | Section navigation and three viewport review. |
| 7 Live AI check tooling | Not started | User-run script and exact setup; no live call until the user runs it. |
| 8 Demo readiness | Not started | Fresh setup, explicit reset and five-minute runbook. |

## Initial verification notes

The Windows sandbox blocked Vitest temporary-file renames before import. Repeating the same unit command with the normal host file permissions ran the checks. A real offline/backend completed-job shape mismatch was corrected by clearing transient progress on completion. Browser tests use an isolated temporary SQLite file on API port 8091 and separate Vite servers on 5191 (mock) and 5192 (API); model requests are disabled in this harness. The working demo database is not used.

Earlier Round 7 and Round 8 test counts are preserved as checkpoint evidence, not presented as current verification. Current public demo access is described in README and DEPLOY; obsolete operator-token requirements and outdated push claims were removed.

The browser repairs update searchable controls, the observations route, five operational map assets, archived trial counts and the six-state work-order flow. Captures now go to ignored test-results instead of overwriting historical checkpoint images. Rendering metadata updates during idle frames; the duplicate playback-control peak seek was removed. Camera zoom checks read actual camera zoom rather than label wording.
