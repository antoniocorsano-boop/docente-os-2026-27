# MATERIAL-CORE-01 — Task 6 checkpoint

Status: IN_PROGRESS

Task 6 introduces verified material reconstruction in the lesson-preparation manifest without creating a second persistence path.

Current invariants:
- typed `LessonMaterialBindingV1` metadata is preserved through the manifest;
- accepted typed materials require exact canonical read-back before `READY`;
- digest mismatch or unavailable verification yields `NEEDS_REVIEW`;
- legacy resource kinds remain historical-only and cannot authorize current readiness;
- role, artifact kind and audience remain distinct;
- existing manifest fixtures remain source-compatible because the additive `materials` metadata is optional at the public type boundary but is emitted by the Task 6 builder.

RED evidence:
- RED commit `0bad3a27b5e98e647d6b6872e38dc7c1d1fbf081` added only the Task 6 regression contract;
- Product CI failed at typecheck because the verified builder and typed material metadata did not yet exist.

GREEN implementation:
- `7dcd4147e57891df39efa305b442e012e9b7c40e` introduced verified readiness using the existing canonical material resolver;
- follow-up compatibility/root-cause repair commit `0eabcbf982d168362d819cb21c4be2d2dfffb4a4` preserves historical fixtures and removes the single TERM-01 test-only vocabulary regression.

Qualification must be evaluated on the exact current head. Do not merge, deploy, or promote Beta from this checkpoint alone.
