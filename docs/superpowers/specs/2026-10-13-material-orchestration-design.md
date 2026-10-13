# MATERIAL-ORCH-01 — Governed Material Orchestration Design v2.2

**Status:** `DESIGN_REWORK / THIRD_FRESH_REVIEW_REQUIRED / IMPLEMENTATION_HOLD`  
**Current Docente OS baseline considered:** `develop@a2e8f46972b60914e3a554df3b6d3942b34029a1`  
**Containment baseline:** CONTAIN-01 + CONTAIN-01B integrated; runtime schema contract v100; legacy Studio Atlas mutation contained.  
**Legacy/reference PR:** #692 remains `QUALIFIED_REFERENCE / ARCHITECTURE_FREEZE / NOT_INTEGRATION_CANDIDATE`.

## 1. Goal

Define one stable, provider-neutral architecture for preparing teaching materials in Docente OS without creating a second lesson-material domain, archive, acceptance lifecycle, provider-owned source of truth, parallel handoff protocol, or implicit cross-product runtime authorization.

The product task is **Prepara materiali**. The canonical path remains:

```text
Knowledge/canonical material content
  -> LessonDesignExtension
  -> LessonPreparationManifest.materialSlots
  -> TeachingSession evidence of actual use
```

## 2. Binding references

### Docente OS

- `docs/architecture/LESSON_PREPARATION_ORCHESTRATION_CANONICAL.md`
  - lesson preparation is composition, not a competing domain;
  - reuse `NextLessonPreparation`, `LessonDesignExtension`, Knowledge/Material assets and `LessonPreparationManifest.materialSlots`;
  - internal/provider-independent fallback first;
  - no second lesson-material model.
- `docs/architecture/CLASS_PREPARED_MATERIALS_CONTRACT.md`
  - pre-existing class-material path uses `knowledge_assets.source_metadata.approvalState`;
  - this is legacy evidence to reconcile, not a permanent second acceptance authority.

### TRAMA

- ADR-010 — Officina materiali is the general provider-neutral specialist production boundary; reuse before generation; Docente OS remains teacher workspace/orchestrator; no runtime authorization.
- ADR-020 — Studio Atlas is a separable product primarily for Atlas Pathway authoring; lesson/material deep links do not transfer lesson authority; no runtime authorization.
- R4-P1 — `Riutilizza | Adatta | Crea nuova`; specialist engines propose, do not write canonical lesson state; explicit teacher review; rights/lineage/accessibility/quality gates.
- OR-07 — provider-neutral shared capability envelope; `requestId`, authority context, provider/adapter provenance, evidence refs; only `READ_ONLY | PROPOSE_ONLY`; no write authority.

This local document does not register a new governed cross-system contract. Any future semantic handoff change must follow the shared governed-memory process in `AGENTS.md`.

## 3. Non-negotiable invariants

1. Docente OS models **Prepara materiali**, not a provider.
2. Reuse/adaptation precede generation.
3. `LessonPreparationManifest.materialSlots` is the canonical lesson-material readiness composition.
4. `LessonDesignExtension` remains the single persisted proposal/acceptance lifecycle: `PROPOSED | MODIFIED | ACCEPTED | DISMISSED`.
5. Knowledge/Material assets remain the durable source pipeline; no second material archive.
6. Provider/local generation output is a proposal until explicit teacher acceptance through a local Docente OS domain action.
7. OR-07 execution, if later governed, remains `PROPOSE_ONLY`; it never performs acceptance.
8. `LessonMaterialRole`, `artifactKind`, and `audience` remain distinct typed dimensions after acceptance.
9. Every accepted material is bound to exact content identity: **an immutable revision identifier plus a mandatory content digest, or an equivalent canonical snapshot whose content digest is mandatory**.
10. `assetId`, `generationId`, URL, provider object ID, or `atlas:*` alone are never sufficient proof of accepted content.
11. Current Knowledge generation identity is not currently content-immutable: `knowledge_documents` and `knowledge_units` can be updated in-place. Therefore a Knowledge `generationId` must always be paired with a verified content digest until the database provides content immutability/versioning strong enough to supersede that rule through a separately reviewed design change.
12. Any post-acceptance content change that causes digest mismatch makes the accepted material `STALE/NEEDS_REVIEW`; it never silently changes what the teacher accepted.
13. `ACCEPTED` is not actual use; use remains TeachingSession evidence.
14. Browser/deep-link payload is untrusted proposal input, never provenance proof by itself.
15. Every mutative boundary enforces authorization server-side/DB-side; UI gating is not authority.
16. CPRI is provider-neutral and separate from material providers.
17. Existing metadata `approvalState=APPROVED` is legacy confirmation evidence during reconciliation, not current canonical acceptance authority.
18. `DOS-A1` remains `RUNTIME_DEFERRED`.
19. No student identity/tracking is required for ordinary material preparation.

