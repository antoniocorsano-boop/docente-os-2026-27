# CPRI-01 — Canonical Plan Runtime Identity Implementation Plan v2

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** make the governed CPRI binding the single provider-neutral runtime authority for new CAN-PLAN work, starting from the contained runtime-schema v100 reality, while preserving historical generation-bound evidence.

**Architecture:** `CAN-PLAN-x` remains the portable logical identity. Runtime consumers resolve `(workspace_id, academic_year_id, canonical_plan_code) -> (asset_id, generation_id)` from the already-contained `canonical_plan_runtime_bindings` table. CPRI-01 does not recreate that table; it qualifies the resolver, repository-wide authority migration and binding-movement/revalidation semantics, including TeachingSession allocation compatibility.

**Tech Stack:** Next.js 16 / TypeScript 5.9, Supabase/PostgreSQL, Node/tsx test runner, SQL contract tests, GitHub Actions.

**Spec:** `docs/architecture/CANONICAL_PLAN_RUNTIME_IDENTITY.md`

## Global Constraints

- Execution baseline must be re-frozen from the current `develop` head; the design baseline considered by this plan is `develop@a2e8f46972b60914e3a554df3b6d3942b34029a1`.
- Runtime schema contract v100 after CONTAIN-01/CONTAIN-01B is the starting schema reality.
- Migration `0098_contain_legacy_atlas_runtime_and_reconcile_cpri.sql` already creates/adopts and contains `canonical_plan_runtime_bindings`; do not recreate or renumber history.
- Any new migration uses the next free version on the execution exact head (currently `>=0101`; never hard-code 0101 before rechecking).
- PR #692 remains `QUALIFIED_REFERENCE / ARCHITECTURE_FREEZE / NOT_INTEGRATION_CANDIDATE`.
- CPRI-01 has no Studio Atlas, Officina materiali, MaterialBundle or cross-product runtime dependency.
- `CAN-PLAN-x` is the only portable logical identity.
- `asset_id` and `generation_id` are workspace/year-local materialization identities.
- No static production UUID may remain runtime authority.
- Historical/provenance literals are preserved when they are evidence, not current runtime authority.
- `source_metadata.canonicalExecCode` may be used only for read-only diagnostics/provisioning discovery, never runtime authority.
- Normal teaching flows cannot auto-create, auto-repair or auto-move bindings.
- Missing/invalid/context-mismatched/non-`SUCCEEDED` binding resolution fails closed.
- Reprocessing a Knowledge asset does not implicitly move its CPRI binding.
- Binding movement requires explicit impact/revalidation semantics across progress, extensions, receipts and teaching-session allocations.
- Historical rows are never rewritten merely because the current binding changes.
- New TeachingSession allocations must eventually validate against CPRI authority rather than only `knowledge_assets.current_generation_id`.
- Preserve runtime-schema lineage/provenance/containment checks introduced by CONTAIN-01.
- No reduction of RLS, FK, trigger, workspace/year isolation or fail-closed behavior.
- TDD RED -> GREEN for every behavioral change.
- No auto-merge or Beta promotion before exact-head qualification + fresh independent review + applicable Human Review.

## Review Focus

- **Pinned binding vs reprocessed asset:** CPRI stays on generation A while `current_generation_id` becomes B; new authoritative reads use A and allocation logic must not reject A merely because B is current. Test ownership: Tasks 3 and 4.
- **Binding movement A -> B:** history on A remains immutable; current preparation becomes stale/requires revalidation; extensions/progress do not silently carry forward. Test ownership: Task 4.
- **Repository-wide residual authority:** any runtime use of static CAN-PLAN UUIDs outside an explicit historical/forensic allowlist fails the guard. Test ownership: Task 2.
- **Cross-workspace/year target:** resolver and movement boundary fail closed on asset/generation/context mismatch. Test ownership: Tasks 1, 3 and 4.
- **Schema drift / contained legacy mutators:** runtime contract must remain v100+ provenance-safe and legacy CPRI/Atlas mutators stay non-executable unless a separate governed change authorizes replacement. Test ownership: Tasks 1 and 6.

---

### Task 1: Adopt and verify the contained v100 CPRI baseline

**Files:**
- Create: `product/scripts/experience/cpri-runtime-baseline-preflight.mjs`
- Create: `product/scripts/experience/cpri-runtime-baseline-preflight.test.mjs`
- Modify: `.github/workflows/product-ci.yml` only if the existing workflow does not already execute the chosen test path.
- Modify: `product/package.json` only if a stable script alias is required.

**Interfaces:**
- Consumes: runtime-schema contract snapshot/provenance checks, `canonical_plan_runtime_bindings`, Knowledge asset/generation state.
- Produces: read-only `READY | BLOCKED` baseline classification; no writes.

