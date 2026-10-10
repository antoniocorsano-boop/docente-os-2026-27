# CPRI-01 — Canonical Plan Runtime Identity

> **Execution mode:** use `superpowers:executing-plans` task by task. Behavioral changes in STEP B require real RED → GREEN. STEP A is documentation/contract only and must not change runtime behavior.

**Goal:** eliminate the ambiguity between the portable logical identity of `CAN-PLAN-1/2/3` and workspace-local Knowledge UUIDs before resuming Atlas HVA.

**Architecture:** `CAN-PLAN-x` remains the stable logical identity. Runtime consumers that need database rows resolve one governed binding `(workspace_id, academic_year_id, canonical_plan_code) → (asset_id, generation_id)`. `asset_id` and `generation_id` are local materialization identities, never universal identifiers. Existing workspace/year/database isolation remains fail-closed.

**Baseline inspected:** PR #692, branch `feat/uda-atlas-material-binding`, exact head `4a468f0d475eaccca1018bc6b89dbfaec858f3a9`.

**Contract:** `docs/architecture/CANONICAL_PLAN_RUNTIME_IDENTITY.md`.

## Global constraints

- Do not run HVA until STEP C preflight is fully green.
- Do not hard-code HVA/runtime UUIDs.
- Do not copy UUIDs across workspaces.
- Do not relax RLS, FK, trigger or workspace/year guards.
- Preserve HR-02 atomic Atlas acceptance: one governed RPC / one transaction.
- Preserve explicit teacher lesson selection.
- Atlas must not become curriculum authority and must not mutate UDA, Piano annuale or Calendario.
- Do not create a parallel Materials persistence model.
- `source_metadata.canonicalExecCode` may be used only as a transitional discovery aid; it is not the definitive runtime identity authority.
- No automatic merge. PR #692 remains Draft until exact-head certification and Human Review.

## Review focus

- One and only one authority for runtime CAN-PLAN materialization.
- No application consumer may infer authority by scanning JSON metadata after STEP B.
- Historical execution rows preserve the local generation actually used when they were written.
- A new Knowledge generation never moves the active CAN-PLAN binding implicitly.
- `generation_id` is always a local runtime/materialization identity; it must never be treated as a portable canonical revision identifier.
- All current consumers of `CANONICAL_PLAN_SOURCES` must be classified before implementation.
- Browser/HVA is the final product gate, not a runtime-discovery mechanism.

---

## STEP A — Contract and consumer inventory

**Status:** PASS — verified on `df59bbf0f37bf60adb04e419882128483da3253b`; this closeout commit changes only plan metadata.

**Files:**
- Create: `docs/architecture/CANONICAL_PLAN_RUNTIME_IDENTITY.md`
- Create: this plan
- No product/runtime/migration changes.

- [x] Freeze inspected baseline at PR #692 exact head `4a468f0d475eaccca1018bc6b89dbfaec858f3a9`.
- [x] Verify PR remains open, Draft, mergeable and unmerged before starting.
- [x] Verify the transitional resolver currently discovers `knowledge_assets` through `source_metadata.canonicalExecCode` and checks ambiguity only in application code.
- [x] Verify `saveAnnualPlanProgress()` / `resetAnnualPlanProgress()` still use hard-coded `CANONICAL_PLAN_SOURCES` UUIDs.
- [x] Verify Atlas return and lesson-page reads already resolve workspace-local asset/generation through the transitional resolver.
- [x] Verify other consumers still use hard-coded generation/asset identity for progress, allocation, duplicate detection or local cache keys.
- [x] Identify the semantic seam in `PLAN_GUIDED_UDA`: `generationId` must be treated as workspace-local materialization evidence, not as a portable canonical revision.
- [x] Commit the architecture contract and complete the exact consumer matrix.
- [x] Re-read the contract from the branch and verify STEP A exit criteria.
- [x] Mark STEP A PASS in this plan; STEP B starts from a fresh exact-head check and RED test commit.

### STEP A exit criteria

STEP A is PASS only when the architecture contract records all of the following:

1. `CAN-PLAN-x` is the portable logical identity.
2. `asset_id` and `generation_id` are local materialization identities.
3. The future binding has DB-enforced uniqueness on `(workspace_id, academic_year_id, canonical_plan_code)`.
4. The binding validates asset/generation/workspace/year consistency and a `SUCCEEDED` generation.
5. The binding writer/provisioning boundary is explicit.
6. Every known consumer is classified as logical-only, runtime-materialization, transitional, test/fixture, or documentation debt.
7. `source_metadata.canonicalExecCode` is explicitly non-authoritative.
8. Missing/duplicate/stale bindings fail closed.
9. Existing execution history is not rewritten when the active binding changes.
10. HVA remains blocked until STEP C.

---

## STEP B — One coherent GREEN

**Start condition:** STEP A PASS and exact head re-frozen.

**Expected migration name:** re-check the migration directory on the new exact head before writing; if `0087` is still latest, use `0088_canonical_plan_runtime_identity.sql`.

**Target architecture:**

```text
CAN-PLAN-x
    │
    ▼
(workspace_id, academic_year_id, canonical_plan_code)
    │  UNIQUE
    ▼
(asset_id, generation_id)
```

