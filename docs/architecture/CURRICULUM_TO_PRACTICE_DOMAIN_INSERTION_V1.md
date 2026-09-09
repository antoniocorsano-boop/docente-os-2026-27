# Curriculum-to-Practice Domain Insertion v1

Status: C2P-01 PURE DOMAIN DESIGN CANDIDATE  
Design ID: `CML-DOS-C2P-DOMAIN-INSERTION-V1`  
Date: 2026-09-09  
Scope: Docente OS insertion model, with Arena authority boundaries preserved

## 1. Purpose

This document converts the C2P-01 contract-shape audit into a precise reuse-first insertion model for the four genuinely missing semantic surfaces identified by the audit:

1. `PlanBlockCurriculumBinding`;
2. `UdaCurriculumBinding`;
3. evidence/feedback/revision/assessment lineage rooted in classroom execution;
4. `CurriculumMigrationImpactManifest`.

It is a **pure-domain design artifact only**. It does not introduce runtime types, persistence schema, migrations, API routes, UI, deployment changes or authority transitions.

## 2. Canonical tranche naming is unchanged

The frozen execution plan already assigns:

- `C2P-02` — Arena Curriculum Release Boundary (C1);
- `C2P-03` — Docente OS Curriculum Intake/Revalidation;
- `C2P-04` — Annual Plan Binding;
- `C2P-05` — UDA Binding and Authoring;
- `C2P-06` — Execution, Evidence and Feedback Cycle;
- `C2P-07`/`C2P-08` — Professional observation producer/intake;
- `C2P-09` — Curriculum Version Transition;
- `C2P-10` — Golden Path acceptance.

Therefore this document remains an extension of **C2P-01 pure domain design** and does not consume or rename `C2P-02`.

## 3. Governing authority model

The insertion model preserves the following ownership rules.

### Arena

Arena remains the institutional curriculum authority. It owns the governed curriculum/release semantics and the institutional review chain. A curriculum release may be provisional or approved according to Arena governance; downstream consumption does not elevate its authority.

### Docente OS

Docente OS owns teacher professional planning, section execution, UDA authoring/adaptation, classroom evidence, feedback, revision, assessment observations and teacher acceptance/revalidation decisions.

Docente OS may persist stable references and binding provenance to an accepted curriculum context. It must not become a second independently editable institutional curriculum source of truth.

### Human authority

The teacher remains the professional authority for classroom adaptation, interpretation of evidence, feedback and assessment judgment. No binding, migration manifest or automation may convert an institutional curriculum reference into an automatic classroom judgment.

## 4. Existing anchors to reuse

The C2P-01 audit established the following reusable roots.

| Concern | Existing anchor | Design consequence |
|---|---|---|
| Curriculum ingress | `CML_LOCAL_HANDOFF_V2` / accepted curriculum context and revalidation | C1 is an evolution/profile of the existing channel, not a second release subsystem. |
| Annual planning | existing Annual Plan execution engine; `AnnualPlanSection` / `AnnualPlanBlockProgress`; canonical block identity | Add only a thin curriculum binding to canonical blocks. |
| UDA work | existing UDA / Progetta / authored-document infrastructure and version history | Bind the existing UDA identity; do not create a parallel UDA archive. |
| Classroom execution | existing `TeachingSessionRecord` / TeachingSession lineage and canonical block allocation | C4 lineage starts from existing execution; do not create a second lesson registry. |
| Professional curriculum feedback | existing `CurriculumFeedbackDraft/EnvelopeV1` | C5 extends the current privacy-safe professional channel. |
| Curriculum transition | existing accepted-context revalidation and structural-footprint comparison | C6 adds an explicit impact manifest; it is not a second migration engine. |

The runtime inspection also confirms that Annual Plan section execution already carries `canonicalPlanAssetId`, `canonicalGenerationId`, `blockId`, execution status, date and an evidence note. That structure is the insertion point for a stable block-level curriculum binding; it is not to be replaced.