## 4. Authority matrix

| Concern | Authority | Non-authority |
|---|---|---|
| Curricolo di istituto | Arena / governed contracts | Docente OS, providers |
| Logical annual-plan identity | `CAN-PLAN-x` | Knowledge UUIDs |
| Runtime CAN-PLAN source | governed CPRI binding | static UUIDs, metadata scans |
| Lesson context/decision | Docente OS + teacher | provider/callback |
| Specialist artifact production | Officina/provider-neutral boundary | Studio Atlas as universal engine |
| Atlas Pathway authoring | Studio Atlas under ADR-020 | lesson ownership |
| Material acceptance | teacher + local Docente OS canonical write | provider result, OR-07 result, metadata flag alone |
| Accepted content identity | canonical ref + mandatory verified content digest | asset/generation/URL/provider ID alone |
| Lesson readiness | `LessonPreparationManifest.materialSlots` | candidate status or metadata `APPROVED` alone |
| Actual use | TeachingSession/evidence | acceptance flag |
| Cross-product authorization | TRAMA governance | env var/provider availability/browser source field |

## 5. User/task flow

```text
UDA / lesson / NextLessonPreparation
  -> PREPARE_MATERIALS
      -> discover existing relevant materials
          -> RIUTILIZZA
          -> ADATTA
      -> CREA NUOVA only when needed
          -> provider-neutral proposal boundary
  -> teacher preview/review
  -> local explicit acceptance
      -> resolve/materialize exact canonical content
      -> compute mandatory content digest
      -> persist typed LessonMaterialBinding in LessonDesignExtension
      -> read back LessonPreparationManifest.materialSlots
  -> lesson use -> TeachingSession evidence
```

No provider can skip local teacher review/acceptance.

## 6. Material semantics

### 6.1 Role

```ts
type LessonMaterialRole =
  | 'TEACHER_BRIEF'
  | 'LIM_VIEW'
  | 'STUDENT_HANDOUT'
  | 'MINI_DECK'
  | 'VISUAL_AID'
  | 'ASSESSMENT'
```

### 6.2 Artifact kind

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

### 6.3 Audience

```ts
type LessonMaterialAudience = 'TEACHER' | 'STUDENT' | 'MIXED'
```

These dimensions never collapse into one enum. A provider may suggest them; Docente OS validates/resolves canonical values before acceptance.

## 7. Exact accepted-content identity

### 7.1 Digest contract

Every accepted material persists a digest object:

```ts
interface MaterialContentDigestV1 {
  algorithm: 'SHA-256'
  canonicalization: 'docente-os.material-content.v1'
  value: string
}
```

The implementation must define one deterministic canonicalization for the exact content graph rendered/used as the accepted material. It must include all content-bearing components that can change the teacher-visible artifact, including applicable document/unit payloads and referenced binary/object content; deterministic ordering and normalization are part of the v1 canonicalization contract.

A digest computed from IDs/metadata alone is invalid.

### 7.2 Canonical material reference

```ts
type CanonicalMaterialRefV1 =
  | {
      kind: 'KNOWLEDGE_GENERATION'
      assetId: string
      generationId: string
      contentDigest: MaterialContentDigestV1
    }
  | {
      kind: 'IMMUTABLE_REVISION'
      assetId: string
      revisionRef: string
      contentDigest: MaterialContentDigestV1
    }
```

The digest is mandatory in both variants.

`KNOWLEDGE_GENERATION` means: “this asset/generation plus this exact verified content digest”. It does **not** claim the current Knowledge schema makes generation content immutable.

