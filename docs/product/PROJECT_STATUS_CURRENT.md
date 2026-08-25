# DOCENTE OS — Stato corrente canonico

Data: 2026-08-25  
Baseline runtime applicativa certificata: `fa570f44bf79955068ac916581f5ddf24336fd30`  
Stato documento: **CURRENT / CANONICAL STATUS**

Questo documento è la sintesi autorevole dello stato operativo. I checkpoint precedenti restano storici e non devono essere usati per dedurre lo stato corrente quando divergono da questo file.

## 1. Classificazione

DOCENTE OS è una **Beta operativa avanzata** con governance Production molto avanzata. Core docente, persistenza, Auth/RLS/Storage, Conoscenza, Planner, Orario, Calendario, Piano annuale, Classi, Progetta, X3, X4-A, authoring UDA, export, recovery account, lifecycle/export workspace, security, integrity e performance Beta sono implementati e sottoposti a gate.

La Production non è attiva. Lo stato infrastrutturale resta **PARTIALLY_PROVISIONED**: Supabase Production separato è realmente provisionato, schema-ready e vuoto; Render Production non è ancora stato creato. Dopo P7-F2 il repository contiene però un Blueprint Render Production separato, validato e non auto-deploy, più un gate di smoke runtime autenticato e non mutante pronto per l'esecuzione successiva. `productionActivationDecision = HOLD` e nessun dato reale è autorizzato.

## 2. Runtime canonico Beta

- codice applicativo: `product/`;
- Next.js 16 / React 19 / TypeScript strict;
- Supabase Auth + PostgreSQL + Storage + RLS;
- Beta: Render `docente-os-2026-27-beta`;
- branch: `develop`;
- build: `npm ci --no-audit --no-fund && npm run build`;
- lockfile: `product/package-lock.json`;
- Vercel non è gate canonico; Netlify è legacy.

La baseline runtime applicativa resta `fa570f44bf79955068ac916581f5ddf24336fd30`. P7-F ha modificato una migrazione storica di bootstrap per renderla fresh-install-safe; P7-F2 modifica solo governance/ops/workflow e non il runtime applicativo Beta.

## 3. Capability e invarianti

- X0/X1/X2: COMPLETE;
- X3: COMPLETE / `READ_ONLY-PROPOSE`;
- X4-A: COMPLETE / BETA-PROVEN — unica write assistita persistente autorizzata: `PLANNER_CREATE_TASK`;
- X5-A: COMPLETE / BETA-PROVEN — UDA versionate;
- X5-B: COMPLETE / BETA-PROVEN — export professionale;
- X6: FUTURE / NOT BASELINE;
- T1/T2/T3A/T3B/T3C/T4: COMPLETE.

Orario e Calendario restano domini indipendenti; la composizione avviene solo via Temporal Projection. Nessuna nuova write assistita è autorizzata senza gate dedicato.

## 4. Conoscenza e Storage Beta

Stato: **ADVANCED / BETA-PROVEN**.

Acquisizione testo/file, Storage privato, trasformazione/normalizzazione, generazioni, provenienza, classificazione, retry/cleanup, ricerca corrente, continuità Progetta → Conoscenza e ownership Storage sono provati. Ultima riconciliazione P5: **5 asset DB / 5 oggetti Storage / missing 0 / orphan 0**.

Residui: documenti completamente visuali senza provider visivo, upload grandi/resumable e off-site Storage recovery.

## 5. Gate permanenti rilevanti

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
- `production-readiness/review`;
- `production-render/blueprint`;
- `production-runtime/smoke` — manuale, pronto ma non ancora eseguito perché Render Production non esiste.

Il ciclo resta: slice piccola → gate specialistici/CI → exact-head merge → evidenza runtime/provisioning → cleanup → stato canonico.

## 6. Operational hardening

Stato: **P0 PASS / P1 PASS / P2 PASS applicativo / P3 PASS / P4 PASS / P5 PASS / P6-A PASS / P6-B PASS / P7-A PASS / P7-B PASS / P7-C PASS / P7-D PASS / P7-E PASS / P7-F PARTIAL PASS / P7-F2 HANDOFF PASS, RUNTIME PENDING**.

### P0–P6

Security baseline, monitoring, account recovery applicativo, data lifecycle/export, dependency security, Storage integrity e performance baseline Beta sono chiusi. Restore rehearsal, off-site Storage recovery e load/scale ampio restano separati dai gate già superati.

### P7-A — Promotion contract: PASS

Promozione solo da SHA immutabile certificato, decisione umana obbligatoria, nessuna promozione automatica, rollback applicativo verso SHA certificati, DB forward recovery finché restore non è provato, nessun rollback Storage distruttivo senza backup verificato.

### P7-B — Data topology: PASS / SEPARATE

Production usa progetto Supabase, DB, Auth, Storage e segreti distinti dal Beta. Vietati copia automatica Beta → Production, riuso credenziali e write cross-environment. Primo rilascio: `SINGLE_OWNER_PILOT` / `named_owner_only`, signup pubblico e onboarding multi-tenant disabilitati.

### P7-C — Infrastructure spec: PASS

Specifica machine-readable, nessun segreto nel repository, deploy Production solo da SHA certificato, auto-deploy off e blocco dei riferimenti Beta.

### P7-D — Readiness review: PASS / ACTIVATION HOLD