## 5. Surface A — `PlanBlockCurriculumBinding`

### Semantic purpose

Make explicit which accepted curriculum release/context and which stable curriculum outcomes/criteria justify a canonical Annual Plan block.

### Product owner

Docente OS owns the binding. Arena owns the referenced institutional curriculum semantics.

### Existing aggregate/service anchor

The binding attaches to the existing canonical Annual Plan block identity and accepted curriculum context. Section execution continues to be represented by the existing Annual Plan execution model.

### Stable identity

The semantic identity must include, at minimum:

- binding identity;
- canonical plan asset/generation identity;
- canonical `blockId`;
- accepted curriculum context/release identity;
- stable curriculum node/outcome references;
- stable criterion references where applicable;
- provenance/fingerprint reference to the accepted handoff footprint.

These are conceptual contract fields, not a persistence schema.

### Lifecycle

A binding is created or accepted for future professional work against one accepted curriculum context. A later curriculum release does not mutate the historical binding in place. Revalidation may preserve it, supersede it for future work, or require manual rebinding.

### Allowed writes

Docente OS may record the binding, its provenance, teacher acceptance and later disposition. It may not edit the Arena-owned curriculum meaning through the binding.

### Forbidden duplication

- no new Annual Plan engine;
- no editable copied curriculum master inside each block;
- no section-specific mutation of the common canonical sequence;
- no silent rebinding after a curriculum update.

## 6. Surface B — `UdaCurriculumBinding`

### Semantic purpose

Make the relationship between an existing teacher-authored UDA and the accepted curriculum explicit and stable, including outcome/criterion references and the Annual Plan linkage that generated or contextualized the UDA.

### Product owner

Docente OS owns UDA professional work and the binding. Arena remains authoritative for the referenced institutional curriculum.

### Existing aggregate/service anchor

The binding is attached to the existing UDA/authored-document/Progetta identity and version history already audited in Docente OS. It is not a replacement document model.

### Stable identity

The semantic identity must include, at minimum:

- binding identity;
- existing UDA document/instance identity and document version;
- related Annual Plan binding and/or canonical block references;
- accepted curriculum context/release identity;
- stable curriculum node/outcome references;
- stable criterion references;
- optional section-adaptation reference containing only the professional delta.

### Local teacher-owned content

The following remain local professional content in Docente OS and are not institutional curriculum master data:

- authentic/problem situation;
- phases and sequencing;
- duration and scheduling;
- resources/materials;
- methods;
- section-specific adaptations;
- classroom evidence design;
- teacher notes and revisions.

### Lifecycle

UDA content may evolve through its existing version/history mechanism. The curriculum binding for each materially relevant version remains traceable to the accepted context used at that time. A new curriculum release may trigger future revalidation without retrospectively rewriting prior UDA versions or completed execution.

### Forbidden duplication

- no parallel C2P UDA repository;
- no automatic common-UDA clone for each section;
- no independently editable curriculum semantics embedded as a new source of truth in the UDA;
- no automatic propagation of a future curriculum release into historical UDA versions.

## 7. Surface C — Evidence / Feedback / Revision / Assessment lineage

### Semantic purpose

Represent the pedagogically meaningful local lineage:

`TeachingSession / SectionExecution -> Evidence -> Feedback -> NextAction -> StudentResponse -> RevisedEvidence -> AssessmentObservation`.

The audit confirms that classroom execution already has a TeachingSession root and history/supersession semantics, but that the learner evidence-feedback-revision-assessment lineage is not yet a complete first-class domain.

### Product owner

Docente OS only.

### Existing aggregate/service anchor

The lineage is rooted in the existing TeachingSession/canonical-block allocation. It must never introduce a second classroom-execution registry.

### Minimum semantic records

#### `EvidenceRecord`

Conceptually carries:

- evidence identity;
- teaching-session/execution reference;
- UDA and/or plan-binding reference when applicable;
- criterion/outcome references;
- governed scope (`INDIVIDUAL`, `GROUP`, or another explicitly governed scope);
- provenance and immutable/versioned content reference;
- creation metadata.

#### `FeedbackRecord`

Conceptually carries:

- feedback identity;
- evidence reference;
- criterion reference(s);
- teacher-authored feedback;
- actionable next step;
- teacher ownership and timestamp.

#### `StudentResponse`

Records that a learner response to feedback occurred without replacing the original evidence/feedback history.

#### `RevisedEvidenceLink`

Links original evidence, feedback and revised evidence, preserving the full chain rather than overwriting the earlier artifact.

#### `AssessmentObservation`

Represents a teacher professional observation grounded in appropriate evidence and criteria. It is not an automatic grade or attainment decision, and group evidence must not automatically become individual attainment.

### Privacy boundary

All pupil-level execution, evidence, feedback, response, assessment, attendance, grades and private notes remain inside Docente OS.

Arena must receive **none** of the following through C2P:

- pupil identity;
- raw pupil work;
- pupil feedback text/history;
- grades;
- attendance;
- private classroom notes;
- raw classroom event streams.

Only a later teacher-confirmed, professional, non-personal curriculum observation may cross the C5 channel.

### Semantic separation from C5

C4 learner/classroom lineage and C5 professional curriculum feedback are different domains. C4 data must not be repurposed directly as an Arena observation payload. A professional observation is a teacher-authored abstraction/review product, not a raw classroom export.

## 8. Surface D — `CurriculumMigrationImpactManifest`

### Semantic purpose

Turn an accepted curriculum change into an explicit worklist of future/historical impacts while preserving the existing revalidation engine and teacher acceptance boundary.

### Product owner

Docente OS owns the impact manifest because it classifies effects on Docente OS professional work. Arena owns the incoming curriculum release semantics that trigger revalidation.

### Existing aggregate/service anchor

The manifest is emitted/consumed by the existing accepted-curriculum revalidation/structural-footprint comparison path. It must not become a second release or migration engine.

### Stable identity

The conceptual manifest contains:

- manifest identity;
- previous accepted curriculum context/footprint;
- incoming accepted curriculum context/footprint;
- affected target type and stable target id;
- changed requirement/node references and human-readable reason;
- temporal scope (`HISTORICAL` or `FUTURE`);
- required disposition;
- teacher-decision status where professional revalidation is required.

### Required dispositions

The frozen C6 vocabulary is authoritative:

- `UNCHANGED_COMPATIBLE`;
- `FUTURE_REVALIDATION_REQUIRED`;
- `FUTURE_REBIND_REQUIRED`;
- `HISTORICAL_PRESERVE`;
- `MANUAL_REVIEW_REQUIRED`.

### Historical integrity

Completed sessions, evidence, feedback, assessment observations and the bindings that explain them remain attached to the curriculum context under which they were created. A later release may affect future work but must not rewrite past execution.

### Forbidden duplication

- no second migration engine;
- no automatic rewriting of existing plan/UDA/session/evidence history;
- no silent future rebinding;
- no manifest status that itself constitutes institutional curriculum approval.

## 9. Insertion matrix

| Surface | Existing root reused | New semantic delta | Authority retained by | Future implementation tranche |
|---|---|---|---|---|
| `PlanBlockCurriculumBinding` | Annual Plan canonical block + accepted curriculum context | stable block -> curriculum refs/provenance | Arena for curriculum; Docente OS for binding/plan | `C2P-04` |
| `UdaCurriculumBinding` | UDA/Progetta/authored-document identity + version history | stable UDA -> plan/curriculum/criteria binding | Arena for curriculum; teacher/Docente OS for UDA | `C2P-05` |
| Evidence/Feedback/Revision/Assessment lineage | TeachingSession / canonical block allocation | first-class learner evidence-feedback-revision lineage | teacher/Docente OS only | `C2P-06` |
| `CurriculumMigrationImpactManifest` | existing curriculum revalidation/footprint comparison | explicit target dispositions and future worklist | Arena for release; teacher/Docente OS for professional revalidation | `C2P-09` |