If future schema work makes generation content physically immutable/versioned, removing or changing this digest invariant requires an explicit design review; it is not an implementation convenience.

### 7.3 Readiness verification

A material can be `READY` only when the current resolved content for the accepted ref recomputes to the stored digest.

```text
digest match       -> eligible for READY (subject to other gates)
digest mismatch    -> STALE / NEEDS_REVIEW
digest unavailable -> NEEDS_REVIEW / fail closed
referenced revision missing -> NEEDS_REVIEW / fail closed
```

The accepted extension is never silently retargeted to changed content.

### 7.4 Reuse

`REUSE_EXISTING` does not relax exact-content identity. The teacher accepts the exact content they reviewed, represented by mandatory digest-bound canonical ref.

A mutable provider URL/current pointer may be discovered/previewed, but cannot become READY until Docente OS can bind it to exact canonical content and digest.

### 7.5 Adapt/create

Adapted/new material must be materialized into the canonical Knowledge/material pipeline before acceptance readiness and must receive the same mandatory digest-bound reference.

## 8. Accepted extension-owned material binding

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

The binding is persisted as extension-owned canonical state, preferably in validated `LessonDesignExtension.payload` or an equivalent existing extension representation. It does not justify a new acceptance table/store.

The transient candidate can be discarded only after the binding contains everything required to reconstruct lesson-material slots without provider state.

Current `roleForExtension()` maps only `TEACHER_RESOURCE -> TEACHER_BRIEF` and `STUDENT_RESOURCE -> STUDENT_HANDOUT`; that is legacy compatibility only. New material acceptance must reconstruct all six roles from `LessonMaterialBindingV1`.

## 9. Lifecycle and readiness

Do not persist a parallel lifecycle such as:

```text
CANDIDATE -> REVIEWED -> ACCEPTED -> AVAILABLE_FOR_LESSON
```

Canonical semantics:

- candidate = transient proposal;
- extension lifecycle = existing `LessonDesignExtension` states;
- accepted material = `ACCEPTED` extension with valid typed material binding;
- READY/NEEDS_REVIEW/PROPOSED/MISSING = derived material-slot state;
- content digest mismatch after acceptance = `STALE/NEEDS_REVIEW` through canonical preparation invalidation/readiness semantics;
- USED = TeachingSession evidence.

Existing exact-state preparation receipt/fingerprint invalidation remains; no second approval subsystem is introduced.

## 10. Existing prepared-class material reconciliation

Current legacy behavior:

```text
knowledge_assets.source_metadata.approvalState
  PENDING_HUMAN | APPROVED
```

and `selectPreparedClassMaterials()` maps metadata `APPROVED` directly to `Confermato`.

MATERIAL-CORE-01 must therefore:

1. inventory every `CLASS_LESSON_MATERIAL` row and every runtime consumer of `approvalState`;
2. preserve original metadata as historical/import provenance;
3. classify `PENDING_HUMAN` as prepared/discovery state, not accepted lesson state;
4. classify legacy `APPROVED` as legacy confirmation evidence requiring canonical reconciliation;
5. never fabricate missing immutable content identity, block, projection, CPRI, actor, or evidence context;
6. automatically reconcile only when exact lesson context, mandatory digest-bound content identity, and sufficient acceptance evidence are available;
7. otherwise produce bounded `REVALIDATION_REQUIRED`/teacher re-association;
8. migrate `selectPreparedClassMaterials()` and equivalent consumers so canonical `Confermato`/READY comes from accepted typed extension + lesson composition, not metadata `APPROVED` alone;
9. retain metadata APPROVED only as provenance after reconciliation.

`PRE_CANONICAL_DIAGNOSTIC` without a real lesson/block remains supporting/prepared material; it cannot be invented into a block-bound accepted extension.

## 11. Local acceptance boundary

There is no persisted UUID `lesson_block`. Context must use existing identity, beginning with:

```text
annual_plan_sections.id
+ contextual block_id (B01..B33)
```

and authoritative server/DB relations must derive/verify actor, workspace/year, logical CAN-PLAN, CPRI source where required, block context, canonical content identity/digest, role/kind/audience, and idempotency scope.

Conceptual command only:

