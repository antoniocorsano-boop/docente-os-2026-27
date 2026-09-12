# DOCENTE OS — Stato corrente canonico

Data: **2026-09-12**  
Stato documento: **CURRENT / CANONICAL STATUS**

Questo documento è la sintesi autorevole dello stato operativo. I checkpoint precedenti e gli audit datati restano storici e non devono essere usati per dedurre lo stato corrente quando divergono da questo file.

Baseline di sviluppo corrente:

`develop` @ `3767d4d5cf20b54808526a73bcbc800a1c5e6503`

## 1. Classificazione

DOCENTE OS è classificato:

**M4 — ADVANCED CONTROLLED PRODUCTION PILOT**

Il single-owner professional core è sostanzialmente completo; la priorità del progetto passa da espansione funzionale generale a **maintenance & maturation** verso M5.

Audit corrente:

- `docs/product/SYSTEM_MATURITY_AUDIT_2026-09-12.md`;
- `docs/product/M5_READINESS_MATRIX_2026-09-12.md`.

Indicatori interni di audit:

- completamento single-owner docente: **≈91%**;
- maturità ingegneristica: **≈4,10/5**;
- readiness M5/general distribution: **≈68–72%**.

Questi valori sono indicatori di governance interna, non certificazioni ISO o dichiarazioni di conformità normativa.

## 2. Production e dati reali

Resta valido il modello di Production separata in modalità **SINGLE_OWNER_PILOT** con promozione tramite SHA immutabile certificato.

La precedente Production certificata non viene automaticamente sostituita dal `develop` corrente: una nuova promozione richiede i relativi gate di release/production.

### Ambito dati ammesso

È ammesso esclusivamente:

`TIER_1_OWNER_PROFESSIONAL_NON_PERSONAL`.

Sono ammessi contenuti professionali reali del proprietario purché non contengano dati personali di studenti, famiglie, colleghi o altri terzi.

Restano non ammessi senza gate separato:

- `TIER_2_SCHOOL_PERSONAL_DATA`;
- signup pubblico;
- onboarding multi-tenant;
- uso istituzionale multiutente;
- migrazione automatica Beta → Production.

## 3. Runtime e invarianti di prodotto

- codice applicativo: `product/`;
- Next.js 16 / React 19 / TypeScript strict;
- Supabase Auth + PostgreSQL + Storage + RLS;
- branch canonico di sviluppo: `develop`;
- promozione Production: `IMMUTABLE_CERTIFIED_SHA`;
- Vercel non è gate canonico;
- Netlify e la vecchia app statica root sono legacy/reference.

## 4. Capability consolidate

### Product experience

- **X0 — COMPLETE**: fondazioni canoniche;
- **X1 — COMPLETE**: component foundation;
- **X2 — COMPLETE**: Professional AppShell;
- **X3 — COMPLETE** nel confine `READ_ONLY / PROPOSE`;
- **X4-A — COMPLETE / BETA-PROVEN**: write assistita `PLANNER_CREATE_TASK` con conferma umana e undo;
- **X5-A — COMPLETE / BETA-PROVEN**: authoring UDA versionato;
- **X5-B — COMPLETE / BETA-PROVEN**: export professionale UDA;
- **X6 — FUTURE / NOT BASELINE**.

### Tempo e lavoro reale

- T1/T2/T3A/T3B/T3C/T4: **COMPLETE**;
- Orario e Calendario restano domini indipendenti;
- Temporal Projection è il solo livello di composizione autorizzato;
- TeachingSession conserva evidenza reale della lezione;
- allocazioni B01–B33 non possono superare i minuti effettivi;
- nessun automatismo può promuovere un blocco a `SVOLTO` senza autorità umana.

### Superfici professionali

Sono consolidate nel prodotto corrente:

- Home/Oggi come cockpit giornaliero;
- Planner/Attività;
- Classi e workspace di classe;
- Piano annuale;
- Progetta e UDA;
- Conoscenza con ingestione, trasformazione, provenienza e generations;
- Orario;
- Calendario;
- registrazione lezione e Diario;
- Impostazioni;
- libri di testo / risorse editoriali;
- assistente contestuale human-in-the-loop.

### Interoperabilità

- curriculum interoperability v2: applicability, coverage, persistence e revalidation;
- textbook adoption: foundation + MIM discovery;
- Lesson Workspace: confine `PROPOSED → ACCEPTED`;
- feedback curricolare inverso Docente OS → Arena con privacy `PROFESSIONAL_NON_PERSONAL`;
- transport runtime cross-product con Arena resta fuori baseline finché non diventa requisito dimostrato dal pilot.

