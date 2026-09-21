# Integrated Project Governed Memory v1

Status: CANONICAL_SHARED_MEMORY
Scope: CurManLight Arena + Docente OS
Date: 2026-08-29
Amended: 2026-09-21 — professional guided transport and persistent class baseline
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

## 4A. Professional guided workflow contract

The canonical professional interaction model is additionally governed by:

`docs/architecture/CML_DOS_PROFESSIONAL_GUIDED_WORKFLOW_V1.md`

Contract ID: `CML-DOS-PROFESSIONAL-GUIDED-WORKFLOW-V1`.

This contract refines the handoff model without weakening any authority boundary.

The durable rule is:

`assisted/automatic transport -> visible provenance -> server-side validation -> explicit teacher decision -> persistent class baseline -> lesson reuse`

The transport layer may become automatic or application-to-application. The persistence decision may not become silent.

Therefore:

- a curriculum baseline is acquired per class/discipline/year/version context, not once per lesson;
- lessons consume the already accepted class baseline and do not re-import curriculum;
- manual `.cml-handoff.json` handling is an interoperability, diagnostic and pilot/fallback mode, not the target professional workflow;
- Arena may prepare and transport a versioned handoff without directly writing Docente OS canonical state;
- Docente OS must validate workspace, year, discipline, grade, section/cohort, provenance, structural footprint and authority before persistence;
- a meaningful new or changed baseline requires explicit teacher acceptance/revalidation;
- an uploaded/local/browser-controlled payload cannot establish institutional `APPROVED` authority;
- institutional authority still requires a server-verifiable Arena authority signal plus explicit downstream teacher revalidation;
- no shared database or cross-system silent canonical write is authorized;
- user-visible feedback is mandatory for transfer, validation, acceptance, rejection and update availability.

The distinction is invariant:

`automatic transport != automatic persistence != institutional authority`

This amendment supersedes any interpretation of “no automatic downstream writes” that would prohibit automation of transport itself. The prohibition applies to silent canonical persistence and authority mutation, not to safe transport, routing, preview or validation.

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

ECO-01 is **CLOSED / MATURITY_REQUIRED / ARCHITECTURE_ONLY**. No runtime capability is activated by this closure.

Closed:
- **ECO-01/S1 — CurriculumSnapshot v1 contract + mapping into the canonical lesson-preparation model**;
- S1 final Arena integration: `main@989d86ef0724dde3fa1362b0fbf3b8c70c9e3498`;
- S1 final Docente OS integration: `develop@3f18eb43d6de026011fff340cc2a52bb4a218e27`;
- **ECO-01/S2 — readable unified lesson-preparation prototype**;
- S2 human cross-review: PASS on Arena #309 `7689caf747a1da2c51eeb8e6346538e792a93198` and Docente OS #548 `95c6cd3dc51984e95aee3ac28b25b71cac8bd334`;
- S2 final Arena integration: `main@ad4ef8bba25577e2ac23fc58bf7ffa5ca7fb4e17`;
- S2 final Docente OS integration: `develop@71f69ee6ac9030c7436c81159f007e9d28986d51`;
- **ECO-01/S3 — teacher-first multi-case validation across Technology I/II/III**;
- S3 human cross-review: PASS on Arena #312 `65a7f5b820b344ec61f8e09d7559012aae521bbc` and Docente OS #551 `6677572e00579a32848b64ddf97e56e685167fde`;
- S3 final Arena integration: `main@0d931c2c20a2c47c7a72c077faacf499feda6908`;
- S3 final Docente OS integration: `develop@dcb141d76352ef189fbb88523062e930112f7724`.

S2 closure invariants:
- teacher-first presentation is accepted: primary lesson language first, technical traceability second;
- the direct `Arena -> Docente OS` curriculum intake/revalidation boundary remains canonical for authority;
- Arena institutional approval and human review remain distinct from downstream Docente OS intake/revalidation;
- the S2 prototype downstream state is `AWAITING_TEACHER_DECISION`, with no implied persistence or adoption;
- Atlas remains subordinate for publication/navigation/LO/material resources and does not intermediate curriculum authority;
- every Atlas-backed resource remains inside canonical `materialSlots`; no parallel Atlas material path is authorized;
- `DOS-A1` remains **RUNTIME_DEFERRED**;
- no route, API, automatic sync, new persistence, shared database, user-data mutation, institutional-approval change or runtime cross-product integration was activated by S2.

Closed S3 invariants:
- one teacher-first preparation shape is generalizable across Technology I/II/III;
- Grade I remains bound to the 2025 regime, while Grades II/III remain correctly bound to their 2012 transition regimes;
- the same canonical material-role vocabulary is used across all three annualities;
- section/date/orario are never inferred; Grade I retains its evidenced `STATIC_BASELINE` state, while unbound Grades II/III remain `PREPARED_NOT_SECTION_BOUND`;
- teaching plans/UDA/activation sheets remain implementation/design evidence, not curriculum authority;
- the direct `Arena -> Docente OS` curriculum authority path remains canonical;
- Atlas remains subordinate for publication/navigation/LO/material resources and does not intermediate curriculum authority;
- every Atlas-backed resource remains inside canonical `materialSlots`;
- `DOS-A1` remains **RUNTIME_DEFERRED**;
- no route, API, automatic sync, shared persistence, user-data mutation or runtime cross-product integration was activated.

