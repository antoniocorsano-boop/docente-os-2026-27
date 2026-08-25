# DOCENTE OS — Stato corrente canonico

Data: 2026-08-25  
Baseline prodotto certificata: `develop` @ `fa570f44bf79955068ac916581f5ddf24336fd30`  
Stato documento: **CURRENT / CANONICAL STATUS**

Questo documento è la sintesi autorevole dello stato operativo. I checkpoint precedenti restano storici e non devono essere usati per dedurre lo stato corrente quando divergono da questo file.

## 1. Classificazione

DOCENTE OS è una **Beta operativa avanzata**. Non è più un prototipo/MVP: persistenza, Auth, RLS, Storage, Planner, Orario, Calendario, Piano annuale, Progetta, Classi, Conoscenza, prima write assistita controllata, authoring UDA versionato, export PDF, account recovery, export workspace, dependency security, Storage integrity, performance baseline e governance di promozione sono implementati e sottoposti a gate.

Non è ancora Production: l'ambiente Production non è stato creato né provisionato. La topologia dati e la specifica infrastrutturale sono però già decise e machine-validated. Restano aperti load/scale isolato, restore rehearsal, off-site backup Storage, incident escalation e prova longitudinale.

## 2. Runtime canonico

- codice applicativo: `product/`;
- Next.js 16 / React 19 / TypeScript strict;
- Supabase Auth + PostgreSQL + Storage + RLS;
- Beta canonico: Render `docente-os-2026-27-beta`;
- ramo Beta: `develop`;
- `rootDir`: `product`;
- build dichiarativo Render: `npm ci --no-audit --no-fund && npm run build`;
- dipendenze congelate da `product/package-lock.json`;
- Vercel non è gate canonico; le failure di quota/build-rate-limit non descrivono lo stato applicativo;
- Netlify è legacy.

La baseline applicativa certificata resta `fa570f44bf79955068ac916581f5ddf24336fd30`; i commit P7-A/P7-B/P7-C modificano governance/infrastruttura, non `product/`.

## 3. Macro-capability

### Esperienza e assistenza

- **X0 COMPLETE** — decisioni canoniche esperienza;
- **X1 COMPLETE** — component foundation;
- **X2 COMPLETE** — AppShell, responsive navigation, command palette;
- **X3 COMPLETE / READ_ONLY-PROPOSE** — assistente contestuale senza write implicita;
- **X4-A COMPLETE / BETA-PROVEN** — unica write assistita persistente autorizzata: `PLANNER_CREATE_TASK`, con proposta → anteprima → conferma → creazione → ricevuta → undo;
- **X5-A COMPLETE / BETA-PROVEN** — authoring UDA versionato, separato dalla fonte, versioni immutabili, RLS e controllo concorrenza;
- **X5-B COMPLETE / BETA-PROVEN** — export professionale della versione UDA salvata/immutabile, senza write persistente;
- **X6 FUTURE / NOT BASELINE**.

### Tempo e attività didattica

- **T1 COMPLETE** — dominio Orario;
- **T2 COMPLETE** — griglia operativa;
- **T3A COMPLETE** — lifecycle versioni Orario;
- **T3B COMPLETE** — Calendario indipendente;
- **T3C COMPLETE** — Temporal Projection read-only Orario + Calendario;
- **T4 COMPLETE** — TeachingSession persistente e allocazione ai blocchi B01–B33.

Invariante: Orario e Calendario restano domini indipendenti; la composizione avviene solo via Temporal Projection.

## 4. Superfici operative

Disponibili: Home/Oggi/Planner, Conoscenza, Piano annuale, Progetta, authoring UDA, export PDF UDA, Classi, Orario, Calendario, Impostazioni, accesso/password recovery, export JSON owner-only del workspace, assistente X3 e write X4-A esclusivamente nel Planner.

## 5. Conoscenza e Storage

Stato: **ADVANCED / BETA-PROVEN**.

