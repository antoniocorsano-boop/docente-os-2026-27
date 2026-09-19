# ECO-00 — Docente OS ecosystem role and handoff

Status: PROPOSED_CANONICAL  
Date: 2026-09-19  
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

## Atlas consumption

Docente OS consumes a read-only `LearningObjectManifest` and `MaterialAssetManifest`.

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

Canonical material bytes remain owned by the declared Atlas/Drive source.

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

## TeachingUseReceipt

After real use Docente OS may emit a versioned receipt containing:
- LO id/version;
- material version(s);
- timestamp/date;
- non-personal class context where appropriate;
- actual duration;
- teacher validation outcome;
- usability findings;
- optional anonymous evidence summary;
- teacher identity/approval reference within the private workspace.

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
- TeachingUseReceipt contract ready.

## References

Masterplan:
https://docs.google.com/document/d/1DFiwpEXcZqPp2Aqvo5Q13sd4wkp22CnzhRrrkJMSWiM/edit

Process:
https://docs.google.com/document/d/199ZL3s8M6YLArcB_4nCv2uRePZJBbqwq0ky78-7zvU0/edit

Registry:
https://docs.google.com/spreadsheets/d/1-rZsKRPXxFZQzTrK7DAno6TUiZsXywSkSdnbB4Dwvpw/edit