- [ ] **Step 1: write the RED baseline-preflight tests**

Test at least:

```text
runtime contract below contained CPRI baseline -> BLOCKED
binding table missing/incompatible -> BLOCKED
legacy CPRI mutator executable -> BLOCKED
required binding missing -> BLOCKED
binding asset/generation context mismatch -> BLOCKED
generation != SUCCEEDED -> BLOCKED
valid contained binding set -> READY
```

- [ ] **Step 2: run the focused test and observe RED**

Run:

```bash
cd product
node --test scripts/experience/cpri-runtime-baseline-preflight.test.mjs
```

Expected: FAIL because the preflight does not yet exist.

- [ ] **Step 3: implement the read-only classifier/preflight**

Expose a pure classifier for fixtures plus an environment reader. The environment reader must not mutate bindings or schema.

- [ ] **Step 4: preserve schema-provenance semantics**

The preflight must consume or align with the existing runtime-schema contract rather than inventing a second migration-lineage authority.

- [ ] **Step 5: verify GREEN**

Run the focused test; then `npm run typecheck` if TypeScript files are added.

Expected: PASS.

- [ ] **Step 6: commit**

Suggested commit: `test: add CPRI contained-baseline preflight`

---

### Task 2: Repository-wide static runtime-authority guard and logical model split

**Files:**
- Create: `.github/scripts/certification/cpri-static-runtime-authority.test.mjs`
- Modify: `product/src/app/piano-annuale/model.ts`
- Modify: `product/src/app/piano-annuale/model.test.ts`
- Modify: direct tests/fixtures that intentionally encode current production UUID authority.

**Interfaces:**
- Consumes: complete repository tree on the execution exact head.
- Produces: logical grade -> `CAN-PLAN-x` mapping and a guard that classifies every static CAN-PLAN UUID occurrence as runtime-authority, historical/provenance, forensic fixture or synthetic test.

- [ ] **Step 1: write the RED repository guard**

The guard must discover all occurrences related to `CANONICAL_PLAN_SOURCES`, known production CAN-PLAN asset/generation UUID literals and equivalent static runtime mappings.

Assertions:

```text
runtime authority occurrence -> FAIL
unclassified occurrence -> FAIL
historical/provenance allowlisted occurrence -> PASS
synthetic non-production test UUID -> PASS
```

- [ ] **Step 2: run RED**

Run:

```bash
node --test .github/scripts/certification/cpri-static-runtime-authority.test.mjs
```

Expected: FAIL with current active consumers such as piano-annuale/actions, feedback/actions, class lesson actions/pages, AnnualPlanClient, human-task pipeline/recipe and any additional current matches.

- [ ] **Step 3: split the logical model from runtime identity**

Target exported shape:

```ts
export const CANONICAL_PLAN_CODES: Record<GradeKey, 'CAN-PLAN-1' | 'CAN-PLAN-2' | 'CAN-PLAN-3'>
```

No production `assetId/generationId` remains in the logical mapping.

- [ ] **Step 4: classify evidence literals instead of deleting history**

Use the smallest explicit allowlist/fixture classification possible. Do not erase migration receipts or historical evidence merely to satisfy the guard.

- [ ] **Step 5: run GREEN for the model + guard**

Run:

```bash
cd product && npx tsx --test src/app/piano-annuale/model.test.ts
cd .. && node --test .github/scripts/certification/cpri-static-runtime-authority.test.mjs
```

Expected: model test PASS; the repository guard may remain RED only for consumers intentionally left for Task 5, but its discovered inventory must be deterministic and complete. Record the exact remaining paths as Task 5 input.

- [ ] **Step 6: commit**

Suggested commit: `refactor: separate CAN-PLAN logical and runtime authority`

---

### Task 3: Single CPRI resolver for runtime reads

**Files:**
- Create: `product/src/core/infrastructure/supabase/supabase-canonical-plan-source-repository.ts`
- Create: `product/src/core/infrastructure/supabase/canonical-plan-runtime-identity.test.ts`
- Modify: `product/src/lib/supabase/database.types.ts` only if generated/current types do not expose the contained table shape.

**Interfaces:**
- Consumes:

```ts
type CanonicalPlanSourceLookup = {
  workspaceId: string
  academicYearId: string
  code: 'CAN-PLAN-1' | 'CAN-PLAN-2' | 'CAN-PLAN-3'
}
```

- Produces:

```ts
type CanonicalPlanRuntimeSource = {
  code: 'CAN-PLAN-1' | 'CAN-PLAN-2' | 'CAN-PLAN-3'
  assetId: string
  generationId: string
}

interface CanonicalPlanSourceRepository {
  resolve(input: CanonicalPlanSourceLookup): Promise<CanonicalPlanRuntimeSource>
}
```

- [ ] **Step 1: write RED resolver tests**

Test:

```text
valid binding -> resolved source
missing binding -> fail-closed typed error
asset workspace/year mismatch -> fail-closed
generation/asset mismatch -> fail-closed
generation non-SUCCEEDED -> fail-closed
asset current_generation_id differs but bound generation is valid SUCCEEDED -> resolve bound generation
no metadata/static fallback -> fail-closed
```

- [ ] **Step 2: run RED**

Use focused `npx tsx --test ...`.

Expected: FAIL because repository/resolver does not exist.

- [ ] **Step 3: implement DB-binding-only resolver**

Resolve only through `canonical_plan_runtime_bindings` plus authoritative relation validation. Never scan `source_metadata`, never use `CANONICAL_PLAN_SOURCES` as UUID authority.

- [ ] **Step 4: verify GREEN**

Run focused resolver tests and `npm run typecheck`.

Expected: PASS.

- [ ] **Step 5: commit**

Suggested commit: `feat: resolve CAN-PLAN runtime source from governed binding`

---

### Task 4: Binding movement/revalidation semantics and TeachingSession compatibility

**Files:**
- Create: `product/supabase/tests/canonical_plan_runtime_identity_behavior.sql`
- Modify: `product/supabase/tests/runtime-release-contract.sql`
- Modify: `product/supabase/migrations/<next-free>_cpri_runtime_authority_and_revalidation.sql` only if DB changes are proven necessary; choose the number from the execution exact head, never from this document.
- Modify/add focused TypeScript/domain tests for current preparation stale/revalidation behavior where the behavior is application-owned.

**Interfaces:**
- Consumes: existing v100 CPRI table/trigger; resolver from Task 3; generation-bound tables.
- Produces: DB/domain semantics for pinned bindings, new allocations and explicit binding movement impact.

- [ ] **Step 1: write RED SQL/domain tests for pinned binding compatibility**

Scenario:

```text
CPRI binds asset generation A (SUCCEEDED)
knowledge_assets.current_generation_id advances to B (SUCCEEDED)
new TeachingSession allocation using governed binding A
```

Expected target: allocation authority is evaluated against CPRI binding/context, not rejected solely because B is current.

- [ ] **Step 2: write RED movement/history tests**

For explicit A -> B movement, assert:

```text
historical teaching_session_allocations on A unchanged
lesson_preparation_receipts on A unchanged
lesson_design_extensions on A not silently rewritten/carried
annual_plan_block_progress on A not silently copied/reset to B
current preparation requiring A becomes stale/revalidation-required
new runtime resolution returns B only after governed move succeeds
invalid/cross-context B -> move blocked
```

- [ ] **Step 3: run RED using the canonical SQL replay/test harness + focused TS tests**

Expected: FAIL at the current-generation allocation invariant and/or missing movement/revalidation boundary.

- [ ] **Step 4: implement the minimum DB authority change**

Replace only the incompatible current-generation assumption for new authoritative allocation with CPRI-aware validation while preserving workspace/year/asset/generation/SUCCEEDED checks.

Do not rewrite historical rows.

- [ ] **Step 5: implement explicit movement impact/revalidation boundary**

The movement path must compute/validate impact before changing the binding. Existing contained legacy mutators are not automatically re-enabled; introduce/qualify a new governed primitive only if required by the approved implementation design.

- [ ] **Step 6: verify GREEN**

Run SQL replay/behavior contract + focused TS tests.

Expected: all movement/history/pinned-binding assertions PASS.

- [ ] **Step 7: commit**

Suggested commit: `feat: align CPRI movement with generation-bound history`

---

### Task 5: Migrate every active runtime consumer

**Files:**
- Modify all active runtime paths discovered by Task 2, including at minimum:
  - `product/src/app/piano-annuale/actions.ts`
  - `product/src/app/piano-annuale/AnnualPlanClient.tsx`
  - `product/src/app/feedback/actions.ts`
  - `product/src/app/classi/[sectionId]/actions.ts` if discovered on the execution head
  - `product/src/app/classi/[sectionId]/lezioni/actions.ts`
  - `product/src/app/classi/class-workspace-model.ts`
  - `product/src/app/classi/[sectionId]/page.tsx`
  - `product/src/app/classi/[sectionId]/lezioni/[blockId]/page.tsx`
  - `product/src/core/application/human-task-content-pipeline.ts`
  - `product/src/core/application/human-task-plan-guided-uda-projection-recipe.ts`
  - assistant/copilot context loaders discovered by the repository-wide guard.
- Modify corresponding tests/fixtures.

**Interfaces:**
- Consumes: `CanonicalPlanSourceRepository.resolve(...)` or a `CanonicalPlanRuntimeSource` already resolved at an authoritative server boundary.
- Produces: zero active runtime paths that use static production CAN-PLAN UUID authority.

