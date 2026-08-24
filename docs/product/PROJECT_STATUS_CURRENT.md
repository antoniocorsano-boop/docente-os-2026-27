# DOCENTE OS — Stato corrente canonico

Data: 2026-08-24  
Baseline prodotto certificata: `develop` @ `fa570f44bf79955068ac916581f5ddf24336fd30`  
Stato documento: **CURRENT / CANONICAL STATUS**

Questo documento è la sintesi corrente autorevole dello stato del sistema. I checkpoint datati precedenti restano storici e non devono essere usati per dedurre lo stato operativo quando divergono da questo file.

## 1. Classificazione del prodotto

DOCENTE OS è una **Beta operativa avanzata**. Non è più un prototipo/MVP: possiede persistenza reale, autenticazione, RLS, domini separati, flussi didattici persistenti, prima scrittura assistita controllata, authoring UDA versionato, export PDF professionale, recovery account esplicito, export/manifest completo del workspace, dependency graph riproducibile, integrità DB↔Storage misurata, baseline performance autenticata e runtime Beta verificato con gate end-to-end e Human + Visual Acceptance.

Il sistema non è ancora classificabile come produzione definitiva perché restano aperti il restore rehearsal isolato, la strategia di copia/restore off-site degli oggetti Storage, la prova load/scale su dataset significativamente maggiori, incident escalation, la decisione sulla topologia dati di produzione e la prova longitudinale durante un anno scolastico reale.

## 2. Runtime canonico

- codice applicativo: `product/`;
- Next.js 16 / React 19 / TypeScript strict;
- Supabase Auth + PostgreSQL + Storage + RLS;
- runtime Beta canonico: **Render**, servizio `docente-os-2026-27-beta`;
- ramo Beta: `develop`;
- `rootDir`: `product`;
- auto-deploy: commit;
- dipendenze prodotto congelate da `product/package-lock.json` e installate con `npm ci` nei gate canonici;
- Blueprint Render allineato a `npm ci --no-audit --no-fund && npm run build` dalla precondizione P7;
- Vercel non è un gate canonico; le failure dovute a quota/build-rate-limit non descrivono lo stato applicativo;
- Netlify è legacy rispetto all'attuale Beta Render.

## 3. Stato macro-capability

### Fondazioni esperienza

- **X0 COMPLETE** — documentazione/decisioni canoniche di esperienza;
- **X1 COMPLETE** — component foundation;
- **X2 COMPLETE** — AppShell, responsive navigation, command palette;
- **X3 COMPLETE entro READ_ONLY / PROPOSE** — assistente contestuale senza autorizzazione implicita alla scrittura;
- **X4-A COMPLETE / BETA-PROVEN** — unica capability persistente autorizzata: `PLANNER_CREATE_TASK`, con proposta → anteprima → conferma esplicita → creazione → ricevuta → annullamento;
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

## 5. Conoscenza e Storage

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
- continuità Progetta → fonte in Conoscenza preservata dopo X5;
- ownership Storage verificata con `storage.objects.owner_id` + membership workspace per le cancellazioni;
- inventario export con receipt di integrità DB↔Storage;
- stato Beta verificato dopo P5: **5 asset DB con originale Storage, 5 oggetti Storage, 0 mancanti, 0 orfani**.

P5 ha individuato e rimosso 25 blob E2E storici orfani, tutti appartenenti alle fixture `x3-responsible-ai` / `k1-upload-recovery`; nessun asset professionale puntava a un file mancante. Il difetto era causato da una policy DELETE Storage incompatibile con il formato reale dei path ed è stato corretto senza ampliare la cancellazione agli altri membri del workspace.

Residui non bloccanti:

- documenti interamente visuali/scansionati senza provider visivo;
- upload grandi/resumable oltre il percorso standard;
- replica/copia off-site degli oggetti Storage e relativo restore rehearsal.

## 6. Human + Visual Acceptance

Il sistema HVA è parte permanente del ciclo di sviluppo e copre mobile/desktop, journey Human, console, rete, HTTP, overflow, layout, target interattivi, screenshot, receipt e fixture hygiene.

Stato corrente:

