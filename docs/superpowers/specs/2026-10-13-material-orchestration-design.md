# MATERIAL-ORCH-01 — Governed Material Orchestration Design v2.1

**Status:** `DESIGN_REWORK / INDEPENDENT_REVIEW_REQUIRED / IMPLEMENTATION_HOLD`  
**Audit sources:**
- `docs/superpowers/checkpoints/2026-10-13-material-orch-01-architecture-audit.md`
- `docs/superpowers/checkpoints/2026-10-13-material-orch-01-deep-preimplementation-audit.md`
- `docs/superpowers/checkpoints/2026-10-13-material-orch-01-design-v2-rework-checkpoint.md`

**Current Docente OS baseline considered:** `develop@a2e8f46972b60914e3a554df3b6d3942b34029a1`  
**Containment baseline:** CONTAIN-01 + CONTAIN-01B integrated; runtime schema contract v100; legacy Studio Atlas material mutation contained.  
**Legacy/reference PR:** #692 remains `QUALIFIED_REFERENCE / ARCHITECTURE_FREEZE / NOT_INTEGRATION_CANDIDATE`.

## 1. Goal

Define a stable, provider-neutral architecture for preparing teaching materials in Docente OS without creating:

- a second lesson-material domain;
- a second source archive outside Knowledge;
- a second persisted acceptance lifecycle;
- a provider-owned source of truth;
- a parallel cross-system protocol;
- an implicit cross-product runtime authorization.

The target user task is **Prepara materiali**. The target architecture must reuse the canonical lesson-preparation foundation and preserve teacher authority end-to-end.

## 2. Binding references

This design is subordinate to existing contracts and decisions.

### Docente OS

- `docs/architecture/LESSON_PREPARATION_ORCHESTRATION_CANONICAL.md`
  - lesson preparation is composition/orchestration, not a competing domain;
  - reuse `NextLessonPreparation`, `LessonDesignExtension`, Knowledge/Material assets and `LessonPreparationManifest.materialSlots`;
  - provider-independent internal fallback first;
  - no second lesson-material model or Copilot frontdoor.
- `docs/architecture/CLASS_PREPARED_MATERIALS_CONTRACT.md`
  - existing pre-MATERIAL-ORCH path for class-prepared material;
  - currently stores `approvalState=PENDING_HUMAN | APPROVED` in `knowledge_assets.source_metadata`;
  - must be reconciled by MATERIAL-CORE-01 because metadata-only `APPROVED` cannot remain a second acceptance authority.

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
9. `LessonMaterialRole`, `artifactKind` and `audience` are separate semantic dimensions and must survive acceptance as typed state.
10. A provider locator is provenance, not durable internal material identity.
11. Every accepted material pins an immutable material revision; an `assetId` alone is never sufficient acceptance identity.
12. `ACCEPTED` is not equivalent to real use; use remains TeachingSession evidence.
13. Browser-return data is untrusted proposal input, not provenance evidence by itself.
14. Every mutative entrypoint enforces authorization at the write boundary; UI visibility is never sufficient.
15. CPRI is provider-neutral and separate from materials/providers.
16. A deploy flag can only restrict or technically enable a capability already authorized by governance; it cannot create authority.
17. Existing `source_metadata.approvalState=APPROVED` is legacy confirmation evidence during reconciliation, not a second permanent acceptance authority.
18. No personal student data is required for ordinary material preparation.
19. Every implementation tranche owns one primary architectural boundary.

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
| Material acceptance | teacher + Docente OS local domain command represented by canonical lesson state | provider, OR-07 result, legacy metadata flag alone |
| Durable accepted material identity | immutable Docente OS material revision reference | asset UUID alone, `atlas:*`, mutable URL, provider object id alone |
| Lesson readiness | `LessonPreparationManifest.materialSlots` | candidate bundle status, `source_metadata.approvalState` alone |
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
                +--> immutable Knowledge/canonical material revision
                +--> typed material binding persisted in LessonDesignExtension
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

```ts
type LessonMaterialArtifactKind =
  | 'PRESENTATION'
  | 'WORKSHEET'
  | 'GUIDE'
  | 'RUBRIC'
  | 'VISUAL'
  | 'ASSESSMENT'
  | 'OTHER'
```

