# ECO-00 — Docente OS ecosystem role and handoff

Status: PROPOSED_CANONICAL  
Date: 2026-09-20  
Base product authority: teacher professional workspace

## Product role

Docente OS is the **operational teacher layer** of the ecosystem.

It owns:
- teacher/workspace context;
- classes and teaching assignments;
- timetable/calendar projections;
- lesson preparation and execution;
- TeachingSession;
- private knowledge;
- actual-use evidence;
- teacher reflection;
- contextual Copilot.

It does not become a second curriculum/LO canonical archive and it does not become the general-purpose graphics/editorial rendering engine for final teaching assets.

## Ecosystem principle

**Arena governs → Atlas makes intelligible/navigable → Docente OS makes operational.**

This does not replace the governed direct Arena → Docente OS curriculum intake/revalidation boundary. Atlas supplies public/navigation/LO context only and never intermediates curriculum authority.


## Material production orchestration

Docente OS owns the **teacher-facing orchestration** of material preparation, not the specialist rendering capability itself.

Professional sequence:

`lesson context → Atlas reuse search → teacher choice (Riutilizza | Adatta | Crea nuova) → structured production brief → specialist Material Studio → preview/review → lesson attachment → optional Atlas publication`.

Docente OS must:
- derive the brief from the accepted curriculum baseline, lesson purpose, class/grade context and teacher choices;
- search Atlas before requesting new production;
- keep generated proposals editable, replaceable and excludable;
- require an explicit teacher decision before attaching a proposal as the selected lesson material;
- keep publication to Atlas as a later, separate and explicit action.

The Material Studio may use Atlas patterns, Learning Objects and design profiles, and may route different artifact types to different specialist providers. It does not gain curriculum authority, lesson authority or publication authority.

A generated artifact is not an Atlas resource merely because it was produced from Atlas context. Publication remains governed by the Atlas publication contract and its provenance, rights/licensing, accessibility and human-review gates.

## Canonical contracts and versions

| Boundary | Canonical contract | Rule |
| --- | --- | --- |
| Arena → Atlas | `CurriculumSnapshot v1` | authoritative curriculum snapshot |
| Atlas → Docente OS | `LearningObjectManifest v1` | canonical LO handoff |
| Atlas asset references | `MaterialAssetManifest v1` | asset sub-contract referenced by the LO manifest |
| Docente OS → Atlas | `TeachingUseReceipt v1` | future minimized use-evidence contract |
| Local Docente OS | `AtlasLearningObjectRef` | DTO/projection of `LearningObjectManifest v1`, not a cross-product contract |

## Atlas consumption

Docente OS consumes read-only `LearningObjectManifest v1` records. `MaterialAssetManifest v1` is the subordinate asset-reference contract carried/referenced by the LO manifest.

Minimum reference:
- loId;
- title;
- discipline/grade;
- version;
- lifecycle;
- curriculum node ids;
- canonical/provenance URL;
- pattern application;
- asset roles/URLs.

Learning Object identity, lifecycle and manifest are owned by Atlas. Canonical material bytes remain owned by the source declared in the manifest, which may be Drive or another authorized source. Docente OS may create temporary print/projection derivatives and stable local teacher adaptations, but neither becomes an Atlas source automatically.

## Operational journey

Atlas:
`curriculum node / LO / resource → Usa nella lezione`

Docente OS:
`Progetta/Classi/Lezione → accepted curriculum context → Atlas reuse search → brief → teacher-reviewed material → TeachingSession`.

Actions:
- Proietta;
- Scheda studente;
- Guida docente;
- Valutazione when available.

## TeachingUseReceipt v1 — future contract

`TeachingUseReceipt v1` is the canonical future Docente OS → Atlas use-evidence contract. Its runtime emission is **out of scope for DOS-A1**. DOS-A1 only preserves the identifiers/versions needed for a later compliant receipt.

The v1 contract must define receipt id, contract version, issuer/recipient, required structured fields, minimization, correction/revocation, incompatible-version behavior and free-text policy. Free text is excluded from the public boundary by default.

After real use a future compliant receipt may contain:
- LO id/version;
- material version(s);
- timestamp/date;
- non-personal class context where appropriate;
- actual duration;
- teacher validation outcome;
- usability findings;
- optional anonymous evidence summary;
- teacher approval reference retained privately where required; no unnecessary teacher identity crosses the public boundary.

The receipt is evidence, not automatic lifecycle promotion.

