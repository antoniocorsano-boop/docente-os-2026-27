# DOCENTE OS V1 Maturation Implementation Plan

**Goal:** portare Docente OS dall'attuale M4 Advanced Controlled Production Pilot a una V1 single-owner realmente qualificata nell'uso quotidiano, senza aprire un nuovo feature train.

**Spec:** `docs/product/DOCENTE_OS_SYSTEM_STATUS_2026-10-27.md`

## Global Constraints

- Nessun merge senza esplicita decisione umana.
- `develop` → Beta è auto-deploy conseguente al merge autorizzato.
- Nessuna promozione Production senza exact SHA, contratto di promozione e decisione umana dedicata.
- Nessun budget performance viene allentato per ottenere un PASS.
- Nessuna patch senza causa dimostrata.
- Tier 1 only per il pilot corrente.
- AI propone/prepara; il docente autorizza gli effetti persistenti o professionalmente significativi.
- Orario, Calendario, TeachingSession e AnnualPlanBlockProgress mantengono autorità distinte.
- Arena resta autorità curricolare; Docente OS resta sistema operativo del lavoro docente.
- Voice/STT resta DEFERRED.
- Tier 2, multi-user e institutional administration restano fuori dal release core.
- Default di programma: maturazione, non feature expansion.

---

### Task 1: Chiudere il repair Orario #761

**Stato: COMPLETE.**

Evidence conclusiva:

- PR #761 merged;
- exact candidate finale `df7cbfd3f2b662590cabc30d40efb1d9ffd5c434`;
- merge `5112ac255c936f4becf0de80dd14a4bebdde6df3`;
- Candidate Qualification PASS;
- Final Independent Review PASS;
- Human Visual / Design PASS WITH WATCH;
- Orario → Lezione qualificato sul candidato.

Il RED HVA successivo al merge è stato diagnosticato come problema separato del test harness e non ha riaperto il repair prodotto.

**Exit raggiunta:** repair prodotto integrato e causalmente chiuso.

---

### Task 2: Stabilizzare runtime/P6

**Stato: COMPLETE per il blocker pre-RC.**

Evidence:

- `p6-performance/render-beta` PASS sul merge #761 `5112ac255c936f4becf0de80dd14a4bebdde6df3`;
- il successivo HVA RED è stato isolato nel test harness mobile week/day;
- PR #763 test-harness-only merged;
- merge corrente `489d8ee67b16db304ede71be94241739d0fa0a79`;
- Beta Render serve esattamente `489d8ee67b16db304ede71be94241739d0fa0a79`;
- post-merge Product CI, X3, Human Interaction Model, TERM-01 e HVA PASS.

Ruling: il PASS P6 resta evidence prodotto valida perché #763 non cambia product/runtime; non si riesegue P6 senza una nuova causa materiale.

**Exit raggiunta:** runtime blocker chiuso senza allentare budget e senza patch speculativa.

---

### Task 2A: Release-governance reconciliation

**Stato: IN PROGRESS. Bloccante per il nuovo freeze RC per decisione di programma del 27/10.**

Finding: `PRODUCTION_PROVENANCE_DRIFT`.

- receipt storica Production: candidate `db3d4ab014ad11dec4aeccdb5aa8740220e4ebde`;
- Render Production attualmente live: `7fa8deae375bc15b4386d17c97b1809f49488b98`, deploy manuale 17/09/2026;
- sullo SHA live diversi gate risultano PASS, mentre `hva/runtime` storico risulta failure;
- Production deve restare immutata durante la ricostruzione.

Checklist:

- [ ] ricostruire l'autorità del deploy manuale `7fa8deae…`;
- [ ] raccogliere le receipt/gate associati senza inventare equivalenze;
- [ ] classificare lo SHA live come certificato, non certificato o superseded;
- [ ] riallineare le fonti canoniche di Production;
- [ ] verificare un rollback target certificato coerente per la futura RC;
- [ ] fermarsi prima di qualsiasi redeploy o promozione.

**Exit:** provenienza Production non ambigua e documentata.

---

### Task 3: Freeze della nuova Release Candidate V1

**Stato: NEXT / BLOCKED BY TASK 2A.**

Sono già state emesse `v0.1.0-rc.1` e `v0.1.0-rc.2`. Le modifiche successive richiedono una nuova RC; nessun tag esistente viene spostato.

- [ ] chiudere Task 2A;
- [ ] scegliere un exact `develop` SHA immutabile;
- [ ] verificare Product CI, HVA, candidate qualification e runtime evidence pertinenti;
- [ ] aggiornare package/changelog solo secondo la decisione RC;
- [ ] inventariare scope, capability modificate, migrazioni, known residuals e rollback target;
- [ ] creare il tag della nuova RC e verificarne la risoluzione exact-SHA;
- [ ] creare la prerelease GitHub coerente;
- [ ] congelare feature expansion durante qualification;
- [ ] aggiornare DOS-CRM freshness solo dove la RC produce nuova evidence.

Se il perimetro resta `0.1.0`, il nome naturale è `0.1.0-rc.3`; il nome diventa vincolante solo al freeze.

**Exit:** una sola nuova RC exact-SHA, immutabile e riproducibile.

