# DOCENTE OS — DOS-CRM Qualification Roadmap

Data: **2026-10-03**  
Stato: **CURRENT / EXECUTION ROADMAP**  
Fonte: `ops/capability-readiness.json`

## 1. Obiettivo

Portare il maggior numero possibile di capability core da **CRL 4 — INTEGRATED** a **CRL 5 — QUALIFIED** senza creare pipeline, test e Human Review duplicati per ogni superficie.

Il principio è:

> **qualificare journey trasversali una volta, attribuire l'evidenza a tutte le capability realmente attraversate.**

Non si promuove automaticamente una capability perché condivide un gate: l'evidence deve coprire il suo perimetro.

## 2. Stato di partenza

### Già CRL 5 come evidence storica
- DOS-TT-SHARE-IMPORT — Share Target → import Orario (**freshness STALE** dopo i cambi del journey);
- DOS-LESSON-PREP — Preparazione lezione / Lesson Brief (**freshness STALE**);
- DOS-ACCOUNT-SECURITY — Account / MFA / sessioni (**freshness STALE**).

### Core a CRL 4
- DOS-TIMETABLE;
- DOS-TODAY-NEXT;
- DOS-TEACHING-SESSION;
- DOS-PLAN-UDA;
- DOS-KNOWLEDGE;
- DOS-CALENDAR;
- DOS-SETTINGS;
- DOS-COPILOT;
- DOS-MATERIALS.

### Capability implementate da qualificare
- DOS-PWA-DEVICE-INTAKE — CRL 3;
- DOS-OBSERVATION-EVIDENCE — CRL 3;
- DOS-CURRICULUM-INTAKE — CRL 4 / CONDITIONAL, solo pilot autorizzato.

### Fuori dal core release
- DOS-VOICE — CRL 3 / DEFERRED;
- DOS-INSTITUTIONAL-CONFIG — CRL 1 / CONDITIONAL.

## 3. Quattro qualification lanes ad alto leverage

### QL-1 — Daily Teaching Loop

Copre:
- Today + Next;
- Orario;
- Calendario;
- Lesson Preparation;
- TeachingSession;
- Piano annuale/UDA.

Critical journey:

`Home → momento corrente/prossimo → Orario/Calendario → Prima della lezione → materiali → lezione → Registra → Piano/next cycle`

Evidence richiesta:
1. exact SHA unico;
2. Product CI;
3. Browser Certification desktop + mobile;
4. critical E2E del ciclo;
5. HUMAN_USE task-based;
6. error/retry/recovery;
7. nessun HIGH/CRITICAL aperto;
8. receipt machine-readable.

Potenziale impatto:
- può promuovere **Today+Next, Orario, Calendario, TeachingSession e Piano/UDA**;
- può portare Lesson Prep da RECENT a CURRENT.

### QL-2 — Professional Context & Setup

Copre:
- Impostazioni;
- Cattedra;
- profilo docente;
- propagazione verso Classi, Orario, Home e Piano;
- Account/Sicurezza come prerequisito, non come duplicazione.

Critical journey:

`login/AAL2 → primo setup → contesto professionale → Cattedra → verifica propagazione cross-surface → riapertura/modifica controllata`

Evidence:
- first-run e returning-user;
- mobile/PWA;
- consistency cross-surface;
- no duplicate authority;
- rollback/reopen;
- Human Review.

Potenziale impatto:
- promozione **Settings** CRL 4→5;
- freshness Account/Security RECENT→CURRENT;
- evidence complementare per Orario/Home.

### QL-3 — Knowledge to Lesson

Copre:
- Conoscenza;
- upload/ingestion;
- provenance;
- retrieval;
- Materiali pronti / lesson materials;
- riuso in Lesson Preparation;
- Copilot retrieval.

Critical journey:

`upload/import → validate → process → provenance → retrieve → suggerisci → usa nella lezione`

Evidence:
- K1 + negative upload/security cases;
- processing generation correctness;
- retrieval relevance;
- source/provenance UI;
- degraded/failure behavior;
- Browser/HUMAN_USE.

Potenziale impatto:
- promozione **Knowledge** CRL 4→5;
- evidence per **Copilot**;
- rafforza Lesson Prep CURRENT.

### QL-4 — Governed Copilot

Copre:
- AssistantContext;
- Today Copilot;
- Lesson Copilot;
- Knowledge retrieval;
- PROPOSE / WRITE_REVERSIBLE;
- graceful degradation.

Esclude:
- Voice Capture;
- Institutional Configurator;
- write esterne non autorizzate.

Critical journey:

`Teacher Moment → context binding → retrieval → proposta → effect preview → conferma → write governata → provenance`

Scenari obbligatori:
- multi-disciplina: nessun binding Tecnologia su disciplina diversa;
- dependency partial failure: il contesto base resta utilizzabile;
- provider unavailable: flusso manuale integro;
- proposta senza authority: nessuna write;
- latenza percepita accettabile;
- Human Review/HUMAN_USE.

Potenziale impatto:
- promozione **Copilot** CRL 4→5;
- evidence complementare per Today+Next, Lesson Prep, Knowledge e Piano/UDA.

## 4. Stato esecutivo aggiornato — 2026-10-01

