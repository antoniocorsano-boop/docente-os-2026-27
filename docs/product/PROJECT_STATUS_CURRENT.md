# DOCENTE OS — Stato corrente canonico

Data: 2026-08-25  
Baseline prodotto certificata: `develop` @ `fa570f44bf79955068ac916581f5ddf24336fd30`  
Stato documento: **CURRENT / CANONICAL STATUS**

Questo documento è la sintesi autorevole dello stato operativo. I checkpoint precedenti restano storici e non devono essere usati per dedurre lo stato corrente quando divergono da questo file.

## 1. Classificazione

DOCENTE OS è una **Beta operativa avanzata**. Persistenza, Auth, RLS, Storage, Planner, Orario, Calendario, Piano annuale, Progetta, Classi, Conoscenza, prima write assistita controllata, authoring UDA versionato, export PDF, account recovery, export workspace, dependency security, Storage integrity, performance baseline, promotion governance e Production readiness governance sono implementati e sottoposti a gate.

Non è ancora Production. L'ambiente Production non è creato né provisionato; la sua attivazione è formalmente **HOLD**. Topologia dati, specifica infrastrutturale e readiness review sono però già decise e machine-validated.

## 2. Runtime canonico

- codice applicativo: `product/`;
- Next.js 16 / React 19 / TypeScript strict;
- Supabase Auth + PostgreSQL + Storage + RLS;
- Beta canonico: Render `docente-os-2026-27-beta`;
- ramo Beta: `develop`;
- build Render: `npm ci --no-audit --no-fund && npm run build`;
- lockfile canonico: `product/package-lock.json`;
- Vercel non è gate canonico; le failure di quota non descrivono lo stato applicativo;
- Netlify è legacy.

La baseline applicativa certificata resta `fa570f44bf79955068ac916581f5ddf24336fd30`; P7-A/B/C/D modificano governance e infrastruttura, non `product/`.

## 3. Macro-capability

- **X0 COMPLETE** — decisioni canoniche esperienza;
- **X1 COMPLETE** — component foundation;
- **X2 COMPLETE** — AppShell, responsive navigation, command palette;
- **X3 COMPLETE / READ_ONLY-PROPOSE** — assistente contestuale senza write implicita;
- **X4-A COMPLETE / BETA-PROVEN** — unica write assistita persistente autorizzata: `PLANNER_CREATE_TASK`, con proposta → anteprima → conferma → creazione → ricevuta → undo;
- **X5-A COMPLETE / BETA-PROVEN** — authoring UDA versionato, separato dalla fonte, versioni immutabili, RLS e controllo concorrenza;
- **X5-B COMPLETE / BETA-PROVEN** — export professionale della versione UDA salvata/immutabile, senza write persistente;
- **X6 FUTURE / NOT BASELINE**.

Tempo e attività didattica: T1, T2, T3A, T3B, T3C e T4 sono COMPLETE. Orario e Calendario restano domini indipendenti; la composizione avviene solo via Temporal Projection.

## 4. Superfici operative

Disponibili: Home/Oggi/Planner, Conoscenza, Piano annuale, Progetta, authoring UDA, export PDF UDA, Classi, Orario, Calendario, Impostazioni, accesso/password recovery, export JSON owner-only del workspace, assistente X3 e write X4-A esclusivamente nel Planner.

## 5. Conoscenza e Storage

Stato: **ADVANCED / BETA-PROVEN**.

Provati: acquisizione testo/file, Storage privato, isolamento workspace, upload same-origin, trasformazione/normalizzazione, generazioni e provenienza, classificazione, PDF testuali/misti, retry/cleanup, ricerca prioritaria, continuità Progetta → Conoscenza, ownership Storage e receipt DB↔Storage.

P5 ha corretto la policy DELETE Storage e rimosso 25 blob E2E storici orfani. Verifica finale: **5 asset DB / 5 oggetti Storage / missing 0 / orphan 0**.

Residui: documenti completamente visuali senza provider visivo, upload grandi/resumable, copia/restore off-site Storage.

## 6. Human + Visual Acceptance e gate runtime

HVA è permanente. Stato rilevante:

- HVA Render Beta: **PASS**;
- K1 Render Beta: **PASS**;
- X3 application + Render Beta: **PASS**;
- X4 Planner Render Beta: **PASS**;
- Operational Security: **PASS**;
- P3 Workspace Export: **PASS**;
- P5 Storage Integrity: **PASS**;
- P6 Performance: **PASS** baseline e re-benchmark post-P6-B;
- V-07, V-08, X5-A e X5-B: **PASS**.

## 7. Gate permanenti

- `product-ci`;
- `ops-security/supabase`;
- `ops-security/dependencies`;
- `ops-health/render-beta`;
- `p3-export/application` / `p3-export/render-beta`;
- `p5-storage-integrity/application` / `p5-storage-integrity/render-beta`;
- `p6-performance/application` / `p6-performance/render-beta`;
- `x3-e2e/render-beta`;
- `x4-planner/render-beta`;
- `x5-authoring/render-beta`;
- `x5b-export/render-beta`;
- `hva/runtime`;
- `production-promotion/contract`;
- `production-infrastructure/spec`;
- `production-readiness/review`.

Il ciclo applicativo resta: slice piccola → CI/gate specialistico → HVA quando pertinente → merge exact-head → Render exact/equivalent → runtime gate → evidence/cleanup → aggiornamento canonico.

## 8. Operational hardening

Stato: **IN PROGRESS — P0 PASS / P1 PASS / P2 PASS applicativo / P3 PASS / P4 PASS / P5 PASS / P6-A PASS / P6-B PASS / P7-A PASS / P7-B PASS / P7-C PASS / P7-D PASS**.

