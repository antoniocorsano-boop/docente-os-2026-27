# MATERIAL-ORCH-01 — Deep Pre-Implementation Audit

**Date:** 2026-10-13  
**Scope:** pre-implementation architecture/runtime/data audit  
**Docente OS baseline:** `develop@7ac09a8795d93cc9a950083cda8b01d5d1407257`  
**MATERIAL-ORCH design head inspected:** `29f10bbb28625c87405b3eedb9e69e42799128d7`  
**Legacy/reference PR:** #692 @ `f17cb2ca743cce33f2b8cafe8be6b6c58dd2d8d5`  
**Decision:** `REWORK_REQUIRED / RUNTIME_CONTAINMENT_REQUIRED / BETA_SCHEMA_RECONCILIATION_REQUIRED`

## Purpose

This checkpoint performs the additional pre-implementation verification requested before starting CPRI or MATERIAL-CORE. It extends the first MATERIAL-ORCH audit and the independent Codex review with direct checks against:

- Docente OS canonical lesson-preparation contracts;
- existing domain/storage lifecycle;
- current `develop` runtime consumers;
- live Beta Supabase schema and data;
- live Render preview surfaces;
- TRAMA cross-product governance;
- OR-07 shared-capability contracts;
- transport integrity and runtime authorization boundaries.

No runtime, schema, deployment, service or data mutation is authorized or performed by this audit.

## A. Confirmed review findings

The five findings raised by the independent review of PR #703 are confirmed:

1. Accepted material must flow through the canonical Knowledge + LessonPreparationManifest/materialSlots composition; no parallel material store is allowed.
2. A new Studio Atlas ↔ Docente OS protocol cannot become canonical locally without the required shared-governance decision.
3. A pinned CPRI binding conflicts with the existing TeachingSession allocation invariant that requires `knowledge_assets.current_generation_id`.
4. CPRI migration inventory must be repository-wide; active writers/readers still consume static `CANONICAL_PLAN_SOURCES` UUIDs.
5. `p_lesson_block_id uuid` is not a real authoritative entity in the current schema; `block_id` is contextual and must remain grounded in existing persisted identities.

## B. Additional findings from the deep audit

### B1 — Existing lesson-material lifecycle must be reused

`LessonDesignExtension` already has the governed lifecycle:

`PROPOSED | MODIFIED | ACCEPTED | DISMISSED`

and `LessonPreparationManifest.materialSlots` already derives lesson readiness from canonical resources and accepted/proposed extensions.

The proposed independent lifecycle:

`CANDIDATE → REVIEWED → ACCEPTED → AVAILABLE_FOR_LESSON`

must not become a second persisted lifecycle.

Canonical interpretation:

- provider/capability candidate = transient proposal result;
- teacher-selected candidate = governed LessonDesignExtension / canonical artifact reference;
- `AVAILABLE_FOR_LESSON` = derived material-slot state, not an independent persisted authority;
- actual use remains TeachingSession evidence.

### B2 — Material semantic role is missing from the proposed contract

`artifactKind` and `audience` are useful but insufficient to map a material into the canonical lesson model.

The existing canonical roles are:

- `TEACHER_BRIEF`
- `LIM_VIEW`
- `STUDENT_HANDOUT`
- `MINI_DECK`
- `VISUAL_AID`
- `ASSESSMENT`

The current extension mapping only maps `TEACHER_RESOURCE → TEACHER_BRIEF` and `STUDENT_RESOURCE → STUDENT_HANDOUT`.

Consequently presentation, guide and rubric can collapse into the same teacher-brief role. A provider may suggest a role, but Docente OS must resolve/validate the canonical `LessonMaterialRole` independently of `artifactKind` and `audience`.

### B3 — CPRI binding movement requires an explicit revalidation policy

Four authoritative/historical tables are generation-bound:

- `annual_plan_block_progress`;
- `lesson_design_extensions`;
- `lesson_preparation_receipts`;
- `teaching_session_allocations`.