## Privacy

Private data remains inside Docente OS boundaries:
- authentication;
- workspace;
- RLS;
- private storage;
- audit.

The outbound TeachingUseReceipt must be minimized before it can be consumed by Atlas.

No student names or unnecessary personal data are exported by default.

## AI Context Firewall

Before external AI:
context classification → minimization → personal-data filter → capability policy → provider adapter.

Default:
`STUDENT_PERSONAL → BLOCK_EXTERNAL_AI` unless a separate approved policy exists.

## Trust

Docente OS can render:
- WORKSPACE PROTETTO;
- REVISIONE UMANA;
- A11Y TEST PASS;
- BUILD VERIFICATA;
- Atlas lifecycle/source badges received as evidence.

It must not invent or locally upgrade an Atlas/Arena assurance.

## Target milestone

### DOS-A1 — Atlas Learning Object runtime consumption

**Authorization state: ARCHITECTURE CONTRACT / RUNTIME DEFERRED.**

This document may define contracts, fixtures, adapters and acceptance rules, but runtime implementation is not authorized until the capability is explicitly classified/authorized under the current maturity program (for example `MATURITY_REQUIRED`, `PILOT_REQUIRED` or `PROFESSIONAL_GAP_CONFIRMED`).

When authorized, implement the architecture contract already tracked by ATLAS-04 without duplicating canonical materials.

Acceptance:
- fixture LO visible in Progetta/Classi/Lezione;
- lifecycle/version/provenance retained;
- `GENERATED` visibly non-canonical;
- direct material actions;
- contextual return navigation;
- no silent source copy;
- no lifecycle writes to Atlas;
- receipt prerequisites preserved; TeachingUseReceipt runtime emission deferred to a later governed slice.

## Return-context privacy rule

When navigating from Docente OS to public Atlas, the public handoff carries only publishable identifiers needed by the destination (for example `LO_ID`, `curriculum_node_id`, version) and, if needed, an opaque return token.

Class, section, lesson, UDA and full professional context remain in Docente OS and are restored locally on return. Atlas must not receive unnecessary class/private context.

## State separation

- `loLifecycle`: DRAFT | GENERATED | REVIEWED | CANONICAL | RETIRED;
- `assuranceState`: UNVERIFIED | AUTOMATED_PASS | HUMAN_REVIEWED;
- `curriculumDecisionState`: PROPOSED | APPROVED | REJECTED | SUPERSEDED, where applicable;
- display badges are derived from evidence/states and do not confer authority.

REVIEWED lifecycle does not equal HUMAN_REVIEWED assurance and does not imply institutional approval.

## ECO-00 slice governance

- Owner: Docente OS product owner for local integration; ECO-00 cross-product governance for compatibility.
- Source of truth: pinned ECO-00 Drive Masterplan + Product & Assurance Process.
- In scope: read-only Atlas consumption, provenance, minimization, local task continuity.
- Out of scope: runtime TeachingUseReceipt emission, Atlas lifecycle writes, shared DB, bidirectional Drive sync.
- Compatibility: `LearningObjectManifest v1` consumer; `MaterialAssetManifest v1` subordinate asset contract.
- Rollback: remove/disable the read-only integration path and revert to local Docente OS behavior; no upstream state mutation.
- Known limitation: canonical asset availability depends on the source declared by Atlas.
- Closure receipt: exact head + pinned Drive revisions + consumer compatibility evidence + human review.

## Canonical Drive pin

- Masterplan: **ECO-00 v0.2**, Drive revision **6**, verified 2026-09-20.
- Product & Assurance Process: **v0.2**, Drive revision **5**, verified 2026-09-20.
- `CML-DOS-INTEGRATED-GOVERNANCE-V1` remains authoritative for ownership, authority, handoff and execution order.
- Any semantic conflict is a blocker pending an explicit governed-memory amendment; Drive cannot override governed memory implicitly.

## References

Masterplan:
https://docs.google.com/document/d/1DFiwpEXcZqPp2Aqvo5Q13sd4wkp22CnzhRrrkJMSWiM/edit

Process:
https://docs.google.com/document/d/199ZL3s8M6YLArcB_4nCv2uRePZJBbqwq0ky78-7zvU0/edit

Registry:
https://docs.google.com/spreadsheets/d/1-rZsKRPXxFZQzTrK7DAno6TUiZsXywSkSdnbB4Dwvpw/edit
