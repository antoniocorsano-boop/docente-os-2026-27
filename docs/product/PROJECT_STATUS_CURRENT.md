# DOCENTE OS — Stato corrente canonico

Data: **2026-09-12**  
Stato documento: **CURRENT / CANONICAL STATUS**

Questo documento è la sintesi autorevole dello stato operativo. I checkpoint precedenti e gli audit datati restano storici e non devono essere usati per dedurre lo stato corrente quando divergono da questo file.

Baseline di sviluppo integrata prima dell'apertura di M5-04:

`develop` @ `0e815f0aaf596b2430924424eeb63714de1efa3f`

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

Questi indicatori non vengono aumentati automaticamente dall'apertura o dal superamento di un singolo gate M5: la maturazione deve essere sostenuta da evidenza osservata e copertura completa dei requisiti pertinenti.

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

La prova MFA reale ha fatto emergere un gap UI distinto dalla sicurezza del boundary: manca ancora una superficie esplicita **Account e sicurezza** per gestione credenziali, fattori MFA e logout. Il finding è registrato nell'issue **#347** e non viene confuso con le Impostazioni professionali.

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
- **Pilot Evidence Policy** — M5-02;
- **WCAG 2.2 AA Assurance** — M5-03, con matrice completa, validator e browser automation Playwright/axe;
- **OWASP ASVS 5.0 Assurance** — M5-04, con baseline v5.0.0, target L2, matrice capitoli, finding prioritari e validator anti-waiver.

La chiusura DPG-2 è stata certificata sull'exact head `f9953382e8ee8ef6307fa3859066bfb8d3e063a4` prima del merge #336.

Per M5-03, il baseline automatizzato sul commit `20eb47b7e35faf3114dcbfe32ee320c1cfcc9557` ha superato WCAG automated assurance run `34672053257`, HVA run `34672053242`, HIM, DPG, Product CI e P6. Il regression gate WCAG `34678320806` è inoltre PASS sul CSP implementation head corretto `1498b675d7d8d9d897867317df3bf07193240833`. Questa è **automation evidence**, non una dichiarazione di conformità WCAG 2.2 AA.

Per M5-04, la foundation usa OWASP ASVS **5.0.0 stabile**, target **L2**, con `verificationClaim=false` e `requirementLevelMappingComplete=false`. Il gate machine-readable impedisce di marcare capitoli `VERIFIED_PASS` prima della mappatura requisito-per-requisito e mantiene espliciti i gap L1/L2 noti. **ASVS-001 / V3.4.3 è `CLOSED_VERIFIED`** sull'implementation SHA `1498b675d7d8d9d897867317df3bf07193240833`; **ASVS-002 / V5.2.2 è `CLOSED_VERIFIED`** sull'implementation SHA `f0c5ee3b4b4995dec78836571584bc9f72e78890`; **ASVS-003 / V6.3.3 è `CLOSED_VERIFIED`** sull'implementation SHA `1f04f2799f9993c53d0578f8caafbe9e9842e60f`, con Product CI, AAL2 Data Plane, Browser Gate, runtime provider isolato e prova umana completa recovery → nuova password → nuovo login → MFA → `Oggi`.

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
- **M5-03A — WCAG 2.2 AA Matrix & Automated Assurance** — **PARTIAL**, baseline automatizzata PASS ma manual receipts ancora incomplete;
- **M5-03B — Keyboard / Focus / Reflow** — **PARTIAL**;
- **M5-03C — Assistive Technology Evidence** — **OPEN**;
- **M5-04A — OWASP ASVS 5.0 Mapping** — **PARTIAL**, V3.4.3, V5.2.2 e V6.3.3 chiusi con receipt; requirement-level mapping e altre receipt provider-managed restano incomplete;
- **M5-04B — Dependency/Security Cadence** — **PARTIAL**;
- **M5-05 — SLO/SLI & Operational Observability** — OPEN/PARTIAL;
- **M5-06 — Runtime Integration Maturity (Drive/Canva; Arena conditional)** — PARTIAL;
- **M5-07 — Institutional / Tier 2 Readiness** — CONDITIONAL / NOT AUTHORIZED.

## 8. M5-01 Release Engineering

Sono canonici:

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

## 10. M5-03 WCAG 2.2 AA Assurance

Fonti canoniche:

- `docs/product/WCAG_2_2_AA_ASSURANCE_CANONICAL.md`;
- `ops/wcag22-aa-assurance.json`;
- `.github/scripts/validate-wcag22-aa-assurance.mjs`;
- `.github/workflows/wcag22-aa-assurance.yml`;
- `product/e2e/experience/accessibility.spec.mjs`.

Stato verificato:

- tutti i 55 criteri A/AA sono presenti nella matrice;
- `conformanceClaim=false`;
- 2.4.1 Bypass Blocks è `VERIFIED_PASS` con skip-link e receipt browser;
- il primo finding automatizzato di contrasto è stato corretto sistemicamente nei token canonici;
- la suite axe mobile+desktop è PASS sul run `34672053257`;
- il regression gate WCAG `34678320806` è PASS dopo la stabilizzazione della precondizione di focus del test first-Tab;
- restano criteri `MANUAL_REQUIRED`, audit keyboard/reflow completo e baseline screen reader.

