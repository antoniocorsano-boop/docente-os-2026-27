# MATERIAL-CORE-01 — Task 6 checkpoint

Status: TASK_6_COMPLETE

Task 6 introduces verified material reconstruction in the lesson-preparation manifest without creating a second persistence path.

## Invariants preserved

- typed `LessonMaterialBindingV1` metadata is preserved through the manifest;
- accepted typed materials require exact canonical read-back before `READY`;
- digest mismatch or unavailable verification yields `NEEDS_REVIEW`;
- legacy resource kinds remain historical-only and cannot authorize current readiness;
- role, artifact kind and audience remain distinct;
- existing manifest consumers remain source-compatible because the additive `materials` metadata is optional at the public type boundary while Task 6 emits it for reconstructed material slots;
- no provider runtime, new persistence store, Beta promotion, deploy, or merge is introduced by this task.

## RED evidence

- RED commit `0bad3a27b5e98e647d6b6872e38dc7c1d1fbf081` added only the Task 6 regression contract;
- Product CI failed at typecheck because the verified builder and typed material metadata did not yet exist.

## GREEN implementation and repairs

- `7dcd4147e57891df39efa305b442e012e9b7c40e` introduced verified readiness using the existing canonical material resolver;
- `a2869f177adb1fb64b6d899d1933ddb7639e7b8b` restored the intended compatibility boundary for `LessonMaterialSlot.materials` and the Task 6 qualification lineage without weakening `legacy != READY`;
- `67f36a2b13b5a5725f3e20668c86f5d6536285ab` migrated the single stale LP-1 READY fixture from an untyped historical `TEACHER_RESOURCE` to a typed canonical material binding with explicit verified read-back. Production code was not changed by this final repair.

## Qualification evidence — implementation head `67f36a2b13b5a5725f3e20668c86f5d6536285ab`

Product CI `38923977417`: PASS, including:
- typecheck;
- complete product tests, including the Task 6 material-manifest contract and LP-1;
- lint;
- build;
- complete migration-chain replay on ephemeral Supabase;
- runtime release preflight receipt.

Also PASS on the same implementation head:
- Dependency Security Gate `38923977537`;
- Certification Impact Classifier `38923977426`;
- Human Interaction Model `38923977446`;
- Release Engineering Policy `38923977352`;
- TRAMA TERM-01 Curricolo Vocabulary `38923977362`;
- TRAMA Perceptible Write `38923977353`;
- Governed MFA Queue Hygiene `38923977410`.

DOS-CRM QL-1 `38923977418` is skipped as expected for this tranche.

The checkpoint commit is documentation-only. The PR head must still be re-qualified after this checkpoint commit before Task 6 is treated as closed at exact-head level.

PR #712 remains Draft, open, unmerged, with no deploy or Beta promotion.
