# MATERIAL-ORCH-01 — Governed Material Orchestration Design v2

**Status:** `DESIGN_V2 / INDEPENDENT_REVIEW_REQUIRED / IMPLEMENTATION_HOLD`  
**Audit sources:**
- `docs/superpowers/checkpoints/2026-10-13-material-orch-01-architecture-audit.md`
- `docs/superpowers/checkpoints/2026-10-13-material-orch-01-deep-preimplementation-audit.md`

**Current Docente OS baseline considered:** `develop@a2e8f46972b60914e3a554df3b6d3942b34029a1`  
**Containment baseline:** CONTAIN-01 + CONTAIN-01B integrated; runtime schema contract v100; legacy Studio Atlas material mutation contained.  
**Legacy/reference PR:** #692 remains `QUALIFIED_REFERENCE / ARCHITECTURE_FREEZE / NOT_INTEGRATION_CANDIDATE`.

## 1. Goal

Define a stable, provider-neutral architecture for preparing teaching materials in Docente OS without creating:

- a second lesson-material domain;
- a second source archive outside Knowledge;
- a provider-owned source of truth;
- a parallel cross-system protocol;
- an implicit cross-product runtime authorization.

The target user task is **Prepara materiali**. The target architecture must reuse the canonical lesson-preparation foundation and preserve teacher authority end-to-end.

## 2. Binding references

This design is subordinate to the following existing contracts and decisions.

### Docente OS

- `docs/architecture/LESSON_PREPARATION_ORCHESTRATION_CANONICAL.md`
  - lesson preparation is composition/orchestration, not a competing domain;
  - reuse `NextLessonPreparation`, `LessonDesignExtension`, Knowledge/Material assets and `LessonPreparationManifest.materialSlots`;
  - provider-independent internal fallback first;
  - no second lesson-material model or Copilot frontdoor.

### TRAMA

- `docs/decisions/trama-adr-010-atlas-integral-material-studio.md`
  - **APPROVED**;
  - Officina materiali is the provider-neutral specialist artifact-production concept;
  - Docente OS remains teacher workspace/orchestrator;
  - reuse before generation;
  - runtime remains not authorized; `DOS-A1` remains `RUNTIME_DEFERRED`.
- `docs/decisions/trama-adr-020-studio-atlas-product-boundary.md`
  - Studio Atlas is a separable professional product for Atlas Pathway authoring;
  - its primary handoff is the Pathway Authoring Package;
  - a lesson/material deep link may be a minimized seed but does not transfer lesson ownership;
  - runtime remains not authorized.
- `docs/contracts/r4-p1-entry-contract.md`
  - teacher-first path `Riutilizza | Adatta | Crea nuova`;
  - no direct writes from specialist engines;
  - explicit preview/review before lesson association;
  - rights, lineage, accessibility and quality gates;
  - `DOS-A1` remains `RUNTIME_DEFERRED`.
- `docs/contracts/trama-shared-capability-layer-contract-v0.md` (OR-07)
  - provider-neutral capability identity;
  - `SharedCapabilityRequest` / `SharedCapabilityResult` envelopes;
  - `requestId`, explicit caller/decision owner, provider/adapter provenance, evidence refs;
  - only `READ_ONLY | PROPOSE_ONLY` in v0;
  - no write authority and no DOS-A1 authorization.

This Docente OS document does **not** create or supersede TRAMA governed memory. Any future semantic cross-system handoff change must follow the shared-memory rule in `AGENTS.md` before becoming canonical.

## 3. Non-negotiable principles

