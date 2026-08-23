# DOCENTE OS — Continuous Improvement Policy

**Status:** ACTIVE  
**Version:** 1  
**Scope:** repository mechanics, Human Task compiler, approved-manifest pipeline and future agentic workflows.

## Principle

Every governed cycle must ask whether the friction encountered can be removed from the system before the same manual work is repeated.

This is not permission to change product semantics autonomously. It is a requirement to improve repeatable mechanics while keeping professional decisions under human control.

## Required cycle

`execute → validate → inspect friction → generalize if reusable → test the improvement → record disposition → promote`

A compiler/repository cycle cannot be promoted with the improvement disposition still `PENDING`.

Allowed dispositions:

- `NO_GENERALIZABLE_CHANGE` — the cycle exposed no reusable mechanical improvement;
- `SYSTEM_IMPROVEMENT_APPLIED` — a reusable improvement was implemented and validated;
- `SYSTEM_IMPROVEMENT_REQUIRED` — a reusable issue exists but has not yet been safely solved; promotion remains blocked when the improvement is necessary for correctness or repeatability.

## What may improve automatically

Mechanical changes may be applied without a separate didactic approval when they:

- remove repeated repository work;
- centralize a registry or loader;
- strengthen provenance or source-drift checks;
- replace per-block tests with stronger generic invariants while preserving existing coverage;
- improve compiler discovery, extraction or deterministic classification;
- reduce runtime coupling without changing the approved teaching meaning;
- preserve all existing security, RLS, validation and fail-closed contracts.

## What still requires human approval

Human approval remains mandatory for:

- didactic meaning;
- recipe-family design when existing families do not fit;
- ambiguous source alignment;
- choice between materially different teaching sequences;
- assessment meaning or criteria;
- canonical planning changes;
- any change that would reinterpret a source rather than mechanically project it.

## Anti-regression rule

A change is **not** an improvement if it obtains speed by weakening:

- tests;
- type safety;
- lint/build gates;
- RLS or privacy boundaries;
- source-generation binding;
- provenance;
- human approval gates;
- fail-closed behavior;
- task continuity;
- canonical ownership boundaries.

## Human Task promotion gate

`HumanTaskCompilerReviewPackage` carries an explicit `improvementReview`.

Promotion must refuse a package when:

- semantic items remain unresolved;
- the package is not ready for human review;
- the human decision is absent;
- the improvement review is still `PENDING` or reports an unresolved required system improvement.

## B28–B30 first application

The first application of this policy is the approved B28–B30 tranche of Prima / UDA 1-06.

Observed friction: adding every tranche required another imported `human-task-approved-projections-bNN-bMM.ts` file and another runtime import.

System improvement applied:

1. approved content is stored as a declarative manifest;
2. manifests carry source generation/revision bindings and human approval metadata;
3. a generic approved registry materializes manifest-backed projections;
4. the runtime resolver imports the registry once rather than every future tranche;
5. future compiler promotions must record the improvement-review disposition before approval can be materialized.

The target is therefore not merely “finish more blocks”; it is to make each successful cycle reduce the cost and risk of the next one.