Historical rows must not be rewritten when the active CPRI binding changes.

A binding movement must therefore produce an explicit impact/revalidation decision. In particular:

- past TeachingSession allocations remain historical evidence;
- preparation receipts remain append-only historical evidence;
- current preparation must become stale until revalidated;
- accepted extensions from the previous generation must not silently disappear or carry forward;
- annual-plan progress must not silently reset or be copied to the new generation.

### B4 — Current exact-state approval invalidation is already correct

The existing lesson page recalculates the complete preparation fingerprint and marks an existing receipt `STALE` when current extension/baseline state differs.

This behavior must be preserved. No new approval model is required.

### B5 — Generated artifacts can use Knowledge, but durability needs a typed internal reference

`knowledge_assets` already supports `asset_kind='GENERATED'`; a second artifact archive is unnecessary.

However, `LessonDesignExtension.source_ref` is currently plain text. A generated/external artifact referenced only as `atlas:*` or a provider locator is not protected as a durable internal asset reference.

Accepted material must therefore resolve to a durable Docente OS identity — preferably a generated/reused `KnowledgeAsset` or an equally canonical internal artifact reference — with provider identity retained only in provenance.

Deletion policy must fail closed for an artifact still referenced by accepted lesson material. The current user-owned Knowledge deletion function is allowed to delete assets it owns; a future material binding cannot rely only on a text `source_ref` if durability is required.

### B6 — Studio Atlas and Officina materiali are distinct governance concepts

TRAMA ADR-010 (APPROVED) defines `Officina materiali` as the provider-neutral specialist artifact-production capability.

TRAMA ADR-020 defines Studio Atlas primarily as a separable professional product domain for Atlas Pathway authoring; its main handoff is the Pathway Authoring Package.

Therefore `ATLAS-MATERIAL-ADAPTER-01` cannot silently make Studio Atlas the universal material engine. A Studio Atlas adapter may exist only for capabilities actually assigned to Studio Atlas by governance. The general material capability remains provider-neutral/Officina-oriented.

### B7 — Reuse OR-07 instead of creating a parallel cross-system envelope

TRAMA OR-07 already defines provider-neutral:

- capability identity;
- request/result envelope;
- `requestId`;
- caller and authority context;
- result status/failure/stale semantics;
- provider/adapter provenance;
- evidence refs;
- provider portability;
- `READ_ONLY | PROPOSE_ONLY` behavior.

`MaterialTaskRequestV1` and `MaterialCandidateBundleV1` should therefore become typed input/output of an OR-07-compatible material proposal capability rather than a new top-level interoperability protocol.

The shared capability remains `PROPOSE_ONLY`. The teacher acceptance write is a local Docente OS domain command and is not part of the shared capability.

The locally proposed capability name `DOS.STUDIO_ATLAS.MATERIAL_HANDOFF` is provider-specific and conflicts with OR-07 capability-identity rules. The canonical capability identity must describe the outcome, not the provider.

### B8 — Rights/provenance must cover reuse and adaptation

The current MATERIAL-ORCH provenance shape is too small for the already-governed `Riutilizza | Adatta | Crea nuova` semantics.

The capability/artifact provenance must be able to preserve, where applicable:

- source artifact refs;
- derivation lineage;
- provider/adapter execution provenance;
- license/rights state or a declared unknown state;
- attribution requirements;
- integrity/version evidence.

Unknown rights may leave a private draft usable only under the applicable policy, but must block any claim of publication readiness.

### B9 — Browser handoff provenance is not authentic evidence

The frozen #692 handoff is encoded as unsigned base64url in browser fragments.

Studio Atlas correctly validates the allowed Docente OS return origin, and Docente OS validates same-origin preview locators. However a browser payload can be altered and cannot prove that a returned bundle was actually produced by Studio Atlas.

Therefore:

- browser envelope content may be treated as an untrusted proposal input;
- `source='studio-atlas'` is not sufficient provenance evidence;
- any governed cross-product runtime must bind the proposal to a verifiable request/evidence receipt or equivalent server-verifiable digest;
- OR-07 `requestId` + `evidenceRefs` should be reused rather than adding an ad-hoc trust mechanism.

### B10 — Runtime authorization must guard the write boundary, not only the CTA

The current #692 exact head gates the outbound Atlas CTA with `STUDIO_ATLAS_RUNTIME_AUTHORIZATION`, but `/progetta/atlas/ritorno` and `bindAtlasMaterialsToLesson()` do not enforce the same capability.

The new architecture must enforce effective authorization at every mutative entrypoint, especially the authoritative write boundary. UI visibility is not an authorization boundary.

## C. Live Beta schema/data findings

### C1 — Beta schema provenance drift is real

The Beta Supabase project currently contains `canonical_plan_runtime_bindings` and an Atlas bundle acceptance RPC even though those objects are absent from the current `develop` migration lineage.

Migration history contains older out-of-lineage entries including:

- `0087_lesson_design_atlas_bundle_atomic_acceptance`;
- `canonical_plan_runtime_identity`.

Later document/template migrations then advanced the governed runtime watermark through `0097_generalized_authored_documents`.

The current `runtime_schema_required_migrations` watermark therefore proves required migrations are present but does not prove that unexpected schema objects are absent.

A new schema-provenance/drift gate is required before any new migration:

`expected lineage + expected object signatures + no unauthorized extras`.

### C2 — Existing CPRI data is scoped and currently coherent

There are six current CPRI bindings: CAN-PLAN-1/2/3 in two workspace/year contexts.

The apparent duplicate CAN-PLAN candidates are not ambiguous after correct workspace/year scoping: each context has one candidate per CAN-PLAN.

All currently bound generations are `SUCCEEDED` and currently equal their asset's `current_generation_id`.

Thus the live binding rows are potential salvage evidence, not evidence that the new CPRI contract is unnecessary.

### C3 — Live Beta exposes a mutative Atlas RPC while runtime remains deferred

`public.accept_atlas_material_bundle(uuid,uuid,uuid,uuid,uuid,text,text,jsonb)` currently exists in Beta as `SECURITY DEFINER` and grants `EXECUTE` to `authenticated`.

The function can create Atlas-sourced lesson-design extensions and accept them for the caller's workspace. Supabase Security Advisor independently flags this function as an authenticated-executable SECURITY DEFINER surface.

This is a runtime-containment blocker because TRAMA governance still keeps DOS-A1/cross-product runtime deferred.

Containment must be decided before CPRI or MATERIAL-CORE implementation. The audit does not perform the revoke/drop itself.

### C4 — Live Beta contains durable Atlas-origin lesson state

Beta contains eight Atlas-sourced `lesson_design_extensions`: five accepted and three dismissed.

Two append-only lesson-preparation receipts include Atlas-sourced accepted extensions. These receipts are historical evidence and must not be deleted or rewritten merely to reconcile the architecture.

Four additional accepted Atlas material rows created on 2026-10-07 represent presentation, worksheet, guide and rubric candidates for one lesson context.

Reconciliation must therefore distinguish:

- historical governed evidence to preserve;
- current accepted state to classify/revalidate;
- future writes to block until authorization.

### C5 — Current accepted Atlas items are not durable artifacts

The accepted 2026-10-07 items retain material identifiers/type/bundle metadata and `source_ref=atlas:*`, but no durable `KnowledgeAsset` reference and no `previewRef` in the stored payload.

The current state proves that metadata acceptance is not sufficient to guarantee future material retrieval.

### C6 — Live dedupe schema is the pre-fix variant

The live unique index uses the raw `payload->>'dedupeKey'` expression while only the predicate trims the value. The live RPC trims its local lookup key but stores the caller payload.