1. Docente OS models the professional task **Prepara materiali**, not a provider.
2. Reuse and adaptation precede generation.
3. The canonical lesson-material composition remains `LessonPreparationManifest.materialSlots`.
4. `LessonDesignExtension` remains the governed proposal/acceptance lifecycle for lesson-design additions.
5. Knowledge/Material assets remain the durable source pipeline; there is no second artifact archive.
6. External/provider results are proposals, never authoritative lesson state.
7. Teacher acceptance is an explicit local Docente OS domain action.
8. Shared capability execution, when eventually authorized, remains `PROPOSE_ONLY`; it does not perform the acceptance write.
9. `LessonMaterialRole`, `artifactKind` and `audience` are separate semantic dimensions.
10. A provider locator is provenance, not durable internal material identity.
11. `ACCEPTED` is not equivalent to real use; use remains TeachingSession evidence.
12. Browser-return data is untrusted proposal input, not provenance evidence by itself.
13. Every mutative entrypoint enforces authorization at the write boundary; UI visibility is never sufficient.
14. CPRI is provider-neutral and separate from materials/providers.
15. A deploy flag can only restrict or technically enable a capability already authorized by governance; it cannot create authority.
16. No personal student data is required for ordinary material preparation.
17. Every implementation tranche owns one primary architectural boundary.

## 4. Authority matrix

| Concern | Authority | Non-authority |
|---|---|---|
| Curricolo di istituto | Arena / applicable governed contracts | Docente OS, Studio Atlas, provider output |
| Logical annual-plan identity | `CAN-PLAN-x` | Knowledge UUIDs |
| Runtime CAN-PLAN materialization | governed Docente OS CPRI binding | compiled UUIDs, metadata scans |
| UDA/document | Docente OS | provider/adapter |
| Lesson context and lesson decision | Docente OS + teacher | provider/adapter |
| Material search/proposal | local services or shared capability as proposal | canonical persistence |
| Specialist artifact production concept | Officina materiali boundary | Studio Atlas as universal engine |
| Atlas Pathway authoring | Studio Atlas within ADR-020 | lesson ownership |
| Material acceptance | teacher + Docente OS local domain command | OR-07 provider/capability |
| Durable material identity | Docente OS Knowledge/canonical internal reference | `atlas:*`, URL, provider object id alone |
| Lesson readiness | `LessonPreparationManifest.materialSlots` | candidate bundle status |
| Actual use | TeachingSession/evidence | `ACCEPTED` flag |
| Cross-product authorization | TRAMA governance | env var, browser payload, provider availability |
| Technical enablement | deployment config after governance | governance authority |

## 5. Target flow

```text
UDA / lesson / NextLessonPreparation
        |
        v
PREPARE_MATERIALS
        |
        +--> discover existing relevant materials
        |       +--> REUSE_EXISTING
        |       +--> ADAPT_EXISTING
        |
        +--> CREATE_NEW only when needed
                |
                v
      provider-neutral proposal capability
      (local/internal first; OR-07 only when governed)
                |
                v
         transient candidates
                |
                v
        teacher preview/review
                |
                v
       explicit local acceptance
                |
                +--> durable Knowledge/canonical material identity
                +--> LessonDesignExtension accepted/proposed state
                +--> LessonPreparationManifest.materialSlots derived state
                |
                v
         lesson use / TeachingSession evidence
```

No provider may skip the teacher-review/local-acceptance boundary.

## 6. Local Material Task

The Docente OS domain intent is local and provider-neutral:

```ts
type MaterialTaskIntent = 'PREPARE_MATERIALS'

type MaterialTaskMode =
  | 'REUSE_EXISTING'
  | 'ADAPT_EXISTING'
  | 'CREATE_NEW'
```

This intent is not itself a cross-system wire protocol.

The UI must search/offer existing materials before exposing generation as the default path.

## 7. Canonical lesson-material semantics

### 7.1 Material role

The lesson needs a semantic role independent of file format/provider:

```ts
type LessonMaterialRole =
  | 'TEACHER_BRIEF'
  | 'LIM_VIEW'
  | 'STUDENT_HANDOUT'
  | 'MINI_DECK'
  | 'VISUAL_AID'
  | 'ASSESSMENT'
```

A provider may suggest a role, but Docente OS resolves/validates the canonical role before acceptance.

### 7.2 Artifact kind

`artifactKind` describes the produced object, not how it is used in the lesson. Initial examples:

```text
PRESENTATION
WORKSHEET
GUIDE
RUBRIC
VISUAL
ASSESSMENT
OTHER
```

