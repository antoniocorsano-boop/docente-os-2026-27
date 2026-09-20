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

It does not become a second curriculum/LO canonical archive.

## Ecosystem principle

**Arena governs → Atlas makes intelligible/navigable → Docente OS makes operational.**

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
`TEC-SYS-001 → Prepara questa lezione`

Docente OS:
`Progetta/Classi/Lezione → LO context → material actions → TeachingSession`.

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

Implement the architecture contract already tracked by ATLAS-04 without duplicating canonical materials.

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

- Masterplan: **ECO-00 v0.2**, Drive revision **5**, verified 2026-09-20.
- Product & Assurance Process: **v0.2**, Drive revision **4**, verified 2026-09-20.
- The pinned Drive documents prevail on semantic conflict until an explicit coordinated revision updates both sides.

## References

Masterplan:
https://docs.google.com/document/d/1DFiwpEXcZqPp2Aqvo5Q13sd4wkp22CnzhRrrkJMSWiM/edit

Process:
https://docs.google.com/document/d/199ZL3s8M6YLArcB_4nCv2uRePZJBbqwq0ky78-7zvU0/edit

Registry:
https://docs.google.com/spreadsheets/d/1-rZsKRPXxFZQzTrK7DAno6TUiZsXywSkSdnbB4Dwvpw/edit
