# ECO-00 — Docente OS product assurance process

Status: PROPOSED_CANONICAL  
Date: 2026-09-19

## Relationship to existing process

Existing Product CI, ASVS/security, WCAG, Human Interaction, RLS and exact-head gates remain authoritative.

ECO-00 adds cross-product contract and trust-layer validation.

## Cross-product change evidence

For Atlas/Arena integration:
- exact contract version;
- fixture;
- domain adapter;
- provenance;
- no duplicate canonical storage;
- workspace/privacy boundary;
- lifecycle authority test;
- return-context test;
- accessibility;
- security/RLS regression;
- exact-head browser journey.

## TeachingUseReceipt privacy gate

Before export:
- strip student identifiers;
- minimize class context;
- no free text containing personal data by default;
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
