# Canonical Plan Runtime Identity — CPRI-01

**Status:** `EXTRACTED_ARCHITECTURE / PROVIDER_NEUTRAL / IMPLEMENTATION_PENDING`  
**Baseline:** `develop@7ac09a8795d93cc9a950083cda8b01d5d1407257`  
**Source of validated lessons:** PR #692, used only as qualified reference.

## 1. Purpose

Separate the portable logical identity of canonical annual plans from their workspace/year-local Knowledge materialization.

CPRI-01 is infrastructure of Docente OS. It has no dependency on Studio Atlas, materials orchestration, or any external provider.

## 2. Logical identity

Portable identity:

```text
CAN-PLAN-1
CAN-PLAN-2
CAN-PLAN-3
```

`CAN-PLAN-x` identifies the canonical annual plan independently of the workspace in which it is materialized.

## 3. Runtime materialization identity

`asset_id` and `generation_id` identify local Knowledge rows.

They are valid only in this context:

```text
workspace_id
academic_year_id
canonical_plan_code
```

They must never be:

- compiled into product code as universal authority;
- copied across workspaces;
- treated as portable canonical IDs;
- used as fallback when the governed binding is missing.

`generation_id` is local materialization evidence, not a portable canonical revision identifier.

## 4. Governed binding

Authority table:

```text
canonical_plan_runtime_bindings

workspace_id
academic_year_id
canonical_plan_code
asset_id
generation_id
created_at
updated_at
```

Identity constraint:

```text
UNIQUE (workspace_id, academic_year_id, canonical_plan_code)
```

The binding does not contain the annual plan content and does not become curricolo authority. It declares which valid Knowledge materialization belongs to that workspace/year for the logical `CAN-PLAN-x`.

## 5. Mandatory database invariants

A binding is valid only when:

1. workspace exists;
2. academic year belongs to the same workspace;
3. canonical plan code is supported;
4. asset belongs to the same workspace and academic year;
5. generation belongs to that asset;
6. generation belongs to the same workspace;
7. generation status is `SUCCEEDED`;
8. only one active binding exists for `(workspace, academic year, canonical plan code)`.

These invariants must be DB-enforced, not only application-checked.

## 6. Writer boundary

Consumers cannot create or repair a binding during a normal read/write teaching flow.

Forbidden:

- auto-binding from metadata during consumer reads;
- selecting the first matching asset;
- fallback to historical static UUIDs;
- HVA-only bindings or fixture exceptions;
- copying bindings between workspaces.

Binding creation/update is an explicit governed provisioning action after a valid Knowledge materialization exists.

A new Knowledge generation never moves the binding implicitly.

## 7. Data-readiness preflight

Before the schema/provisioning migration is applied to an environment, execute a read-only preflight.

For every `(workspace, academicYear, CAN-PLAN-x)` candidate discovered through transitional metadata, classify:

```text
READY
MISSING
AMBIGUOUS
GENERATION_MISSING
GENERATION_NOT_SUCCEEDED
CONTEXT_MISMATCH
```

Rules:

- any `AMBIGUOUS` or context-integrity failure blocks promotion;
- missing bindings may remain unmaterialized when the CAN-PLAN is not required in that workspace/year;
- the migration must not be the first place where ambiguity is discovered;
- transitional `source_metadata.canonicalExecCode` can be used for the preflight/provisioning discovery only, never as runtime authority.

## 8. Read contract

Single conceptual resolver:

```text
resolveCanonicalPlanRuntimeSource({
  workspaceId,
  academicYearId,
  canonicalPlanCode
})
```

Success:

```text
{
  code: CAN-PLAN-x,
  assetId: <workspace-local UUID>,
  generationId: <workspace-local UUID>
}
```

Fail-closed conditions:

- binding missing;
- binding invalid;
- asset context mismatch;
- generation context mismatch;
- generation not `SUCCEEDED`;
- referenced rows missing/not usable.

No fallback to static UUIDs or metadata scans.

## 9. Historical semantics

The binding identifies the current runtime materialization for a workspace/year.

Historical records preserve the UUIDs actually used when created.

When a binding is explicitly moved to a new generation:

- historical rows are not rewritten;
- new work uses the new binding;
- historical reads keep the recorded identity;
- reconciliation, if ever needed, is explicit.

## 10. Consumer classes

Consumers must be classified before implementation:

### Logical-only

Need only `CAN-PLAN-x`; must not receive runtime UUID authority.

### Runtime-materialization

Need the local `assetId/generationId`; must obtain them from the resolver.

### Presentation/helper

Receive resolved runtime identity as data where practical; do not open independent authority lookups.

### Transitional

Current metadata-based resolution must be replaced.

### Test/fixture/documentation debt

Static UUID assumptions must be removed or replaced with explicit synthetic local IDs.

Known consumer inventory from the qualified #692 reference includes at minimum:

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
- related tests and architecture documentation.

Provider-specific consumers are deliberately excluded from CPRI-01.

## 11. Failure contract

Stable internal error classes/codes must distinguish at least:

```text
CANONICAL_PLAN_BINDING_MISSING
CANONICAL_PLAN_BINDING_INVALID
CANONICAL_PLAN_BINDING_AMBIGUOUS
CANONICAL_PLAN_GENERATION_NOT_READY
CANONICAL_PLAN_CONTEXT_MISMATCH
```

All are blocking for writes that require a runtime-materialized CAN-PLAN.

## 12. CPRI preflight before system certification

Before Browser Certification/HVA for any tranche that depends on CPRI, verify:

1. candidate exact head frozen;
2. tests/typecheck/lint/build green;
3. expected runtime schema installed;
4. workspace and academic year active;
5. required CAN-PLAN has exactly one valid binding;
6. bound asset matches workspace/year;
7. bound generation matches asset/workspace and is `SUCCEEDED`;
8. no runtime consumer in scope depends on static CAN-PLAN UUID authority.

A failed item returns `BLOCKED` before browser certification.

## 13. Non-goals

CPRI-01 does not:

- change CAN-PLAN content;
- change the 33-block/66-hour canonical sequence;
- change curricolo authority;
- define MaterialBundle;
- define Studio Atlas handoff;
- authorize any cross-product runtime;
- create a new material persistence model;
- merge or promote PR #692.

## 14. Completion criteria

CPRI-01 is complete only when:

- the governed binding is the single runtime materialization authority;
- the data-readiness preflight is available and used before promotion;
- all in-scope runtime consumers use the resolver or resolved data;
- static CAN-PLAN asset/generation UUID authority has been removed;
- historical semantics are preserved;
- focused DB/repository tests and full exact-head certification are green;
- independent review is clean;
- any applicable Human Review refers to the same exact head.
