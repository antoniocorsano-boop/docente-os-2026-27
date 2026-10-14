# MATERIAL-ORCH-01 — Design v2.2 Immutability Rework

**Date:** 2026-10-13  
**PR:** #703  
**Second fresh-review exact head:** `0eef14193aedb0b7fd00059e7c5141640ff4c065`  
**Status after review:** `REWORK_REQUIRED / IMPLEMENTATION_HOLD`

## Finding

The second fresh independent review completed on `0eef141...` and found one P1 remaining in MATERIAL-CORE exact-content identity.

The v2.1 type allowed:

```text
KNOWLEDGE_GENERATION(assetId + generationId + optional digest)
```

That was insufficient because the current Knowledge schema permits in-place `UPDATE` of `knowledge_documents` and `knowledge_units`. `private.enforce_knowledge_document_invariants()` and `private.enforce_knowledge_unit_invariants()` freeze identity fields but do not freeze content.

Therefore the same `generationId` can refer to changed teacher-visible content.

## Verification

Verified against current `develop` migration:

`product/supabase/migrations/0007_knowledge_base_hardening.sql`

- authenticated members may update `knowledge_documents`;
- authenticated members may update `knowledge_units`;
- document trigger freezes `workspace_id`, `asset_id`, and timestamps, not content;
- unit trigger freezes `workspace_id`, `document_id`, and timestamps, not content.

The finding is valid.

## Design v2.2 correction

Every accepted material now requires a mandatory digest-bound exact-content identity.

```ts
interface MaterialContentDigestV1 {
  algorithm: 'SHA-256'
  canonicalization: 'docente-os.material-content.v1'
  value: string
}

type CanonicalMaterialRefV1 =
  | {
      kind: 'KNOWLEDGE_GENERATION'
      assetId: string
      generationId: string
      contentDigest: MaterialContentDigestV1
    }
  | {
      kind: 'IMMUTABLE_REVISION'
      assetId: string
      revisionRef: string
      contentDigest: MaterialContentDigestV1
    }
```

The digest is mandatory in both variants.

A Knowledge generation is now treated as a locator/context component plus exact digest, not as proof that the underlying document/unit content is physically immutable.

## Readiness semantics

At canonical material readiness:

```text
stored digest == recomputed canonical content digest -> eligible for READY
stored digest != recomputed digest                    -> STALE / NEEDS_REVIEW
digest cannot be recomputed                           -> NEEDS_REVIEW / fail closed
referenced content missing                            -> NEEDS_REVIEW / fail closed
```

An accepted extension is never silently retargeted to later in-place content.

## Implementation-plan correction

MATERIAL-CORE-01 plan v2 now requires RED tests for:

- in-place mutation of `knowledge_documents` content while generation ID remains unchanged;
- in-place mutation of `knowledge_units` content while generation ID remains unchanged;
- mutable referenced binary/object content where applicable;
- digest mismatch causing `STALE/NEEDS_REVIEW` rather than READY;
- acceptance rejection when mandatory digest is absent;
- legacy `APPROVED` reconciliation refusing to invent a historical digest from changed current content without provenance proving equivalence.

## Scope unchanged

This correction:

- adds no runtime code;
- applies no migration;
- mutates no Beta data;
- authorizes no provider runtime;
- leaves DOS-A1 `RUNTIME_DEFERRED`;
- leaves #692 frozen reference only;
- preserves Knowledge → `LessonDesignExtension` → `materialSlots` as the only canonical acceptance path.

## Next gate

After resolving the verified P1 thread:

1. freeze a new exact head;
2. require all documentation workflows PASS;
3. request a third fresh independent review on that exact head;
4. classify `ARCHITECTURE_READY` only if no relevant unresolved finding remains;
5. stop at the applicable Human Review/process gate.

Current state:

`MATERIAL-ORCH-01 = DESIGN_V2_2 / THIRD_FRESH_REVIEW_REQUIRED / IMPLEMENTATION_HOLD`