`artifactKind` describes the produced object, not how it is used in the lesson.

### 7.3 Audience

```ts
type LessonMaterialAudience = 'TEACHER' | 'STUDENT' | 'MIXED'
```

`LessonMaterialRole`, `artifactKind` and `audience` must never be collapsed into one enum.

A presentation may map to `LIM_VIEW` or `MINI_DECK`; a rubric may map to `ASSESSMENT`; a guide may map to `TEACHER_BRIEF`. Mapping is a Docente OS semantic decision, not provider authority.

### 7.4 Accepted-state material binding

The transient candidate may be discarded only after the accepted extension contains enough typed state to reconstruct all canonical material slots without consulting provider-specific proposal state.

Target semantic payload:

```ts
interface LessonMaterialBindingV1 {
  schema: 'docente-os.lesson-material-binding.v1'
  role: LessonMaterialRole
  artifactKind: LessonMaterialArtifactKind
  audience: LessonMaterialAudience
  materialRef: CanonicalMaterialRefV1
  provenance: MaterialProposalProvenanceV1
}
```

MATERIAL-CORE-01 may persist this typed structure inside the existing `LessonDesignExtension.payload` or an equivalent canonical extension-owned typed representation; it must **not** create a second material acceptance store.

`LessonDesignExtension.kind` is not sufficient material-role authority. The current `TEACHER_RESOURCE -> TEACHER_BRIEF` / `STUDENT_RESOURCE -> STUDENT_HANDOUT` fallback covers only two of six roles and therefore must be completed/reconciled by MATERIAL-CORE-01.

After MATERIAL-CORE-01, `roleForExtension()` or its replacement must reconstruct all six canonical roles from the typed accepted material state. Legacy extension-kind fallback may remain only for explicitly classified historical extensions and must not be used for new canonical material acceptance.

## 8. Proposal capability: reuse OR-07, do not create a parallel envelope

`MaterialTaskRequestV1` and `MaterialCandidateBundleV1` are **not** canonical top-level transport envelopes.

The following typed shapes are **local design proposals only** until registered through the applicable TRAMA governed process. They do not create a canonical cross-system contract by appearing in this Docente OS document.

If authorized, the shared boundary must use OR-07:

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
  artifactKind: LessonMaterialArtifactKind
  audience: LessonMaterialAudience
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
- accepted material extension: contains a validated `LessonMaterialBindingV1`;
- `AVAILABLE_FOR_LESSON`: derived state of the relevant `LessonPreparationManifest.materialSlots`;
- `USED`: TeachingSession/evidence, not a material acceptance state.

The existing exact-state preparation receipt/fingerprint invalidation remains the approval model; a new approval subsystem is not introduced.

## 10. Immutable accepted material identity

### 10.1 Rule

A material accepted for lesson use must resolve to a durable **immutable revision** before it can be considered ready.

Target semantic contract:

```ts
type CanonicalMaterialRefV1 =
  | {
      kind: 'KNOWLEDGE_GENERATION'
      assetId: string
      generationId: string
      integrityDigest?: string
    }
  | {
      kind: 'IMMUTABLE_REVISION'
      assetId: string
      revisionRef: string
      integrityDigest: string
    }
```

An accepted `CanonicalMaterialRefV1` must always pin an immutable generation/revision. `assetId` alone is forbidden. `integrityDigest` is additionally required when the underlying revision identifier cannot independently guarantee content immutability.

Provider identity is retained in provenance; it is not the canonical internal material identity.

### 10.2 Reuse

`REUSE_EXISTING` does **not** relax immutability. Acceptance must pin the exact reusable revision/generation the teacher reviewed.

If an existing external/provider-backed Knowledge asset has only a mutable URL/current pointer and cannot prove an immutable revision, it may be discovered/previewed but cannot become `READY` until Docente OS materializes or records an immutable canonical revision/snapshot.

No duplicate source archive is created merely for reuse; the immutable revision belongs to the existing canonical Knowledge/material pipeline.

### 10.3 Adapt/create

For `ADAPT_EXISTING` or `CREATE_NEW`, the accepted artifact must be materialized into the canonical Docente OS material/Knowledge pipeline (for example `knowledge_assets.asset_kind='GENERATED'` with an exact usable generation/revision) before lesson readiness can depend on it.

