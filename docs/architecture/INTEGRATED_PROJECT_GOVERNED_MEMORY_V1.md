# Integrated Project Governed Memory v1

Status: CANONICAL_SHARED_MEMORY
Scope: CurManLight Arena + Docente OS
Date: 2026-08-29
Memory ID: CML-DOS-INTEGRATED-GOVERNANCE-V1

## 1. Purpose

This file is the canonical cross-system working memory for the integrated CurManLight Arena + Docente OS project.

Every agent, assistant, automation or developer working on either product must read this memory before making cross-system architectural, domain, UI, interoperability or roadmap decisions.

Conversation summaries, local notes, PR descriptions and temporary branches may add evidence, but they do not override this file. A change to this memory requires an explicit governance decision and must be applied consistently to both repositories.

## 2. Product ownership boundary

### CurManLight Arena owns

- institutional curriculum;
- national/institutional applicability and curriculum authority;
- curriculum revision proposals;
- institutional review and decision boundaries;
- curricular provenance and source evidence;
- institutional adoption state;
- versioned curriculum handoff contracts;
- institutional/curricular documentation and controlled exports.

Arena is not the teacher's classroom workspace.

Arena must not own:

- pupil-level operational data;
- classroom observations;
- student grouping;
- timetable execution;
- lesson execution;
- teacher daily workflow;
- teacher professional knowledge as a separate archive;
- automatic downstream writes into Docente OS.

### Docente OS owns

- teacher operational planning;
- annual teaching plan as teacher work;
- UDA authoring/execution after curricular intake;
- classes and teacher-owned class workspace;
- lessons and in-class work;
- observation/recording workflows;
- timetable and daily professional activity;
- teacher professional Knowledge Base;
- authored-document derivatives bound to Knowledge assets;
- teacher review/revalidation of incoming curricular updates.

Docente OS is not an institutional curriculum authority.

Docente OS must not:

- reinterpret a proposal as an institutional decision;
- promote provisional curriculum to approved authority on its own;
- mutate Arena canonical curriculum state;
- introduce a second institutional curriculum source of truth.

## 3. Authority model

The following distinctions are invariants:

`Person != Role != Capability != Authority`

and

`Proposal != Review != Institutional Decision != Approved Curriculum != Planning Handoff != Teacher Acceptance`

No agent may collapse these states for convenience.

Authority must be explicit, scoped and evidenced. Missing authority fails closed.

## 4. Cross-system handoff contract

The canonical direction is:

`Arena institutional/curricular baseline -> versioned handoff -> Docente OS teacher intake/revalidation`

The handoff is never an automatic shared-database write.

Required properties:

1. immutable/versioned curriculum identity;
2. explicit curriculum authority state (`APPROVED` or governed provisional state);
3. provenance/source references;
4. applicability context;
5. structural footprint sufficient to detect meaningful change even when `curriculumVersionRef` is unchanged;
6. explicit downstream teacher acceptance/revalidation when required;
7. no silent mutation of teacher-authored framework or existing UDA work;
8. no canonical write-back to Arena from Docente OS without a separately governed proposal/review boundary.

## 5. Same-version authority transition rule

A change from provisional to approved authority may occur without changing curriculum content or `curriculumVersionRef`.

Therefore Docente OS must not compare only version IDs.

It must detect changes through the structural/authority footprint and, when that footprint changes, require teacher revalidation before persistence of the approved context.

Unchanged requirement coverage may carry forward. Teacher-authored reviewed work must remain intact unless the teacher explicitly changes it.

## 6. Knowledge boundary

Docente OS Knowledge Base is the canonical teacher professional knowledge pipeline:

`KnowledgeAsset -> KnowledgeProcessingGeneration -> KnowledgeDocument -> KnowledgeUnit -> operational use / authored derivative`

`knowledge_assets` preserve source identity.

`authored_documents` are editable/versioned derivatives bound to a source asset; they are not a second source archive.

Future external frameworks, including AILit if later authorized, must enter through the same governed Knowledge pipeline rather than through a dedicated parallel store.

## 7. UI/product boundary

Arena UI language must describe institutional/curricular work, not a teacher's personal classroom environment.

Docente OS UI may describe teacher operational work, classes, lessons, planning and professional activity.

A UI change must not silently shift domain ownership.

Visual/design tools such as Styler may improve implementation consistency only after domain, Human Task and interaction contracts are fixed. They are not an authority for product semantics.

## 8. Human validation chain

For Arena critical journeys the governed validation chain is:

`Human Task -> HIM -> automated browser evidence -> immutable deployed Beta release -> actual human acceptance receipt`