```ts
acceptLessonMaterialProposal({
  sectionId,
  blockId,
  candidateOrExistingMaterial,
  resolvedRole,
  idempotencyKey,
})
```

This is not an RPC signature freeze.

Where acceptance spans multiple local writes, it is atomic/fail-closed. Identical semantic retry may return the existing acceptance; conflicting payload under the same idempotency scope fails closed.

## 12. Acceptance mapping

One coherent local acceptance operation must:

1. resolve/verify lesson context;
2. resolve active CPRI source where required;
3. resolve/materialize exact canonical material content;
4. compute and verify `MaterialContentDigestV1` over that content;
5. resolve/validate role, artifact kind, and audience independently;
6. persist `LessonMaterialBindingV1` as extension-owned state;
7. apply existing extension acceptance semantics;
8. rebuild/read `LessonPreparationManifest`;
9. derive material-slot readiness and verify stored content digest before READY;
10. never create an independent `AVAILABLE_FOR_LESSON` record.

Read-after-write authority is the canonical lesson-preparation composition, not provider callback or Knowledge metadata flag.

## 13. Provenance, derivation, rights

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
}
```

Rules:

- reuse preserves source identity/rights;
- adaptation preserves derivation lineage/attribution;
- new creation records incorporated sources where present;
- provenance explains the digest-bound accepted content;
- unknown rights may permit private draft under policy but block publication-readiness claims;
- publication is a separate governed action.

## 14. Provider-neutral proposal capability

Local material task intent:

```ts
type MaterialTaskIntent = 'PREPARE_MATERIALS'
type MaterialTaskMode = 'REUSE_EXISTING' | 'ADAPT_EXISTING' | 'CREATE_NEW'
```

This is not a cross-system wire protocol.

`MaterialTaskRequestV1` / `MaterialCandidateBundleV1` are not canonical top-level handoff contracts.

Any future governed shared proposal must use OR-07:

```ts
SharedCapabilityRequest<MaterialProposalInputV1>
  -> SharedCapabilityResult<MaterialProposalOutputV1>
