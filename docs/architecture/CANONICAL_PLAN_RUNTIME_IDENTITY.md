# Canonical Plan Runtime Identity — CPRI-01 v2

**Status:** `ARCHITECTURE_REWORKED / PROVIDER_NEUTRAL / IMPLEMENTATION_PENDING`  
**Current baseline considered:** `develop@a2e8f46972b60914e3a554df3b6d3942b34029a1`  
**Schema baseline:** runtime contract v100 after CONTAIN-01 / CONTAIN-01B  
**Source of validated lessons:** PR #692 is qualified reference only; it is not an integration source.

## 1. Purpose

Separate the portable logical identity of canonical annual plans from workspace/year-local Knowledge materialization, and make the governed binding the single runtime authority for new work without rewriting historical evidence.

CPRI-01 is Docente OS infrastructure. It has no dependency on Studio Atlas, Officina materiali or any external provider.

## 2. Current schema reality after CONTAIN-01

The current governed `develop` line already contains:

- `public.canonical_plan_runtime_bindings`;
- uniqueness on `(workspace_id, academic_year_id, canonical_plan_code)`;
- DB checks for workspace/year/asset/generation coherence;
- `SUCCEEDED` generation requirement;
- authenticated read access through RLS;
- runtime mutation grants revoked;
- legacy CPRI mutators retained only as forensic schema evidence with execution revoked;
- runtime schema provenance/containment contract through migration v100.

Therefore CPRI-01 **must not** plan to recreate migration 0098 or assume a clean pre-CPRI schema.

The v100 table is an adopted/contained data baseline, not yet an authorized application runtime mutation surface.

## 3. Logical identity

Portable identity:

```text
CAN-PLAN-1
CAN-PLAN-2
CAN-PLAN-3
```

`CAN-PLAN-x` identifies the canonical annual plan independently of workspace-specific Knowledge UUIDs.

## 4. Runtime materialization identity

The governed runtime source is scoped by:

```text
workspace_id
academic_year_id
canonical_plan_code
```

and resolves to:

```text
asset_id
generation_id
```

`asset_id` and `generation_id` are local materialization identities. They must never be:

- compiled into product code as universal authority;
- copied across workspaces;
- treated as portable canonical IDs;
- inferred at runtime by scanning `source_metadata`;
- used as fallback when the governed binding is absent/invalid.

## 5. Governed binding invariants

A valid binding requires:

1. workspace exists;
2. academic year belongs to the workspace;
3. canonical plan code is supported;
4. asset belongs to the same workspace/year;
5. generation belongs to the asset;
6. generation belongs to the same workspace;
7. generation status is `SUCCEEDED`;
8. exactly one binding exists for `(workspace, academic year, canonical plan code)`.

The current v100 trigger already enforces these shape/context rules. CPRI-01 must preserve or strengthen them, never weaken them.

## 6. Runtime mutation boundary

Normal teaching flows cannot create, repair or move a binding.

Forbidden:

- auto-binding during consumer reads/writes;
- first-match selection;
- fallback to static UUIDs;
- HVA-only fixture exceptions;
- cross-workspace copy;
- implicit movement when `knowledge_assets.current_generation_id` changes.

Any future binding mutation is a distinct governed/provisioning operation. Its runtime authorization, caller and audit semantics must be explicitly qualified; existing contained legacy mutators are not automatically reused.

## 7. Read contract

Single conceptual resolver:

```ts
resolveCanonicalPlanRuntimeSource({
  workspaceId,
  academicYearId,
  canonicalPlanCode,
}): Promise<CanonicalPlanRuntimeSource>
```

Result:

```ts
type CanonicalPlanRuntimeSource = {
  code: 'CAN-PLAN-1' | 'CAN-PLAN-2' | 'CAN-PLAN-3'
  assetId: string
  generationId: string
}
```

Fail closed when:

- binding missing;
- referenced rows missing;
- workspace/year mismatch;
- generation/asset mismatch;
- generation not `SUCCEEDED`;
- binding otherwise violates the governed schema contract.

No metadata scan/static fallback is permitted.

## 8. Relationship with `current_generation_id`

The CPRI binding and `knowledge_assets.current_generation_id` answer different questions:

- `current_generation_id` = latest/current Knowledge processing generation for the asset;
- CPRI binding = governed generation currently selected as runtime materialization for that CAN-PLAN in a workspace/year.

A new Knowledge generation does not move the CPRI binding automatically.

The existing `private.enforce_teaching_session_allocation()` currently requires allocation generation to equal `knowledge_assets.current_generation_id`. That rule conflicts with a legitimately pinned CPRI binding once the asset is reprocessed.

Before CPRI can become runtime authority for new TeachingSession allocations, the authoritative DB check must validate new allocations against the governed CPRI binding (plus context/integrity checks), not merely against `current_generation_id`.

## 9. Binding movement and revalidation policy

A binding move from generation A to generation B is not a simple pointer update. It changes the authoritative runtime materialization for future work and therefore requires an impact/revalidation operation.

Before movement, compute and classify affected rows in at least:

- `annual_plan_block_progress`;
- `lesson_design_extensions`;
- `lesson_preparation_receipts`;
- `teaching_session_allocations`.

Required semantics:

### Historical TeachingSession allocations

- remain immutable historical evidence;
- keep the asset/generation actually used at recording time;
- are never rewritten to B.

### Lesson-preparation receipts

- remain append-only historical evidence;
- a receipt for A is not silently reinterpreted as approval of B;
- current preparation is stale/requires revalidation when its fingerprint/generation-bound state no longer matches.

### LessonDesignExtension

- accepted/proposed extensions bound to A remain historical state;
- they do not silently disappear;
- they do not silently carry forward to B;
- any carry-forward/adaptation requires an explicit governed action/revalidation.

### Annual-plan block progress

- progress recorded against A remains historical evidence;
- it is not silently copied/reset onto B;
- any projection/reconciliation onto the new runtime generation is explicit and separately testable.

### New work after movement

- resolves B through CPRI;
- must not write new authoritative rows using static or stale A UUIDs.

## 10. Movement command requirements

If/when a binding mutation command is introduced, it must:

1. validate current binding and requested target generation;
2. compute impact/revalidation classification before mutation;
3. require explicit governed intent for the movement;
4. fail closed if target generation/context is invalid;
5. preserve historical rows;
6. produce auditable evidence of old/new binding and impact summary;
7. invalidate/reclassify only current mutable preparation state through existing semantics, not by rewriting history.

Exact DB/API signature is implementation work and is not frozen by this architecture document.

## 11. Data-readiness / environment preflight

Before any environment promotion of CPRI behavior:

- verify runtime schema contract version/provenance/containment;
- verify exactly one valid binding for each required `(workspace, year, CAN-PLAN)`;
- verify bound asset/generation context and `SUCCEEDED` status;
- classify absent/ambiguous/transitional candidates;
- verify no runtime writer depends on static UUID authority;
- verify legacy contained mutators remain non-executable unless a new governed decision explicitly replaces them.

Transitional `source_metadata.canonicalExecCode` may be used only for read-only discovery/provisioning diagnostics, never runtime authority.

## 12. Repository-wide consumer inventory

The migration guard must be repository-wide for runtime authority use, not a manually curated path list.

Known active `CANONICAL_PLAN_SOURCES` consumers include at least:

- `product/src/app/piano-annuale/model.ts`
- `product/src/app/piano-annuale/actions.ts`
- `product/src/app/piano-annuale/AnnualPlanClient.tsx`
- `product/src/app/feedback/actions.ts`
- `product/src/app/classi/[sectionId]/lezioni/actions.ts`
- `product/src/app/classi/class-workspace-model.ts`
- `product/src/app/classi/[sectionId]/page.tsx`
- `product/src/app/classi/[sectionId]/lezioni/[blockId]/page.tsx`
- `product/src/core/application/human-task-content-pipeline.ts`
- `product/src/core/application/human-task-plan-guided-uda-projection-recipe.ts`
- assistant/copilot context loaders and any further runtime matches discovered on the execution exact head.

