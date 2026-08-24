# DOCENTE OS — Stato corrente canonico

Data: 2026-08-24  
Baseline prodotto certificata: `develop` @ `1e6e15e59e3615f0c950940bab89337ff4613832`  
Stato documento: **CURRENT / CANONICAL STATUS**

Questo documento è la sintesi corrente autorevole dello stato del sistema. I checkpoint datati precedenti restano storici e non devono essere usati per dedurre lo stato operativo quando divergono da questo file.

## 1. Classificazione del prodotto

DOCENTE OS è una **Beta operativa avanzata**. Non è più un prototipo/MVP: possiede persistenza reale, autenticazione, RLS, domini separati, flussi didattici persistenti, prima scrittura assistita controllata, authoring UDA versionato, export PDF professionale, recovery account esplicito, export/manifest completo del workspace, runtime Beta verificato, gate end-to-end e Human + Visual Acceptance.

Il sistema non è ancora classificabile come produzione definitiva perché restano aperti il restore rehearsal isolato, ulteriori tranche di hardening operativo/produzione e la prova longitudinale durante un anno scolastico reale.

## 2. Runtime canonico

- codice applicativo: `product/`;
- Next.js 16 / React 19 / TypeScript strict;
- Supabase Auth + PostgreSQL + Storage + RLS;
- runtime Beta canonico: **Render**, servizio `docente-os-2026-27-beta`;
- ramo Beta: `develop`;
- `rootDir`: `product`;
- auto-deploy: commit;
- Vercel non è un gate canonico; le failure correnti dovute a quota/build-rate-limit non descrivono lo stato applicativo;
- Netlify è legacy rispetto all'attuale Beta Render.

## 3. Stato macro-capability

### Fondazioni esperienza

- **X0 COMPLETE** — documentazione/decisioni canoniche di esperienza;
- **X1 COMPLETE** — component foundation;
- **X2 COMPLETE** — AppShell, responsive navigation, command palette;
- **X3 COMPLETE entro READ_ONLY / PROPOSE** — assistente contestuale senza autorizzazione implicita alla scrittura;
- **X4-A COMPLETE / BETA-PROVEN** — una sola capability persistente autorizzata: `PLANNER_CREATE_TASK`, con proposta → anteprima → conferma esplicita → creazione → ricevuta → annullamento; nessuna estensione generalizzata delle write capability;
- **X5-A COMPLETE / BETA-PROVEN** — authoring professionale UDA separato dalla fonte, versioni immutabili, cronologia, RLS e protezione dai conflitti di concorrenza;
- **X5-B COMPLETE / BETA-PROVEN** — export professionale PDF di una versione UDA salvata e immutabile, con provenienza/versione visibili e nessuna write persistente durante l'export;
- **X6 FUTURE / NOT BASELINE** — valutazione agentica avanzata intenzionalmente successiva.

### Tempo e attività didattica

- **T1 COMPLETE** — dominio Orario;
- **T2 COMPLETE** — griglia e gestione operativa;
- **T3A COMPLETE** — lifecycle versioni Orario e attivazione;
- **T3B COMPLETE** — Calendario indipendente;
- **T3C COMPLETE** — Temporal Projection read-only Orario + Calendario;
- **T4 COMPLETE** — TeachingSession persistente e allocazione minuti ai blocchi B01–B33.

Invariante: **Orario e Calendario restano domini indipendenti**; la composizione avviene solo attraverso Temporal Projection.

## 4. Superfici operative disponibili

- Home / Oggi / Planner;
- Conoscenza;
- Piano annuale;
- Progetta;
- authoring UDA versionato;
- export PDF professionale UDA;
- Classi;
- Orario;
- Calendario;
- Impostazioni;
- accesso con password, prima configurazione e recupero password distinti;
- export JSON owner-only del workspace tramite `/api/account/export-manifest`;
- assistente contestuale X3 sulle superfici autorizzate;
- scrittura X4-A controllata esclusivamente nel Planner.

## 5. Conoscenza

Stato: **ADVANCED / BETA-PROVEN**.

Disponibili e provati:

- acquisizione testo e file;
- Storage privato e isolamento workspace;
- upload same-origin;
- limite applicativo 20 MB per il percorso standard;
- trasformazione/normalizzazione;
- generazioni e provenienza;
- classificazione e contesto professionale;
- PDF testuali e PDF misti con fallback parziale;
- errori recuperabili, retry e cleanup;
- ricerca come compito primario con acquisizione in progressive disclosure;
- continuità Progetta → fonte in Conoscenza preservata dopo X5.