Pertanto **M5-03 non è COMPLETE e non esiste alcuna dichiarazione di conformità WCAG 2.2 AA**.

## 11. M5-04 OWASP ASVS 5.0 Assurance

Fonti canoniche:

- `docs/product/ASVS_5_0_ASSURANCE_CANONICAL.md`;
- `ops/asvs50-assurance.json`;
- `ops/mfa-v6-3-3-closure-receipt.json`;
- `.github/scripts/validate-asvs50-assurance.mjs`;
- `.github/workflows/asvs50-assurance.yml`.

Stato corrente:

- standard stabile **ASVS 5.0.0**;
- target **L2**;
- `verificationClaim=false`;
- 17 capitoli censiti;
- requirement-level mapping ancora incompleta;
- **ASVS-001 / V3.4.3 — `CLOSED_VERIFIED`** sull'implementation SHA `1498b675d7d8d9d897867317df3bf07193240833`;
- **ASVS-002 / V5.2.2 — `CLOSED_VERIFIED`** sull'implementation SHA `f0c5ee3b4b4995dec78836571584bc9f72e78890`;
- **ASVS-003 / V6.3.3 — `CLOSED_VERIFIED`** sull'implementation SHA `1f04f2799f9993c53d0578f8caafbe9e9842e60f`, con receipt machine, provider-runtime e umana;
- i tre finding prioritari iniziali sono quindi chiusi, ma i capitoli e la mappatura complessiva non sono ancora verificati integralmente.

Pertanto **M5-04A è PARTIAL e non esiste alcuna dichiarazione di verifica ASVS L2**.

## 12. Finding correnti

### A — Repository hygiene

Le tranche DPG-2 #328/#329/#330/#331/#332/#334 sono state chiuse come `SUPERSEDED`. Le PR restanti devono essere classificate individualmente: la catena C2P contiene lavoro non assorbito e non va chiusa meccanicamente; #262 contiene un caso reale non presente in `develop`.

### B — Release engineering residuo

Versioning e RC contract sono chiusi. Resta aperta la prima release reale sotto M5-01: non verrà creata una release fittizia per chiudere il gate.

### C — Sustained pilot evidence

L'infrastruttura di evidence è attiva, ma manca ancora la finestra di `HUMAN_USE` su normali giornate scolastiche. M5-02 resta PARTIAL finché tale evidenza non esiste.

### D — Accessibility assurance

La matrice WCAG 2.2 AA e il gate automatizzato esistono e il baseline browser è verde. Restano da chiudere le receipt dei criteri manuali, la traversata completa keyboard/focus/reflow e la baseline assistive technology. Nessun PASS automatico può essere trasformato in dichiarazione di conformità generale.

### E — Security assurance

La foundation OWASP ASVS 5.0.0 è attiva con target L2 e gate anti-waiver. **V3.4.3 CSP**, **V5.2.2 file content/type validation** e **V6.3.3 MFA/AAL2** sono `CLOSED_VERIFIED` con implementation SHA e receipt strutturate. Restano incomplete la mappatura requirement-level L1/L2 e le receipt provider/runtime degli altri controlli applicabili.

### F — SLO/SLI

Smoke, performance e recovery sono presenti, ma le soglie devono essere derivate dalla baseline M5-02 e non inventate anticipatamente.

### G — Account e sicurezza UI

La sicurezza MFA è implementata e verificata, ma la prova mobile reale ha evidenziato l'assenza di una superficie utente dedicata per account, password, fattori MFA e logout. Il gap è registrato nell'issue **#347** come `PROFESSIONAL_GAP_CONFIRMED` e va chiuso in una slice separata, senza alterare retroattivamente la receipt V6.3.3.

### H — Runtime integrations

Il prossimo valore reale è la continuità **Docente OS ↔ Drive ↔ Canva** nel flusso didattico. Arena runtime resta requisito condizionale.

## 13. Priorità operative

1. completare e integrare in ordine lo stack security M5-04, preservando le receipt exact-head;
2. aprire la slice separata **Account e sicurezza** dall'issue #347;
3. continuare la classificazione individuale delle PR aperte senza chiudere lavoro vivo;
4. raccogliere M5-02 durante il normale lavoro docente, registrando anche friction, workaround e failure;
5. completare le prove manuali M5-03 e la baseline screen reader, mantenendo axe/HVA verdi;
6. preservare le closure di **V3.4.3**, **V5.2.2** e **V6.3.3** e proseguire la mappatura requirement-level M5-04;
7. definire SLI/SLO soltanto dopo la prima baseline osservata M5-02;
8. maturare Drive/Canva sulle journey reali;
9. mantenere Tier 2 e multi-user separati finché non esiste una decisione istituzionale esplicita.

## 14. Regola anti-feature-creep

Durante il programma M5 ogni nuova feature deve essere classificata come:

- `MATURITY_REQUIRED`;
- `PILOT_REQUIRED`;
- `PROFESSIONAL_GAP_CONFIRMED`;
- `DEFERRED`.

Il default in assenza di evidenza è **DEFERRED**.
