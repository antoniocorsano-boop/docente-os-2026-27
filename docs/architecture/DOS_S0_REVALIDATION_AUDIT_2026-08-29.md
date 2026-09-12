# DOS-S0 — Curriculum Receiver & Revalidation Audit

Date: 2026-08-29
Status: PASS
Active baseline: `develop@ebdb2aa77ad68f1d65264671b4f61185b0ba2205`
Validated candidate: `455cef5f7c2df01cbab6aa6f1adfa4f4025885ec`
PR: #255

## Scope

Verify that Docente OS can receive a curriculum that changes from provisional to institutionally approved without overwriting teacher-authored operational state, including the important case where the curricular content/version identity remains unchanged and only authority/provenance changes.

## Findings

### 1. Import classification — PASS

Docente OS classifies current/incoming curriculum using the handoff structural footprint in the same class context. It does not rely solely on `curriculumVersionRef`.

Therefore the state change:

`same curriculumVersionRef + new complete approval evidence`

correctly becomes:

`UPDATE_AVAILABLE`

rather than `ALREADY_KNOWN`.

### 2. Explicit teacher revalidation — PASS

The incoming approved baseline produces an `AWAITING_TEACHER_REVALIDATION` review with persistence disallowed until the teacher makes an explicitly bound decision.

### 3. Teacher-authored operational state — PASS

The existing reviewed annual-planning framework is preserved as a defensive copy. The approved Arena handoff does not overwrite teacher sequencing, periods or operational constraints.

### 4. Requirement comparison — PASS

Revalidation distinguishes `ADDED`, `REMOVED`, `CHANGED` and `UNCHANGED`. Coverage is carried only for semantically unchanged requirements; changed/new mandatory requirements require explicit new alignment.

### 5. Approval authority — PASS

Only after explicit teacher acceptance can the new receipt become `APPROVED_INSTITUTIONAL` and clear `requiresRevalidationOnApproval`. The previous snapshot remains unchanged.

### 6. Cross-product same-version regression — PASS

A dedicated regression now proves:
- provisional and approved contexts use the exact same `curriculumVersionRef`;
- authority/provenance changes the structural footprint;
- import becomes `UPDATE_AVAILABLE`;
- teacher revalidation remains mandatory;
- unchanged requirement coverage carries forward;
- teacher framework remains intact.

## CI evidence

On candidate `455cef5f7c2df01cbab6aa6f1adfa4f4025885ec` Product CI explicitly executed `cml-curriculum-revalidation-same-version.test.ts`.

Result:
- same-version authority tests: 2/2 PASS;
- complete product test suite: 285/285 PASS;
- typecheck: PASS;
- lint: PASS with pre-existing warnings only;
- production build: PASS;
- Human Interaction Model: PASS;
- Dependency Security Gate: PASS.

P6 Performance Baseline is independent of the revalidation semantic gate and was still running when this audit receipt was written.

## Gate

`DOS-S0 = PASS`

Next Docente OS stabilization slice: `DOS-S2 — Annual plan / Design / UDA / Classes coherence`, with DOS-S1 already `PASS_WITH_FOLLOW_UPS`.
