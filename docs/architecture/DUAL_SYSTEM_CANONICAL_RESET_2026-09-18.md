# Dual-System Canonical Reset — 2026-09-18

Status: **CANONICAL RESET CANDIDATE / COMPLETION AUDIT**  
Scope: **CurManLight Arena + Docente OS**  
Date: **2026-09-18**

## 1. Canonical baselines

### Docente OS
- repository: `antoniocorsano-boop/docente-os-2026-27`
- canonical development baseline: `develop@7f714e6ac6f4264af86f15f8a6f5b99121a52a41`
- maturity class: **M4 — Advanced Controlled Production Pilot**
- current program: **Teacher Operating System V1 convergence**
- H8 lifecycle governance: **COMPLETE**
- H9-A governed replanning read model: **COMPLETE**

### CurManLight Arena
- repository: `antoniocorsano-boop/CurManLight_arena`
- canonical main baseline: `main@dd46122cc0038c3e5de3fe8714e14e25b895bc18`
- maturity class: **M3.3 — Advanced Controlled Beta**
- active evolved Beta candidate: PR #222
- candidate exact head: `a64560202567f67eac5fd6ecaad30c6062199c0f`
- candidate automatic gates: **PASS on exact head**
- immutable deployed human-accepted release for the same candidate: **NOT YET CLOSED**
- Arena S3 human-validation closure: **IN PROGRESS**
- Arena S4 interoperability stabilization: **BLOCKED UNTIL S3 CLOSES**

## 2. Executive verdict

The integrated project is no longer primarily feature-incomplete.

The dominant remaining work is:

`canonicalization → release → human validation → sustained operational evidence → controlled interoperability`

The project MUST NOT start another broad feature train while these maturity gates remain open.

The two products keep distinct ownership:

### Arena owns
- institutional curriculum and applicability;
- curricular provenance and source evidence;
- proposal/review/institutional decision boundaries;
- institutional adoption state;
- versioned curricular handoff.

### Docente OS owns
- teacher operational planning;
- annual plan and UDA after curricular intake;
- classes, lessons, materials and daily workflow;
- TeachingSession, evidence, reflection and replanning;
- teacher Knowledge Base and professional memory;
- teacher acceptance/revalidation of incoming curricular context.

They collaborate through explicit, versioned, human-governed contracts. They do not become one shared runtime or database.

## 3. Current integrated lifecycle

The intended end-to-end lifecycle is now structurally complete:

`Arena curriculum authority → versioned handoff → Docente OS teacher intake/revalidation → annual plan → UDA → preparation → lesson → evidence/TeachingSession → reflection → governed replanning → subsequent preparation`

H8/H9 close the internal Docente OS loop:

`lesson → reflection → PROPOSED adjustment → teacher decision → ACCEPTED adjustment → governed preparation read model`

No accepted reflection automatically rewrites Plan, UDA, sequence, materials, progress or `nextActivity`.

## 4. Maturity audit — Docente OS

### COMPLETED
- core single-owner professional domain;
- account/MFA/AAL2 foundation;
- classes/cattedra;
- timetable/calendar separation and temporal projection;
- annual plan and UDA authoring;
- Knowledge ingestion/provenance/generations;
- TeachingSession and lesson recording;
- teaching evidence;
- Today/Next and Lesson Brief foundations;
- contextual Copilot foundations;
- design/HIM/HVA/security/recovery assurance foundations;
- governed reflection/replanning lifecycle H8;
- H9-A governed accepted-adjustment consumption;
- release engineering policy foundation.

### MUST CLOSE BEFORE A REAL RELEASE / MATURITY PROMOTION
1. freeze a real Docente OS release candidate from `develop`;
2. emit the first governed SemVer RC / GitHub Release / changelog receipt;
3. sustained HUMAN_USE evidence across multiple normal teaching days;
4. close remaining high-value UX friction demonstrated by actual use;
5. complete Contextual Voice Capture/STT as an operational input path or explicitly defer it from the release;
6. complete WCAG manual/assistive evidence required by the M5 matrix;
7. complete ASVS requirement-level mapping;
8. establish SLI/SLO from observed pilot evidence;
9. mature Drive runtime continuity;
10. decide Canva runtime inclusion from pilot evidence, not feature ambition;
11. close bounded Knowledge retrieval #514;
12. classify remaining open issues so that “open” means live work.

### DEFERRED / CONDITIONAL
- Tier 2 school personal data;
- institutional multi-user/multi-tenant product;
- automatic student evaluation/profiling;
- autonomous writes by AI;
- broad new assistant surfaces;
- new Learning Object store;
- automatic UDA composer;
- Arena runtime transport unless the pilot makes it necessary.

## 5. Maturity audit — CurManLight Arena

### COMPLETED / STRONG FOUNDATIONS
- curriculum domain and applicability;
- institutional authority model;
- provenance and source evidence boundaries;
- proposal/review/decision separation;
- same-SHA release discipline;
- versioned Arena ↔ Docente OS handoff contracts;
- canonical UX contract;
- Esplora + Trama V2;
- Mobile Compact candidate;
- C2P-10 golden-path preflight;
- source verification and institutional review foundations.

