# DOCENTE OS — Stato corrente canonico

Data: 2026-08-25  
Stato documento: **CURRENT / CANONICAL STATUS**

Questo documento è la sintesi autorevole dello stato operativo. I checkpoint precedenti restano storici e non devono essere usati per dedurre lo stato corrente quando divergono da questo file.

## 1. Classificazione

DOCENTE OS è una **Beta operativa avanzata** con infrastruttura Production inattiva realmente provisionata e verificata tecnicamente.

La Production **non è attiva** e non è autorizzata a ricevere dati professionali reali. `productionActivationDecision = HOLD`.

Stato infrastrutturale:

- Beta Render: operativa;
- Supabase Production: separato, schema-ready;
- Render Production: `docente-os-2026-27-production`, Frankfurt, provisionato inattivo;
- Production Runtime Smoke autenticato: PASS, run `32836204567`;
- Production applicative rows dopo smoke: 0;
- identità Auth tecnica dedicata: 1;
- logical restore PostgreSQL isolato: PASS;
- incident escalation owner-visible: PASS;
- auto-deploy Production: OFF;
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

**P0 PASS / P1 PASS / P2 PASS applicativo / P3 PASS / P4 PASS / P5 PASS / P6-A PASS / P6-B PASS / P7-A PASS / P7-B PASS / P7-C PASS / P7-D REVIEW CURRENT / P7-E PASS / P7-F PASS / P7-F2 COMPLETE / DB_LOGICAL_RESTORE PASS / INCIDENT_ESCALATION_MINIMUM PASS / ACTIVATION HOLD**.

## 4. P7 — Production governance e infrastruttura

### Promotion e topologia

- P7-A: PASS; Production può essere promossa solo mediante SHA immutabile certificato e decisione umana esplicita.
- P7-B: PASS / SEPARATE; nessuna copia automatica Beta → Production e nessun riuso di credenziali Beta.
- P7-C/P7-E: PASS; Render Frankfurt, auto-deploy disabilitato.

### Supabase e Render Production

Supabase Production:

- project ref `xpxhlmpsvfzgsjxgieks`;
- regione `eu-central-1`;
- schema canonico applicato;
- application data: 0;
- Storage objects: 0;
- identità tecnica Auth dedicata: 1.

Render Production:

- servizio `docente-os-2026-27-production`;
- URL `https://docente-os-2026-27-production.onrender.com`;
- regione Frankfurt;
- tier Free solo per validazione inattiva;
- auto-deploy OFF;
- runtime smoke PASS, run `32836204567`;
- commit applicativo servito durante lo smoke: `f33eb4785ed66630c3a162ae2f2c1bd5db64d532`;
- mutating actions: false.

Production non segue automaticamente `develop`.

### P7 Recovery — DB logical restore

**PASS.** Run `32837945388`:

- PostgreSQL 16 effimero;
- tutti i 35 file SQL canonici presenti al momento del run applicati;
- dati esclusivamente sintetici;
- backup logico → distruzione DB → restore fresco;
- fingerprint schema preservato: `4edad5ed83db226ebad83b0e915b684a`;
- workspace, membership, anno scolastico e Planner sentinel ripristinati;
- 26 tabelle `public` con RLS preservate;
- Beta/Production toccati: false.

Ricevuta: `docs/product/P7_DB_RESTORE_REHEARSAL_RECEIPT.md`.

Il risultato non prova ancora il servizio Supabase Auth end-to-end.

### P7 Incident escalation minimum

**PASS.** Implementazione PR #192, merge `075bf9e5f00b76ee1555656a98d87a88caa714b4`.

Il canale canonico minimo è GitHub Issue con:

- environment;
- severità SEV-1..SEV-4;
- detection time;
- observed condition;
- user/data impact;
- real-data flag;
- containment;
- owner action;
- evidence links;
- stato;
- safety confirmation;
- receipt finale di chiusura.

Gate `p7-incident/escalation-contract`: PASS, run `32838659845`.

Rehearsal sintetico issue #193:

- `PRODUCTION_INACTIVE` / `SEV-4`;
- assegnato a `antoniocorsano-boop`;
- dati reali: false;
- Beta/Production toccati: false;
- receipt finale presente;
- chiuso `completed` il `2026-08-25T10:45:02Z`.

Ricevuta: `docs/product/P7_INCIDENT_ESCALATION_REHEARSAL_RECEIPT.md`.

## 5. Readiness / blocker di activation

Production activation resta **HOLD**.

Blocker chiusi:

- `DB_LOGICAL_RESTORE` — PASS;
- `INCIDENT_ESCALATION_MINIMUM` — PASS.

Restano **due blocker**:

1. `SUPABASE_AUTH_SERVICE_RECOVERY` — OPEN / BLOCKER: serve prova end-to-end del servizio Auth dopo recovery, non solo restore del catalogo DB;
2. `OFFSITE_STORAGE_RECOVERY` — OPEN / BLOCKER: serve copia indipendente e restore binario verificato degli originali Storage.

Watch non bloccanti:

- load/scale isolato prima di rollout più ampio;
- leaked-password protection quando il piano Supabase lo consente;
- longitudinal proof;
- retention/account deletion dopo sufficiente evidenza di export/recovery.

## 6. Gate permanenti rilevanti

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
- `p7-recovery/db-restore-rehearsal`;
- `p7-incident/escalation-contract`.

## 7. Prossime priorità autorizzate

1. **SUPABASE_AUTH_SERVICE_RECOVERY** — individuare una prova realmente isolata e rappresentativa senza usare dati reali;
2. **OFFSITE_STORAGE_RECOVERY** — progettare copia indipendente e restore binario degli originali;
3. nuova Production Readiness Review;
4. solo dopo, valutare activation del pilot e promozione di uno SHA applicativo certificato più recente;
5. load/scale isolato prima di rollout più ampio.

Non introdurre nuove macro-capability per riempire artificialmente la roadmap.
