# DOCENTE OS — Stato corrente canonico

Data: **2026-09-14**  
Stato documento: **CURRENT / CANONICAL STATUS**

Questo documento è la sintesi autorevole dello stato operativo. I checkpoint precedenti e gli audit datati restano storici e non devono essere usati per dedurre lo stato corrente quando divergono da questo file.

Baseline integrata corrente:

`develop` @ `77455d5f50bcccf2fed2cf5607dba3067fd81f97`

## 1. Classificazione

DOCENTE OS resta classificato:

**M4 — ADVANCED CONTROLLED PRODUCTION PILOT**

Il single-owner professional core è sostanzialmente completo; il programma attivo resta **maintenance & maturation** verso M5. La chiusura di Account e sicurezza e di M5-01A non costituisce da sola promozione a M5.

Fonti di maturità:

- `docs/product/SYSTEM_MATURITY_AUDIT_2026-09-12.md`;
- `docs/product/M5_READINESS_MATRIX_2026-09-12.md`;
- `docs/product/M5_01A_REPOSITORY_HYGIENE_RECEIPT_2026-09-14.md`.

Gli indicatori percentuali degli audit precedenti restano indicatori interni e non certificazioni. Non vengono aumentati automaticamente da un singolo gate.

## 2. Production e dati reali

Production resta separata da `develop` e governata come **SINGLE_OWNER_PILOT** tramite SHA immutabile certificato.

Un merge in `develop` non equivale a promozione in Production. Una nuova promozione richiede release candidate, gate applicabili, decisione umana e smoke post-deploy secondo il contratto M5-01.

### Ambito dati ammesso

È ammesso esclusivamente:

`TIER_1_OWNER_PROFESSIONAL_NON_PERSONAL`.

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
- Netlify e la vecchia app statica root restano legacy/reference.

Invarianti permanenti:

- il docente conserva l'autorità sulle decisioni professionali;
- `TeachingSession` è la ricevuta autorevole dell'accaduto didattico;
- nessun automatismo può promuovere un blocco del Piano a `SVOLTO` senza autorità umana;
- Orario e Calendario restano domini distinti, composti tramite Temporal Projection;
- nessun dato Tier 2 viene ammesso implicitamente da nuove feature o integrazioni.

## 4. Capability consolidate

### Product experience

- **X0 — COMPLETE**: fondazioni canoniche;
- **X1 — COMPLETE**: component foundation;
- **X2 — COMPLETE**: Professional AppShell;
- **X3 — COMPLETE** nel confine `READ_ONLY / PROPOSE`;
- **X4-A — COMPLETE / BETA-PROVEN**: Planner write assistita con conferma umana e undo;
- **X5-A — COMPLETE / BETA-PROVEN**: authoring UDA versionato;
- **X5-B — COMPLETE / BETA-PROVEN**: export professionale UDA;
- **X6 — FUTURE / NOT BASELINE**.

### Superfici professionali consolidate in `develop`

- Home/Oggi;
- Planner/Attività;
- Classi e workspace di classe;
- Piano annuale;
- Progetta e UDA;
- Conoscenza con ingestione, trasformazione, provenienza e generations;
- Orario;
- Calendario;
- registrazione lezione e Diario;
- Impostazioni professionali;
- **Account e sicurezza**;
- libri di testo / risorse editoriali;
- assistente contestuale human-in-the-loop.

### Account e sicurezza — CLOSED / CONSOLIDATED

La foundation MFA/AAL2 **#346** è integrata in `develop` come:

`b07596f7c2142becd32eb66ed195ecbf5ac6b24a`

La superficie Account **#348** è stata certificata sull'exact head:

`41bb3c55c866c31c6b906382165f3c18821ec81e`

ed è stata integrata in `develop` come:

`77455d5f50bcccf2fed2cf5607dba3067fd81f97`

L'issue prodotto **#347** è chiusa con evidence. La capability comprende `/account`, `/account/mfa`, identità account, gestione fattori TOTP, cambio password protetto da AAL2, revoca delle altre sessioni e logout corrente, mantenendo separati Account e Impostazioni professionali.

Sul final head di #348 risultano PASS Product CI, MFA Browser AAL2, WCAG 2.2 AA Assurance, P6, ASVS 5.0 Assurance, Design Policy, Human Interaction Model, Production Readiness, Release Engineering, Pilot Evidence e Human + Visual Acceptance. La receipt HVA registra **24/24 osservazioni e 10 journey**, incluse le superfici Account mobile/desktop e la verifica finale del CTA MFA libero dalla navigazione inferiore.