## 5. Design e Human Interaction

DPG-2 è **CLOSED / INTEGRATED** sul merge #336.

Baseline permanente:

- raw colors: **27**;
- local tokens: **13**;
- legacy brand references: **0**;
- decorative effects: **0**;
- raw radii: **1**;
- raw shadows: **5**.

I residui sono descritti in `product/design/DESIGN_DEBT_RESIDUALS.md`; il registro non è una allowlist e la baseline può soltanto diminuire.

Per le normali superfici applicative non sono autorizzate nuove varianti visuali locali fuori dal design system canonico.

Human Interaction Model, HVA, mobile rules e Design Policy Gate restano gate permanenti.

## 6. Assurance e gate

Il prodotto dispone di:

- Product CI: test + typecheck + lint + build;
- Human Interaction Model gate;
- Human + Visual Acceptance;
- DPG-1 / DPG-2;
- P6 Performance Baseline;
- X4 Planner Confirmed Write;
- X5 UDA Versioned Authoring;
- X5B Professional UDA Export;
- K1 Knowledge Upload;
- P7 Anonymization Input Guard;
- operational security e dependency security;
- recovery/storage/incident gates già maturati nel programma P7.

La chiusura DPG-2 è stata certificata sull'exact head `f9953382e8ee8ef6307fa3859066bfb8d3e063a4` prima del merge #336; il merge commit corrente contiene lo stesso tree applicativo più la ricevuta di integrazione.

## 7. Maturity program M5

Il programma attivo è:

**FEATURE DEVELOPMENT → MAINTENANCE & MATURATION PROGRAM**

Gate M5:

- **M5-00 — Canonical State & Maturity Baseline** — IN PROGRESS;
- **M5-01 — Repository Hygiene & Release Engineering** — OPEN;
- **M5-02 — Sustained Pilot Evidence** — OPEN;
- **M5-03 — WCAG 2.2 AA Assurance** — OPEN;
- **M5-04 — ASVS 5.0 Security Mapping** — OPEN;
- **M5-05 — SLO/SLI & Operational Observability** — OPEN;
- **M5-06 — Runtime Integration Maturity (Drive/Canva; Arena conditional)** — PARTIAL;
- **M5-07 — Institutional / Tier 2 Readiness** — CONDITIONAL / NOT AUTHORIZED.

## 8. Finding correnti

### A — Repository hygiene

Restano PR storiche/draft superseded. Devono essere chiuse come `SUPERSEDED` dopo verifica per far tornare `open` a significare lavoro realmente candidato.

### B — Release engineering

Non esiste ancora una disciplina completa di versione prodotto, release candidate, changelog/GitHub Release e rollback receipt. L'immutable SHA promotion resta una buona fondazione ma non chiude da sola M5-01.

### C — Sustained pilot evidence

I gate puntuali sono forti; manca ancora una finestra formalizzata di evidenza longitudinale sul normale uso scolastico delle journey critiche.

### D — Accessibility assurance

DPG/HVA contengono regole di accessibilità ma manca una matrice WCAG 2.2 AA requisito → evidenza → esito.

### E — Security assurance

I controlli applicativi sono forti ma non esiste ancora un mapping formale OWASP ASVS 5.0.

### F — SLO/SLI

Smoke, performance e recovery sono presenti ma manca una policy canonica di SLI/SLO/error budget.

### G — Runtime integrations

Il prossimo valore reale è la continuità **Docente OS ↔ Drive ↔ Canva** nel flusso didattico. Arena runtime resta requisito condizionale.

## 9. Priorità operative

Ordine corrente:

1. chiudere M5-00 riallineando tutta la documentazione sintetica;
2. chiudere le PR superseded e avviare release engineering;
3. usare normalmente DOCENTE OS e raccogliere sustained pilot evidence;
4. costruire WCAG 2.2 AA matrix e ASVS 5.0 mapping;
5. definire SLI/SLO su dati di pilot, non su soglie inventate;
6. maturare Drive/Canva sulle journey reali;
7. mantenere Tier 2 e multi-user separati finché non esiste una decisione istituzionale esplicita.

## 10. Regola anti-feature-creep

Durante il programma M5 ogni nuova feature deve essere classificata come:

- `MATURITY_REQUIRED`;
- `PILOT_REQUIRED`;
- `PROFESSIONAL_GAP_CONFIRMED`;
- `DEFERRED`.

Il default in assenza di evidenza è **DEFERRED**.
