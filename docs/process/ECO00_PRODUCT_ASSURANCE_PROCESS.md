# ECO-00 — Docente OS product assurance process

Status: PROPOSED_CANONICAL  
Date: 2026-09-20

## Relationship to existing process

Existing Product CI, ASVS/security, WCAG, Human Interaction, RLS and exact-head gates remain authoritative.

ECO-00 adds cross-product contract and trust-layer validation.

## Cross-product change evidence

For Atlas/Arena integration:
- owner/responsible role;
- exact contract name + major/minor version;
- fixture;
- domain adapter;
- provenance;
- no duplicate canonical storage;
- workspace/privacy boundary;
- lifecycle authority test;
- return-context test;
- accessibility;
- security/RLS regression;
- exact-head browser journey;
- compatibility matrix;
- rollback/recovery;
- known limitations;
- closure receipt structure;
- pinned Drive masterplan/process revisions.

## TeachingUseReceipt v1 privacy gate

TeachingUseReceipt runtime emission is not part of DOS-A1; this gate applies to the later slice that implements the contract.

Before export:
- strip student identifiers;
- minimize class context;
- free text excluded from the public boundary by default;
- preserve LO/material version;
- preserve teacher review outcome;
- allow explicit preview before consequential sharing when appropriate.

## AI

AI remains READ_ONLY/PROPOSE by default for ecosystem content.

No action can bypass:
- RLS;
- capability policy;
- human approval;
- source provenance.

## Trust badges

Docente OS renders only evidence it can prove or consume from a trusted contract.

Badge state must remain version-aware and revocable.

## DOS-A1 gate

- Atlas reference resolves;
- source is read-only;
- asset action works;
- lifecycle visible;
- provenance retained;
- task context survives;
- no private data leaks to public Atlas;
- no duplicate source-of-truth;
- Product CI/security/accessibility/HIA pass.


## ECO-00 v0.2 canonical state model

Canonical contracts:
- Arena → Atlas: `CurriculumSnapshot v1`;
- Atlas → Docente OS: `LearningObjectManifest v1`;
- `MaterialAssetManifest v1`: subordinate asset contract;
- Docente OS → Atlas: `TeachingUseReceipt v1`, future governed slice;
- `AtlasLearningObjectRef`: local Docente OS projection/DTO, not a cross-product contract.

State dimensions are independent:
- LO lifecycle: DRAFT | GENERATED | REVIEWED | CANONICAL | RETIRED;
- assurance: UNVERIFIED | AUTOMATED_PASS | HUMAN_REVIEWED;
- curriculum decision: PROPOSED | APPROVED | REJECTED | SUPERSEDED;
- badges are derived display state only.

Public return-context rule:
- public Atlas receives only necessary publishable identifiers and/or an opaque return token;
- class, section, lesson, UDA and full private task context remain in Docente OS and are restored locally.

Drive pin used for this review:
- ECO-00 Masterplan v0.2 — revision 6;
- ECO-00 Product & Assurance Process v0.2 — revision 5;
- verified 2026-09-20.

For ownership, authority, cross-system handoff and execution order, `CML-DOS-INTEGRATED-GOVERNANCE-V1` remains authoritative. Semantic divergence is a blocker pending an explicit mirrored governance amendment.


## Interoperability authorization rule

DOS-A1 is a documentation/architecture target only until separately classified and authorized by the current maturity governance. ECO-00 documentation does not authorize runtime cross-product implementation by itself.

The direct governed Arena → Docente OS curriculum intake/revalidation boundary remains in force. Atlas LO/material consumption is a separate read-only operational input and cannot replace curriculum authority or teacher revalidation.

Any future Atlas material integration must adapt into the canonical Docente OS lesson-composition read model rather than creating a parallel materials path.