Questa chiusura non equivale a promozione Production né a dichiarazione complessiva WCAG 2.2 AA o ASVS L2.

### Interoperabilità

Restano consolidati o governati:

- curriculum interoperability v2: applicability, coverage, persistence e revalidation;
- textbook adoption: foundation + MIM discovery;
- Lesson Workspace nel confine `PROPOSED → ACCEPTED`;
- feedback curricolare inverso Docente OS → Arena con privacy `PROFESSIONAL_NON_PERSONAL`;
- transport runtime cross-product con Arena fuori baseline finché il pilot non lo renda requisito dimostrato.

## 5. Design e Human Interaction

DPG-2 è **CLOSED / INTEGRATED** sul merge #336.

Baseline permanente:

- raw colors: **27**;
- local tokens: **13**;
- legacy brand references: **0**;
- decorative effects: **0**;
- raw radii: **1**;
- raw shadows: **5**.

I residui sono descritti in `product/design/DESIGN_DEBT_RESIDUALS.md`; la baseline può soltanto diminuire. Human Interaction Model, HVA, mobile rules e Design Policy Gate restano gate permanenti.

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
- recovery/storage/incident gates;
- Release Engineering Policy — M5-01;
- Pilot Evidence Policy — M5-02;
- WCAG 2.2 AA Assurance — M5-03;
- OWASP ASVS 5.0 Assurance — M5-04.

### M5-03 WCAG

La matrice A/AA e l'automazione esistono e i regression gate applicabili restano verdi. Restano criteri `MANUAL_REQUIRED`, audit keyboard/focus/reflow completo e baseline assistive technology.

**M5-03 non è COMPLETE e non esiste una dichiarazione complessiva di conformità WCAG 2.2 AA.**

### M5-04 ASVS

La foundation usa OWASP ASVS **5.0.0**, target **L2**, con `verificationClaim=false` e requirement-level mapping ancora incompleta.

Sono `CLOSED_VERIFIED`:

- **ASVS-001 / V3.4.3** — implementation SHA `1498b675d7d8d9d897867317df3bf07193240833`;
- **ASVS-002 / V5.2.2** — implementation SHA `f0c5ee3b4b4995dec78836571584bc9f72e78890`;
- **ASVS-003 / V6.3.3** — implementation SHA `1f04f2799f9993c53d0578f8caafbe9e9842e60f`.

La closure Account #348 preserva i boundary AAL2 ma non trasforma queste closure in una verifica ASVS L2 complessiva.

## 7. Maturity program M5

Il programma attivo è:

**FEATURE DEVELOPMENT → MAINTENANCE & MATURATION PROGRAM**

Stato gate:

- **M5-00 — Canonical State & Maturity Baseline** — **COMPLETE**;
- **M5-01A — Repository Hygiene** — **COMPLETE**;
- **M5-01B — Versioning** — **COMPLETE**;
- **M5-01C — Release Candidate Contract** — **COMPLETE**;
- **M5-01D — GitHub Release / changelog** — **PARTIAL**, in attesa della prima release reale;
- **M5-02 — Sustained Pilot Evidence** — **COLLECTING / PARTIAL**;
- **M5-03A — WCAG 2.2 AA Matrix & Automated Assurance** — **PARTIAL**;
- **M5-03B — Keyboard / Focus / Reflow** — **PARTIAL**;
- **M5-03C — Assistive Technology Evidence** — **OPEN**;
- **M5-04A — OWASP ASVS 5.0 Mapping** — **PARTIAL**;
- **M5-04B — Dependency/Security Cadence** — **PARTIAL**;
- **M5-05 — SLO/SLI & Operational Observability** — **OPEN/PARTIAL**;
- **M5-06 — Runtime Integration Maturity (Drive/Canva; Arena conditional)** — **PARTIAL**;
- **M5-07 — Institutional / Tier 2 Readiness** — **CONDITIONAL / NOT AUTHORIZED**.

## 8. M5-01A Repository Hygiene — COMPLETE

La closure è registrata in:

`docs/product/M5_01A_REPOSITORY_HYGIENE_RECEIPT_2026-09-14.md`

Esito:

- chiuse senza merge le PR superate **#360, #254, #286, #255, #251**;
- preservato lo stack C2P **#298–#307** come `STACKED_LIVE`;
- preservata **#350** come Teaching Evidence foundation `STACKED_LIVE / BLOCKED`;
- classificati come candidati di maturazione **#361, #262, #259, #234, #170**, con **#261** candidato da ribasare/verificare;
- classificati come rinviati **#311, #260, #252, #86** con motivazione esplicita.

Nessuna PR aperta resta priva di una classificazione intenzionale. La hygiene chiude l'ambiguità della coda, non autorizza i merge dei candidati attivi.

## 9. M5-02 Sustained Pilot Evidence

La raccolta M5-02 usa:

- `docs/product/SUSTAINED_PILOT_EVIDENCE_CANONICAL.md`;
- `ops/pilot-evidence-policy.json`;
- `ops/pilot-evidence-ledger.json`;
- gate `m5/pilot-evidence`.

L'evidenza automatizzata non conta come `HUMAN_USE`. Successi, attriti, workaround, incidenti e recovery devono essere registrati durante normali giornate di utilizzo, senza dati personali scolastici.

La journey Account ora può entrare nella futura evidence longitudinale:

`login AAL2 → Account → verifica identità/stato MFA → gestione fattore o password/sessioni → feedback → ritorno al lavoro`

La certificazione di #348 resta evidence tecnica e non viene conteggiata retroattivamente come uso umano M5-02.

## 10. Finding correnti

### A — Candidati di maturazione

- **#361**: convergenza `Registra la lezione` su TeachingSession; candidato attivo, nessun merge prima dei final-head gate;
- **#262**: fail-closed risoluzione plesso MIM; rebase e ricertificazione;
- **#259**: hardening server-side Calendario; rebase e ricertificazione;
- **#234**: promozione governance DOCX con media non ancora assorbita dal contratto P7 corrente; riconciliazione richiesta;
- **#170**: bounded Knowledge search/P6; verificare il delta utile sulla baseline corrente prima del rebase;
- **#261**: canone temporale A.S. 2026/27; verificare riferimenti correnti e ribasare.

### B — Stack deliberatamente non promosso

- Teaching Evidence **#350** resta bloccata da #361;
- C2P **#298–#307** resta lavoro stacked vivo, senza merge/deploy isolato.

### C — Lavoro rinviato

- **#311** e **#260** richiedono evidenza M5-02 prima di riattivare nuove capacità di prodotto;
- **#252** resta riferimento esterno rinviato;
- **#86** resta checkpoint professionale in attesa di decisione umana.

### D — Release engineering residuo

Versioning e RC contract sono chiusi. M5-01D resta PARTIAL fino alla prima release reale; non verrà emessa una release fittizia per chiudere il gate.

### E — P7 governance

La `develop` corrente conserva `ops/anonymization-input-guard.json` a `schemaVersion: 6` e mantiene il DOCX media-preserving path non ammesso. La PR #234 va quindi riconciliata, non considerata assorbita né mergiata sul vecchio head.

### F — SLO/SLI

Smoke, performance e recovery esistono, ma soglie e budget devono derivare dalla baseline M5-02, non essere inventati anticipatamente.

## 11. Priorità operative

1. portare **#361** a final-head certification e integrare soltanto se tutti i gate applicabili restano verdi;
2. mantenere **#350** bloccata finché la semantica TeachingSession non è consolidata;
3. affrontare **uno alla volta** i candidati di maturazione #262, #259, #234, #170 e #261 mediante rebase/reconciliation sulla baseline corrente;
4. raccogliere **M5-02 Pilot Evidence** durante il normale lavoro docente, registrando successi, friction, workaround e failure;
5. completare le prove manuali **M5-03** e la baseline assistive technology mantenendo verdi i gate automatizzati;
6. completare la mappatura requirement-level **M5-04** senza false claim;
7. definire SLI/SLO soltanto dopo una baseline osservata M5-02;
8. maturare **Drive/Canva** sulle journey didattiche reali;
9. mantenere C2P runtime, Tier 2 e multi-user separati finché non esiste una decisione esplicita supportata da evidenza.

## 12. Regola anti-feature-creep

Durante il programma M5 ogni nuova feature deve essere classificata come:

- `MATURITY_REQUIRED`;
- `PILOT_REQUIRED`;
- `PROFESSIONAL_GAP_CONFIRMED`;
- `DEFERRED`.

Il default in assenza di evidenza è **DEFERRED**.