---

### Task 4: QL-1 HUMAN_USE — Daily Teaching Loop

**Journey:** `Oggi → Lezione → Materiali → Registra → prossimo passo/domani`

- [ ] HU-1 iniziare la giornata;
- [ ] HU-2 entrare nella lezione;
- [ ] HU-3 usare materiali/supporti e tornare senza perdere contesto;
- [ ] HU-4 registrare la lezione distinguendo TeachingSession da Piano;
- [ ] HU-5 chiudere oggi e capire cosa preparare domani;
- [ ] registrare decision count, internal concepts, competing actions, surface transitions e net work;
- [ ] classificare PASS / FRICTION / WORKAROUND / FAIL senza occultare i finding;
- [ ] aprire repair separati solo per frizioni dimostrate.

**Exit:** QL-1 QUALIFIED oppure finding umani espliciti.

---

### Task 5: QL-3 — Knowledge → Lesson → Materials

- [ ] partire da una fonte nella KB;
- [ ] recuperare provenance e contesto;
- [ ] trasformare/adattare la fonte verso una lezione reale;
- [ ] rendere il materiale disponibile dal Lesson Brief;
- [ ] aprirlo in classe e tornare alla Lezione senza perdita di contesto;
- [ ] verificare mobile e runtime;
- [ ] verificare che il docente non debba comprendere ID/provider interni.

**Exit:** Knowledge/Materials qualified whole-journey.

---

### Task 6: QL-4 — Governed Copilot

- [ ] recuperare Teacher Moment/lesson context;
- [ ] verificare ricerca/sintesi/produzione/adattamento;
- [ ] verificare proposta del prossimo passo;
- [ ] verificare write governata con conferma umana;
- [ ] verificare FAB AUTO/drag/protected regions/DOCKED_SAFE;
- [ ] verificare ritorno al task senza perdita di contesto;
- [ ] eseguire HUMAN_USE del Copilot come strumento operativo, non chat separata.

**Exit:** Governed Copilot qualified o gap professionale esplicito.

---

### Task 7: Observe → Registra → Next

- [ ] catturare Observation/Evidence nel contesto lezione;
- [ ] verificare Tier 1 e privacy;
- [ ] registrare TeachingSession;
- [ ] provare recovery da errore senza perdita evitabile;
- [ ] verificare che AnnualPlanBlockProgress resti una decisione separata;
- [ ] collegare il risultato al prossimo Teacher Moment.

**Exit:** whole-journey browser/mobile/HUMAN_USE PASS.

---

### Task 8: Android Reality / PWA

- [ ] qualificare installazione PWA su Chrome Android reale/emulatore governato;
- [ ] verificare share sheet → Docente OS;
- [ ] verificare apertura da file/documento condiviso;
- [ ] verificare gesture native del Contextual Copilot FAB;
- [ ] verificare safe area e bottom navigation;
- [ ] verificare offline/service worker nel perimetro autorizzato;
- [ ] produrre device receipt separata dall'HVA browser standard.

**Exit:** PWA/device intake qualified.

---

### Task 9: Assurance M5

- [ ] chiudere criteri WCAG A/AA manual-required;
- [ ] aggiungere evidence assistive technology sulle journey critiche;
- [ ] completare mapping ASVS L1/L2 applicabile;
- [ ] consolidare dependency/security cadence;
- [ ] definire SLI da pilot osservato;
- [ ] approvare SLO/error budget solo dopo una finestra dati sufficiente;
- [ ] rehearsal incident/support/recovery.

**Exit:** M5 assurance senza gap critici aperti nel perimetro V1.

---

### Task 10: Sustained Pilot e decisione V1

- [ ] usare la RC in più giornate reali Tier-1-safe;
- [ ] registrare success, friction, workaround, failure e recovery;
- [ ] misurare Teacher Attention Returned / Task Cost;
- [ ] verificare trend runtime e performance;
- [ ] aggiornare DOS-CRM con evidence corrente;
- [ ] rieseguire maturity review M4→M5/V1;
- [ ] prendere decisione umana: V1 READY / V1 REWORK.

**Exit:** decisione V1 basata su evidence.

---

## Sequenza bloccante aggiornata

`Task 1 CLOSED → Task 2 CLOSED → Task 2A Production provenance → RC freeze → QL-1 HUMAN_USE → QL-3 → QL-4 → Observe/Registra → Android Reality → M5 assurance → sustained pilot → V1 decision`

Le fasi successive non devono essere usate per aggirare un blocker delle precedenti.

## Non-obiettivi fino alla decisione V1

- nuova tassonomia di moduli;
- Voice/STT;
- Tier 2;
- multiutente istituzionale;
- replica del registro elettronico;
- nuovo archivio materiali;
- nuovi provider obbligatori;
- nuove feature autonome non richieste da un finding professionale reale.

## Stato live — 27/10/2026

- Task 1: **COMPLETE**.
- Task 2: **COMPLETE per il blocker pre-RC**.
- Task 2A: **IN PROGRESS**.
- Task 3: **NEXT / BLOCKED BY TASK 2A**.
- Task 4–10: **BLOCKED BY SEQUENCE**.