### 7.3 Audience

```text
TEACHER
STUDENT
MIXED
```

`LessonMaterialRole`, `artifactKind` and `audience` must never be collapsed into one enum.

A presentation may map to `LIM_VIEW` or `MINI_DECK`; a rubric may map to `ASSESSMENT`; a guide may map to `TEACHER_BRIEF`. Mapping is a Docente OS semantic decision, not provider authority.

## 8. Proposal capability: reuse OR-07, do not create a parallel envelope

`MaterialTaskRequestV1` and `MaterialCandidateBundleV1` are **not** canonical top-level transport envelopes.

The future shared boundary, if authorized, must use OR-07:

```ts
SharedCapabilityRequest<MaterialProposalInputV1>
  -> SharedCapabilityResult<MaterialProposalOutputV1>
```

### 8.1 Typed input

```ts
interface MaterialProposalInputV1 {
  task: 'PREPARE_MATERIALS'
  mode: 'ADAPT_EXISTING' | 'CREATE_NEW'
  lessonSeed: {
    lessonRef?: string
    sectionRef?: string
    blockId?: string
    canonicalPlanCode?: 'CAN-PLAN-1' | 'CAN-PLAN-2' | 'CAN-PLAN-3'
    udaDocumentRef?: string
  }
  requestedRoles: readonly LessonMaterialRole[]
  constraints: Record<string, unknown>
  sourceArtifactRefs: readonly string[]
}
```

The seed is minimized context, not transferred authority. The provider cannot infer or write authoritative lesson relationships from it.

### 8.2 Typed output

```ts
interface MaterialProposalOutputV1 {
  proposalId: string
  items: readonly MaterialProposalItemV1[]
}

interface MaterialProposalItemV1 {
  candidateId: string
  suggestedRole?: LessonMaterialRole
  artifactKind: string
  audience: 'TEACHER' | 'STUDENT' | 'MIXED'
  title: string
  description?: string
  providerArtifactRef?: string
  previewRef?: string
  provenance: MaterialProposalProvenanceV1
}
```

Candidate items are transient proposal results. They are not canonical assets and do not own a persisted acceptance lifecycle.

### 8.3 Capability identity

This Docente OS document does not freeze a new canonical OR-07 capability ID.

An outcome-oriented shape such as:

```text
lesson.material.propose
```

is compatible with OR-07 naming, but it becomes canonical only after registration through the applicable TRAMA governed process/shared memory. Provider-specific IDs such as `DOS.STUDIO_ATLAS.MATERIAL_HANDOFF` are forbidden as canonical capability identity.

### 8.4 Decision boundary

OR-07 result state is `PROPOSAL`. Teacher acceptance is a separate Docente OS local domain command and cannot be embedded in the shared capability result.

## 9. Lifecycle: one persisted lifecycle, derived readiness

Do **not** persist a second lifecycle such as:

```text
CANDIDATE -> REVIEWED -> ACCEPTED -> AVAILABLE_FOR_LESSON
```

Canonical interpretation:

- external/local candidate: transient proposal result;
- teacher-edited/selected proposal: represented through existing local lesson-design semantics;
- `LessonDesignExtension`: `PROPOSED | MODIFIED | ACCEPTED | DISMISSED`;
- `AVAILABLE_FOR_LESSON`: derived state of the relevant `LessonPreparationManifest.materialSlots`;
- `USED`: TeachingSession/evidence, not a material acceptance state.

The existing exact-state preparation receipt/fingerprint invalidation remains the approval model; a new approval subsystem is not introduced.

## 10. Durable material identity

### 10.1 Rule

A material accepted for lesson use must resolve to a durable Docente OS identity before it can be considered ready.

Preferred target:

```ts
interface CanonicalMaterialRefV1 {
  kind: 'KNOWLEDGE_ASSET'
  assetId: string
  generationId?: string
  integrityDigest?: string
}
```

Exact implementation is deferred to MATERIAL-CORE-01, but the following invariant is fixed:

> provider identity is retained in provenance; it is not the canonical internal material identity.

