# DOS-IA-RESET — CV2 final blockers remediation

Base exact SHA: `b563bd0c6bf10666e380aa3cfd8709786cbdff06`.

Root causes isolated from CV2 Candidate Qualification #59:

1. `/planner` performance regression: the new Oggi page loaded lesson preparation twice in the same request path — once through `loadCurrentTodayOperationalContext()` and again for selected lesson routing.
2. CV2 HVA governance integration: the browser orchestrator generated the HVA receipt without running the governed baseline preflight/postflight pair, so otherwise-green HVA journeys were classified as baseline/fixture drift.
3. WCAG 2.2 AA:
   - mobile `.todayCalendarLink` hid its only visible/accessibility text with `display:none` and had no independent accessible name;
   - `.textbookCoverageBadge.optional` reduced text contrast to 4.17:1 through opacity.
4. X3 no-implicit-write gate: the assertion still used the superseded Planner task UI (`Sintesi della giornata`) even though generic professional tasks now live under `/attivita`.

Remediation boundaries:

- no budget increases;
- no weakening of HVA baseline integrity;
- no bypass of WCAG assertions;
- X3 continues to prove no implicit mutation by comparing the rendered Activities board before/after the Copilot request;
- no deploy or tenant mutation.