- HVA Render Beta: **PASS** sulla tranche X5-B dopo rerun sul medesimo commit certificato; un singolo `net::ERR_ABORTED` su stylesheet Next.js del Planner mobile è stato osservato nel primo tentativo e non si è riprodotto nel retry, senza finding automatici di prodotto;
- K1 Render Beta: **PASS**;
- X3 application + Render Beta: **PASS**;
- X4 Planner Render Beta: **PASS** sul current product head `fa570f44…`;
- Operational Security: **PASS**;
- P3 Workspace Export Render Beta: **PASS**;
- P5 Storage Integrity Render Beta: **PASS**;
- P6 Performance Render Beta: **PASS** sia sulla baseline P6-A sia sul re-benchmark post-P6-B del current product head `fa570f44…`.

**V-07 PASS** — Conoscenza privilegia consultazione/ricerca prima dell'acquisizione.  
**V-08 PASS** — target tattile mobile dei filtri conforme.  
**X5-A PASS** — consultazione della fonte e trasformazione in documento di lavoro restano azioni distinte.  
**X5-B PASS** — l'export parte da una versione salvata/immutabile e non introduce una nuova write capability.  
**P3 EXPORT PASS** — l'owner può ottenere un manifest completo e read-only del workspace; accesso anonimo negato.  
**P5 STORAGE INTEGRITY PASS** — DB e Storage sono riconciliati nel manifest e il Beta corrente non presenta riferimenti mancanti o blob orfani.  
**P6-A PERFORMANCE PASS** — baseline autenticata e non mutante su 8 superfici operative.  
**P6-B PLANNER QUERY PASS** — il Planner carica dal DB solo task `OPEN`/`WAITING`, preservando la cronologia completa; X3/X4 e il re-benchmark P6 sono verdi sul Beta corrente.

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

Gate permanenti:

- `ops-security/supabase` — RPC sensibili, lifecycle autenticato e accessi conformi alla RLS;
- `ops-security/dependencies` — lockfile canonico, `npm ci`, audit full/prod/tooling e blocco di finding high/critical;
- `ops-health/render-beta` — probe periodico di Render, login, Supabase Auth, DB/RLS e coerenza exact/product-equivalent;
- `p3-export/application` / `p3-export/render-beta` — export workspace owner-only e coerenza inventario;
- `p5-storage-integrity/application` / `p5-storage-integrity/render-beta` — riconciliazione DB↔Storage e fixture hygiene;
- `p6-performance/application` / `p6-performance/render-beta` — baseline prestazionale autenticata, warm-up separato dal cold start e receipt median/p95/max;
- `production-promotion/contract` — vincoli machine-readable di promozione, rollback e decisione umana per il futuro canale produzione.

Le failure Vercel per quota non sono failure del canale Beta Render.

## 8. Operational hardening

Stato: **IN PROGRESS — P0 SECURITY PASS / P1 MONITORING PASS / P2 ACCOUNT RECOVERY PASS / P3 DATA LIFECYCLE + EXPORT PASS / P4 DEPENDENCY SECURITY PASS / P5 STORAGE INTEGRITY PASS / P6-A PERFORMANCE BASELINE PASS / P6-B PLANNER QUERY + RE-BENCHMARK PASS / P7-A PRODUCTION PROMOTION CONTRACT PASS**.

### P0 — Security baseline: PASS

- RPC privilegiate hardenizzate rispetto ad `anon`;
- accesso `authenticated` preservato e provato;
- RLS X4 ottimizzata e indici FK pertinenti aggiunti;
- gate `ops-security/supabase` permanente.

### P1 — Monitoring baseline: PASS

- `ops-health/render-beta` ogni 6 ore e on-demand;
- verifica runtime Render, login, Auth, DB/RLS e stato prodotto exact/equivalent.

### P2 — Account recovery: PASS · Restore: BLOCKED_BY_PLAN

- `resetPasswordForEmail → callback recovery → sessione verificata → nuova password`;
- recovery non crea utenti e usa risposta non enumerante;
- cambio password non bypassabile durante recovery;
- runbook e `verify_restore.sql` disponibili;
- rehearsal isolato autorizzato ma non eseguibile sul piano corrente perché Supabase Branching richiede Pro;
- nessun restore distruttivo tentato sul Beta.

### P3 — Data lifecycle + export: PASS / BETA-PROVEN

