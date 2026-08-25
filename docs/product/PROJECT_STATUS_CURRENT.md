# DOCENTE OS — Stato corrente canonico

Data: 2026-08-25  
Stato documento: **CURRENT / CANONICAL STATUS**

Questo documento è la sintesi autorevole dello stato operativo. I checkpoint precedenti restano storici e non devono essere usati per dedurre lo stato corrente quando divergono da questo file.

## 1. Classificazione

DOCENTE OS è una **Beta operativa avanzata** con infrastruttura Production inattiva realmente provisionata e verificata tecnicamente.

La Production **non è attiva** e non è autorizzata a ricevere dati professionali reali. `productionActivationDecision = HOLD`.

Stato infrastrutturale:

- Beta Render: operativa;
- Supabase Production: separato e schema-ready;
- Render Production: `docente-os-2026-27-production`, Frankfurt, provisionato inattivo;
- Production Runtime Smoke autenticato: PASS, run `32836204567`;
- Production application rows dopo smoke: 0;
- identità Auth tecnica dedicata: 1;
- `DB_LOGICAL_RESTORE`: PASS;
- `SUPABASE_AUTH_SERVICE_RECOVERY`: PASS;
- `OFFSITE_STORAGE_RECOVERY_REHEARSAL`: PASS;
- `INCIDENT_ESCALATION_MINIMUM`: PASS;
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

**P0 PASS / P1 PASS / P2 PASS applicativo / P3 PASS / P4 PASS / P5 PASS / P6-A PASS / P6-B PASS / P7-A PASS / P7-B PASS / P7-C PASS / P7-D REVIEW CURRENT / P7-E PASS / P7-F PASS / P7-F2 COMPLETE / DB_LOGICAL_RESTORE PASS / SUPABASE_AUTH_SERVICE_RECOVERY PASS / OFFSITE_STORAGE_RECOVERY_REHEARSAL PASS / INCIDENT_ESCALATION_MINIMUM PASS / ACTIVATION HOLD**.

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

Backup logico, distruzione DB, restore, dati sintetici, fingerprint schema e RLS provati in ambiente isolato.

### Supabase Auth service recovery

**PASS**, run `32841165988`.

GoTrue/Auth reale dello stack Supabase locale ha provato login, richiesta recovery, email, recovery session, cambio password e verifica vecchia/nuova password con identità sintetica.

### Off-site Storage recovery rehearsal

**PASS**, run `32842616571`.

La prova ha usato due runner GitHub distinti:

- runner A / job `97785243034`: crea oggetto sintetico in Supabase Storage, verifica i byte, produce una copia indipendente, cancella la sorgente, verifica la perdita e distrugge lo stack;
- runner B / job `97785811124`: scarica la copia su host distinto, avvia un nuovo Supabase Storage vuoto, ripristina l'oggetto e verifica byte e SHA-256.

Evidenza:

- fresh restore Storage: true;
- separate runner boundary: true;
- binary restore verified: true;
- byte length: `131071`;
- object SHA-256: `ab2f638970566aaf3f495b7a3860612f7bd91a2afe5d837e835a27f11ba811be`;
- Beta/Production toccati: false;
- dati reali: false.

Ricevuta: `docs/product/P7_OFFSITE_STORAGE_RECOVERY_RECEIPT.md`.

L'artifact GitHub con retention di un giorno è **rehearsal-only** e non è approvato come backup operativo per dati professionali reali.

### Incident escalation minimum

**PASS.** Gate owner-visible e rehearsal issue #193 con receipt finale.

## 5. Readiness / blocker di activation

Production activation resta **HOLD**.

I rehearsal/capability tecnici richiesti sono provati:

- `DB_LOGICAL_RESTORE` — PASS;
- `SUPABASE_AUTH_SERVICE_RECOVERY` — PASS;
- `OFFSITE_STORAGE_RECOVERY_REHEARSAL` — PASS;
- `INCIDENT_ESCALATION_MINIMUM` — PASS.

Resta **un solo blocker operativo**:

`OFFSITE_STORAGE_PERSISTENT_DESTINATION` — **NOT CONFIGURED / BLOCKER**.

Occorre una destinazione off-site persistente, cifrata, indipendente da Supabase Production e privacy-appropriata, con retention/accesso controllati e restore verificabile. GitHub Actions Artifact non è tale destinazione.

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
- `p7-recovery/supabase-auth-service`;
- `p7-recovery/offsite-storage`;
- `p7-incident/escalation-contract`.

## 7. Prossime priorità autorizzate

1. **P7-OFFSITE-STORAGE-DESTINATION** — scegliere e verificare una destinazione persistente, cifrata e privacy-appropriata;
2. nuova Production Readiness Review;
3. decisione umana esplicita sull'eventuale activation del pilot;
4. solo se autorizzato, promozione di uno SHA applicativo certificato più recente;
5. load/scale isolato prima di rollout più ampio.

Non introdurre nuove macro-capability per riempire artificialmente la roadmap.