- [ ] **Step 1: freeze the Task 2 inventory on the current task BASE**

Search the complete repository again. Do not trust the original hand-written file list.

- [ ] **Step 2: migrate server/action write boundaries first**

Resolve once per authoritative `(workspace, academicYear, code)` context and pass resolved identity inward where practical.

- [ ] **Step 3: migrate read/context loaders**

Assistant/Copilot/read models consume resolved identity or logical code as appropriate; they do not open metadata/static fallbacks.

- [ ] **Step 4: migrate presentation/client helpers**

Client state must not own runtime authority. Pass only the minimum resolved IDs where genuinely required.

- [ ] **Step 5: update tests with synthetic/local identities**

No test should require production canonical UUIDs unless it is an explicit historical/forensic fixture classified by the guard.

- [ ] **Step 6: run focused suites and repository guard**

Run relevant `npx tsx --test ...` files plus:

```bash
node --test .github/scripts/certification/cpri-static-runtime-authority.test.mjs
```

Expected: repository-wide guard PASS with zero unclassified/static runtime-authority consumers.

- [ ] **Step 7: commit**

Suggested commit: `refactor: migrate CAN-PLAN runtime consumers to CPRI`

---

### Task 6: Runtime preflight, canonical docs and full qualification

**Files:**
- Create or extend: `product/scripts/experience/cpri-runtime-preflight.mjs`
- Create or extend corresponding tests.
- Modify: `docs/architecture/TIMETABLE_CANONICAL_SPEC.md`
- Modify: `docs/architecture/CANONICAL_PLAN_RUNTIME_IDENTITY.md` only for implementation-discovered deltas that do not silently enlarge authority.
- Modify Product CI/certification wiring only if the new guard/preflight is not already executed.

**Interfaces:**
- Consumes: qualified CPRI schema, resolver, migrated consumers, movement semantics.
- Produces: `READY | BLOCKED` runtime qualification result before dependent browser/HVA certification.

- [ ] **Step 1: write RED runtime-preflight tests**

Test:

```text
schema/provenance/containment invalid -> BLOCKED
required binding missing -> BLOCKED
binding context invalid -> BLOCKED
generation non-SUCCEEDED -> BLOCKED
legacy contained mutator unexpectedly executable -> BLOCKED
static runtime-authority guard fails -> BLOCKED
all invariants valid -> READY
```

- [ ] **Step 2: implement/compose the runtime preflight**

Reuse the runtime-schema contract and Task 1/2 classifiers; do not create independent contradictory authorities.

- [ ] **Step 3: update canonical documentation**

`TIMETABLE_CANONICAL_SPEC.md` must refer to logical CAN-PLAN + governed runtime binding, not “UUIDs already present in runtime”.

- [ ] **Step 4: run full product verification**

From `product/`:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Also run the repository certification/SQL migration replay/runtime-release contract used by Product CI.

Expected: all PASS on one exact head.

- [ ] **Step 5: run the Architecture Readiness Gate**

Confirm:

```text
provider-specific coupling in CPRI = 0
unauthorized cross-product runtime = 0
static production CAN-PLAN runtime UUID authority = 0
metadata-scan runtime authority = 0
unclassified repository matches = 0
CPRI/current_generation allocation conflict = 0
silent historical rewrite/carry-forward = 0
schema provenance/containment regression = 0
```

- [ ] **Step 6: fresh independent review**

Request review on the exact qualified head. No PASS is inherited from #692, #703 or CONTAIN-01.

- [ ] **Step 7: Human Review classification**

If no visual/product surface changes, record the correct impact classification. If governance/process requires Human Review, it must refer to the same exact head.

- [ ] **Step 8: commit**

Suggested commit: `docs: certify CPRI runtime identity implementation`

---

## Plan self-review

### Spec coverage

- existing v100 CPRI baseline: Task 1;
- repository-wide static authority inventory: Tasks 2 and 5;
- resolver: Task 3;
- pinned-binding vs `current_generation_id`: Task 4;
- movement/revalidation across progress/extensions/receipts/sessions: Task 4;
- history preservation: Task 4;
- environment preflight/provenance/containment: Tasks 1 and 6;
- canonical docs and full qualification: Task 6.

### Type consistency

Tasks 3 and 5 share `CanonicalPlanSourceLookup` / `CanonicalPlanRuntimeSource`; Task 4 changes DB semantics but does not change the resolver contract.

### Execution stop conditions

Do not start CPRI implementation unless MATERIAL-ORCH design v2 has:

1. documentation CI PASS;
2. all original #703 review findings resolved or made outdated by the corrected text;
3. fresh independent review with no relevant unresolved finding;
4. explicit confirmation that no new cross-system runtime authority is introduced.

Any destructive data rewrite, runtime promotion or governance authorization remains a separate stop/gate.