### 10.2 Reuse

For `REUSE_EXISTING`, acceptance references an existing canonical Knowledge/Material asset. No duplicate archive is created.

### 10.3 Adapt/create

For `ADAPT_EXISTING` or `CREATE_NEW`, the accepted artifact must be materialized into the canonical Docente OS material/Knowledge pipeline (for example `knowledge_assets.asset_kind='GENERATED'` with an exact usable generation/revision) before lesson readiness can depend on it.

### 10.4 Deletion safety

A durable asset/revision referenced by accepted lesson material must not be silently deletable. MATERIAL-CORE-01 must make deletion fail closed or require an explicit detach/replace workflow before destructive removal.

A plain `LessonDesignExtension.source_ref='atlas:*'` or provider URL is insufficient for this guarantee.

## 11. Acceptance mapping into the canonical lesson model

Local acceptance must perform one coherent operation from teacher decision to canonical lesson state.

Target semantic result:

1. resolve/validate lesson context from existing persisted identities;
2. resolve the active CPRI source where required;
3. resolve/materialize the durable internal material reference;
4. resolve/validate `LessonMaterialRole`;
5. create/update the governed `LessonDesignExtension` representation;
6. mark the extension accepted only through the existing local acceptance semantics;
7. rebuild/read the `LessonPreparationManifest`;
8. observe the corresponding `materialSlots` state as `READY | NEEDS_REVIEW | PROPOSED | MISSING`;
9. never write an independent `AVAILABLE_FOR_LESSON` record.

The read-after-write source of truth is the canonical lesson-preparation composition, not a provider callback result.

## 12. Authoritative local write boundary

### 12.1 Existing identity, no invented lesson UUID

There is no persisted UUID `lesson_block` entity. `block_id` is contextual.

Therefore the future local command must be grounded in existing identities such as:

```text
section_id (annual_plan_sections.id)
block_id (B01..B33)
```

and derive/verify workspace, academic year and active canonical generation through authoritative server/database relations.

A conceptual application command may be shaped as:

```ts
acceptLessonMaterialProposal({
  sectionId,
  blockId,
  candidate,
  resolvedRole,
  idempotencyKey
})
```

This is not an RPC signature freeze. MATERIAL-CORE-01 must minimize caller-controlled authority and may use a DB function/repository boundary only after verifying the actual schema.

### 12.2 Resolve, do not trust

The write boundary must derive or verify, not trust from browser/provider payload:

- current authenticated actor;
- workspace membership/authorization;
- section workspace/year;
- logical CAN-PLAN for the section/grade;
- current governed CPRI binding when required;
- contextual block identity;
- durable internal material identity;
- material role mapping;
- dedupe/idempotency scope.

### 12.3 Transactional properties

Where a single operation spans multiple local writes, it must be atomic or fail closed with no partially accepted lesson state.

Semantic retry with identical canonical payload may return the prior acceptance. Conflicting payload under the same idempotency scope must fail closed.

Canonicalization used for conflict lookup must match persistence uniqueness semantics.

## 13. Provenance, derivation and rights

Proposal/accepted-material provenance must preserve, when applicable:

```ts
interface MaterialProposalProvenanceV1 {
  sourceArtifactRefs: readonly string[]
  derivationRefs: readonly string[]
  providerType?: string
  providerId?: string
  adapterId?: string
  adapterVersion?: string
  requestId?: string
  evidenceRefs: readonly string[]
  rightsState: 'KNOWN' | 'UNKNOWN' | 'RESTRICTED'
  licenseRef?: string
  attributionRequirements: readonly string[]
  integrityDigest?: string
}
```

Rules:

- reuse preserves source identity and applicable rights;
- adaptation preserves derivation lineage and attribution requirements;
- new creation still records incorporated sources/assets when present;
- unknown rights may permit a private draft under applicable policy but block any claim of publication readiness;
- publication remains a distinct governed action outside MATERIAL-ORCH acceptance.

## 14. Browser/deep-link transport is untrusted

