# Integrated Project Governed Memory v1

Status: CANONICAL_SHARED_MEMORY
Scope: CurManLight Arena + Docente OS
Date: 2026-08-29
Amended: 2026-09-20 — ECO-01 architecture-only maturity bridge authorization
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

The integrated project must advance in this order unless this memory is explicitly amended.

### Arena stabilization

- ARENA-S0 authority/baseline audit — completed with follow-ups.
- ARENA-S1 curriculum runtime consolidation — complete.
- ARENA-S2 product-surface rationalization — complete.
- ARENA-S3 human validation closure — **complete for the governed S3 release chain**.
- Arena M4 closure sequence M4-S1 through M4-S7 — implementation and exact-head automation complete.
- Final M4 promotion candidate: `a315aa72ce68a52da7d4d960996b6470774104b0`, published immutably with public smoke identity PASS and mobile human review PASS.
- **Final M4 promotion remains pending same-candidate desktop human review required by `BETA_G5_HUMAN_ACCEPTANCE_PROTOCOL_v2.md`.** Until that desktop review is completed and recorded, the effective formal classification remains M3.3 / M4 promotion candidate; `ARENA_M4_CONTROLLED_PRODUCTION_PILOT` is not yet effective.
- ARENA-S4 or any new cross-system feature phase is not automatically authorized by the M4 candidate. Controlled-pilot stabilization/maintenance is the intended next state only after final M4 promotion; cross-system expansion still requires an explicit governance decision.

### Docente OS stabilization and Teacher OS V1

- DOS-S0 provisional/approved receiver and same-version revalidation — implementation validated; promotion must still follow current branch/gate governance.
- DOS-S1 Knowledge Base consolidation — audit PASS_WITH_FOLLOW_UPS.
- DOS-UX0 Product Simplification produced binding HUMAN_USE evidence, including `FRICTION / REWORK_REQUIRED`. That evidence remains authoritative and must not be rewritten as PASS. Its open human-use/document closure remains a separate evidence stream, but after the explicit Teacher OS V1 convergence decision it no longer acts as a blanket freeze on all subsequent Docente-only product maturation.
- **DOS-V1 Teacher Operating System — AUTHORIZED DOCENTE-ONLY CONVERGENCE PROGRAM.** The convergence decision already integrated in Docente OS is now part of this shared memory. V1 may proceed independently of Arena S3/S4 only inside capabilities already owned by Docente OS and only while preserving Arena ownership, curriculum authority, handoff semantics, cross-product runtime boundaries, Tier 2 boundaries and canonical curricular state.
  - V1-A `Teacher Moment + Today/Next` — integrated.
  - V1-B `Lesson Brief` — integrated.
  - **V1-C `Contextual Copilot + Voice Capture` — AUTHORIZED as the concrete DOS-S3 assistant-authority closure path**, staged so that authority grows only after the previous stage is certified:
    1. **C1 Context Bridge / READ_ONLY + PROPOSE** — server-reconstructed authoritative context, minimized provider payload, explicit provenance, privacy preflight, no model tools and no writes;
    2. **C2 Contextual Voice Capture** — voice is only an input mode, raw audio ephemeral by default, context resolved before persistence, fallback manual always available;
    3. **C3 Governed reversible writes** — only teacher-owned reversible effects, through application/domain boundaries, with preview and explicit human confirmation; no direct model writes.
  - V1-C does **not** authorize automatic student evaluation, pupil-level profiling, automatic Plan completion, institutional decisions, silent curriculum promotion, external writes without confirmation or any Arena canonical mutation.
  - Later V1 increments remain Docente-only unless a separate amendment authorizes a cross-system or curricular-authority change.
- DOS-S2 Piano annuale / Progetta / UDA / Classi coherence remains governed by the Arena S4 boundary for cross-system or curricular-authority implications. Isolated Docente-only orchestration may proceed only when it does not reinterpret or promote curricular authority.
- DOS-S3 is no longer a separate future blocker: its assistant-authority closure is implemented through the staged V1-C contract above.
- DOS-S4 browser/mobile/HVA remains mandatory evidence for every applicable slice and for promotion, but it is an assurance layer rather than a blanket prohibition on starting an otherwise authorized Docente-only slice.

