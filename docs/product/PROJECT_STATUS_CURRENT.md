# DOCENTE OS — Stato corrente canonico

Data: 2026-08-25  
Head canonico `develop` dopo integrazione del gate DB restore: `7f2ad9b50d510cc447091bbf52e4826877a5f1fd`  
Stato documento: **CURRENT / CANONICAL STATUS**

Questo documento è la sintesi autorevole dello stato operativo. I checkpoint precedenti restano storici e non devono essere usati per dedurre lo stato corrente quando divergono da questo file.

## 1. Classificazione

DOCENTE OS è una **Beta operativa avanzata** con infrastruttura Production inattiva realmente provisionata e verificata tecnicamente.

La Production **non è attiva** e non è autorizzata a ricevere dati professionali reali. `productionActivationDecision = HOLD`.

Stato infrastrutturale corrente:

- Beta Render: operativa su `docente-os-2026-27-beta`;
- Supabase Production: separato, schema-ready;
- Render Production: provisionato e raggiungibile su `https://docente-os-2026-27-production.onrender.com`;
- Auth Production tecnica: verificata per il runtime smoke;
- runtime smoke Production autenticato: PASS;
- logical restore PostgreSQL isolato: PASS;
- dati applicativi Production: 0;
- auto-deploy Production: non autorizzato dal contratto;
- dati reali autorizzati: false.

## 2. Runtime e invarianti di prodotto

- codice applicativo: `product/`;
- Next.js 16 / React 19 / TypeScript strict;
- Supabase Auth + PostgreSQL + Storage + RLS;
- branch canonico: `develop`;
- Vercel non è gate canonico; Netlify è legacy.

Capability principali:

- X0/X1/X2: COMPLETE;
- X3: COMPLETE / `READ_ONLY-PROPOSE`;
- X4-A: COMPLETE / BETA-PROVEN — unica write assistita persistente autorizzata: `PLANNER_CREATE_TASK`;
- X5-A: COMPLETE / BETA-PROVEN — UDA versionate;
- X5-B: COMPLETE / BETA-PROVEN — export professionale;
- X6: FUTURE / NOT BASELINE;
- T1/T2/T3A/T3B/T3C/T4: COMPLETE.

Orario e Calendario restano domini indipendenti; la composizione avviene solo via Temporal Projection. Nessuna nuova write assistita è autorizzata senza gate dedicato.

## 3. Operational hardening

Stato:

**P0 PASS / P1 PASS / P2 PASS applicativo / P3 PASS / P4 PASS / P5 PASS / P6-A PASS / P6-B PASS / P7-A PASS / P7-B PASS / P7-C PASS / P7-D REVIEW CURRENT / P7-E PASS / P7-F PASS infrastrutturale / P7-F2 COMPLETE / DB_LOGICAL_RESTORE PASS / ACTIVATION HOLD**.

P0–P6 coprono security baseline, monitoring, account recovery applicativo, lifecycle/export, dependency security, Storage integrity e performance Beta entro budget.

## 4. P7 — Production governance e infrastruttura

### P7-A — Promotion contract

PASS. Production può essere allineata solo mediante SHA immutabile certificato e decisione umana esplicita. Nessun auto-deploy o promozione implicita da `develop`.

### P7-B — Data topology

PASS / SEPARATE. Production usa applicazione, progetto Supabase, DB, Auth, Storage e segreti distinti dal Beta. Nessuna copia automatica Beta → Production e nessun riuso di credenziali Beta.

### P7-C / P7-E

Specifica infrastrutturale validata. Provider applicativo scelto: Render, regione Frankfurt.

### P7-F — Supabase Production

Supabase Production reale:

- progetto: `DOCENTE OS Production`;
- project ref: `xpxhlmpsvfzgsjxgieks`;
- regione: `eu-central-1`;
- stato: `ACTIVE_HEALTHY`;
- schema canonico applicato e verificato;
- bucket privato `knowledge-assets` presente;
- nessun dato Beta importato.

Il fresh-bootstrap ha anche corretto la migrazione storica `0004_harden_event_trigger_rpc_exposure.sql` rendendo la revoca condizionale tramite `to_regprocedure(...)`.

Nota di conteggio: il provisioning Production storico registra 36 migrazioni applicate nel relativo registro; il nuovo gate di restore applica dinamicamente tutti i file SQL oggi presenti nel repository, che al run certificato erano 35. Il gate non usa più un numero hardcoded e non altera la ricevuta storica di provisioning.

### P7-F2 — Render Production + authenticated runtime smoke

Stato: **COMPLETE**.

Render Production reale:

- servizio: `docente-os-2026-27-production`;
- URL: `https://docente-os-2026-27-production.onrender.com`;
- regione: Frankfurt;
- root: `product`;
- auto-deploy: OFF per contratto;
- tier Free usato soltanto per validazione inattiva, da rivalutare prima dell'attivazione.

Il workflow `Production Runtime Smoke` è stato eseguito il 2026-08-25:

- run: `32836204567`;
- branch di esecuzione: `develop`;
- commit del workflow/test: `ee141fd156a788f2e4c2357ab0d09e6eec52f073`;
- commit applicativo servito da Render Production: `f33eb4785ed66630c3a162ae2f2c1bd5db64d532`;
- root Production: PASS;
- `/api/build-info`: PASS;
- login tecnico Production: PASS;
- sessione Auth: PASS;
- RPC autenticato `current_workspace_context`: PASS;
- `mutatingActionsPerformed = false`.

Verifica diretta post-smoke su Supabase Production:

- workspace: 0;
- membership: 0;
- academic years: 0;
- planner tasks: 0;
- Knowledge assets: 0;
- authored documents: 0;
- Storage objects: 0.

È presente soltanto l'identità tecnica Production dedicata al test. Nessun dato professionale reale è stato introdotto.

Ricevuta: `docs/product/P7F2_PRODUCTION_RUNTIME_RECEIPT.md`.

La differenza tra il codice canonico `develop` e Production servita = `f33eb478...` è coerente con il contratto: Production non segue automaticamente `develop`. Un eventuale allineamento è una futura decisione di promozione, non una conseguenza dei gate P7.

### P7 Recovery — logical DB restore

Stato componente: **PASS**.

PR #190 ha introdotto il gate permanente `p7-recovery/db-restore-rehearsal`. Sul run certificato `32837945388`, head `d2488cdf4399131696ba54bee375e87d7934446a`, il gate ha:

- creato PostgreSQL 16 effimero in GitHub Actions;
- applicato tutti i 35 file SQL canonici presenti;
- usato esclusivamente dati sintetici;
- creato un backup logico da 259526 byte;
- distrutto il database;
- eseguito restore in un database fresco;
- preservato fingerprint schema `4edad5ed83db226ebad83b0e915b684a`;
- ripristinato Auth catalog sintetico, workspace, membership, anno scolastico e Planner sentinel;
- preservato 26 tabelle `public` con RLS;
- toccato Beta: false;
- toccato Production: false.

Ricevuta: `docs/product/P7_DB_RESTORE_REHEARSAL_RECEIPT.md`.

Il risultato **non** prova ancora il servizio Supabase Auth end-to-end. Il recupero di `auth.users` dimostra il restore del catalogo PostgreSQL, non il funzionamento di GoTrue/Supabase Auth dopo un disaster recovery reale.

## 5. Readiness / blocker di activation

Production activation resta **HOLD**.

Il precedente blocker aggregato `RESTORE_REHEARSAL` è ora scomposto correttamente:

- `DB_LOGICAL_RESTORE` — **PASS**;
- `SUPABASE_AUTH_SERVICE_RECOVERY` — **OPEN / BLOCKER**.

Restano inoltre:

- `OFFSITE_STORAGE_RECOVERY` — **OPEN / BLOCKER**: copia indipendente e restore binario degli oggetti Storage da provare;
- `INCIDENT_ESCALATION_MINIMUM` — **OPEN / BLOCKER**: escalation owner-visible e receipt minima da implementare.

Watch non bloccanti per il pilot nominale:

- load/scale isolato prima di rollout più ampio;
- leaked-password protection quando il piano Supabase lo consente;
- longitudinal proof;
- retention/account deletion dopo evidenza sufficiente di export/recovery.

## 6. Gate permanenti rilevanti

Tra i gate permanenti restano:

- `product-ci`;
- `ops-security/supabase`;
- `ops-security/dependencies`;
- `ops-health/render-beta`;
- `p3-export/*`;
- `p5-storage-integrity/*`;
- `p6-performance/*`;
- `x3-e2e/*`;
- `x4-planner/*`;
- `x5-authoring/*`;
- `x5b-export/*`;
- `hva/runtime`;
- `production-promotion/contract`;
- `production-infrastructure/spec`;
- `production-readiness/review`;
- `production-render/blueprint`;
- `production-runtime/smoke`;
- `p7-recovery/db-restore-rehearsal`.

Nota corrente HVA: sul merge `ee141fd...` i journey HVA runtime sono passati, ma il gate globale ha registrato un `net::ERR_ABORTED` su uno stylesheet Next.js nella superficie Calendario desktop. È un finding runtime separato da P7 e non viene mascherato come PASS.

## 7. Prossime priorità autorizzate

Ordine raccomandato per validità, rischio e costo:

1. **INCIDENT_ESCALATION_MINIMUM** — chiudibile senza nuovo ambiente a pagamento e con alto valore operativo;
2. **SUPABASE_AUTH_SERVICE_RECOVERY** — prova end-to-end in ambiente Supabase realmente isolato o equivalente verificabile;
3. **OFFSITE_STORAGE_RECOVERY** — backup indipendente e restore binario degli originali Storage;
4. nuova Production Readiness Review;
5. solo successivamente decidere se promuovere uno SHA applicativo più recente su Production;
6. load/scale isolato prima di rollout più ampio;
7. pilotaggio continuativo settembre–ottobre.

Non introdurre nuove macro-capability per riempire artificialmente la roadmap.