Provati: acquisizione testo/file, Storage privato, isolamento workspace, upload same-origin, trasformazione/normalizzazione, generazioni e provenienza, classificazione, PDF testuali/misti, retry/cleanup, ricerca prioritaria, continuità Progetta → Conoscenza, ownership Storage e receipt DB↔Storage.

P5 ha corretto la policy DELETE Storage e rimosso 25 blob E2E storici orfani. Verifica finale: **5 asset DB / 5 oggetti Storage / missing 0 / orphan 0**.

Residui: documenti completamente visuali senza provider visivo, upload grandi/resumable, copia/restore off-site Storage.

## 6. Human + Visual Acceptance

HVA è permanente e copre mobile/desktop, journey Human, console, rete, HTTP, overflow, layout, target interattivi, screenshot, receipt e fixture hygiene.

Stato rilevante:

- HVA Render Beta: **PASS**;
- K1 Render Beta: **PASS**;
- X3 application + Render Beta: **PASS**;
- X4 Planner Render Beta: **PASS**;
- Operational Security: **PASS**;
- P3 Workspace Export: **PASS**;
- P5 Storage Integrity: **PASS**;
- P6 Performance: **PASS** baseline e re-benchmark post-P6-B.

V-07 PASS, V-08 PASS, X5-A PASS, X5-B PASS.

## 7. Gate permanenti

- `product-ci` — test, typecheck, lint, build;
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
- `production-infrastructure/spec`.

Il ciclo applicativo resta: slice piccola → CI/gate specialistico → HVA quando pertinente → merge exact-head → Render exact/equivalent → runtime gate → evidence/cleanup → aggiornamento canonico.

## 8. Operational hardening

Stato: **IN PROGRESS — P0 PASS / P1 PASS / P2 PASS applicativo / P3 PASS / P4 PASS / P5 PASS / P6-A PASS / P6-B PASS / P7-A PASS / P7-B PASS / P7-C PASS**.

### P0 — Security baseline: PASS

RPC sensibili hardenizzate, RLS e accessi autenticati verificati, indici pertinenti presenti.

### P1 — Monitoring: PASS

`ops-health/render-beta` verifica periodicamente runtime, login, Auth, DB/RLS e stato prodotto exact/equivalent.

### P2 — Account recovery: PASS · Restore rehearsal: BLOCKED_BY_PLAN

Recovery password verificato. Il restore rehearsal reale richiede un ambiente isolato; Supabase Branching non è disponibile sul piano corrente. Nessun restore distruttivo è stato tentato sul Beta.

### P3 — Data lifecycle + export: PASS / BETA-PROVEN

Export workspace owner-only completo, `deletionReady=false`, cancellazione account automatica non abilitata.

### P4 — Dependency security: PASS

Lockfile canonico, `npm ci`, audit full/prod/tooling senza high/critical nel run finale, nessun upgrade cieco.

### P5 — Storage integrity: PASS / BETA-PROVEN

DB e Storage riconciliati; missing 0, orphan 0 dopo cleanup E2E controllato.

### P6-A — Performance baseline: PASS / BETA-PROVEN

8 superfici, 24 campioni, warm-up separato, budget Render route max 3.000 ms / aggregate p95 2.200 ms. Baseline pre-P6-B: mediana 291 ms, p95 1.206 ms, max 1.355 ms.

### P6-B — Planner query: PASS / BETA-PROVEN

Filtro DB `status IN (OPEN, WAITING)`; cronologia preservata. Planner mediana 721 → 684 ms; p95 794 → 810 ms. Re-benchmark aggregato: mediana 461 ms, p95 1.037 ms, max 1.611 ms. Tutto entro budget; nessuna dichiarazione impropria di accelerazione sistemica.

### P7-A — Promotion contract: PASS / CONTRACT READY