This amendment supersedes only the earlier local ordering that treated UX-0 and DOS-S3 as a blanket sequential feature freeze. It does not weaken the Arena/Docente authority boundary, the requirement for same-version revalidation, exact-head certification, privacy/security gates or human confirmation.

Arena stabilization continues independently and is neither blocked by nor subordinated to Teacher OS V1.

### 2026-09-18 completion reset

The integrated project is now explicitly in **completion and maturation mode**.

- Docente OS H8 lifecycle governance and H9-A governed replanning consumption are complete.
- Docente OS must prefer release-candidate freeze, sustained teacher pilot evidence and maturity closure over another broad feature train.
- Arena must complete the same-candidate desktop human acceptance for the final M4 candidate before formal controlled-production-pilot promotion; further product expansion remains deferred.
- New capabilities in either product default to `DEFERRED` unless classified `MATURITY_REQUIRED`, `PILOT_REQUIRED` or `PROFESSIONAL_GAP_CONFIRMED`.
- The canonical completion checkpoint is `docs/architecture/DUAL_SYSTEM_CANONICAL_RESET_2026-09-18.md`.
- This reset does not authorize Arena S4 early, does not weaken exact-head certification and does not change the product ownership or authority boundary.

### ECO-01 — curricular lesson-preparation maturity bridge

ECO-01 is explicitly classified **MATURITY_REQUIRED / ARCHITECTURE_ONLY**.

Authorized now:
- **ECO-01/S1 — CurriculumSnapshot v1 contract + mapping into the canonical lesson-preparation model**;
- documentation, schemas, fixtures, validators and non-operational read-model prototypes only;
- a real Technology lesson fixture may be used as evidence;
- `CurriculumSnapshot v1` must carry a deterministic structural/authority fingerprint;
- Docente OS mapping must converge on `NextLessonPreparation` and `LessonPreparationManifest.materialSlots`.

Invariants:
- the direct `Arena -> Docente OS` curriculum intake/revalidation boundary remains canonical for authority;
- Atlas is subordinate for publication/navigation/LO/material resources and does not intermediate curriculum authority;
- Atlas resources must enter the canonical lesson manifest; no parallel material path is authorized;
- `DOS-A1` remains **RUNTIME_DEFERRED**;
- no automatic sync, new shared persistence, runtime API coupling, user-data mutation or institutional-approval change is authorized by ECO-01/S1.

Later ECO-01 slices require their own governed evidence and do not become authorized merely because S1 closes.

Canonical plan:
- Drive document: `ECO-01 — Preparazione curricolare della lezione — Contratto e prototipo non operativo`;
- plan version at authorization: v0.1 / 2026-09-20.

### AILit

AILit remains `EXTERNAL_REFERENCE / ARCHITECTURE_ONLY`.

No AILit runtime, UI, database, dedicated store or authority implementation is authorized until the stabilization sequence above is explicitly closed or this memory is amended.

## 10. Current repository baselines at memory freeze

### CurManLight Arena

Repository: `antoniocorsano-boop/CurManLight_arena`  
Canonical integrated baseline at this amendment: `main@5438514c71fe75e4e2781d896aff949c685a2acf`

Current M4 promotion candidate:
- source candidate: `a315aa72ce68a52da7d4d960996b6470774104b0`;
- M4-S7 merged to main in PR #290 as `9bc3bb3f57b4c6bc17453fce044d478a0994976a`;
- automatic exact-head gates: PASS;
- immutable Beta deployment and public smoke identity: PASS;
- mobile human review: PASS;
- same-candidate desktop human review: PENDING;
- effective formal status: M3.3 / M4 promotion candidate until desktop HVA is completed.

### Docente OS

Repository: `antoniocorsano-boop/docente-os-2026-27`  
Canonical active product baseline at this amendment: `develop@d190d028ae37109a2893b974ffec05bd6ce9180c`

Current completion state:
- Teacher OS V1 convergence is the active product program;
- H8 governed reflection/replanning lifecycle: complete;
- H9-A accepted replanning read model: complete and post-merge certified;
- next maturity move: freeze a real release candidate and collect sustained teacher-pilot evidence rather than continue indefinite feature accumulation.

ECO-00 cross-product governance documentation is integrated in both current baselines. ECO-01/S1 is the next authorized architecture-only maturity slice.

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