Browser fragments/query payloads may carry minimized proposal/return data but are not authentic evidence.

Invariants:

- `source='studio-atlas'` does not prove origin;
- base64url encoding does not provide integrity;
- provider/browser data cannot become accepted state without server-side validation;
- governed cross-product execution, if later authorized, must bind result to OR-07 `requestId` + `evidenceRefs` or an equivalent governed server-verifiable receipt/digest;
- same-origin/allowed-origin checks remain necessary but are not provenance proof.

## 15. Officina materiali vs Studio Atlas

### Officina materiali

ADR-010 defines the general provider-neutral specialist artifact-production concept. It may use different engines/providers behind replaceable adapters. It owns no lesson/curricolo/editorial authority.

### Studio Atlas

ADR-020 defines Studio Atlas primarily for professional Atlas Pathway authoring. Its main contract is the Pathway Authoring Package.

Studio Atlas therefore **must not** become the universal material-production engine by convenience.

A Studio Atlas adapter may be introduced only for a capability explicitly compatible with/assigned to its governed product boundary. General material proposal/production remains provider-neutral and Officina-oriented.

## 16. UX contract

Primary entry:

**Prepara materiali**

Initial hierarchy:

1. show relevant available materials;
2. `Riutilizza`;
3. `Adatta`;
4. `Crea nuova`;
5. provider/tool choice only when necessary and authorized.

After a proposal result:

1. preview;
2. compare/select;
3. modify or discard;
4. verify/choose canonical lesson context if not already fixed;
5. explicit `Associa alla lezione` / equivalent teacher decision;
6. local canonical acceptance;
7. read-after-write from lesson-preparation state.

Provider naming is secondary UI detail, not the primary task label.

## 17. Runtime authorization

### 17.1 Current state

`DOS-A1` remains `RUNTIME_DEFERRED`. MATERIAL-ORCH v2 does not authorize cross-product runtime.

CONTAIN-01 deliberately revoked/blocked the legacy #692 Studio Atlas material write surfaces while preserving historical evidence.

### 17.2 Future shared capability

A future OR-07 provider binding must distinguish at least:

```text
supported
available
authorized
qualified
```

These are not equivalent.

### 17.3 Mutative boundary enforcement

When cross-product proposal runtime is eventually authorized, effective authorization must be checked at **every** relevant boundary, including:

- outbound invocation;
- return/callback ingestion;
- authoritative local acceptance if it consumes externally produced proposal evidence;
- any retry/replay path.

UI gating alone is insufficient.

### 17.4 Deployment configuration

A deploy flag may only narrow/technically enable an already-governed capability. It cannot turn `RUNTIME_DEFERRED` into authorization.

## 18. CPRI dependency and movement semantics

MATERIAL-CORE-01 depends on CPRI-01 where lesson context requires a canonical annual-plan generation.

The current contained v100 schema already preserves `canonical_plan_runtime_bindings`; existence of the table does not mean runtime mutation is authorized.

A future explicit binding movement from generation A to B must first produce an impact/revalidation decision covering:

- `annual_plan_block_progress`;
- `lesson_design_extensions`;
- `lesson_preparation_receipts`;
- `teaching_session_allocations`.

Required semantics:

- historical TeachingSession allocations remain immutable evidence;
- historical lesson-preparation receipts remain append-only evidence;
- current preparation becomes stale/requires revalidation where its generation-bound state no longer matches;
- accepted extensions from A do not silently disappear and do not silently carry forward to B;
- annual-plan progress from A is not silently copied/reset onto B;
- new TeachingSession allocations must validate against the governed CPRI binding rather than merely `knowledge_assets.current_generation_id` once CPRI becomes runtime authority.

CPRI-01 owns these semantics, not the material provider layer.

## 19. Migration/data readiness rules

Before any new schema change:

1. read the current runtime schema contract and migration lineage;
2. use the next free migration version from the exact baseline;
3. run read-only preflight against existing data when introducing stronger invariants;
4. classify `READY | BLOCKED` before promotion;
5. do not use migration execution as discovery;
6. preserve historical evidence; no cleanup by deletion to satisfy a new design;
7. retain schema provenance/drift checks established by CONTAIN-01.