### 10.4 Deletion safety

A durable asset/revision referenced by accepted lesson material must not be silently deletable. MATERIAL-CORE-01 must make deletion fail closed or require an explicit detach/replace workflow before destructive removal.

A plain `LessonDesignExtension.source_ref='atlas:*'`, provider URL, mutable `source_locator` or asset UUID without revision identity is insufficient.

## 11. Acceptance mapping into the canonical lesson model

Local acceptance must perform one coherent operation from teacher decision to canonical lesson state.

Target semantic result:

1. resolve/validate lesson context from existing persisted identities;
2. resolve the active CPRI source where required;
3. resolve/materialize the immutable internal material revision;
4. resolve/validate `LessonMaterialRole`, `artifactKind` and `audience` independently;
5. persist the typed `LessonMaterialBindingV1` as extension-owned accepted state;
6. create/update the governed `LessonDesignExtension` representation;
7. mark the extension accepted only through the existing local acceptance semantics;
8. rebuild/read the `LessonPreparationManifest`;
9. derive the corresponding `materialSlots` state as `READY | NEEDS_REVIEW | PROPOSED | MISSING` from the typed extension state;
10. never write an independent `AVAILABLE_FOR_LESSON` record.

The read-after-write source of truth is the canonical lesson-preparation composition, not a provider callback result or Knowledge metadata flag.

### 11.1 Reconcile the existing prepared-class material path

Current product behavior predating MATERIAL-ORCH must be explicitly reconciled:

```text
knowledge_assets.source_metadata.approvalState
  PENDING_HUMAN | APPROVED
```

and `selectPreparedClassMaterials()` currently maps metadata `APPROVED` directly to the UI label `Confermato` without a `LessonDesignExtension`/`materialSlots` representation.

MATERIAL-CORE-01 therefore owns a mandatory reconciliation/migration slice:

1. inventory every `CLASS_LESSON_MATERIAL` using `approvalState`;
2. preserve original metadata as historical/import provenance;
3. classify `PENDING_HUMAN` as **prepared/discovery state**, not accepted lesson state;
4. classify legacy `APPROVED` as **legacy confirmation evidence requiring canonical reconciliation**, not permanent acceptance authority;
5. never silently fabricate missing immutable revision, block, projection, CPRI or actor/evidence context;
6. where exact canonical lesson context + immutable revision + acceptance evidence are sufficient, materialize the equivalent typed `LessonDesignExtension` through a governed reconciliation path;
7. where those requirements are not sufficient, surface `REVALIDATION_REQUIRED` / teacher re-association rather than silently carrying forward `APPROVED`;
8. migrate `selectPreparedClassMaterials()` and any equivalent consumer so canonical accepted/`Confermato` state comes from lesson composition/accepted typed extension, not `source_metadata.approvalState`;
9. after reconciliation, metadata `APPROVED` may remain only as historical provenance and must not independently make a material `READY` or canonically `Confermato`.

`PRE_CANONICAL_DIAGNOSTIC` resources that lack a canonical lesson block remain valid prepared/supporting Knowledge resources, but cannot be invented into a block-bound accepted extension. They require explicit association with an actual lesson before canonical acceptance.

### 11.2 No acceptance-state loss

The reconciliation must preserve user intent without overstating evidence:

- never delete legacy confirmation metadata;
- never downgrade historical evidence to “never confirmed”;
- never interpret a legacy confirmation as proof of a lesson/block/revision that was not recorded;
- make any required teacher revalidation explicit and bounded.

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
- immutable internal material revision;
- material role/kind/audience mapping;
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
- accepted typed extension state preserves the provenance required to explain the immutable material revision;
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

Existing legacy prepared materials remain discoverable during reconciliation, but metadata-only `APPROVED` cannot be presented indefinitely as canonical acceptance after MATERIAL-CORE migration.

Provider naming is secondary UI detail, not the primary task label.

## 17. Runtime authorization

### 17.1 Current state

`DOS-A1` remains `RUNTIME_DEFERRED`. MATERIAL-ORCH v2.1 does not authorize cross-product runtime.

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

