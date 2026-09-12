# DOCENTE OS — Stato corrente canonico

Data: **2026-09-12**  
Stato documento: **CURRENT / CANONICAL STATUS**

Questo documento è la sintesi autorevole dello stato operativo. I checkpoint precedenti e gli audit datati restano storici e non devono essere usati per dedurre lo stato corrente quando divergono da questo file.

Baseline di sviluppo corrente all'apertura di M5-02:

`develop` @ `b1953126fd4e7214304db309addaa59d1f38f9ee`

## 1. Classificazione

DOCENTE OS è classificato:

**M4 — ADVANCED CONTROLLED PRODUCTION PILOT**

Il single-owner professional core è sostanzialmente completo; la priorità del progetto è **maintenance & maturation** verso M5.

Audit corrente:

- `docs/product/SYSTEM_MATURITY_AUDIT_2026-09-12.md`;
- `docs/product/M5_READINESS_MATRIX_2026-09-12.md`.

Indicatori interni di audit, non certificazioni:

- completamento single-owner docente: **≈91%**;
- maturità ingegneristica: **≈4,10/5**;
- readiness M5/general distribution: **≈68–72%**.

Questi indicatori non vengono aumentati perché è stata aperta M5-02: la maturazione deve essere sostenuta da evidenza osservata.

## 2. Production e dati reali

Resta valido il modello di Production separata in modalità **SINGLE_OWNER_PILOT** con promozione tramite SHA immutabile certificato.

La Production certificata non viene automaticamente sostituita dal `develop` corrente: una nuova promozione richiede release candidate, gate applicabili, decisione umana e smoke post-deploy secondo il contratto M5-01.

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

- Home/Oggi;
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

Human Interaction Model, HVA, mobile rules e Design Policy Gate restano gate permanenti.

## 6. Assurance e gate

Il prodotto dispone di:

- Product CI: test + typecheck + lint + build;
- Human Interaction Model;
- Human + Visual Acceptance;
- DPG-1 / DPG-2;
- P6 Performance Baseline;
- X4 Planner Confirmed Write;
- X5 UDA Versioned Authoring;
- X5B Professional UDA Export;
- K1 Knowledge Upload;
- P7 Anonymization Input Guard;
- operational security e dependency security;
- recovery/storage/incident gates P7;
- **Release Engineering Policy** — M5-01;
- **Pilot Evidence Policy** — M5-02, in introduzione sulla tranche corrente.

La chiusura DPG-2 è stata certificata sull'exact head `f9953382e8ee8ef6307fa3859066bfb8d3e063a4` prima del merge #336.

## 7. Maturity program M5

Il programma attivo è:

**FEATURE DEVELOPMENT → MAINTENANCE & MATURATION PROGRAM**

Stato gate:

- **M5-00 — Canonical State & Maturity Baseline** — **COMPLETE**;
- **M5-01A — Repository Hygiene** — **PARTIAL**;
- **M5-01B — Versioning** — **COMPLETE**;
- **M5-01C — Release Candidate Contract** — **COMPLETE**;
- **M5-01D — GitHub Release / changelog** — **PARTIAL**, in attesa della prima release reale;
- **M5-02 — Sustained Pilot Evidence** — **COLLECTING / PARTIAL**;
- **M5-03 — WCAG 2.2 AA Assurance** — OPEN/PARTIAL secondo la sottodimensione;
- **M5-04 — ASVS 5.0 Security Mapping** — OPEN/PARTIAL;
- **M5-05 — SLO/SLI & Operational Observability** — OPEN/PARTIAL;
- **M5-06 — Runtime Integration Maturity (Drive/Canva; Arena conditional)** — PARTIAL;
- **M5-07 — Institutional / Tier 2 Readiness** — CONDITIONAL / NOT AUTHORIZED.

## 8. M5-01 Release Engineering

Sono ora canonici:

- `docs/product/RELEASE_ENGINEERING_CANONICAL.md`;
- `ops/release-engineering-policy.json`;
- `CHANGELOG.md`;
- gate `release-engineering/policy`.

Regole chiave:

- SemVer per le release formali;
- major `0` durante M4;
- `1.0.0` riservata alla decisione M5;
- RC immutabile su exact SHA;
- `CERTIFIED` non equivale a `PROMOTED`;
- Production resta human-gated;
- il pilot Production del 25 agosto resta `LEGACY_UNVERSIONED_CERTIFIED_PILOT`, senza versione retroattiva inventata.

## 9. M5-02 Sustained Pilot Evidence

La raccolta M5-02 usa:

- `docs/product/SUSTAINED_PILOT_EVIDENCE_CANONICAL.md`;
- `ops/pilot-evidence-policy.json`;
- `ops/pilot-evidence-ledger.json`;
- gate `m5/pilot-evidence`.

Stato iniziale deliberato:

- baseline tecnica già registrabile tramite machine gates e runtime smoke certificati;
- `HUMAN_USE = 0` nella ledger iniziale;
- `humanUseEvidenceSufficient = false`;
- `thresholdsFrozen = false`;
- `m502ClosureAuthorized = false`.

Un machine gate non può contare come uso umano. Successi, attriti, workaround, incidenti e recovery devono poter essere registrati con la stessa grammatica append-only e senza dati personali scolastici.

## 10. Finding correnti

### A — Repository hygiene

Le tranche DPG-2 #328/#329/#330/#331/#332/#334 sono state chiuse come `SUPERSEDED`. Le PR restanti devono essere classificate individualmente: la catena C2P contiene lavoro non assorbito e non va chiusa meccanicamente; #262 contiene un caso reale non presente in `develop`.

### B — Release engineering residuo

Versioning e RC contract sono chiusi. Resta aperta la prima release reale sotto M5-01: non verrà creata una release fittizia per chiudere il gate.

### C — Sustained pilot evidence

L'infrastruttura di evidence è attiva, ma manca ancora la finestra di `HUMAN_USE` su normali giornate scolastiche. M5-02 resta PARTIAL finché tale evidenza non esiste.

### D — Accessibility assurance

DPG/HVA contengono regole di accessibilità ma manca una matrice WCAG 2.2 AA requisito → evidenza → esito.

### E — Security assurance

I controlli applicativi sono forti ma non esiste ancora un mapping formale OWASP ASVS 5.0.

### F — SLO/SLI

Smoke, performance e recovery sono presenti, ma le soglie devono essere derivate dalla baseline M5-02 e non inventate anticipatamente.

### G — Runtime integrations

Il prossimo valore reale è la continuità **Docente OS ↔ Drive ↔ Canva** nel flusso didattico. Arena runtime resta requisito condizionale.

## 11. Priorità operative

1. continuare la classificazione individuale delle PR aperte senza chiudere lavoro vivo;
2. raccogliere M5-02 durante il normale lavoro docente;
3. registrare anche friction, workaround e failure;
4. costruire WCAG 2.2 AA matrix e ASVS 5.0 mapping;
5. definire SLI/SLO soltanto dopo la prima baseline osservata M5-02;
6. maturare Drive/Canva sulle journey reali;
7. mantenere Tier 2 e multi-user separati finché non esiste una decisione istituzionale esplicita.

## 12. Regola anti-feature-creep

Durante il programma M5 ogni nuova feature deve essere classificata come:

- `MATURITY_REQUIRED`;
- `PILOT_REQUIRED`;
- `PROFESSIONAL_GAP_CONFIRMED`;
- `DEFERRED`.

Il default in assenza di evidenza è **DEFERRED**.