This allows semantically equivalent padded keys to be represented differently and can make conflict lookup inconsistent.

No true same-context canonicalized collision exists in the current data, but the schema is vulnerable to one. Because the RPC should be contained rather than extended, this is a reconciliation finding, not a reason to patch the legacy flow forward.

## D. Live deployment findings

The main Beta Render service is currently deployed from:

`develop@7ac09a8795d93cc9a950083cda8b01d5d1407257`.

That is correct.

However two old cross-product preview services remain live with auto-deploy disabled:

- Docente OS PR692 Atlas preview, deployed from `575bb452b4c3a41ee61119538a778395afa84f28`;
- Studio Atlas materials preview, deployed from `ebf27e788b15835171beed16a49b599e71bd4734`.

The Docente preview predates the later atomic acceptance and runtime-authorization hardening. Its source exposes `Prepara materiali con Atlas` whenever its Studio origin is configured and its return action sequentially creates/accepts extensions.

The audit cannot prove from Render metadata alone which Supabase project its current environment points to. Treat the service as a containment item until that connection is verified or the stale preview is suspended through an explicit operational decision.

## E. Revised tranche order

No runtime implementation should start from the current #703 design unchanged.

The safer order is:

0. **CONTAIN-01 — Runtime/schema containment and evidence preservation**
   - reconcile Beta schema provenance;
   - contain unauthorized Atlas mutative RPC exposure;
   - classify/suspend stale cross-product previews as appropriate;
   - preserve historical receipts/extensions;
   - establish schema-drift detection.

1. **MATERIAL-ORCH-01 design rework**
   - incorporate all review + deep-audit findings;
   - reference TRAMA ADR-010, ADR-020, R4-P1 and OR-07 explicitly;
   - no runtime.

2. **CPRI-01 — Docente-only identity authority**
   - start from reconciled schema reality;
   - repository-wide runtime consumer guard;
   - generation-movement/revalidation semantics;
   - preserve historical provenance literals while removing static runtime authority.

3. **MATERIAL-CORE-01 — canonical local material acceptance**
   - reuse Knowledge, LessonDesignExtension and LessonPreparationManifest/materialSlots;
   - durable internal artifact identity;
   - no provider-specific runtime.

4. **MATERIAL-TASK-UX-01 — teacher-first orchestration**
   - reuse first;
   - `Riutilizza | Adatta | Crea nuova`;
   - local/internal fallback first.

5. **MATERIAL-CAPABILITY-01 — OR-07 typed material proposal capability**
   - provider-neutral typed input/output;
   - PROPOSE_ONLY;
   - request/evidence/provenance contract;
   - no cross-product runtime authorization.

6. **Provider adapter slices**
   - only after capability qualification;
   - Studio Atlas only where its product boundary authorizes the capability;
   - Officina/provider abstraction remains canonical for general artifact production.

7. **Governed runtime authorization**
   - explicit TRAMA decision;
   - provider binding authorization;
   - end-to-end capability enforcement at mutative boundary;
   - exact-head certification + independent review + Human Review.

## F. Stop conditions before implementation

CPRI implementation must not start until all of the following are true:

- Beta schema drift is classified and reconciled by an explicit plan;
- unauthorized legacy Atlas write surface is contained or formally authorized (authorization is not currently recommended);
- stale preview-service exposure is resolved or proven isolated;
- #703 design is amended with the canonical lesson-material lifecycle/roles;
- CPRI generation-movement semantics cover progress, extensions, receipts and sessions;
- OR-07/Officina/Studio Atlas responsibility split is explicit;
- durable artifact identity/deletion semantics are defined;
- a fresh independent review on the revised design returns no relevant unresolved findings.

Until then the canonical state is:

`ARCHITECTURE_REWORK_REQUIRED / RUNTIME_CONTAINMENT_REQUIRED / BETA_SCHEMA_RECONCILIATION_REQUIRED / IMPLEMENTATION_HOLD`.
