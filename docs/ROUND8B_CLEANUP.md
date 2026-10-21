# Round 8B cleanup — 17 October 2026

The owner approved the full cleanup brief after completion of the selected-part AI integration (`ae60bf4`). The existing Map desk design, radar palette and honesty rules are retained. Each numbered section receives its own commit. Follow-up on 18 October: the user supplied a successful live DeepSeek check for all three seeded faults; see [live verification evidence](AI_LIVE_CHECK.md). Original cleanup checks below remain checkpoint evidence.

## Progress

| Section | Status | Evidence / next work |
|---|---|---|
| 0 Verification and stale docs | Done | Build and lint pass. Final build and lint pass. Backend/shared 59/59 and frontend 67/67. Final full browser suite 62/62, no skips or retries. Initial stale tests and real playback/progress issues were repaired. |
| 1 Shared drawers | Done | Native shared modal: dimmed scrim, outside/Escape/Back, dirty guard, focus trap/return, scroll lock, 540px desktop and full-height mobile. Shared footer for measurement/allocation/safety/report/commissioning. Three browser checks pass, including axe and saves. |
| 2 Fault layout | Done | Status and asset/source header, six-step lifecycle, explicit note helper, sticky next action, summary/evidence sections and newest-first audit timeline. Three drawer/lifecycle browser checks pass. Header status/source/location verified and captured at all three widths. |
| 3 Suggested diagnosis | Done | Cached automatic retrieval, Refresh, concise state/mode chips, deduplicated numbered draft steps and source chips, collapsed citations/production details, amber insufficient state, reasoned edit/reject and timestamped feedback. Four diagnosis browser checks pass; backend/shared checks finish at 59/59. |
| 4 Board fixable case | Done | Local DB F-001 was the older untouched rule-origin detected fixture. Only that untouched fixture is upgraded; entered lifecycle history is preserved. Heavy physics test confirms S1 fixable, S2 capacity-limited and S3 clear. Computed differences, three bar styles/legend and stale-confirmation notice added. Two new unit checks pass. |
| 5 R1 / 3D framing | Done | Bounds-based R1 camera and inlet close-up; three viewport checks confirm at least 70% width. High-first adaptive quality, quality/FPS only in Debug. Visible assembly modes; collapsed advanced controls. Compact flow legend and selected chamber flow. Human device labels retain IDs in details. |
| 6 Page structure | Done | Sticky section navigation on Overview and feature pages links Overview, Replay, Parts, Sensors and Model details. Empty states provide next actions. Six-page containment/axe matrix passes at 390, 1440 and 1920 (3 browser tests). Existing single primary-action patterns retained. Three-viewport screenshot review completed. |
| 7 Live AI check tooling | Done, including user-run live verification | server/.env setup and npm run check:ai added. After follow-up response validation and token-budget fixes, the user's 18 October run validated F-001, F-002 and F-003 on the first attempt with no fallback. This verifies provider integration, not diagnostic accuracy. |
| 8 Demo readiness | Done | Both locked installs and dev:all passed in a separate clean clone, with seeded data and zero browser console errors. Reset backup/restore and AI tooling self-tests pass. Video runbook and all 12 requested screenshots are saved. |

## Initial verification notes

The Windows sandbox blocked Vitest temporary-file renames before import. Repeating the same unit command with the normal host file permissions ran the checks. A real offline/backend completed-job shape mismatch was corrected by clearing transient progress on completion. Browser tests use an isolated temporary SQLite file on API port 8091 and separate Vite servers on 5191 (mock) and 5192 (API); model requests are disabled in this harness. The working demo database is not used.

Earlier Round 7 and Round 8 test counts are preserved as checkpoint evidence, not presented as current verification. Current public demo access is described in README and DEPLOY; obsolete operator-token requirements and outdated push claims were removed.