- ordine canonico: **manifest/export → Storage → workspace/cascade DB → Auth user → receipt**;
- `owner_user_id → auth.users ON DELETE RESTRICT` mantenuto come protezione;
- nessuna cancellazione account/retention automatica abilitata;
- export owner-only DB + famiglie dipendenti + Storage;
- `deletionReady=false`.

### P4 — Dependency security: PASS

- `product/package-lock.json` versionato come grafo canonico;
- Product CI usa `npm ci`;
- audit repository completo: **0 vulnerabilità high/critical**;
- audit production-only: **0 high/critical**;
- tooling Playwright temporaneo classificato separatamente e **0 high/critical nel run finale**;
- evidenze e receipt conservate 90 giorni;
- nessun `npm audit fix --force` o upgrade cieco.

### P5 — Storage integrity: PASS / BETA-PROVEN

- trovato e corretto il mismatch tra policy DELETE e formato reale dei path Storage;
- nuova DELETE policy: bucket corretto + `owner_id = auth.uid()` + membership del workspace;
- cleanup E2E verifica materialmente la rimozione tramite relisting;
- export espone `expectedObjectCount`, `missingObjectCount`, `orphanObjectCount`, path e `PASS/FAIL`;
- 25 fixture storiche orfane rimosse;
- verifica indipendente finale Supabase: **5 DB file assets / 5 Storage objects / missing 0 / orphan 0 / 4.960.051 byte**;
- P3/P5 applicativo e `p5-storage-integrity/render-beta`: **PASS**;
- K1 post-merge: **PASS**, senza ricreare orfani.

### P6-A — Performance baseline: PASS / BETA-PROVEN

- prova autenticata su 8 superfici operative: workspace, Planner, Conoscenza, Classi, Piano annuale, Progetta, Orario e Calendario;
- warm-up separato per non confondere il cold start del piano Render Free con la latenza operativa;
- 3 campioni per superficie, 24 campioni complessivi;
- dataset classificato `CURRENT_BETA_NON_MUTATING`, senza generare volume sintetico nel Beta canonico;
- budget: route max **3.000 ms**, aggregate p95 **2.200 ms**;
- baseline Render Beta pre-P6-B: mediana aggregata **291 ms**, p95 **1.206 ms**, massimo **1.355 ms**;
- Planner pre-P6-B: mediana **721 ms**, p95/max **794 ms**;
- nessuna dichiarazione di load/scale proven: il dataset misurato resta troppo piccolo per quel livello di certificazione.

### P6-B — Planner operational query: PASS / BETA-PROVEN

- `SupabasePlannerRepository.listByWorkspace()` filtra lato DB `status IN (OPEN, WAITING)`;
- task `DONE`/`CANCELLED` non vengono più trasferiti inutilmente alle superfici operative;
- cronologia persistente DB preservata integralmente;
- nessun limite arbitrario introdotto;
- Render serve esattamente il product head `fa570f44bf79955068ac916581f5ddf24336fd30`;
- regressione X3 no-implicit-write: **PASS**;
- X4 Planner acceptance: **PASS**;
- re-benchmark P6 post-merge: **PASS** sullo stesso product head;
- Planner post-P6-B: mediana **684 ms** contro **721 ms** prima della correzione (circa −5%); p95/max **810 ms** contro **794 ms**, quindi coda sostanzialmente invariata;
- aggregate post-P6-B: mediana **461 ms**, p95 **1.037 ms**, massimo **1.611 ms**; tutti i valori restano entro budget;
- il p95 aggregato migliora rispetto a **1.206 ms**, mentre mediana aggregata e massimo oscillano in senso opposto: la variabilità del runtime Render Free non consente di attribuire causalmente le differenze complessive alla sola query Planner;
- l'evidenza robusta di P6-B è quindi: **trasferimento storico inutile eliminato, Planner median leggermente migliore e budget prestazionali ancora rispettati**, non una dichiarazione di accelerazione sistemica.

### P7-A — Contratto Beta → produzione: PASS / CONTRACT READY

