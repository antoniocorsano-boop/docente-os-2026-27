# MATERIAL-ORCH-01 — Design v2 Rework Checkpoint

**Date:** 2026-10-13  
**PR:** #703  
**Design source:** `docs/superpowers/specs/2026-10-13-material-orchestration-design.md`  
**CPRI architecture:** `docs/architecture/CANONICAL_PLAN_RUNTIME_IDENTITY.md`  
**CPRI plan:** `docs/superpowers/plans/2026-10-13-cpri-01-canonical-plan-runtime-identity.md`  
**Current develop baseline considered:** `a2e8f46972b60914e3a554df3b6d3942b34029a1`

## 1. Purpose

Record the post-CONTAIN-01 architecture rework required by the original independent review and the deep pre-implementation audit before any CPRI or material-core runtime work begins.

This checkpoint is documentation-only. It does not authorize schema, runtime, provider, deployment or cross-product mutations.

## 2. Containment prerequisite status

The containment prerequisites identified by the deep audit are now satisfied on the active `develop` line:

- CONTAIN-01 integrated through PR #704;
- CONTAIN-01B integrated through PR #705;
- Beta runtime schema contract is v100;
- runtime schema lineage/provenance/containment checks are active;
- legacy Studio Atlas material write RPC execution is revoked;
- legacy #692-style Atlas lesson-material inserts are blocked at the authoritative DB boundary;
- historical Atlas-origin extensions/receipts were preserved rather than deleted;
- legacy CPRI mutators are retained only as forensic schema evidence with runtime execution revoked;
- production startup fails closed on runtime-schema mismatch and is pinned to the release contract rather than deploy-time migration files.

Containment closure does not authorize CPRI mutation or material cross-product runtime.

## 3. Original review findings — disposition

### Finding 1 — accepted artifacts must use the canonical lesson-material path

**Disposition:** addressed in design v2.

The design now requires:

`durable Knowledge/canonical material identity -> LessonDesignExtension -> LessonPreparationManifest.materialSlots`

There is no independent material acceptance store/lifecycle. `AVAILABLE_FOR_LESSON` is derived readiness, and actual use remains TeachingSession evidence.

### Finding 2 — no locally invented cross-system protocol

**Disposition:** addressed in design v2.

`MaterialTaskRequestV1` / `MaterialCandidateBundleV1` are removed as canonical top-level handoff envelopes. Future shared execution must reuse OR-07 `SharedCapabilityRequest/Result` with typed material proposal input/output. This Docente OS PR does not register a new canonical capability ID or update shared governed memory.

### Finding 3 — pinned CPRI binding vs `current_generation_id`

**Disposition:** addressed in CPRI architecture/plan v2.

The design explicitly distinguishes Knowledge current generation from governed CPRI generation and requires new TeachingSession allocation authority to validate against CPRI once it becomes active. Historical allocations remain unchanged.

### Finding 4 — repository-wide CPRI consumer migration

**Disposition:** addressed in CPRI plan v2.

The guard is repository-wide, classifies every match, and distinguishes forbidden runtime authority from historical/provenance/forensic evidence. A hand-maintained path subset is not sufficient.

### Finding 5 — invented UUID `lesson_block`

**Disposition:** addressed in design v2.

The acceptance boundary is grounded in existing persisted context, starting from `annual_plan_sections.id` plus contextual `block_id`, with workspace/year/generation resolved or verified authoritatively. No new lesson-block UUID entity is assumed.

## 4. Deep-audit findings B1–B10 — disposition

### B1 lifecycle reuse

Use existing `LessonDesignExtension` states. External/provider candidates remain transient. Material-slot readiness is derived.

### B2 semantic material role

`LessonMaterialRole` is a distinct canonical dimension from `artifactKind` and `audience`.

### B3 CPRI movement revalidation

Binding movement must explicitly cover:

- annual-plan progress;
- lesson-design extensions;
- lesson-preparation receipts;
- TeachingSession allocations.

Historical evidence is immutable; no silent carry-forward/copy/reset.

### B4 exact-state approval invalidation

Existing preparation fingerprint/STALE behavior remains the approval model. No competing approval subsystem is introduced.

### B5 durable internal artifact identity

Accepted material must resolve to Knowledge/canonical internal identity. Provider refs remain provenance only. Destructive deletion must fail closed while accepted lesson state depends on the artifact.

### B6 Officina vs Studio Atlas

General specialist material production remains Officina/provider-neutral under ADR-010. Studio Atlas is not the universal material engine; its primary governed boundary remains Pathway authoring under ADR-020.

### B7 OR-07 reuse

Future shared material proposal is typed input/output inside OR-07 and remains `PROPOSE_ONLY`. Teacher acceptance is a local Docente OS write.

### B8 rights/provenance

Design v2 includes source/derivation refs, provider/adapter provenance, rights/license state, attribution requirements and integrity evidence. Unknown rights block publication-readiness claims.

### B9 browser handoff provenance

Browser payload is explicitly untrusted proposal input. Origin/source strings and base64url do not prove provenance. Future governed runtime must use verifiable request/evidence binding.

### B10 write-boundary authorization

Future external proposal flow must enforce effective authorization at outbound invocation, return ingestion and authoritative local acceptance/replay boundaries. UI gating alone is insufficient.

## 5. CPRI plan correction after v100

The previous CPRI plan assumed it might create migration `0098_canonical_plan_runtime_identity.sql`. That assumption is obsolete and unsafe.

Current reality:

- 0098 is already occupied by CONTAIN-01;
- `canonical_plan_runtime_bindings` is already present/adopted;
- runtime mutation is intentionally revoked;
- schema provenance is anchored through v100.

CPRI-01 v2 therefore starts by verifying/adopting this baseline. Any later schema delta must use the next free migration number on the execution exact head and must preserve the runtime-schema contract.

## 6. Governance references now explicit

Design v2 explicitly references:

- Docente OS `LESSON_PREPARATION_ORCHESTRATION_CANONICAL.md`;
- TRAMA ADR-010 — Officina materiali separation;
- TRAMA ADR-020 — Studio Atlas product boundary;
- R4-P1 Governed Entry Contract;
- OR-07 Shared Capability Layer Contract v0.

No local document claims authority to supersede these contracts.

## 7. Revised implementation order

```text
CONTAIN-01                         CLOSED
  -> MATERIAL-ORCH-01 design v2   CURRENT / REVIEW REQUIRED
  -> CPRI-01                       HOLD until design review clean
  -> MATERIAL-CORE-01              HOLD
  -> MATERIAL-TASK-UX-01           HOLD
  -> MATERIAL-CAPABILITY-01        HOLD
  -> provider adapter slices       HOLD
  -> governed runtime authorization HOLD
```

## 8. Remaining gate for #703

Before #703 can be classified `ARCHITECTURE_READY`:

1. documentation CI must be PASS on one exact head;
2. original review threads must be resolved/outdated only after the corrected text is present;
3. fresh independent review must inspect the revised exact head;
4. no relevant unresolved finding may remain;
5. PR remains documentation-only and Draft until the Human Review/process gate is satisfied.

## 9. Canonical state after this rework commit set

Until the fresh review completes:

`DESIGN_V2 / CONTAINMENT_CLOSED / IMPLEMENTATION_HOLD / INDEPENDENT_REVIEW_REQUIRED`

PR #692 remains:

`QUALIFIED_REFERENCE / ARCHITECTURE_FREEZE / NOT_INTEGRATION_CANDIDATE`.