Automation collects evidence but does not issue the human verdict.

The four frozen Arena G5 tasks are:

1. `HT-BETA-CURRICULUM-CONTEXT`
2. `HT-BETA-REVISION-PREPARE`
3. `HT-REVISION-DECISION`
4. `HT-BETA-PLANNING-HANDOFF`

Human acceptance must be bound to the same immutable deployed `releaseSha` used by the Beta candidate.

## 9. Current governed execution order

The integrated project must advance in this order unless this memory is explicitly amended:

### Arena stabilization

- ARENA-S0 authority/baseline audit — completed with follow-ups.
- ARENA-S1 curriculum runtime consolidation — complete.
- ARENA-S2 product-surface rationalization — complete.
- ARENA-S3 human validation closure — in progress.
  - S3A validation contract/release binding — complete and integrated.
  - S3B critical desktop/mobile browser evidence — in validation.
  - S3C immutable Beta deploy + actual HVA — pending.
- ARENA-S4 bidirectional interoperability stabilization — blocked until S3 closes.

### Docente OS stabilization

- DOS-S0 provisional/approved receiver and same-version revalidation — implementation validated; promotion must still follow current branch/gate governance.
- DOS-S1 Knowledge Base consolidation — audit PASS_WITH_FOLLOW_UPS.
- DOS-S2 Piano annuale / Progetta / UDA / Classi coherence — next product slice after Arena S4 boundary is stable, unless an isolated Docente-only change is explicitly authorized.
- DOS-S3 assistant authority closure — subsequent.
- DOS-S4 browser/mobile/HVA closure — subsequent.

### AILit

AILit remains `EXTERNAL_REFERENCE / ARCHITECTURE_ONLY`.

No AILit runtime, UI, database, dedicated store or authority implementation is authorized until the stabilization sequence above is explicitly closed or this memory is amended.

## 10. Current repository baselines at memory freeze

### CurManLight Arena

Repository: `antoniocorsano-boop/CurManLight_arena`
Canonical integrated baseline at freeze: `main@cb65f9c6dbd3cd1b0143dfa7e793cb9f4f4a3464`

Current active S3B candidate at freeze:
- branch: `stabilization/arena-s3b-critical-journey-browser`
- PR: `#101`
- head: `1ad7cc8c75b5ec895f8cc5836274d9434be1d3bd`
- state: validation in progress; not merged at memory freeze.

### Docente OS

Repository: `antoniocorsano-boop/docente-os-2026-27`
Canonical active product baseline: `develop@ebdb2aa77ad68f1d65264671b4f61185b0ba2205`

Important stabilization checkpoints already established:
- plan branch: `stabilization/product-plan-develop-2026-08-29`;
- plan PR: `#254`;
- DOS-S0 implementation PR: `#255`;
- validated DOS-S0 candidate previously recorded: `455cef5f7c2df01cbab6aa6f1adfa4f4025885ec`.

Agents must re-check live PR/gate state before promotion or merge; this memory records governance and point-in-time state, not permission to merge stale candidates.

## 11. Agent operating rules

Before any work, an agent must answer internally:

1. Which product owns this capability?
2. Is the requested action domain, UI, evidence, authority, interoperability or operational work?
3. Does it cross the Arena/Docente OS boundary?
4. Which canonical contract is being read or written?
5. Is a human decision required?
6. What is the immutable candidate SHA?
7. Which gates must pass on that exact SHA?
8. Does the action preserve the execution order in section 9?

If ownership or authority is ambiguous, stop promotion and classify the ambiguity. Do not resolve it by adding shared state or duplicating functionality.

## 12. Promotion and merge rule

No agent may merge, deploy or promote based on a summary that says a branch was previously green.

Before promotion it must re-check:

- exact head SHA;
- mergeability;
- all applicable required gates on that same SHA;
- absence of a newer governing decision in this memory.

Deployment and HVA must also verify published runtime/release identity against the same immutable SHA.

## 13. Memory update rule

This file is shared logical memory, not a historical log.

Update it only when one of these changes:

- product ownership boundary;
- authority model;
- handoff contract;
- canonical execution order;
- approved integrated baseline;
- status of a major stabilization slice;
- authorization state of an external framework such as AILit.

Routine commits, test runs and temporary findings belong in session/checkpoint evidence, not here.

Any semantic update must be mirrored in both repositories under the same `Memory ID` and version.

## 14. Non-negotiable invariant

**The two products collaborate through explicit, versioned, human-governed contracts. They do not become one shared runtime, one shared database or one blurred authority domain.**