### Task B1 — RED: binding contract

- [ ] Add failing DB/repository tests proving uniqueness, same-workspace/year integrity, generation→asset integrity, `SUCCEEDED` requirement, missing binding and ambiguous/invalid binding fail-closed behavior.
- [ ] Add a failing regression test proving a CAN-PLAN materialization from workspace A cannot be consumed in workspace B.
- [ ] Run focused tests and record RED for the missing governed binding.

### Task B2 — GREEN: database authority

- [ ] Create `canonical_plan_runtime_bindings` with at least `workspace_id`, `academic_year_id`, `canonical_plan_code`, `asset_id`, `generation_id`, timestamps and DB-enforced unique key.
- [ ] Add FK/trigger constraints required to guarantee binding coherence without weakening existing protections.
- [ ] Define governed provisioning/upsert path. Consumers must not self-bind by metadata scan.
- [ ] Ensure changing the active binding does not rewrite historical progress/session records.
- [ ] Update generated Supabase types as required.

### Task B3 — GREEN: one resolver

- [ ] Replace metadata-scan authority in `SupabaseCanonicalPlanSourceRepository` with the governed binding.
- [ ] Resolver input remains `workspaceId + academicYearId + canonicalPlanCode`.
- [ ] Resolver returns exactly one valid local `assetId + generationId` or fails closed.
- [ ] No fallback to static UUIDs or JSON metadata.

### Task B4 — GREEN: migrate runtime consumers

Migrate every runtime UUID consumer identified by STEP A, including at minimum:

- `product/src/app/piano-annuale/actions.ts`
- `product/src/app/piano-annuale/AnnualPlanClient.tsx`
- `product/src/app/feedback/actions.ts`
- `product/src/app/classi/[sectionId]/lezioni/actions.ts`
- `product/src/app/classi/class-workspace-model.ts` and its callers
- `product/src/app/classi/[sectionId]/page.tsx`
- `product/src/app/classi/[sectionId]/lezioni/[blockId]/page.tsx`
- `product/src/app/progetta/atlas/ritorno/actions.ts`
- `product/src/core/application/human-task-plan-guided-uda-projection-recipe.ts`

Rules:

- Presentation/domain helpers should receive resolved identity as data rather than opening independent DB lookups where practical.
- `CANONICAL_PLAN_SOURCES` must stop carrying runtime UUID authority. Prefer a logical-only map such as grade → `CAN-PLAN-x`.
- `generationId` inside plan-guided recipes is local materialization evidence for the active workspace/year; it is not a portable canonical identifier.
- Client cache/progress keys must not depend on compile-time UUIDs.

### Task B5 — GREEN: fixtures and documentation debt

- [ ] Replace canonical hard-coded UUIDs in tests with explicit synthetic local fixture IDs.
- [ ] Update tests that expose `source.generationId` as if it were canonical provenance.
- [ ] Update `TIMETABLE_CANONICAL_SPEC.md` and other affected architecture text so “canonical source” means CAN-PLAN logical identity plus governed runtime binding.
- [ ] Run focused tests, full product tests, typecheck, lint, production build and migration replay.

### Task B6 — governed provisioning

- [ ] Materialize/bind the required CAN-PLAN records for the target HVA workspace/year using the approved provisioning path.
- [ ] Do not create an HVA-only fixture or manual UUID exception.
- [ ] Verify one row per required CAN-PLAN code and no ambiguous candidate.

---

## STEP C — Runtime preflight gate

**Start condition:** STEP B exact-head Product CI and migration replay green.

Create/reuse one automated preflight that returns `READY` or `BLOCKED` before Browser Certification/HVA.

It must verify:

1. exact head matches the candidate under test;
2. tests/typecheck/lint/build are green;
3. required runtime schema/migrations are installed;
4. `accept_atlas_material_bundle(...)` exists;
5. active workspace resolves;
6. active academic year resolves;
7. target section belongs to that workspace/year;
8. exactly one runtime binding exists for the required `CAN-PLAN-x`;
9. bound asset belongs to the same workspace/year;
10. bound generation belongs to that asset/workspace and is `SUCCEEDED`;
11. lesson projection/design context matches the same resolved identity;
12. no runtime path under this tranche still depends on static canonical UUIDs.

Any failed item returns `BLOCKED` and prevents HVA.

---

## STEP D — HVA final gate

**Start condition:** STEP C = READY on the exact candidate head.

- [ ] Execute desktop journey.
- [ ] Execute mobile journey.
- [ ] Verify explicit teacher lesson selection.
- [ ] Verify one atomic bundle acceptance and resulting lesson materials.
- [ ] Verify read-after-write uses the same workspace-local CAN-PLAN binding.
- [ ] Verify no UDA/Piano/Calendario mutation was introduced.
- [ ] Run cleanup and verify no HVA residue remains outside approved evidence.
- [ ] Record exact head and evidence. Human Review remains the final integration gate.

## Completion contract

CPRI-01 is complete only when STEP D passes on one exact head and the branch contains no static runtime authority for the three canonical plan asset/generation UUID pairs. No PASS may be inherited from an earlier head.