```

The typed input/output definitions in this Docente OS design are local proposals only until registered through the applicable TRAMA governance/shared-memory process. Provider-specific capability IDs such as `DOS.STUDIO_ATLAS.MATERIAL_HANDOFF` are forbidden as canonical IDs.

OR-07 result remains `PROPOSAL`; teacher acceptance remains local Docente OS write.

## 15. Browser/deep-link trust

Browser fragment/query payload may transport minimized proposal data but is untrusted.

- `source='studio-atlas'` does not prove origin;
- base64url does not prove integrity;
- same-origin/allowed-origin is necessary but not provenance proof;
- provider/browser data cannot become accepted state without authoritative validation;
- future governed cross-product execution must bind results to OR-07 `requestId` + `evidenceRefs` or equivalent server-verifiable receipt/digest.

## 16. Officina materials vs Studio Atlas

**Officina materials:** general provider-neutral specialist artifact-production concept under ADR-010; replaceable adapters; no lesson/curricolo/editorial authority.

**Studio Atlas:** professional Atlas Pathway authoring product under ADR-020; primary contract Pathway Authoring Package; not the universal material engine.

A Studio Atlas adapter may exist only for a capability explicitly compatible with its governed boundary. General material proposal/production remains provider-neutral/Officina-oriented.

## 17. Runtime authorization

Current state:

```text
DOS-A1 = RUNTIME_DEFERRED
```

This design authorizes no cross-product runtime.

Future shared capability must distinguish supported / available / authorized / qualified. UI availability or deploy config cannot substitute for governance.

Effective authorization must be enforced at outbound invocation, return ingestion, local acceptance of external proposal evidence, and retry/replay boundaries.

## 18. CPRI dependency

MATERIAL-CORE depends on CPRI-01 wherever lesson context requires canonical annual-plan generation.

CPRI starts from contained runtime-schema v100; it does not recreate 0098.

Binding movement A→B requires explicit impact/revalidation covering:

- `annual_plan_block_progress`;
- `lesson_design_extensions`;
- `lesson_preparation_receipts`;
- `teaching_session_allocations`.

Historical allocations/receipts remain immutable evidence. Extensions/progress do not silently carry forward. Current preparation becomes stale/revalidation-required where generation-bound state changes. New TeachingSession allocations must validate against governed CPRI semantics rather than only `knowledge_assets.current_generation_id` once CPRI is runtime authority.

The static-authority inventory/guard is repository-wide and preserves only explicitly classified historical/provenance/forensic literals.

## 19. Data/schema readiness

Before stronger persistence/schema invariants:

1. read current runtime schema contract/lineage;
2. use next free migration version on exact baseline;
3. run read-only preflight against existing data;
4. inventory legacy prepared/confirmed state;
5. classify `READY | BLOCKED` before promotion;
6. never use migration execution as discovery;
7. preserve historical evidence;
8. retain CONTAIN-01 schema provenance/drift protection.

## 20. Implementation order

```text
0 CONTAIN-01                CLOSED
1 MATERIAL-ORCH design v2.2 CURRENT / REVIEW REQUIRED
2 CPRI-01                   HOLD until architecture gate clean
3 MATERIAL-CORE-01          HOLD
4 MATERIAL-TASK-UX-01       HOLD
5 MATERIAL-CAPABILITY-01    HOLD
6 provider adapter slices   HOLD
7 governed runtime auth     HOLD
```

### MATERIAL-CORE-01 mandatory scope

Before it is complete it must provide:

- read-only inventory of legacy class-material approval data/consumers;
- retirement of metadata-only `APPROVED` as current acceptance authority;
- migration of `selectPreparedClassMaterials()` and equivalent consumers;
- mandatory digest-bound exact content identity for every accepted material including reuse;
- deterministic canonical-content digest algorithm and verification;
- in-place mutation detection for Knowledge document/unit content;
- typed `LessonMaterialBindingV1` as extension-owned state;
- all six roles reconstructable in `materialSlots`;
- distinct role/kind/audience persistence;
- deletion/reference safety;
- no external provider runtime.

MATERIAL-CORE is not complete if any metadata-only APPROVED resource is canonically `Confermato`, any accepted ref lacks content digest, or in-place content mutation can remain READY silently.

## 21. Architecture readiness gate

All must be true before implementation begins:

- canonical Knowledge → `LessonDesignExtension` → `materialSlots` path only;
- no second persisted material lifecycle/store;
- legacy metadata approval reconciliation explicitly planned;
- accepted content reference always includes mandatory verified digest;
- Knowledge-generation refs have in-place-mutation detection, not just generation-pointer tracking;
- all six roles persist/reconstruct from typed accepted state;
- role/kind/audience remain distinct;
- OR-07 reused for future proposal capability and local types remain noncanonical until governed registration;
- provider-specific canonical capability ID absent;
- Officina/Studio Atlas split explicit;
- browser input untrusted;
- rights/derivation provenance defined;
- write boundary uses existing lesson identity and derives authority server-side;
- CPRI v100/revalidation/repository-wide migration semantics explicit;
- historical evidence preserved;
- `DOS-A1` deferred;
- PR remains docs-only;
- fresh independent review on final exact head has no unresolved relevant finding.

## 22. Acceptance criteria

MATERIAL-ORCH may be classified `ARCHITECTURE_READY` only when:

1. five original review findings are addressed;
2. deep-audit B1–B10 are covered;
3. first fresh-review P1s are covered: legacy confirmation reconciliation, typed six-role persistence, immutable accepted content;
4. second fresh-review P1 is covered: Knowledge-generation accepted identity cannot rely on `generationId` with optional digest; digest is mandatory and in-place content mutation is explicitly tested/invalidates readiness;
5. CPRI plan starts from contained v100;
6. MATERIAL-CORE plan covers canonical reconciliation/digest verification/reference safety;
7. no local document claims new governed cross-system authority;
8. PR #692 remains frozen reference;
9. documentation CI is green on one exact head;
10. fresh independent review of that final exact head is clean;
11. applicable Human Review refers to that same exact head.

Until then:

`IMPLEMENTATION_HOLD`.

## 23. Non-goals

This design does not authorize Studio Atlas/Officina runtime, DOS-A1, new curricolo authority, new material store, new lesson entity, new canonical OR-07 capability ID, migrations, Beta mutation, deployment, auto-merge, Atlas publication, student accounts, or tracking.