### MUST CLOSE BEFORE M4 PROMOTION
1. reconcile PR #222 with current `main` without losing the evolved candidate;
2. certify one immutable exact candidate SHA after reconciliation;
3. deploy that exact SHA as Beta;
4. verify release identity and public smoke;
5. obtain actual human acceptance on phone/desktop for the frozen G5 tasks;
6. close G5 human acceptance;
7. close G6 accessibility acceptance;
8. re-evaluate the older A1–A10 audit against the evolved candidate and mark already-satisfied items;
9. close remaining real source-registry/revision/persistence/repository-governance gaps;
10. classify and close superseded historical PRs/evidence branches.

### DEFERRED UNTIL S3 CLOSES
- Arena S4 bidirectional interoperability stabilization;
- product-mutating work that changes the Arena/Docente OS boundary;
- AILit runtime or dedicated store;
- broad teacher operational lesson/UDA workspace inside Arena.

## 6. Cross-system completion sequence

### Phase R0 — Canonical reset
- mirror this audit in both repositories;
- update canonical status pointers;
- classify stale issues and PRs;
- freeze the completion backlog.

Exit:
`DUAL_SYSTEM_CANONICAL_RESET_PASS`

### Phase R1 — Arena S3 closure
- clean candidate from #222 on current main;
- exact-head certification;
- immutable Beta deploy;
- human retest;
- G5/G6 closure.

Exit:
`ARENA_S3_HUMAN_VALIDATION_PASS`

### Phase R2 — Docente OS RC1
- freeze current product line;
- release version + tag;
- complete release matrix;
- GitHub Release + changelog;
- exact-SHA Beta/production candidate receipt.

Exit:
`DOCENTE_OS_RC1_CERTIFIED`

### Phase R3 — Sustained teacher pilot
Run normal teacher work over multiple days:
- morning/Today;
- before lesson;
- preparation;
- lesson;
- recording;
- reflection;
- next-day preparation.

Record:
- success/failure;
- friction/workaround;
- latency;
- recovery;
- Task Cost;
- HUMAN_USE findings.

Exit:
`DOCENTE_OS_SUSTAINED_PILOT_EVIDENCE_PASS`

### Phase R4 — Maturity closure
Docente OS:
- WCAG manual/assistive;
- ASVS requirement mapping;
- SLI/SLO;
- Drive continuity;
- runtime decision.

Arena:
- M4 blockers remaining after S3;
- repository governance;
- persistence decision;
- operations closure.

### Phase R5 — Controlled integrated golden path
Only after Arena S3 closes:

`Arena approved baseline → versioned handoff → Docente OS preview → teacher acceptance/revalidation → operational plan/UDA → lesson → professional evidence → governed feedback to Arena as non-authoritative evidence`

No direct shared-database writes.

Exit:
`CML_DOS_CONTROLLED_INTEROP_E2E_PASS`

## 7. Anti-feature-creep rule

Until R0–R3 are closed, every proposed new capability MUST be classified:

- `MATURITY_REQUIRED`
- `PILOT_REQUIRED`
- `PROFESSIONAL_GAP_CONFIRMED`
- `DEFERRED`

Default: **DEFERRED**.

A capability is not authorized merely because it is technically possible.

## 8. Promotion rules

### Docente OS
Do not call the product M5 until:
- sustained pilot evidence exists;
- release/rollback are reproducible;
- applicable WCAG evidence is complete;
- ASVS coverage is traceable;
- no HIGH/CRITICAL product findings remain;
- data scope is explicit.

### Arena
Do not call Arena M4 until:
- S3 human acceptance is formally closed;
- accessibility gate is closed;
- remaining M4 blockers are explicitly resolved or accepted as governed limitations;
- the promoted release is tied to immutable evidence.

## 9. Canonical resumption rule

When resuming work on either repository:

1. read `INTEGRATED_PROJECT_GOVERNED_MEMORY_V1.md`;
2. read this audit;
3. verify live branch SHAs and release identities;
4. work from the first unresolved item in the authorized phase;
5. do not reopen completed foundations without a reproducible defect;
6. do not start a new feature train before release/pilot closure.

## 10. Current next actions

1. **Arena:** reconcile and promote the evolved #222 candidate through immutable Beta + human G5/G6 closure.
2. **Docente OS:** freeze a real RC from the current mature `develop` line instead of continuing indefinite feature accumulation.
3. **Both:** clean backlog and canonical status so repository state matches product reality.
4. **Then:** run the controlled cross-system golden path.

## 11. Durable audit statement

This document is the canonical completion checkpoint for 2026-09-18.

Its purpose is to prevent the project from losing the maturity audit in conversation history or reopening already-solved architectural questions.

**The project is now in completion and maturation mode, not broad feature-discovery mode.**