### P0–P6

- P0 security baseline: PASS.
- P1 monitoring: PASS.
- P2 account recovery: PASS; restore rehearsal reale ancora non provato.
- P3 data lifecycle/export: PASS / BETA-PROVEN; deletion automation disabilitata.
- P4 dependency security: PASS; lockfile canonico, `npm ci`, nessun high/critical nel run finale.
- P5 Storage integrity: PASS / BETA-PROVEN; missing 0, orphan 0.
- P6-A performance baseline: PASS / BETA-PROVEN.
- P6-B Planner query: PASS / BETA-PROVEN; trasferimento storico inutile eliminato, budget ancora rispettati.

### P7-A — Promotion contract: PASS / CONTRACT READY

SHA immutabile, decisione umana obbligatoria, promozione automatica vietata, rollback applicativo solo verso SHA certificati, rollback DB automatico vietato prima del restore rehearsal, rollback Storage distruttivo vietato senza backup verificato.

### P7-B — Production data topology: PASS / DECIDED

- Production Supabase separato dal Beta;
- DB, Auth, Storage e segreti separati;
- nessuna write cross-environment;
- nessun riuso credenziali Beta;
- nessuna copia automatica Beta → Production;
- primo rilascio `SINGLE_OWNER_PILOT` / `named_owner_only`;
- signup pubblico e onboarding multi-tenant disabilitati;
- `productionEnvironmentState = NOT_CREATED`.

### P7-C — Production infrastructure spec: PASS / SPEC READY

- infrastruttura Production `NOT_PROVISIONED`;
- provider hosting `UNDECIDED`;
- servizio e progetto Supabase Production `UNASSIGNED`;
- deploy solo da SHA immutabile certificato;
- auto-deploy Production disabilitato;
- segreti production-scoped, mai nel repository;
- validator blocca riferimenti al Beta e materiale di chiave reale;
- dati iniziali `EMPTY_OR_EXPLICIT_OWNER_IMPORT`;
- nessun servizio, dominio, DNS, segreto, utente o progetto Supabase creato.

### P7-D — Production Readiness Review: PASS / ACTIVATION HOLD

Il gate `production-readiness/review` è **PASS** sulla PR #179, head `c73fb5a615a7cacabe13c24237d649adf1342d60`; merge P7-D `1ef1dbddee32ef9fe32034e59fc6e95afbeb2a3a`.

Il PASS certifica la **coerenza della review**, non la readiness finale. La decisione machine-readable è:

- `productionActivationDecision = HOLD`;
- `inactiveProvisioningDecision = ALLOWED_AFTER_PROVIDER_SELECTION`;
- provisioning e attivazione sono separati;
- infrastruttura inattiva può essere usata per prove di recovery;
- dati reali richiedono un activation gate successivo.

**Blocker di attivazione con dati reali:**

1. `RESTORE_REHEARSAL` — DB/Auth recovery non ancora provato su ambiente isolato;
2. `OFFSITE_STORAGE_RECOVERY` — copia indipendente degli originali e restore Storage non ancora provati;
3. `INCIDENT_ESCALATION_MINIMUM` — manca una escalation owner-visible con receipt minima oltre al monitor GitHub.

**Blocker di provisioning:**

- `PRODUCTION_PROVIDER_SELECTION` — il provider hosting Production resta `UNDECIDED`.

**Watch non bloccanti per il pilot single-owner:**

- load/scale isolato, da chiudere prima di rollout più ampio;
- leaked-password protection, plan-dependent;
- prova longitudinale;
- retention/account deletion, che resta disabilitata.

## 9. Maturità

- architettura/dominio: **molto matura**;
- persistenza/sicurezza/RLS: **matura**;
- dependency security/riproducibilità: **matura per Beta**;
- core operativo docente: **avanzato**;
- Human/UX: **molto avanzato e verificato**;
- Conoscenza: **molto matura**;
- CI/E2E/HVA: **molto maturo per Beta**;
- authoring UDA + export PDF: **Beta-proven**;
- account recovery: **verificato**;
- data lifecycle/export: **Beta-proven**;
- performance: **Beta-proven entro budget**, load/scale non ancora provato;
- Production governance: **P7-A/B/C/D formalizzati e gated**;
- Production: **non creata / non provisionata / non attiva / activation HOLD**.

## 10. Rischi e residui prioritari

1. **P7-E provider selection + inactive provisioning plan** — scegliere provider, service boundary, regione e secret mechanism senza attivazione né dati reali.
2. **Restore rehearsal DB/Auth** — blocker di attivazione.
3. **Off-site Storage backup/restore** — blocker di attivazione.
4. **Incident escalation minima** — blocker di attivazione.
5. **Load/scale isolato** — watch per pilot, requisito prima del rollout più ampio.
6. **Leaked-password protection** — quando il piano lo consente.
7. **Longitudinal proof** — settimane/mesi reali di uso scolastico.
8. **Governance X4** — `PLANNER_CREATE_TASK` resta l'unica write assistita finché una nuova capability non supera un gate separato.

## 11. Ordine di maturazione autorizzato

1. **P7-E** — scegliere il provider Production e definire il piano di provisioning inattivo; nessuna attivazione e nessun dato reale;
2. usare l'ambiente isolato per chiudere **restore rehearsal DB/Auth**;
3. definire e provare **off-site Storage backup/restore**;
4. introdurre una **incident escalation minima** owner-visible;
5. rivalutare l'activation gate;
6. eseguire **load/scale isolato** prima di rollout più ampio;
7. pilotaggio continuativo settembre–ottobre e nuove tranche guidate da evidenza reale.

Non introdurre nuove macro-capability per riempire artificialmente la roadmap.