No ECO-01/S4 or later slice is authorized by this closure. Any runtime activation or new cross-product capability requires a separate governed decision.
Canonical plan:
- Drive document: `ECO-01 — Preparazione curricolare della lezione — Contratto e prototipo non operativo`;
- plan version at S3 authorization: v0.5 / 2026-09-20.

### ECO-02/P1 — controlled teacher-first pilot

ECO-02/P1 is **AUTHORIZED / PILOT_REQUIRED / TEACHER_CONTROLLED / DOS-A1 RUNTIME_DEFERRED**.

Authorized scope:
- one real Technology sequence only: **“Agricoltura come sistema tecnologico”**;
- one real class only: **2C**, with date and timetable bound by the teacher before use;
- Arena remains the sole curriculum authority and supplies the governed curriculum snapshot/provenance;
- Atlas may supply learning objects and resources only through canonical `LessonPreparationManifest.materialSlots`;
- Docente OS organizes `NextLessonPreparation` and the lesson manifest for teacher review;
- the teacher retains final authority to modify, exclude, replace, adapt and publish every proposal;
- the pilot records preparation time, comprehensibility, provenance visibility, teacher overrides and revalidation behaviour as evidence.

Explicit exclusions:
- `DOS-A1` remains **RUNTIME_DEFERRED**;
- no autonomous operational action, definitive automatic generation or autonomous publication;
- no parallel curriculum-authority path and no Atlas mediation of curriculum authority;
- no pupil personal data;
- no automatic opening of ECO-01/S4 or any later slice;
- pilot evidence is not an implicit approval of runtime operation.

P1 must stop at human review of the prepared pilot packet. Classroom execution, result classification and any later activation require an explicit teacher decision and separately bound evidence.

Authorization bases:
- Arena: `main@65ad4a8ff2f74f7f9b9ea763b1a344686cf0dedc`;
- Docente OS: `develop@9811d2756b59da54e09ed9c2d83210507e8cc6a7`.

### ECO-02 local-file authority transport rule

For ECO-02, a user-selected local `CML_LOCAL_HANDOFF_V2` JSON file is an **untrusted transport envelope** for preview and provisional teacher intake. Its structural footprint can detect meaningful mutation but is not an authenticity proof and cannot establish institutional authority.

Therefore:

- the local-file intake surface may persist only a governed `PROVISIONAL_COMPLETE` context with no top-level or nested approval-bearing claim;
- it must fail closed when the uploaded context claims `curriculumState = APPROVED`, a curriculum `approvalDecisionRef`, `transitionRemodulation.state = APPROVED`, `transitionRemodulation.institutionallyApproved = true`, or a remodulation `approvalDecisionRef`;
- a provisional → approved authority transition, including a same-`curriculumVersionRef` transition, may be persisted in Docente OS only after **both** a server-verifiable Arena authority signal **and completed teacher revalidation**, with both bound to the **exact imported curricular context** through the canonical payload itself or a collision-resistant digest (for example SHA-256 or stronger) computed over that canonical payload; the attested payload/digest must cover the curricular requirements and the authority-relevant identity fields, including curriculum/curriculum-version identity, school year, discipline, grade plus section/cohort scope, applicability status, transition-rule identity and the relevant institutional decision; the existing 32-bit FNV structural footprint remains only a change detector and must never be used as the integrity/authenticity binding for institutional approval; persistence of the approved context occurs only after the verified Arena evidence and teacher revalidation are bound to the same canonical payload/digest;
- this rule does not itself authorize or implement that future server-verifiable channel;
- the controlled ECO-02 local intake must be bound to the explicitly configured real pilot workspace/year/section identity and fail closed when that identity is absent or different; a class label such as “2C” alone is not sufficient authority or scope evidence;
- `DOS-A1` remains `RUNTIME_DEFERRED`.

This refines the transport and authority-evidence semantics of the existing `Arena -> versioned handoff -> Docente OS teacher intake/revalidation` contract. It does not move curriculum authority away from Arena and does not create a shared runtime or database.

Paired amendment candidates:
- CurManLight Arena PR #317;
- Docente OS PR #561;
- exact candidate heads must be rebound after all review corrections and before human approval/merge.

### AILit

AILit remains `EXTERNAL_REFERENCE / ARCHITECTURE_ONLY`.

No AILit runtime, UI, database, dedicated store or authority implementation is authorized until the stabilization sequence above is explicitly closed or this memory is amended.

## 10. Current repository baselines at memory freeze

### CurManLight Arena

Repository: `antoniocorsano-boop/CurManLight_arena`  
Canonical integrated baseline at this amendment: `main@0d931c2c20a2c47c7a72c077faacf499feda6908`

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
Canonical active product baseline at this amendment: `develop@dcb141d76352ef189fbb88523062e930112f7724`

Current completion state:
- Teacher OS V1 convergence is the active product program;
- H8 governed reflection/replanning lifecycle: complete;
- H9-A accepted replanning read model: complete and post-merge certified;
- next maturity move: freeze a real release candidate and collect sustained teacher-pilot evidence rather than continue indefinite feature accumulation.

ECO-00 cross-product governance documentation is integrated in both current baselines. ECO-01/S1, S2 and S3 are closed. No later ECO-01 slice or runtime activation is currently authorized.

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