Before any new schema or stronger persistence invariant:

1. read the current runtime schema contract and migration lineage;
2. use the next free migration version from the exact baseline;
3. run read-only preflight against existing data;
4. inventory legacy prepared/confirmed material state before changing acceptance semantics;
5. classify `READY | BLOCKED` before promotion;
6. do not use migration execution as discovery;
7. preserve historical evidence; no cleanup by deletion to satisfy a new design;
8. retain schema provenance/drift checks established by CONTAIN-01.

## 20. Implementation decomposition

### 0 — CONTAIN-01

**Closed / integrated.** Schema provenance, legacy Atlas mutation containment and runtime release preflight are established through v100.

### 1 — MATERIAL-ORCH-01 design v2.1

This PR only. Documentation, architecture, implementation plans and independent review. No runtime.

### 2 — CPRI-01

Provider-neutral Docente OS runtime identity authority:

- adopt/reconcile the contained v100 CPRI baseline;
- repository-wide runtime-authority inventory guard;
- resolver;
- generation movement/revalidation semantics;
- migrate runtime consumers;
- preserve historical/provenance literals where they are evidence rather than runtime authority.

### 3 — MATERIAL-CORE-01

Local canonical material acceptance only. This tranche must include **all** of the following before it can be considered complete:

- read-only inventory of current `CLASS_LESSON_MATERIAL` `approvalState` data and consumers;
- explicit reconciliation/retirement of metadata-only `APPROVED` as current acceptance authority;
- migration of `selectPreparedClassMaterials()` and equivalent consumers to canonical lesson-composition acceptance semantics;
- immutable Knowledge/canonical material revision identity for every accepted material, including reuse;
- typed `LessonMaterialBindingV1` persisted as extension-owned state;
- all six canonical `LessonMaterialRole` values reconstructable from accepted extension state;
- separate persistence of role, artifact kind and audience semantics;
- `LessonDesignExtension` lifecycle reuse;
- `LessonPreparationManifest.materialSlots` derivation from typed accepted state;
- legacy extension/resource compatibility classified explicitly without allowing new writes into legacy semantics;
- durable deletion/reference safety;
- no external provider runtime.

MATERIAL-CORE-01 is not complete if any runtime surface can still call a metadata-only `APPROVED` resource canonically `Confermato` while bypassing accepted extension/material-slot composition.

### 4 — MATERIAL-TASK-UX-01

Teacher-first orchestration starts only after MATERIAL-CORE reconciliation:

- search/reuse first;
- `Riutilizza | Adatta | Crea nuova`;
- local/internal provider-independent fallback first;
- visible review/acceptance;
- legacy-revalidation UX only where MATERIAL-CORE classified historical confirmation as insufficient for automatic canonical reconciliation.

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
- existing metadata-only `APPROVED` path explicitly reconciled and assigned to MATERIAL-CORE consumer migration;
- accepted material maps to an immutable internal revision + typed `LessonDesignExtension` material binding + `materialSlots`;
- all six material roles survive acceptance and are reconstructable after transient proposal state is discarded;
- material role separated from kind/audience in persisted accepted state;
- OR-07 reused instead of a parallel top-level cross-system protocol;
- proposed material capability types explicitly local/noncanonical until TRAMA registration;
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

## 22. Acceptance criteria for MATERIAL-ORCH design v2.1

The design may be classified `ARCHITECTURE_READY` only when:

1. all five original Codex review findings are addressed in the documents;
2. all deep-audit findings B1–B10 are represented as invariants or explicit tranche ownership;
3. the fresh-review P1 findings on legacy confirmed-material reconciliation, typed six-role persistence and immutable accepted revision are addressed;
4. CPRI plan starts from the contained v100 schema reality, not from a fictional clean pre-0098 state;
5. MATERIAL-CORE has an explicit execution plan that retires metadata-only current acceptance without deleting historical evidence;
6. no local document claims a new cross-system capability/handoff as canonically governed without TRAMA registration/shared-memory update;
7. PR #692 remains frozen reference only;
8. documentation CI is green on one exact head;
9. fresh independent review of that revised exact head is clean;
10. Human Review, if required by the project process, refers to that same exact head.

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