## 10. C1 and C5 are channels to evolve, not surfaces to duplicate

### C1

The existing CML handoff v2 plus Docente OS acceptance/revalidation remains the only curriculum release/intake boundary. Future C2P-02/C2P-03 work may profile or extend it, but must not create a competing curriculum-release store or transport.

### C5

The existing `CurriculumFeedbackDraft/EnvelopeV1` remains the professional feedback transport. Future C2P-07/C2P-08 work may extend its professional signal vocabulary, but must not create a parallel observation channel.

## 11. Cross-surface integrity rules

The following rules apply to all later implementation tranches:

1. **Stable references over copied authority** — persist identities/provenance; do not create editable curriculum masters in Docente OS.
2. **Append/supersede over retrospective rewrite** — historical bindings and classroom evidence are preserved.
3. **Common nucleus versus section execution** — section execution/adaptation must not mutate the canonical common plan/UDA nucleus.
4. **Teacher judgment remains human** — criteria and evidence references support professional judgment; they do not automate it.
5. **Pupil data is local** — pupil-level data never crosses into Arena.
6. **C1 is unique** — one release/intake/revalidation boundary.
7. **C5 is unique** — one professional curriculum-feedback boundary.
8. **C6 does not approve curriculum** — an impact manifest classifies Docente OS work; it does not confer institutional authority.
9. **No silent future mutation** — incoming releases require explicit dispositions and, where required, teacher revalidation.
10. **Exact provenance** — every binding that matters to later review must identify the accepted curriculum context/footprint that justified it.

## 12. Persistence, API and UI deliberately deferred

This document does not decide:

- table names or database layout;
- migration numbering;
- API endpoint shapes;
- event bus or RPC design;
- UI panels or navigation;
- storage technology;
- deployment sequence.

Those decisions belong to the authorized runtime tranche after exact-head inspection and must obey the reuse-first rule.

## 13. Pure-domain acceptance criteria

This insertion design is acceptable only if all are true:

- every new semantic surface has an explicit product owner;
- every surface has an existing root to reuse or an explicitly audited missing domain;
- no new Arena/Docente OS shared canonical database is implied;
- no second Annual Plan, UDA archive, C1 channel, C5 channel or migration engine is introduced;
- pupil-level data remains in Docente OS;
- teacher professional authority over classroom adaptation and assessment is preserved;
- historical work is never silently rebound or rewritten;
- the canonical C2P-02…C2P-10 tranche numbering remains unchanged;
- runtime, persistence, migration, API, UI and deployment remain untouched by C2P-01.

## 14. Design conclusion

The C2P-01 audit does not justify rebuilding the products. It justifies four bounded semantic additions around existing professional roots: two thin curriculum bindings, one local pedagogical lineage and one explicit transition-impact manifest.

The architecture therefore remains:

```text
Arena curriculum authority
        |
        | existing C1 handoff/revalidation boundary
        v
Docente OS accepted curriculum context
        |
        +--> existing Annual Plan -- PlanBlockCurriculumBinding
        |                              |
        |                              +--> existing UDA work -- UdaCurriculumBinding
        |                                                       |
        |                                                       v
        |                                                TeachingSession
        |                                                       |
        |                                            Evidence -> Feedback
        |                                                       |
        |                                        Response -> Revision -> AssessmentObservation
        |
        +--> existing revalidation -- CurriculumMigrationImpactManifest
        |
        +--> teacher professional review
                 |
                 +--> existing C5 professional curriculum-feedback channel
                          |
                          v
                     Arena governed review intake
```

This is the maximum domain surface justified at C2P-01. It does not authorize C2P-02 or any subsequent runtime tranche.