The browser repairs update searchable controls, the observations route, five operational map assets, archived trial counts and the six-state work-order flow. Captures now go to ignored test-results instead of overwriting historical checkpoint images. Rendering metadata updates during idle frames; the duplicate playback-control peak seek was removed. Camera zoom checks read actual camera zoom rather than label wording.

## Final verification

- `npm run build:all`: pass, including server type check and React production build. Rollup strips upstream dependency annotation comments; the build exits successfully.
- `npm --prefix app run lint`: pass, no lint errors.
- `npm run test:all`: **126/126**, comprising **59 backend/shared** and **67 frontend** tests.
- Full Playwright suite: **62/62 passed**, **0 failed**, **0 skipped**, **0 retries**; 339.2 seconds. This includes the original 43 scenarios and 19 cleanup checks/captures. The legacy rule-origin seed-format correction made after that full run was followed by all 126 unit checks and another production build; it does not change the fresh-fixture UI exercised in the full suite.
- `npm run check:ai -- --self-test`: three mocked, validated outputs pass, plus assertions rejecting fallback as a successful live check. **No live provider verification is claimed.**
- `npm run demo:reset -- --self-test`: pass; an isolated database was reseeded and its original records remained available in the automatic backup. The working database was not reset.
- Separate clean clone at readiness commit `cc396dd`: `npm ci` installed 95 packages, `npm --prefix app ci` installed 333, then `npm run dev:all` started the fresh API/app. Browser verification found seeded contract 4.3.0 data, 11 faults, confirmed S1, and **zero browser console errors**. Temporary services and the verification clone were removed afterward.
- The working app was restarted at `http://127.0.0.1:5174/`. Read-only verification confirms the older untouched F-001 fixture is now confirmed with one clearly labelled demo-baseline audit entry. Manual reports and any recorded lifecycle history are preserved.

## Item-by-item completion