Residui non bloccanti:

- documenti interamente visuali/scansionati senza provider visivo;
- upload grandi/resumable oltre il percorso standard.

## 6. Human + Visual Acceptance

Il sistema HVA è parte permanente del ciclo di sviluppo.

Copre:

- mobile `412×915` e desktop `1440×1000`;
- osservazioni di superficie e journey Human;
- console, rete, errori HTTP, overflow, layout e target interattivi;
- screenshot e receipt strutturate;
- fixture E2E isolate e cleanup.

Stato corrente:

- X5 authoring Render Beta: **PASS**;
- X5-B export Render Beta: **PASS**;
- P3 workspace export Render Beta: **PASS**;
- HVA Render Beta: **PASS** sul commit corrente;
- K1 Render Beta: **PASS**;
- X3 Render Beta: **PASS**;
- X4 Planner Render Beta: **PASS**;
- Operational Security: **PASS**.

**V-07 PASS** — Conoscenza privilegia consultazione/ricerca prima dell'acquisizione.  
**V-08 PASS** — target tattile mobile dei filtri conforme.  
**X5-A PASS** — consultazione della fonte e trasformazione in documento di lavoro restano azioni distinte.  
**X5-B PASS** — l'export parte da una versione salvata/immutabile e non introduce una nuova write capability.  
**P3 EXPORT PASS** — l'owner può ottenere un manifest completo e read-only del workspace; accesso anonimo negato.

## 7. Gate canonici correnti

Per le slice applicative rilevanti il ciclo comprende, secondo ambito:

1. Product CI: test → typecheck → lint → build;
2. gate specialistico applicativo;
3. HVA applicativo quando pertinente;
4. merge su `develop` vincolato alla testa certificata;
5. Render Beta e verifica stato prodotto esatto/equivalente;
6. gate specialistico sul runtime Beta;
7. evidence/receipt e cleanup;
8. aggiornamento della decisione canonica.

Sono inoltre permanenti:

- `ops-security/supabase` — diniego RPC sensibili al ruolo anonimo, lifecycle autenticato e accessi conformi alla RLS;
- `ops-health/render-beta` — probe periodico di Render, login, Supabase Auth, DB/RLS e coerenza exact/product-equivalent con `develop`;
- `p3-export/application` / `p3-export/render-beta` — export workspace owner-only, anon 401, coerenza conteggi/righe e inventario Storage sotto prefisso workspace.

Le failure Vercel per quota non sono failure del canale Beta Render.

## 8. Operational hardening

Stato: **IN PROGRESS — P0 SECURITY PASS / P1 MONITORING PASS / P2 ACCOUNT RECOVERY PASS / P3 DATA LIFECYCLE + EXPORT PASS**.

Completato:

- RPC privilegiate hardenizzate rispetto al ruolo `anon` dove non necessario;
- accesso intenzionale `authenticated` preservato e provato end-to-end;
- policy X4 receipt ottimizzata;
- indici FK necessari a lifecycle/referential checks;
- gate permanente `ops-security/supabase`;
- monitor `ops-health/render-beta` ogni 6 ore e on-demand;
- account recovery separato dalla prima configurazione: `resetPasswordForEmail → callback recovery → sessione verificata → nuova password`;
- recovery non crea utenti e usa risposta non enumerante;
- durante una sessione recovery non è possibile bypassare il cambio password;
- runbook `docs/operations/RECOVERY_RUNBOOK.md` e verifica `product/supabase/recovery/verify_restore.sql` disponibili;
- contratto data lifecycle: **manifest/export → Storage → workspace/cascade DB → Auth user → receipt**;
- `workspaces.owner_user_id → auth.users ON DELETE RESTRICT` mantenuto come protezione intenzionale;
- nessuna cancellazione account o retention automatica introdotta senza gate dedicato;
- RPC `workspace_export_manifest()` `SECURITY INVOKER`, owner-only e non disponibile ad anon;
- endpoint `/api/account/export-manifest` con risposta JSON, `cache-control: no-store` e download;
- export delle tabelle workspace-scoped e delle famiglie dipendenti, incluse versioni UDA, slot Orario, allocazioni TeachingSession e progressi annuali;
- inventario effettivo del bucket `knowledge-assets` letto sotto sessione autenticata;
- `deletionReady=false`: l'export non abilita né implica cancellazione;
- gate P3 applicativo e Render Beta **PASS** sul commit `1e6e15e59e3615f0c950940bab89337ff4613832`;
- regressioni Operational Security, K1, X3, X4 e HVA **PASS** dopo P3.

