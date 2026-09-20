# ECO Agentic Officina — Run 002

Run ID: `ECO-OFFICINA-RUN-002`  
Contract: `ECO-AGENTIC-OFFICINA-V1`  
Target: **ECO-02/P4 post-merge intake boundary correction**  
Date: 2026-09-20  
Status: **EXECUTED / CORRECTIVE_REVIEW_APPLIED / VERIFICATION_PENDING**

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

The cross-system authority-transport clarification requires a mirrored governed-memory amendment. Docente OS carries the amendment in this PR and CurManLight Arena carries the identical amendment in companion PR #317.

## EXECUTION

Implemented on `fix/eco02-p4-intake-boundaries`:

- pilot-only discovery and server-side enforcement bound to an explicit workspace/year/section identity configuration, not to the “2C” label alone;
- fail-closed behavior when the pilot identity configuration is missing;
- local-file authority guard: all top-level and nested approval-bearing claims are preview-only and cannot persist institutional authority;
- teacher-facing wording aligned to the verified-authority boundary;
- target-scope construction preserves section/cohort dimensions;
- shared 500 KB client/server upload ceiling below the default Server Action body limit;
- focused domain tests for exact pilot identity, authority guard, upload ceiling and cohort/section scope preservation;
- the guard suite is included in the normal `npm test` Product CI command;
- the shared governed-memory amendment is mirrored in CurManLight Arena PR #317.

The real Beta pilot identifiers were resolved from the active Docente OS data context but are **not stored in the public repository**. They will be injected into the Beta service only after a human-approved merge. Production remains untouched.

No Production action has been taken.

## DESIGN CLASSIFICATION

**COMPATIBLE** — this corrective delta reuses the existing ECO-02/class workspace components, tokens and interaction patterns. It narrows visibility, clarifies authority copy and adds fail-closed states without introducing or superseding the visual system.

The first DPG-1 attempt failed only because the required PR-body classification was absent. The PR body has been updated; this checkpoint creates a new exact head so the design-policy workflow can evaluate the current metadata on a fresh pull-request synchronization event.

## INDEPENDENT REVIEW


State: **REVIEW FINDINGS APPLIED / FRESH REVIEW REQUIRED ON FINAL EXACT HEAD**

Codex review on the superseded head `7a72104db3b0dfba4ccdf95d3708d5c0443f924c` identified four valid findings: exact tenant/year/section pilot binding, nested authority claims, mirrored governed memory, and CI inclusion of the guard suite. All four are addressed in the current branch.

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

The transport/authority clarification is a shared-memory amendment and must merge consistently in Docente OS and CurManLight Arena. Runtime correction and shared governance remain separately human-gated.

## NEXT AUTHORIZED ACTION

Implement the bounded corrections on this branch, verify the final exact head, then request human review.
