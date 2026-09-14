# DOCENTE OS — Fast Feedback Test Strategy V1

Data: **2026-09-14**  
Stato: **CANONICAL CANDIDATE**  
Issue: **#387**

## 1. Problema

Il programma M4/M5 ha costruito una rete di assurance utile, ma il ciclo di sviluppo è diventato troppo costoso quando ogni incremento attende l'intera batteria di gate, browser journey, visual evidence e runtime checks.

Questo rallenta la convergenza del prodotto e incentiva slice troppo piccole.

La soluzione non è eliminare sicurezza o qualità. È separare:

- feedback necessario **mentre si costruisce**;
- evidence necessaria **prima del merge**;
- assurance completa necessaria **nightly/release**.

## 2. Regola

> **Fast by default, deep by risk.**

Un gate deve girare nel percorso critico soltanto se il rischio che protegge è pertinente al diff oppure se rappresenta un invariante non negoziabile.

## 3. Livello FAST — inner loop

Target: pochi minuti.

Obbligatorio durante sviluppo:

- test unitari mirati ai file/contratti modificati;
- TypeScript/typecheck incrementale o equivalente;
- lint sui file modificati;
- domain contract test pertinenti;
- test presenter/resolver per TeacherMoment/NextStep quando coinvolti;
- local smoke della route modificata;
- nessun full-browser suite di default.

Failure = correggere prima di proseguire.

## 4. Livello MERGE — critical path

Target: feedback sufficientemente rapido da non interrompere il flusso di prodotto.

Sempre:

- clean install/build;
- test core applicativi;
- auth/session smoke;
- RLS/domain invariant checks fondamentali;
- migration/schema validation se il diff tocca persistence;
- critical journey interessata dal diff;
- security scanner pertinente.

Condizionale:

- MFA/AAL2 suite solo per auth/account/privileged write;
- Knowledge gate solo per ingestion/retrieval;
- timetable/calendar suite solo per temporal composition;
- visual browser journey solo per superfici UX modificate;
- performance runtime solo per cambi che possono alterare bundle/query/runtime oppure su campionamento periodico.

## 5. Livello NIGHTLY

La notte o su schedule:

- full Product CI;
- full HVA desktop/mobile;
- WCAG automated regression suite;
- DPG full-runtime ratchet;
- P6/P7;
- X3/K1 e altre journey complete;
- dependency/security checks;
- cross-surface navigation;
- service-worker/cache/version coherence;
- browser console/network scan;
- baseline performance P50/P95.

I finding nightly bloccanti aprono defect e possono congelare release/merge successivi secondo severità.

## 6. Livello RELEASE / PROMOTION

Prima di una release/promotion:

- exact SHA freeze;
- full applicable gate set;
- ASVS/WCAG evidence richieste dalla maturity corrente;
- HUMAN_USE evidence applicabile;
- visual acceptance;
- runtime smoke sul target;
- rollback target;
- release receipt.

## 7. Risk classifier

Ogni PR dichiara una o più categorie:

- `UX_PRESENTATION`;
- `DOMAIN_LOGIC`;
- `PERSISTENCE`;
- `AUTH_SECURITY`;
- `EXTERNAL_CONNECTOR`;
- `AI_ORCHESTRATION`;
- `VOICE_CAPTURE`;
- `INFRA_RUNTIME`;
- `DOCS_GOVERNANCE`.

Il workflow seleziona i gate pertinenti.

Esempio:

`UX_PRESENTATION + AI_ORCHESTRATION`

non deve attendere ASVS full mapping o una suite MFA completa se non modifica auth, ma deve eseguire Human Interaction, browser journey della superficie e invarianti sulle write AI.

## 8. Gate permanenti non negoziabili

Non vengono rimossi:

- segreti/credential leak;
- migration/schema integrity quando applicabile;
- RLS/authorization boundary quando applicabile;
- divieto di write AI non confermata;
- data tier guard;
- build/type safety;
- exact-head discipline in promotion.

## 9. HUMAN_USE

HVA automatico e HUMAN_USE restano distinti.

HUMAN_USE non deve essere rieseguito per ogni commit. Si usa per:

- cambi del modello mentale;
- nuovi Teacher Moment;
- cambi sostanziali di Lesson Brief/copilota;
- release candidate significative.

Le osservazioni umane alimentano direttamente backlog e Product Convergence.

## 10. Performance feedback

Per V1, oltre ai benchmark sintetici, registrare:

- tap/click → navigation start;
- server TTFB;
- data fetch latency;
- render/hydration;
- time to usable/interactive;
- cold vs warm;
- P50/P95.

Un runtime che espone attese percepite non può essere considerato adeguato solo perché la media è sotto soglia.

## 11. Obiettivo operativo

Ridurre il tempo di validazione di un normale incremento di prodotto da decine di minuti a un ciclo rapido, mantenendo assurance profonda fuori dal percorso critico quotidiano.

Il successo non è `meno test`.

È:

> **più iterazioni di prodotto per unità di tempo, con gli stessi invarianti di sicurezza e integrità.**