The implementation must search/classify the whole repository on the exact baseline.

## 13. Static-literal classification

The guard must distinguish:

### Forbidden runtime authority

Static UUIDs used to choose/read/write the current CAN-PLAN materialization.

### Allowed historical/provenance evidence

Static IDs retained only inside:

- historical receipts/evidence;
- migration provenance;
- forensic fixtures explicitly testing legacy behavior;
- documentation describing past state.

### Allowed synthetic tests

Locally generated/synthetic UUIDs that do not encode production authority.

The goal is to remove static **runtime authority**, not erase historical evidence.

## 14. Logical model migration

The canonical logical model should expose plan code/grade mapping without runtime UUID authority, for example:

```ts
const CANONICAL_PLAN_CODES = {
  Prima: 'CAN-PLAN-1',
  Seconda: 'CAN-PLAN-2',
  Terza: 'CAN-PLAN-3',
} as const
```

Runtime UUIDs are resolved separately from workspace/year context.

## 15. Consumer classes

### Logical-only

Need only `CAN-PLAN-x`; never receive runtime UUID authority.

### Runtime-materialization

Need `assetId/generationId`; resolve through CPRI.

### Presentation/helper

Receive resolved identity from an authoritative server boundary where practical; do not open independent authority lookups.

### Transitional

Metadata/static resolution must be replaced.

### Historical/forensic

Preserve the original IDs as evidence and remain excluded from current-runtime authority.

## 16. Failure contract

Stable internal failures must distinguish at least:

```text
CANONICAL_PLAN_BINDING_MISSING
CANONICAL_PLAN_BINDING_INVALID
CANONICAL_PLAN_BINDING_AMBIGUOUS
CANONICAL_PLAN_GENERATION_NOT_READY
CANONICAL_PLAN_CONTEXT_MISMATCH
CANONICAL_PLAN_REVALIDATION_REQUIRED
CANONICAL_PLAN_BINDING_MOVE_BLOCKED
```

All authority-dependent writes fail closed on the applicable errors.

## 17. Certification gate

Before CPRI integration/promotion, one exact head must demonstrate:

1. runtime schema contract/provenance/containment PASS;
2. focused DB/repository tests PASS;
3. repository-wide authority inventory has zero unclassified runtime static UUID uses;
4. resolver has no static/metadata fallback;
5. new TeachingSession allocations validate against CPRI authority semantics;
6. movement/revalidation tests preserve history for the four generation-bound areas;
7. typecheck/lint/build/Product CI PASS;
8. fresh independent review clean;
9. Human Review requirement correctly classified and, if required, tied to the same exact head.

## 18. Non-goals

CPRI-01 does not:

- change CAN-PLAN content;
- change the canonical 33-block/66-hour sequence;
- change curricolo authority;
- define material provider protocols;
- define Studio Atlas handoff;
- authorize DOS-A1 or any cross-product runtime;
- create a material persistence model;
- rewrite historical TeachingSession/progress/receipt/extension evidence;
- promote PR #692.

## 19. Completion criteria

CPRI-01 is complete only when:

- the governed binding is the single runtime materialization authority for new work;
- the existing v100 contained schema has been adopted/reconciled rather than duplicated;
- all runtime consumers resolve through CPRI or consume already-resolved identity;
- repository-wide static runtime authority is eliminated;
- generation movement/revalidation semantics are implemented and tested;
- historical evidence remains immutable;
- TeachingSession allocation checks are compatible with pinned governed bindings;
- environment preflight is available and used before promotion;
- full exact-head qualification is green;
- independent review is clean;
- any applicable Human Review refers to that same exact head.
