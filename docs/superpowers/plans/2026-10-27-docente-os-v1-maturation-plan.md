# DOCENTE OS V1 Maturation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** portare Docente OS dall’attuale M4 Advanced Controlled Production Pilot a una V1 single-owner realmente qualificata nell’uso quotidiano, senza aprire un nuovo feature train.

**Architecture:** il piano non introduce un nuovo modello di prodotto. Riusa le capability esistenti e le qualifica lungo i journey canonici Teacher Moment → Next Step → Lezione → Fatto, mantenendo esatti confini di dominio, human authority, Tier 1 e assurance exact-SHA. Ogni fase produce una receipt indipendente e può bloccare la successiva.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, Supabase, GitHub Actions, Playwright/HVA, Render.

**Spec:** `docs/product/DOCENTE_OS_SYSTEM_STATUS_2026-10-27.md`

## Global Constraints

- Nessun merge senza esplicita decisione umana.
- Nessun deploy manuale senza autorizzazione separata.
- Exact SHA è l’autorità di qualification.
- Nessun budget performance viene allentato per ottenere un PASS.
- Nessuna patch senza causa dimostrata.
- Tier 1 only per il pilot corrente.
- AI propone/prepara; il docente autorizza effetti persistenti/professionalmente significativi.
- Orario, Calendario, TeachingSession e AnnualPlanBlockProgress mantengono le rispettive autorità.
- Arena resta autorità curricolare; Docente OS resta sistema operativo del lavoro docente.
- Voice/STT resta DEFERRED.
- Tier 2, multi-user e institutional administration restano fuori dal release core.
- Default di programma: maturazione, non feature expansion.

## Review Focus

1. Effective-date / timezone / recurring-week boundaries non devono rompere Orario→Lezione.
2. Cold/warm runtime non deve produrre falsi regressivi né mascherare latenze reali.
3. Mobile bottom navigation/FAB/safe areas non devono coprire CTA o contenuti operativi.
4. Auth/MFA e deterministic test clocks devono restare isolati.
5. Il contesto docente deve sopravvivere a transizioni Oggi→Lezione→Materiali→Registra→Next.

---

### Task 1: Chiudere il repair Orario #761

**Evidence:**
- PR #761
- exact candidate `92ea0fd0ea88b942d3dd630423264d9a50d04982`
- HVA #1126
- Human Visual/Design review `5663864955`
- Candidate Qualification #69 / run `40472819003`

- [x] Verificare che head/base siano invariati.
- [x] Portare la PR da Draft a Ready.
- [ ] Eseguire Candidate Qualification sullo stesso exact SHA — **IN PROGRESS**.
- [ ] Verificare WCAG e tutti i gate richiesti dal classifier.
- [ ] Eseguire Final Independent Review sullo stesso exact SHA.
- [ ] Fermarsi al confine di decisione umana di merge.
- [ ] Dopo approvazione esplicita: merge exact candidate.
- [ ] Qualificare il merge commit reale su `develop`.
- [ ] Verificare Beta Orario→Lezione sul 27/10 e sulla prossima occorrenza.
- [ ] Non confondere eventuali RED P6 `/knowledge` con il repair Orario.

**Evidence live dopo Ready:** candidate lease + impact PASS; browser preflight PASS; `p6-performance/application` PASS; `x4-planner/application` PASS; HVA/WCAG candidate gates in progress sullo stesso exact SHA.

**Exit:** merge commit reale qualificato oppure blocker causale aperto.

---

### Task 2: Stabilizzare runtime/P6

**Scope:** Render Beta, runtime health, `/knowledge`.

- [ ] Rieseguire una sola volta P6 same-SHA solo se il precedente RED è classificato transient/warm-up.
- [ ] Se il limite `/knowledge` fallisce nuovamente, catturare tempi cold/warm e route-by-route.
- [ ] Verificare che non vi sia query/payload/app code causalmente responsabile prima di proporre patch.
- [ ] Conservare invariati i budget.
- [ ] Chiudere runtime health sul merge commit reale.
- [ ] Produrre receipt `RUNTIME_STABLE` oppure finding causale separato.

**Exit:** P6 + runtime health PASS o finding causale non ambiguo.

---

### Task 3: Freeze della Release Candidate V1

- [ ] Scegliere un exact `develop` SHA con Task 1–2 chiusi.
- [ ] Verificare Product CI, HVA, Candidate Qualification e runtime receipt.
- [ ] Creare/registrare RC immutabile secondo release engineering canonica.
- [ ] Congelare feature expansion durante la qualification.
- [ ] Aggiornare DOS-CRM freshness solo dove la RC produce nuova evidence.

**Exit:** una sola RC V1 exact-SHA, immutabile e riproducibile.

---

### Task 4: QL-1 HUMAN_USE — Daily Teaching Loop

**Journey:** `Oggi → Lezione → Materiali → Registra → prossimo passo/domani`

