# CurManLight Arena + Docente OS — Product Stabilization Execution Plan

Date: 2026-08-29
Status: ACTIVE EXECUTION PLAN
Docente OS active baseline: `develop@ebdb2aa77ad68f1d65264671b4f61185b0ba2205`
Arena active baseline at plan start: `main@6991f9293fe83761ab263d6962909554f18853f5`

## Governing decision
AILit remains architecture-only until the stabilization gates below are closed.

## Arena sequence
ARENA-S0 authority/baseline audit → ARENA-S1 curriculum runtime consolidation → ARENA-S2 product-surface rationalization → ARENA-S3 Human Task/HIM/browser/mobile/HVA closure → ARENA-S4 interoperability stabilization.

## Docente OS sequence
DOS-S0 provisional/approved receiver and revalidation audit → DOS-S1 Knowledge Base consolidation → DOS-S2 Piano annuale/Progetta/UDA/Classi coherence → DOS-S3 assistant authority closure → DOS-S4 browser/mobile/HVA closure.

## Cross-product final gate
1. Arena authority model has no unresolved contradiction.
2. Runtime curriculum projection is deterministic/versioned.
3. Product ownership boundary is reflected in runtime and UI.
4. Arena → Docente OS planning handoff is stable.
5. Provisional → approved revalidation is stable.
6. Docente OS → Arena evidence cannot mutate canonical curriculum automatically.
7. KB provenance/human validation are preserved end-to-end.
8. Critical journeys pass browser/mobile validation.
9. HVA passes on immutable candidates.
10. AILit remains `EXTERNAL_REFERENCE` until separate authorization.

## Current execution state
- ARENA-S0: PASS_WITH_FOLLOW_UPS.
- ARENA-S1: active in PR #83 with explicit complete-curriculum approval evidence and regression tests moved into fast CI.
- DOS-S0: begins from `develop`, not `main`, because the modern Docente OS product is developed on that branch.
- AILit remains parked in architecture-only PRs.
