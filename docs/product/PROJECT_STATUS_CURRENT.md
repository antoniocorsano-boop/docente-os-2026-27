# DOCENTE OS — Stato corrente canonico

Data: 2026-08-25  
Stato documento: **CURRENT / CANONICAL STATUS**

Questo documento è la sintesi autorevole dello stato operativo. I checkpoint precedenti restano storici e non devono essere usati per dedurre lo stato corrente quando divergono da questo file.

## 1. Classificazione

DOCENTE OS è una **Beta operativa avanzata** con infrastruttura Production separata, provisionata inattiva e tecnicamente verificata.

La Production **non è attiva** e non è autorizzata a ricevere dati professionali reali. `productionActivationDecision = HOLD`.

Stato infrastrutturale:

- Beta Render: operativa;
- Supabase Production: separato, schema-ready e senza dati applicativi reali;
- Render Production: Frankfurt, provisionato inattivo;
- Production Runtime Smoke autenticato: PASS, run `32836204567`;
- `DB_LOGICAL_RESTORE`: PASS;
- `SUPABASE_AUTH_SERVICE_RECOVERY`: PASS;
- `OFFSITE_STORAGE_RECOVERY_REHEARSAL`: PASS;
- `OFFSITE_STORAGE_PERSISTENT_DESTINATION`: PASS;
- `OFFSITE_STORAGE_RETENTION_LOCK`: PASS;
- `INCIDENT_ESCALATION_MINIMUM`: PASS;
- auto-deploy Production: OFF;
- dati reali autorizzati: false;
- activation blocker tecnici P7: **0**.

## 2. Runtime e invarianti di prodotto

- codice applicativo: `product/`;
- Next.js 16 / React 19 / TypeScript strict;
- Supabase Auth + PostgreSQL + Storage + RLS;
- branch canonico di sviluppo: `develop`;
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

**P0 PASS / P1 PASS / P2 PASS applicativo / P3 PASS / P4 PASS / P5 PASS / P6-A PASS / P6-B PASS / P7-A PASS / P7-B PASS / P7-C PASS / P7-D REVIEW CURRENT / P7-E PASS / P7-F PASS / P7-F2 COMPLETE / DB_LOGICAL_RESTORE PASS / SUPABASE_AUTH_SERVICE_RECOVERY PASS / OFFSITE_STORAGE_RECOVERY_REHEARSAL PASS / OFFSITE_STORAGE_PERSISTENT_DESTINATION PASS / OFFSITE_STORAGE_RETENTION_LOCK PASS / INCIDENT_ESCALATION_MINIMUM PASS / TECHNICAL BLOCKERS 0 / ACTIVATION HOLD**.

## 4. P7 — Production governance e recovery

### Production provisioning

- P7-A: promotion contract PASS;
- P7-B: Production data topology SEPARATE;
- P7-C/P7-E: Render Frankfurt, auto-deploy disabilitato;
- P7-F: Supabase Production provisionato e schema-ready;
- P7-F2: Render Production provisionato inattivo e runtime smoke autenticato PASS.

Production non segue automaticamente `develop`; la promozione richiede SHA immutabile certificato e decisione umana esplicita.

### DB logical restore

**PASS**, run `32837945388`.

### Supabase Auth service recovery

**PASS**, run `32841165988`.

### Off-site Storage recovery rehearsal

**PASS**, run `32842616571`.

Due runner distinti hanno provato perdita della sorgente, copia indipendente, restore su Storage fresco e verifica byte/SHA-256.

### Off-site Storage persistent destination

**PASS**, run `32888249839`.

Destinazione reale verificata:

- Cloudflare R2;
- bucket `docente-os-backup-eu`;
- jurisdiction EU;
- backup medium `CLOUDFLARE_R2_EU_PERSISTENT`;
- upload remoto, distruzione sorgente, download su secondo runner, restore e SHA-256 verificati;
- Beta/Production applicativa non toccate;
- dati reali non usati.

### R2 retention / Bucket Lock

**PASS**, run `32891383829`, job `97943868034`.

Configurazione verificata:

- protected prefix: `production/`;
- retention: 90 giorni;
- overwrite bloccato da `ObjectLockedByBucketPolicy`;
- delete bloccato da `ObjectLockedByBucketPolicy`;
- probe originale ancora leggibile e byte-identico;
- probe SHA-256: `0f61c37e11d23342438df4d2b13a5da4e7d1f88e3378626ecd899090f7623e06`.

Ricevuta: `docs/product/P7_R2_RETENTION_LOCK_RECEIPT.md`.

### Incident escalation minimum

**PASS.** Gate owner-visible e rehearsal issue #193 con receipt finale.

## 5. Readiness / activation

La readiness tecnica P7 corrente registra:

**activationBlockers = []**

Quindi non restano blocker tecnici aperti per il pilot single-owner. Questo **non autorizza automaticamente Production**.

Restano invarianti obbligatori:

- `productionActivationDecision = HOLD`;
- `realUserDataAccepted = false`;
- nessuna promozione automatica Beta → Production;
- nessun auto-deploy Production;
- decisione umana esplicita richiesta prima di qualunque activation.

Watch non bloccanti:

- load/scale isolato prima di rollout più ampio;
- leaked-password protection quando il piano Supabase lo consente;
- longitudinal proof;
- retention/account deletion a livello applicativo.

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
- `p7-recovery/supabase-auth-service`;
- `p7-recovery/offsite-storage`;
- `p7-recovery/offsite-storage-destination`;
- `p7-recovery/r2-retention-lock`;
- `p7-incident/escalation-contract`.

## 7. Prossima priorità autorizzata

1. **P7-PRODUCTION-ACTIVATION-DECISION** — review umana esplicita dello stato zero-blocker;
2. solo in caso di autorizzazione, scegliere e certificare lo SHA applicativo da promuovere;
3. attivare il pilot single-owner senza ampliare automaticamente scope o capability;
4. mantenere load/scale come watch prima di rollout più ampio.

Non introdurre nuove macro-capability per riempire artificialmente la roadmap.
