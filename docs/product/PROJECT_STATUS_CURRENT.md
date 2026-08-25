# DOCENTE OS — Stato corrente canonico

Data: 2026-08-25  
Baseline runtime applicativa certificata: `fa570f44bf79955068ac916581f5ddf24336fd30`  
Stato documento: **CURRENT / CANONICAL STATUS**

Questo documento è la sintesi autorevole dello stato operativo. I checkpoint precedenti restano storici e non devono essere usati per dedurre lo stato corrente quando divergono da questo file.

## 1. Classificazione

DOCENTE OS è una **Beta operativa avanzata** con governance Production in fase di hardening. Core docente, persistenza, Auth/RLS/Storage, Conoscenza, Planner, Orario, Calendario, Piano annuale, Classi, Progetta, X3, X4-A, authoring UDA, export, recovery account, lifecycle/export workspace, security, integrity e performance Beta sono implementati e sottoposti a gate.

La Production non è attiva. Dopo P7-F lo stato infrastrutturale è **PARTIALLY_PROVISIONED**: il progetto Supabase Production separato esiste ed è schema-ready ma vuoto; il servizio Render Production non è ancora stato creato. `productionActivationDecision = HOLD` e nessun dato reale è autorizzato.

## 2. Runtime canonico Beta

- codice applicativo: `product/`;
- Next.js 16 / React 19 / TypeScript strict;
- Supabase Auth + PostgreSQL + Storage + RLS;
- Beta: Render `docente-os-2026-27-beta`;
- branch: `develop`;
- build: `npm ci --no-audit --no-fund && npm run build`;
- lockfile: `product/package-lock.json`;
- Vercel non è gate canonico; Netlify è legacy.

La baseline runtime applicativa resta `fa570f44bf79955068ac916581f5ddf24336fd30`. P7-F ha modificato una **migrazione storica di bootstrap** per renderla fresh-install-safe; non ha modificato lo schema già applicato sul Beta né il comportamento applicativo servito dal Beta.

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
- `production-readiness/review`.

Il ciclo resta: slice piccola → gate specialistici/CI → exact-head merge → evidenza runtime/provisioning → cleanup → stato canonico.

## 6. Operational hardening

Stato: **P0 PASS / P1 PASS / P2 PASS applicativo / P3 PASS / P4 PASS / P5 PASS / P6-A PASS / P6-B PASS / P7-A PASS / P7-B PASS / P7-C PASS / P7-D PASS / P7-E PASS / P7-F PARTIAL PASS**.

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
- Planner tasks: 0;
- Knowledge assets: 0;
- authored documents: 0;
- calendar events: 0;
- teaching sessions: 0;
- bucket Storage privato `knowledge-assets`: 1;
- oggetti Storage: 0;
- nessun dato Beta o dato reale copiato.

**Finding fresh-bootstrap:** `0004_harden_event_trigger_rpc_exposure.sql` assumeva l'esistenza di `public.rls_auto_enable()` e falliva su un progetto nuovo. La migrazione è stata resa condizionale con `to_regprocedure(...)`. La correzione rende il bootstrap ripetibile senza modificare lo stato runtime già esistente sul Beta.

**Security:** gli advisor Production mostrano lo stesso profilo di warning previsto per gli RPC `SECURITY DEFINER` autenticati e intenzionali del Beta; non è emerso un nuovo warning specifico Production. Nella verifica corrente Production non espone il warning Beta sulla leaked-password protection.

**Render Production:** `NOT_PROVISIONED`. In questa sessione non è disponibile un connettore Render autenticato; non è stato quindi creato alcun servizio, URL applicativo o secret environment.

Verdetto:

- Supabase Production: `PROVISIONED / SCHEMA_READY / EMPTY`;
- Render Production: `NOT_PROVISIONED`;
- Production complessiva: `PARTIALLY_PROVISIONED`;
- activation: `HOLD`;
- real user data accepted: `false`.

Gate sullo stesso head P7-F: **Product CI PASS, Operational Security PASS, K1 PASS, X4 PASS, Production Infrastructure PASS, Production Readiness PASS**.

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
- Production infrastructure: **parzialmente provisionata, inattiva**.

## 8. Prossime priorità autorizzate

1. **P7-F2** — creare il servizio Render Production isolato e inattivo, configurare le variabili Production-scoped fuori dal repository e fare smoke autenticato con identità tecnica dedicata; nessun dato reale e nessuna attivazione;
2. eseguire **restore rehearsal DB/Auth** nell'ambiente isolato;
3. definire e provare **off-site Storage backup/restore**;
4. introdurre **incident escalation minima** owner-visible;
5. rivalutare l'activation gate;
6. eseguire **load/scale isolato** prima di rollout più ampio;
7. pilotaggio continuativo settembre–ottobre.

Non introdurre nuove macro-capability per riempire artificialmente la roadmap.