Contratto machine-readable, SHA immutabile, decisione umana obbligatoria, promozione automatica vietata, rollback applicativo solo verso SHA certificati, rollback DB automatico vietato prima del restore rehearsal, rollback Storage distruttivo vietato senza backup verificato.

### P7-B — Production data topology: PASS / DECIDED

Decisione vincolante:

- `productionDataTopologyState = SEPARATE`;
- progetto Supabase Production distinto dal Beta;
- DB, Auth, Storage e segreti Production separati;
- nessuna write cross-environment;
- nessun riuso di credenziali tecniche Beta;
- nessuna copia automatica Beta → Production;
- primo rilascio `SINGLE_OWNER_PILOT` / `named_owner_only`;
- signup pubblico disabilitato;
- onboarding multi-tenant disabilitato;
- eventuale import manuale richiede decisione esplicita dell'owner;
- `productionEnvironmentState = NOT_CREATED`.

Il validator `production-promotion/contract` rende questi vincoli permanenti.

### P7-C — Production infrastructure spec: PASS / SPEC READY

La specifica `ops/production-infrastructure-spec.json` è machine-readable e resta intenzionalmente `NOT_PROVISIONED`.

Vincoli permanenti:

- provider hosting Production ancora `UNDECIDED`;
- servizio Production e progetto Supabase Production `UNASSIGNED` / `NOT_PROVISIONED`;
- deploy Production solo da SHA immutabile certificato;
- auto-deploy Production disabilitato;
- segreti esclusivamente production-scoped e mai commessi nella specifica;
- validator blocca project ref/URL Beta, URL app Beta e materiale di chiave Supabase reale;
- DB/Auth/Storage Production devono restare materialmente separati dal Beta;
- copia automatica Beta → Production e write cross-environment vietate;
- stato dati iniziale `EMPTY_OR_EXPLICIT_OWNER_IMPORT`;
- attivazione futura richiede schema, RLS, Storage policy, smoke autenticato, rollback target, release receipt e decisione umana coerente col contratto P7-A/B.

Gate permanente: `production-infrastructure/spec` — **PASS** sulla PR #177, head `72b0ebf3b6b29c472d8fce5bd270e06a019e9883`; merge P7-C `8880f64a13d9f2e89c01ac081e980b5f70d3f393`.

P7-C non ha creato servizi, domini, DNS, segreti, utenti o progetti Supabase e non ha migrato dati.

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
- performance corrente: **Beta-proven entro budget**, load/scale non ancora provato;
- promotion governance: **P7-A/P7-B formalizzati e gated**;
- Production infrastructure governance: **P7-C formalizzata e gated, non provisionata**;
- Production: **non creata / non provisionata / non attiva**.

## 10. Rischi e residui prioritari

1. **P7-D Production readiness review** — classificare formalmente prerequisiti e blocker prima di autorizzare qualunque provisioning reale.
2. **Load/scale isolato** — dataset significativamente maggiori fuori dal Beta canonico.
3. **Restore + off-site Storage** — restore rehearsal e copia indipendente degli originali.
4. **Incident response** — escalation oltre ai monitor GitHub.
5. **Password/platform hardening** — leaked-password protection quando disponibile.
6. **Longitudinal proof** — settimane/mesi reali di uso scolastico.
7. **Governance X4** — `PLANNER_CREATE_TASK` resta l'unica write assistita finché una nuova capability non supera un gate separato.

## 11. Ordine di maturazione autorizzato

1. **P7-D** — readiness review: distinguere prerequisiti obbligatori, blocker reali e watch accettabili prima del provisioning Production;
2. definire una prova **load/scale isolata**;
3. definire **off-site Storage**;
4. eseguire restore rehearsal quando esiste un ambiente Supabase isolato;
5. definire retention/cancellazione solo dopo export e restore affidabili;
6. pilotaggio continuativo settembre–ottobre;
7. nuove tranche guidate da evidenza reale.

Non introdurre nuove macro-capability per riempire artificialmente la roadmap.