- **R-1 — COMPLETE** via PR #642, exact head `04ca4e6fb5b6832ae26df84da2290928ea8c3742`, merge `1d8c4ee7c1209f624b412db1b11e666c2de25aaa`. Product CI include ora le regression contract TeachingSession.
- **R-2 — COMPLETE** via PR #642: binding disciplina fail-closed sul piano canonico supportato e graceful degradation della dipendenza opzionale di preparation.
- **R-3 — COMPLETE**: schema e contract receipt già consolidati.
- **QL-1 — TECHNICAL PASS + HUMAN REVIEW PASS / HUMAN_USE PENDING** via PR #643, qualified exact head `eda319ec545d5ad37104882d5224c020ebe302dc`, merge `a59cc21e01b1955514e946fa487a50712a004857`. 45 test browser PASS, Browser Certification/Product CI/K1/ASVS/Human Interaction/TRAMA/MFA Queue Hygiene PASS.
- **Nessuna promozione CRL automatica**: la lane richiede ancora HUMAN_USE task-based prima di attribuire una promozione alle capability attraversate.

## 4-a. Rebaseline capability — 2026-10-03

Audit: `docs/product/audits/DOS_CRM_REBASELINE_2026-10-03.md`.

Baseline: `develop@57743e9d395ae5d739ca89e9afbdbb3a7edf875d`.

Esiti:
- DOS-TIMETABLE resta CRL 4 / CURRENT con evidence #664;
- DOS-TT-SHARE-IMPORT conserva CRL 5 storico ma freshness STALE;
- DOS-MATERIALS entra nel registro a CRL 4 / INTEGRATED;
- DOS-PWA-DEVICE-INTAKE entra a CRL 3 / IMPLEMENTED;
- DOS-OBSERVATION-EVIDENCE entra a CRL 3 / IMPLEMENTED;
- DOS-CURRICULUM-INTAKE entra a CRL 4 / CONDITIONAL nel solo pilot ECO-02;
- nessuna promozione automatica derivata dal full HVA di #664.

Il full HVA di #664 ha prodotto 69 test PASS e WCAG automated assurance 30 PASS, ma questa evidence resta regression/interaction evidence: non sostituisce HUMAN_USE o una qualification capability-level quando richiesta.

## 4-bis. Remediation immediata prima delle qualification lanes

### R-1 — TeachingSession regression discovery

Stato: **COMPLETE** con PR #642. Le regression contract TeachingSession sono ora incluse nel Product CI e il blocker di QL-1 è chiuso.

### R-2 — Copilot K2 historical findings

Stato: **COMPLETE** con PR #642. Il binding disciplina corrente è fail-closed sul piano canonico supportato e la dipendenza opzionale di preparation degrada senza perdere il contesto base.

### R-3 — Release-grade operational receipts

Definire un receipt schema comune:

`qualification_id, exact_sha, capability_ids, environment, scenarios, browser, human_review, failures, recovery, evidence_refs, completed_at`

Lo stesso schema deve essere riusabile da QL-1..QL-4 e dal Control Center.

## 5. Ordine esecutivo

### Wave A — deterministica, basso costo
1. R-1 TeachingSession test discovery;
2. R-2 verifica Copilot historical findings;
3. R-3 receipt schema + validator.

### Wave B — massimo leverage
4. QL-1 Daily Teaching Loop — technical PASS + Human Review PASS; HUMAN_USE pending;
5. QL-2 Professional Context & Setup.

### Wave C — knowledge/AI
6. QL-3 Knowledge to Lesson, includendo DOS-MATERIALS;
7. QL-4 Governed Copilot.

### Wave D — qualification mirate
8. PWA/device intake Android real-device;
9. Observe → Registra / Teaching Evidence;
10. revalidation Lesson Prep e Account/Security.

### Wave E — release
11. promozione capability realmente supportate;
12. congelamento RC;
13. sustained HUMAN_USE per CRL 6.

## 6. Cosa NON fare

- una pipeline separata per ogni schermata;
- ripetere gli stessi Browser test in workflow scollegati;
- promuovere tutti i componenti toccati da una lane;
- riattivare Voice per “completezza”;
- implementare Institutional Configurator senza pilot autorizzato;
- usare medie percentuali per dichiarare readiness;
- trasformare un gate tecnico in HUMAN_USE.

## 7. Definition of Done di una lane

Una lane è chiusa quando:
- exact SHA immutabile;
- scenarios versionati;
- gate automatici PASS;
- Browser Certification PASS dove applicabile;
- Human Review sullo stesso SHA;
- finding aperti classificati;
- receipt salvata;
- `ops/capability-readiness.json` aggiornato;
- `CAPABILITY_READINESS_CURRENT.md` rigenerato/aggiornato.

## 8. Target ragionevole

Se QL-1..QL-4 passano senza nuovi blocker strutturali, il core può realisticamente convergere verso:
- Orario 5;
- Today+Next 5;
- TeachingSession 5;
- Piano/UDA 5;
- Knowledge 5;
- Calendar 5;
- Settings 5;
- Copilot 5;
- Lesson Prep 5 CURRENT;
- Account/Security 5 CURRENT.

Questo è un **target di qualification**, non una dichiarazione anticipata di stato.

## 9. Regola finale

> **La roadmap non misura quanto codice manca: misura quale evidence manca per sostenere responsabilmente che una capability è pronta.**
