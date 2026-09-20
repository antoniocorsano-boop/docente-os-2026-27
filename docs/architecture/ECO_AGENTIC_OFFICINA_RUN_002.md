# ECO Agentic Officina — Run 002

Run ID: `ECO-OFFICINA-RUN-002`  
Contract: `ECO-AGENTIC-OFFICINA-V1`  
Target: **ECO-02/P4 post-merge intake boundary correction**  
Date: 2026-09-20  
Status: **EXECUTED / VERIFICATION_PENDING**

## INTENT

Correct the post-merge findings raised against ECO-02/P4 before treating the Beta intake as ready for real teacher-flow verification.

This run does not expand ECO-02. It narrows and hardens the already-merged teacher-first Arena curriculum intake.

## BASE

Repository: `antoniocorsano-boop/docente-os-2026-27`  
Canonical source branch: `develop`  
Base exact SHA: `eaa806b1bd77386f405f5ac505ebbbca50246632`

Runtime Beta currently serving the earlier P4 merge:

`d5002280907399bc979df763a2ab96300f3e5b49`

The following review findings were raised on PR #559 after its human approval and merge:

1. intake/link available outside the authorized Technology 2C pilot scope;
2. uploaded `APPROVED` JSON can self-assert institutional authority because the local footprint is not an authenticity proof;
3. the local upload surface promises future revalidation but cannot safely complete a provisional → approved authority transition without a server-verifiable Arena authority signal;
4. cohort-scoped handoffs lose `cohortRef` when the local target scope is built;
5. UI accepts files up to 2 MB even though the default Server Action request limit is lower.

## PLAN

1. Restrict the ECO-02 Arena intake route, link and server action to the authorized **Technology 2C** pilot.
2. Make the local file intake **provisional-only**. An uploaded `APPROVED` handoff must fail closed and must never be persisted as institutional authority.
3. Update teacher-facing copy so the local upload surface no longer implies that institutional approval can be completed from an unverified file. Future approved revalidation remains reserved for a separately verified Arena authority channel.
4. Preserve the incoming scope dimension when constructing the target: `sectionRef` when section-scoped, `cohortRef` when cohort-scoped.
5. Reduce the upload contract to a safe size below the default Server Action body limit and enforce the same limit server-side.
6. Add/extend deterministic unit tests for pilot-scope, discipline binding and scope construction.
7. Run the applicable repository gates and independent review on the final exact head.
8. Stop at human decision. No merge is authorized by this run alone.

## TEST CONTRACT

The run passes only if all of the following are true:

- a non-2C class cannot discover the Arena intake link;
- direct navigation/action against a non-2C class fails closed;
- a non-Technology handoff fails closed;
- an uploaded `APPROVED` handoff cannot be accepted or persisted through this local file surface;
- the UI clearly states that institutional approval requires a verified Arena authority channel;
- the existing provisional Technology 2C handoff remains previewable and acceptable;
- a section-scoped handoff retains the local canonical section target;
- a cohort-scoped handoff retains `cohortRef` instead of being rejected because the target silently substitutes a section scope;
- the client and server use the same conservative upload-size ceiling;
- no Production deployment or Production promotion is triggered;
- `DOS-A1` remains `RUNTIME_DEFERRED`.

## EXECUTION BOUNDARY

Expected changed paths are limited to the ECO-02 intake surface, its small domain guards/tests, and this Run 002 record.

No integrated governed-memory amendment is part of this run.

## EXECUTION

Implemented on `fix/eco02-p4-intake-boundaries`:

- pilot-only discovery and server-side enforcement for Technology 2C;
- local-file authority guard: `APPROVED` claims are preview-only and cannot persist institutional authority;
- teacher-facing wording aligned to the verified-authority boundary;
- target-scope construction preserves section/cohort dimensions;
- shared 500 KB client/server upload ceiling below the default Server Action body limit;
- focused domain tests for pilot scope, authority guard, upload ceiling and cohort/section scope preservation.

No Production action has been taken.

## INDEPENDENT REVIEW

State: **PENDING FINAL EXACT HEAD**

Required focus:

- pilot-scope enforcement cannot be bypassed server-side;
- untrusted local JSON cannot create institutional authority;
- copy and runtime behavior describe the same authority boundary;
- cohort/section scope handling remains contract-correct;
- no regression to the valid provisional 2C intake.

## VERIFICATION

State: **PENDING FINAL EXACT HEAD**

Required:

- focused tests;
- typecheck;
- lint/build if applicable;
- Product CI / applicable repository gates;
- independent review;
- exact-head binding.

## HUMAN DECISION

State: **NOT YET REQUESTED**

## MEMORY UPDATE

State: **NOT AUTHORIZED**

This is a corrective implementation run, not a shared-memory amendment.

## NEXT AUTHORIZED ACTION

Implement the bounded corrections on this branch, verify the final exact head, then request human review.
