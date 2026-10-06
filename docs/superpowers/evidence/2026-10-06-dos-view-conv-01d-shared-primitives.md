# DOS-VIEW-CONV-01D — Shared primitive inventory

Date: 2026-10-06
Status: QUALIFIED_NO_EXTRACTION
Parent tranche: DOS-VIEW-CONV-01
PR: #688
Qualified input head: `f808ac72e40247eacfff5dd548c4924cb7e61cec`

## Decision

Task 01D closes without introducing a new global/shared presentation primitive.

The approved rule is strict: a generalized primitive is created only when at least two real consumers among 01A–01C require the same behavior or styling. The A–C implementation already consolidated repeated behavior at the narrowest appropriate scope, and the remaining candidates do not satisfy that threshold without erasing meaningful ownership differences.

## Inventory

### Existing repeated primitives retained

- `NavigationCommandDialog` — shared by the command palette and the secondary `Naviga` menu. This is already the correct AppShell-level consolidation created by 01A.
- `SettingsContextDisclosure` — reused by multiple Settings sections. Its behavior is Settings-specific and already locally consolidated.
- `SettingsSectionHeading` — reused by multiple Settings cards. It remains correctly scoped to Settings.
- `GuidedEmpty` — reused by multiple Settings empty states. It remains correctly scoped because no second cross-surface consumer with the same semantics is demonstrated by 01A–01C.

### Candidate abstractions rejected

- `MobileBottomNavigation` — one structural AppShell consumer; extraction would add indirection without a second real consumer.
- `PageHeader` — the AppShell mobile header and Settings page header have different ownership and responsibilities; visual similarity is not sufficient evidence for one abstraction.
- `TaskFocus` — only one demonstrated Settings consumer in 01A–01C.
- `StatusFeedback` — repeated feedback styling exists, but the observed states carry different semantics and lifetimes; a generic primitive at this point would blur behavior rather than consolidate it.
- `EmptyState` — Settings already has `GuidedEmpty`; no second A–C consumer with matching behavior is demonstrated.
- `SettingsIndexItem` / `SettingsGroup` — the 01C overview is already generated from the Settings model and semantic group mapping; extracting wrappers would not remove duplicated source behavior.

## Verification basis

01C exact input head `f808ac72e40247eacfff5dd548c4924cb7e61cec` passed:

- Product CI;
- Browser Certification preflight;
- Human + Visual Acceptance;
- WCAG 2.2 AA automated assurance;
- P6 performance baseline;
- consolidated selected-gate enforcement.

X3 no-implicit-write and X4 Planner were selectively skipped because the exact-head impact classifier did not require them.

Because 01D introduces no product-code or behavior change, no behavioral RED/GREEN extraction cycle is applicable. The no-extraction decision is itself the outcome of the mandatory duplication inventory.

## Boundary

This decision does not prevent later extraction if 01E or 01F creates a second real consumer with identical behavior. Such an extraction must then be justified by those concrete consumers and, if behavioral, follow RED → GREEN before migration.

No domain, persistence, timetable, authority, PWA/install or `DOS-A1` behavior is changed by 01D.