## 20. Implementation decomposition

### 0 — CONTAIN-01

**Closed / integrated.** Schema provenance, legacy Atlas mutation containment and runtime release preflight are established through v100.

### 1 — MATERIAL-ORCH-01 design v2

This PR only. Documentation, architecture, implementation plan and independent review. No runtime.

### 2 — CPRI-01

Provider-neutral Docente OS runtime identity authority:

- adopt/reconcile the contained v100 CPRI baseline;
- repository-wide runtime-authority inventory guard;
- resolver;
- generation movement/revalidation semantics;
- migrate runtime consumers;
- preserve historical/provenance literals where they are evidence rather than runtime authority.

### 3 — MATERIAL-CORE-01

Local canonical material acceptance only:

- Knowledge/canonical material identity;
- `LessonDesignExtension` lifecycle;
- `LessonPreparationManifest.materialSlots` derivation;
- durable deletion/reference safety;
- no external provider runtime.

### 4 — MATERIAL-TASK-UX-01

Teacher-first orchestration:

- search/reuse first;
- `Riutilizza | Adatta | Crea nuova`;
- local/internal provider-independent fallback first;
- visible review/acceptance.

### 5 — MATERIAL-CAPABILITY-01

OR-07-compatible typed proposal capability:

- provider-neutral input/output only;
- `PROPOSE_ONLY`;
- `requestId`, evidence, provenance, stale/failure semantics;
- no write authority;
- no provider binding runtime unless separately authorized.

### 6 — Provider adapter slices

Separate per provider/capability. Studio Atlas only where its governed product boundary permits it; general artifact production remains Officina/provider-neutral.

### 7 — Governed runtime authorization

Explicit TRAMA decision + shared governed-memory update where applicable + exact-head certification + independent review + Human Review before activation.

## 21. Architecture readiness gate

Before leaving design/starting implementation, all must be true:

- canonical lesson-preparation foundation explicitly reused;
- no second persisted material lifecycle/store;
- accepted material maps to durable internal identity + `LessonDesignExtension` + `materialSlots`;
- material role separated from kind/audience;
- OR-07 reused instead of a parallel top-level cross-system protocol;
- provider-specific capability identity removed;
- Officina/Studio Atlas boundaries explicit;
- browser payload classified untrusted;
- rights/derivation provenance defined;
- local write boundary grounded in existing identities, no invented lesson UUID;
- CPRI movement semantics cover progress/extensions/receipts/sessions;
- repository-wide static runtime-authority guard required for CPRI;
- historical evidence preserved;
- `DOS-A1` still deferred;
- no runtime/schema/deploy mutation in this design PR;
- fresh independent review on the revised exact head has no relevant unresolved findings.

## 22. Acceptance criteria for MATERIAL-ORCH design v2

The design may be classified `ARCHITECTURE_READY` only when:

1. all five original Codex review findings are addressed in the documents;
2. all deep-audit findings B1–B10 are represented as invariants or explicit tranche ownership;
3. CPRI plan starts from the contained v100 schema reality, not from a fictional clean pre-0098 state;
4. no local document claims a new cross-system capability/handoff as canonically governed without TRAMA registration/shared-memory update;
5. PR #692 remains frozen reference only;
6. documentation CI is green on one exact head;
7. fresh independent review is clean;
8. Human Review, if required by the project process, refers to that same exact head.

Until then:

`IMPLEMENTATION_HOLD`.

## 23. Non-goals

This design does not:

- authorize Studio Atlas or Officina runtime;
- authorize DOS-A1;
- change curricolo authority;
- change CAN-PLAN content;
- create a new material table/store;
- create a new lesson entity;
- register a new canonical OR-07 capability ID;
- update TRAMA governed memory by itself;
- apply migrations;
- mutate Beta data;
- deploy code;
- merge PR #692 or #703 automatically;
- publish materials to Atlas;
- introduce student accounts, profiles or tracking.