- precondizione infrastrutturale: `render.yaml` allineato al lockfile canonico con `npm ci`; validazione Render + Product CI PASS;
- contratto machine-readable in `ops/production-promotion-contract.json`;
- gate permanente `production-promotion/contract`: **PASS**;
- candidato di rilascio identificato da SHA immutabile proveniente da `develop`;
- decisione umana finale obbligatoria; promozione automatica disabilitata;
- produzione non può diventare `ACTIVE` mentre `productionDataTopologyState=UNDECIDED`;
- segreti production-scoped obbligatori;
- migrazioni distruttive non ammesse nel percorso ordinario;
- rollback applicativo soltanto verso SHA precedentemente certificato;
- rollback DB automatico disabilitato finché il restore rehearsal non è provato;
- rollback Storage distruttivo vietato senza backup verificato;
- release receipt minima definita;
- stato intenzionale corrente: **PRODUCTION NOT CREATED / DATA TOPOLOGY UNDECIDED**.

### Residui hardening aperti

- decisione P7-B sulla topologia dati e sul perimetro del primo rilascio produzione;
- load/scale isolato con dataset significativamente maggiori, senza contaminare il Beta canonico;
- restore rehearsal reale su ambiente isolato quando il piano lo consente;
- replica/copia off-site e procedura di restore degli oggetti Storage;
- leaked-password protection quando il piano Supabase lo consente;
- alert escalation/incident response oltre alla failure del monitor GitHub;
- policy retention e, solo dopo evidenza sufficiente, eventuale cancellazione account controllata.

## 9. Maturità corrente

- architettura/dominio: **molto matura**;
- persistenza/sicurezza/RLS: **matura e sottoposta a gate permanenti**;
- dependency security/riproducibilità: **matura per la Beta**;
- core operativo docente: **avanzato**;
- Human/UX: **molto avanzato e verificato**;
- Conoscenza: **tra le capability più mature**, con integrità Storage ora misurata;
- CI/E2E/HVA: **molto maturo per la fase Beta**;
- authoring UDA + export PDF: **Beta-proven**;
- account recovery: **implementato e verificato**;
- data lifecycle/export: **Beta-proven**, distruzione ancora intenzionalmente non abilitata;
- azioni AI persistenti: **prima capability minima controllata e reversibile**;
- performance operativa corrente: **baseline e re-benchmark Beta-proven entro budget**, ma load/scale non ancora provati;
- promotion governance: **contratto Beta → produzione formalizzato e sottoposto a gate, ambiente produzione non ancora creato**;
- operations/produzione: **security, monitoring, recovery applicativo, export dati, dependency security, Storage integrity, performance baseline e promotion contract attivi; restore, off-site backup, scale/load e attivazione produzione ancora incompleti**.

Le misure P6 sul piano Render Free sono snapshot operative ripetibili, non una prova causale isolata di micro-ottimizzazioni; i confronti prima/dopo devono essere interpretati insieme alla variabilità del runtime.

Le percentuali di maturità restano indicative e non sostituiscono i gate.

## 10. Rischi e residui prioritari

1. **P7-B data topology + release scope** — decidere esplicitamente separazione/condivisione dei dati e perimetro del primo rilascio prima di creare produzione.
2. **Load/scale isolato** — provare volumi significativamente maggiori in un ambiente che non contamini il Beta canonico.
3. **Restore + off-site Storage** — provare realmente DB/Auth e oggetti su ambiente isolato e definire una copia indipendente degli originali.
4. **Incident response** — escalation oltre ai monitor GitHub e ricevuta operativa degli incidenti.
5. **Password/platform hardening** — leaked-password protection quando disponibile.
6. **Longitudinal proof** — validare settimane e mesi reali di lavoro scolastico.
7. **Governance X4** — `PLANNER_CREATE_TASK` resta l'unica write assistita finché una nuova capability non supera un gate separato.

## 11. Ordine di maturazione autorizzato

Il ciclo corrente è:

1. **P7-B** — decidere topologia dati e perimetro del primo rilascio, senza creare ancora produzione se restano precondizioni non soddisfatte;
2. definire una prova **load/scale isolata** con dataset significativamente maggiori, senza contaminare il Beta canonico;
3. definire la strategia **off-site Storage** senza confonderla con l'integrità già certificata;
4. eseguire il restore rehearsal quando sarà disponibile un ambiente Supabase isolato;
5. definire retention/cancellazione soltanto dopo export e restore affidabili;
6. pilotaggio continuativo settembre–ottobre;
7. nuove tranche guidate da evidenza reale.

Non introdurre nuove macro-capability non previste per riempire artificialmente la roadmap.