- [ ] HU-1 Iniziare la giornata.
- [ ] HU-2 Entrare nella lezione.
- [ ] HU-3 Usare materiali/supporti e tornare senza perdere contesto.
- [ ] HU-4 Registrare la lezione distinguendo TeachingSession da Piano.
- [ ] HU-5 Chiudere oggi e capire cosa preparare domani.
- [ ] Per ogni task registrare decision count, internal concepts, competing actions, surface transitions e net work.
- [ ] Classificare PASS / FRICTION / WORKAROUND / FAIL senza occultare i finding.
- [ ] Aprire repair separati solo per frizioni dimostrate.

**Exit:** QL-1 QUALIFIED oppure finding umani espliciti.

---

### Task 5: QL-3 — Knowledge → Lesson → Materials

- [ ] Partire da una fonte nella KB.
- [ ] Recuperare provenance e contesto.
- [ ] Trasformare/adattare la fonte verso una lezione reale.
- [ ] Rendere il materiale disponibile dal Lesson Brief.
- [ ] Aprirlo in classe e tornare alla Lezione senza perdita di contesto.
- [ ] Verificare mobile e runtime.
- [ ] Verificare che il docente non debba comprendere KnowledgeAsset/provider/internal IDs.

**Exit:** Knowledge/Materials qualified whole-journey.

---

### Task 6: QL-4 — Governed Copilot

- [ ] Recuperare Teacher Moment/lesson context.
- [ ] Verificare ricerca/sintesi/produzione/adattamento.
- [ ] Verificare proposta del prossimo passo.
- [ ] Verificare write governata con conferma umana.
- [ ] Verificare FAB AUTO/drag/protected regions/DOCKED_SAFE.
- [ ] Verificare ritorno al task senza perdita di contesto.
- [ ] HUMAN_USE del Copilot come strumento operativo, non chat separata.

**Exit:** Governed Copilot qualified o gap professionale esplicito.

---

### Task 7: Observe → Registra → Next

- [ ] Catturare Observation/Evidence nel contesto lezione.
- [ ] Verificare Tier 1 e privacy.
- [ ] Registrare TeachingSession.
- [ ] Provare recovery da errore senza perdita evitabile.
- [ ] Verificare che AnnualPlanBlockProgress resti una decisione separata.
- [ ] Collegare il risultato al prossimo Teacher Moment.

**Exit:** whole-journey browser/mobile/HUMAN_USE PASS.

---

### Task 8: Android Reality / PWA

- [ ] Qualificare installazione PWA su Chrome Android reale/emulatore governato.
- [ ] Verificare share sheet → Docente OS.
- [ ] Verificare apertura da file/documento condiviso.
- [ ] Verificare gesture native del Contextual Copilot FAB.
- [ ] Verificare safe area e bottom navigation.
- [ ] Verificare offline/service worker nel perimetro autorizzato.
- [ ] Produrre device receipt separata dall’HVA browser standard.

**Exit:** PWA/device intake qualified.

---

### Task 9: Assurance M5

- [ ] Chiudere criteri WCAG A/AA manual-required.
- [ ] Aggiungere evidence assistive technology sulle journey critiche.
- [ ] Completare mapping ASVS L1/L2 applicabile.
- [ ] Consolidare dependency/security cadence.
- [ ] Definire SLI da pilot osservato.
- [ ] Approvare SLO/error budget solo dopo una finestra dati sufficiente.
- [ ] Rehearsal incident/support/recovery.

**Exit:** M5 assurance senza gap critici aperti nel perimetro V1.

---

### Task 10: Sustained Pilot e decisione V1

- [ ] Usare la RC in più giornate reali Tier-1-safe.
- [ ] Registrare success, friction, workaround, failure e recovery.
- [ ] Misurare Teacher Attention Returned / Task Cost.
- [ ] Verificare trend runtime e performance.
- [ ] Aggiornare DOS-CRM con evidence corrente.
- [ ] Rieseguire maturity review M4→M5/V1.
- [ ] Prendere decisione umana: V1 READY / V1 REWORK.

**Exit:** decisione V1 basata su evidence, non su completezza narrativa.

---

## Sequenza bloccante

`#761 → runtime stable → RC freeze → QL-1 HUMAN_USE → QL-3 → QL-4 → Observe/Registra → Android Reality → M5 assurance → sustained pilot → V1 decision`

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

## Stato live del piano — 27/10/2026

- Task 1: **IN PROGRESS**
  - Engineering PASS
  - Full HVA PASS
  - Human Visual/Design PASS WITH WATCH
  - PR #761 Ready for review
  - Candidate Qualification #69 in progress sull’exact SHA
  - candidate P6 PASS
- Task 2: **OPEN / BLOCKED BY TASK 1**
  - precedente P6 Render `/knowledge` RED da rivalutare solo sul merge commit reale
- Task 3–10: **BLOCKED BY SEQUENCE**