| Item | Status | Result |
|---|---|---|
| 0.1 | Done | Build, lint, unit and full browser checks run; failures fixed. |
| 0.2 | Done | Current push/auth statements and model instructions corrected. Public-edit warning appears in README and deployment instructions. |
| 1.1 | Done | X, scrim, Escape and mobile Back share a typed-text guard. Saving one section preserves another section's unsaved note. |
| 1.2 | Done | Native modal, labelled title, dimmed scrim, focus entry/trap/return and background scroll lock. |
| 1.3 | Done | 540px right drawer; full-height mobile sheet; fixed header/footer and scrolling body. |
| 1.4 | Done | Shared opening coordination replaces an existing drawer; replacement also respects unsaved text. StrictMode fixture checks both paths. |
| 1.5 | Done | Dismissal, focus, scroll and axe checks pass. |
| 2.1 | Done | Fault title/status, asset/part/zone and source/time are in the header. |
| 2.2 | Done | Six lifecycle steps with completed ticks/current fill and one next work-order action. |
| 2.3 | Done | Note and assignment requirements are explained next to the fields. |
| 2.4 | Done | Summary, Work order, Suggested diagnosis, Evidence and inputs, Audit trail; collapsed sections retain summaries/counts. |
| 2.5 | Done | Evidence table includes input, latest stored value/time and trust captured at alert time, with that distinction explained. |
| 2.6 | Done | Sticky next action and newest-first audit timeline. |
| 2.7 | Done | Checked and captured at 390, 1440 and 1920px. |
| 3.1 | Done | Automatic cached retrieval and Refresh; snapshot time stays tied to the result. |
| 3.2 | Done | Diagnosis, confidence/mode chips, unique numbered draft steps and source chips. Duplicate text is also collapsed. |
| 3.3 | Done | Collapsible evidence classifies sources; production details identify retrieval, prompt and provider/fallback. |
| 3.4 | Done | Amber insufficient-information state lists missing evidence and suppresses ranked steps. |
| 3.5 | Done | Enabled review buttons; inline step edits; required edit/reject reason; saved choice/time and fault audit entry. |
| 3.6 | Done | Only the drawer header stays fixed; nested section headings no longer clip the body. |
| 3.7 | Done | Numbering, uniqueness, feedback and audit checks pass. |
| 4.1 | Done | Heavy result derives fixable S1, capacity-limited S2 and clear S3 from parameters/faults. Older untouched rule-origin seed records are upgraded without overriding operator actions. |
| 4.2 | Done | Computed removed overflow and persistent-capacity escalation are explicit. |
| 4.3 | Done | Strong/light bars, thin capacity reference and legend; identical capacity bars are labelled. |
| 4.4 | Done | Relative-ranking and About-page demo/limits disclosures retained. |
| 5.1 | Done | R1 bounds fit is at least 70% width at all three widths; three-quarter view and inlet close-up. |
| 5.2 | Done | High-first adaptive quality; quality/FPS limited to Debug. |
| 5.3 | Done | Visible assembly modes and playback; heavy controls are grouped in View controls, closed by default in Operator. Debug exposes its advanced controls. |
| 5.4 | Done | Selected stage L/min on model; compact Inlet/Chamber/Outlet/Bypass legend when not inspecting. Unit help retained. |
| 5.5 | Done | Operational device labels are human-readable; full IDs remain in record details. |
| 6.1 | Done | Sticky section links on Overview and feature pages. Existing compost tabs remain. |
| 6.2 | Done | One primary action per task section; consistent existing button sizes and verbs retained. |
| 6.3 | Done | Empty records/parts/devices give a next action. |
| 6.4 | Done | Containment and axe checks at 390/1440/1920; all 12 captures reviewed in one batch plus one confirmation. |
| 7.1 | Done | `AI_LIVE_CHECK.md` gives ignored server/.env settings and a seeded-fault click path. |
| 7.2 | Done | check:ai prints all requested fields for three seeded faults, validates outputs and fails on unexpected fallback without printing credentials. |
| 7.3 | Done | The self-test is explicitly mocked. The user subsequently ran the actual provider check and supplied all three validated outputs with no fallback on 18 October. |
| 8.1 | Done | Three-command clean-clone startup verified with seeded API data and no browser console errors. |
| 8.2 | Done | Explicit demo:reset backs up the current database, restores fresh seed state and refuses reset when a local API is detected. Stop the launcher before using it. |
| 8.3 | Done | Five-minute recording guide includes starting state, click path, expected results and limits. |

## Screenshots and settled design

[All 12 captures](screens/round8b/README.md) cover the fault drawer, diagnosis, fixable board row and R1 at 390, 1440 and 1920px. The initial review found missing header metadata, excess R1 mobile canvas height and incorrect capture scrolling; one correction batch and one confirmation review resolved them. Cream/brown surfaces, Archivo typography, radar and water colours were preserved. **No settled-design conflict remains.**

## Delivery

The 18 October follow-up aligns prompt constraints with validation, supplies safe rejection feedback on retries, and fixes OpenCode DeepSeek truncation using low reasoning effort and bounded larger token budgets. Both frontend and backend TypeScript checks passed after these changes; the full unit/browser suites were not rerun for this follow-up. SQLite was rebuilt locally for the user's Node 22 installation and app/API startup succeeded at `http://127.0.0.1:5173/`; native binaries, database files and API keys are not committed.

AI integration was committed first (`ae60bf4`), followed by one commit per numbered section: 0 `d6996a6`, 1 `b296957`, 2 `346df89`, 3 `9635d5f`, 4 `7166eb5`, 5 `7e084e7`, 6 `b35bf3a`, 7 `ab5fe4a`, 8 `cc396dd`. Final verification fixes and captures are saved in `c73e3ad`. These remained local at the original cleanup checkpoint. The user requested pushing the cleanup and subsequent AI fixes on 18 October; the branch is `codex/drain-trial-console`. No deployment is included in that request.