Il PASS certifica la correttezza della review, non la readiness finale.

Blocker di attivazione con dati reali:

1. `RESTORE_REHEARSAL` — DB/Auth recovery non ancora provato;
2. `OFFSITE_STORAGE_RECOVERY` — copia indipendente e restore Storage non ancora provati;
3. `INCIDENT_ESCALATION_MINIMUM` — escalation owner-visible non ancora implementata.

### P7-E — Provider selection: PASS

Provider applicativo del pilot Production: **Render**, regione **Frankfurt**, servizio pianificato `docente-os-2026-27-production`, auto-deploy disabilitato, deploy da SHA certificato.

### P7-F — Inactive provisioning: PARTIAL PASS

PR #183, head `7d44d42f920adbf70573f59a7a694f577ef78758`, merge `7ff1203d283398a03f2a01e46de0e3cec234c6bd`.

**Supabase Production reale:**

- progetto: `DOCENTE OS Production`;
- project ref: `xpxhlmpsvfzgsjxgieks`;
- regione: `eu-central-1`;
- stato: `ACTIVE_HEALTHY`;
- 36/36 migrazioni canoniche applicate fino a `knowledge_search_current`;
- Auth users: 0;
- workspace: 0;
- dati operativi: 0;
- bucket Storage privato `knowledge-assets`: 1;
- oggetti Storage: 0;
- nessun dato Beta o dato reale copiato.

Finding fresh-bootstrap: `0004_harden_event_trigger_rpc_exposure.sql` non era fresh-install-safe; è stata resa condizionale con `to_regprocedure(...)`. I gate P7-F sul medesimo head sono stati tutti verdi: Product CI, Operational Security, K1, X4, Production Infrastructure e Production Readiness.

### P7-F2 — Render handoff + runtime smoke contract: HANDOFF PASS / RUNTIME PENDING

PR #185, head `6cafa529df3956d2b55f1e8ef1be229488548a6f`, merge `c9551ae4bb3eedbf1cce374b4143c5dc0d7f168b`.

È stato integrato un Blueprint Production **separato dal Blueprint Beta**:

- file: `ops/render-production-blueprint.yaml`;
- servizio pianificato: `docente-os-2026-27-production`;
- runtime Node;
- regione Frankfurt;
- root `product`;
- build `npm ci --no-audit --no-fund && npm run build`;
- `autoDeployTrigger: off`;
- tier `free` esclusivamente per validazione inattiva, da rivalutare prima dell'attivazione;
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `NEXT_PUBLIC_APP_URL` dichiarate con `sync:false`, quindi nessun valore Production viene commesso nel repository.

Il gate permanente `production-render/blueprint` verifica isolamento dal Beta, assenza di chiavi/URL Beta, auto-deploy off e sintassi del contratto smoke.

È inoltre pronto `Production Runtime Smoke`, manuale e non mutante. Il gate:

- rifiuta esplicitamente l'URL applicativo Beta e il Supabase Beta;
- verifica root applicativa e `/api/build-info`;
- esegue login con una futura identità tecnica Production dedicata;
- verifica un RPC autenticato;
- non crea workspace, task, documenti o altri dati applicativi.

Sul medesimo head P7-F2 sono PASS:

- `production-render/blueprint`;
- `production-infrastructure/spec`;
- `production-readiness/review`.

**Stato reale dopo P7-F2:**

- Supabase Production: `PROVISIONED / SCHEMA_READY / EMPTY`;
- Render Production: `NOT_PROVISIONED`;
- handoff Render: `BLUEPRINT_READY`;
- runtime smoke: `PREPARED_NOT_RUN`;
- Production complessiva: `PARTIALLY_PROVISIONED`;
- activation: `HOLD`;
- real user data accepted: `false`.

L'unico passaggio non automatizzabile da questa sessione è la creazione/sincronizzazione del nuovo Blueprint nel dashboard Render autenticato e l'inserimento delle variabili Production-scoped. Blueprint Render e valori secret non vengono simulati come esistenti finché non sono realmente creati.

## 7. Maturità

- architettura/dominio: **molto matura**;
- persistenza/sicurezza/RLS: **matura**;
- dependency security/riproducibilità: **matura per Beta**;
- core operativo docente: **avanzato**;
- Human/UX: **molto avanzato e verificato**;
- Conoscenza: **molto matura**;
- CI/E2E/HVA: **molto maturo per Beta**;
- authoring UDA + export: **Beta-proven**;
- performance: **Beta-proven entro budget**;
- Production governance: **molto avanzata**;
- Production infrastructure: **Supabase provisionato; Render handoff pronto ma servizio non ancora creato**.

## 8. Prossime priorità autorizzate

1. **P7-F2-RUNTIME** — sincronizzare manualmente il Blueprint Render Production, configurare le variabili Production-scoped fuori dal repository, creare un'identità tecnica Production dedicata ed eseguire `production-runtime/smoke`; nessun dato reale e nessuna attivazione;
2. eseguire **restore rehearsal DB/Auth** nell'ambiente isolato;
3. definire e provare **off-site Storage backup/restore**;
4. introdurre **incident escalation minima** owner-visible;
5. rivalutare l'activation gate;
6. eseguire **load/scale isolato** prima di rollout più ampio;
7. pilotaggio continuativo settembre–ottobre.

Non introdurre nuove macro-capability per riempire artificialmente la roadmap.