### Restore readiness

Stato: **PREPARED / BLOCKED_BY_PLAN / NOT YET REHEARSED**.

Baseline di recovery catturata il 2026-08-24 con manifest DB/Auth/Storage e migrazioni. Invariante operativo: **backup PostgreSQL/Auth e backup degli oggetti Storage sono distinti**. Un restore del database non ricrea oggetti Storage cancellati.

Il rehearsal su branch Supabase isolato è stato autorizzato, ma la piattaforma ha rifiutato la creazione perché **Supabase Branching richiede il piano Pro**. Nessun branch a consumo è stato creato e nessun restore distruttivo è stato tentato sul Beta reale.

P2 restore non può diventare `PASS` finché non viene eseguito un rehearsal su ambiente isolato con confronto manifest, verifica ACL/RLS/RPC, ripristino Storage e gate funzionali.

### Residui hardening aperti

- restore rehearsal reale su ambiente isolato quando il piano lo consente;
- leaked-password protection: advisor Supabase la segnala disabilitata e la capability dipende dal piano;
- strategia off-site/restore degli oggetti Storage;
- alert escalation/incident response oltre alla failure del monitor GitHub;
- dependency security da riesaminare sulla baseline corrente;
- policy retention e, solo dopo evidenza sufficiente, eventuale cancellazione account controllata;
- performance/load con dataset significativamente più grandi;
- canale produzione definitivo e contratto Beta → produzione.

## 9. Maturità corrente

Valutazione audit aggiornata del 2026-08-24:

- architettura/dominio: **molto matura**;
- persistenza/sicurezza/RLS: **matura e sottoposta a gate operativo dedicato**;
- core operativo docente: **avanzato**;
- Human/UX: **molto avanzato e verificato**;
- Conoscenza: **tra le capability più mature**;
- CI/E2E/HVA: **molto maturo per la fase Beta**;
- authoring professionale UDA + export PDF: **Beta-proven**;
- account recovery: **baseline applicativa implementata e verificata**;
- data lifecycle: **contratto canonico + export/manifest owner-only Beta-proven; distruzione ancora intenzionalmente non abilitata**;
- azioni AI persistenti: **prima capability minima attiva, controllata e reversibile**;
- operations/produzione: **security, monitoring, recovery applicativo ed export dati attivi; restore e altri gate di produzione ancora incompleti**.

Le percentuali di maturità restano indicative e non sostituiscono i gate.

## 10. Rischi e residui prioritari

1. **Restore rehearsal** — provare realmente DB/Auth + Storage su ambiente isolato senza alterare il Beta canonico.
2. **Storage resilience** — definire copia off-site e procedura di restore degli oggetti, separata dal DB.
3. **Password/platform hardening** — leaked-password protection e configurazioni Auth di produzione quando disponibili.
4. **Operational hardening restante** — incident response, dependency security, retention policy, performance/load e canale produzione.
5. **Longitudinal proof** — validare settimane e mesi reali: cambi orario, sospensioni, correzioni, accumulo documenti/task/sessioni, fine quadrimestre/anno.
6. **Governance X4** — mantenere `PLANNER_CREATE_TASK` come unica write capability assistita finché non esiste evidenza sufficiente per un'estensione controllata.
7. **Estensione authoring** — valutare altri documenti professionali solo sulla base dell'uso reale, evitando duplicazioni indiscriminate.

## 11. Ordine di maturazione autorizzato

Il ciclo corrente è:

1. completare ciò che è possibile dell'hardening senza abbassare i gate: **Storage resilience, dependency security, performance/load e contratto Beta → produzione**;
2. eseguire il restore rehearsal quando sarà disponibile un ambiente Supabase isolato;
3. definire retention/cancellazione soltanto dopo export e restore affidabili;
4. pilotaggio continuativo settembre–ottobre;
5. nuove tranche guidate da evidenza reale.

Non introdurre nuove macro-capability non previste per riempire artificialmente la roadmap.