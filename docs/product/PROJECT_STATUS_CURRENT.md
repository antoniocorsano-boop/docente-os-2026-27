# DOCENTE OS — Stato corrente canonico

Data: 2026-08-24  
Baseline: `develop` @ `eaa29f65e0d540e820e07b4a719a91c99539a45d`  
Stato documento: **CURRENT / CANONICAL STATUS**

Questo documento è la sintesi corrente dello stato del sistema. I checkpoint datati precedenti restano storici e non devono essere usati per dedurre lo stato operativo quando divergono da questo file.

## 1. Classificazione del prodotto

DOCENTE OS è una **Beta operativa avanzata**. Non è più un prototipo/MVP: possiede persistenza reale, autenticazione, RLS, domini separati, flussi didattici persistenti, runtime Beta verificato, gate end-to-end e Human + Visual Acceptance.

Il sistema non è ancora classificabile come produzione definitiva perché restano aperti authoring professionale, prima capacità X4 persistente controllata, hardening operativo e prova di continuità su un anno scolastico reale.

## 2. Runtime canonico

- codice applicativo: `product/`;
- Next.js 16 / React 19 / TypeScript strict;
- Supabase Auth + PostgreSQL + Storage + RLS;
- runtime Beta canonico: **Render**, servizio `docente-os-2026-27-beta`;
- ramo Beta: `develop`;
- `rootDir`: `product`;
- auto-deploy: commit;
- Vercel non è un gate canonico; eventuali failure dovute a quote/build-rate-limit non descrivono lo stato applicativo;
- Netlify è legacy rispetto all'attuale Beta Render.

## 3. Stato macro-capability

### Fondazioni esperienza

- **X0 COMPLETE** — documentazione/decisioni canoniche di esperienza;
- **X1 COMPLETE** — component foundation;
- **X2 COMPLETE** — AppShell, responsive navigation, command palette;
- **X3 COMPLETE entro il confine READ_ONLY / PROPOSE** — assistente contestuale su Conoscenza e Planner, Answer First, nessuna scrittura automatica;
- **X4 PREPARED / EXECUTION NOT ENABLED** — contratti di proposta, fingerprint e conferma predisposti; nessuna capability AI persistente autorizzata nel runtime corrente;
- **X5 NOT COMPLETE** — authoring professionale/versionato ed export restano la principale macro-capability funzionale aperta;
- **X6 FUTURE / NOT BASELINE** — valutazione agentica avanzata intenzionalmente successiva.

### Tempo e attività didattica

- **T1 COMPLETE** — dominio Orario;
- **T2 COMPLETE** — griglia e gestione operativa;
- **T3A COMPLETE** — lifecycle versioni Orario e attivazione;
- **T3B COMPLETE** — Calendario indipendente;
- **T3C COMPLETE** — Temporal Projection read-only Orario + Calendario, prima integrazione in Oggi;
- **T4 COMPLETE** — TeachingSession persistente e allocazione minuti ai blocchi B01–B33, con decisione umana separata per il completamento didattico.

Invariante: **Orario e Calendario restano domini indipendenti**; la composizione avviene solo attraverso Temporal Projection.

## 4. Superfici operative disponibili

- Home / Oggi / Planner;
- Conoscenza;
- Piano annuale;
- Progetta;
- Classi;
- Orario;
- Calendario;
- Impostazioni;
- assistente contestuale X3 su superfici autorizzate.

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
- PDF testuali e PDF misti con fallback parziale quando la lettura visuale non è disponibile;
- errore PDF non leggibile distinto dagli errori temporanei;
- recovery e retry senza perdita della selezione;
- cleanup E2E;
- ricerca come compito primario con acquisizione in progressive disclosure;
- target tattili mobile conformi nel gate HVA corrente.

Residui non bloccanti:

- documenti interamente visuali/scansionati senza provider visivo;
- upload grandi/resumable (TUS o equivalente) oltre il percorso standard.

## 6. Human + Visual Acceptance

Il sistema HVA è parte permanente del ciclo di sviluppo.

Copre:

- mobile `412×915` e desktop `1440×1000`;
- 16 osservazioni di superficie;
- 8 journey Human;
- console, rete, errori HTTP, overflow, layout e target interattivi;
- screenshot e receipt strutturate;
- fixture E2E isolate e cleanup.

Ultima tranche HVA-11 / V-08 sulla baseline corrente:

- Product CI: PASS;
- K1 applicativo: PASS;
- HVA applicativo: 24/24 PASS;
- `mobileTargets`: PASS;
- `layout`: PASS;
- finding automatici: 0;
- K1 Render Beta: PASS;
- X3 application: PASS;
- X3 Render Beta: PASS;
- HVA Render Beta: PASS.

**V-07 PASS** — Conoscenza privilegia consultazione/ricerca prima dell'acquisizione.  
**V-08 PASS** — il controllo mobile `Applica filtri` non ricade più sotto la soglia tattile HVA.

## 7. Gate canonici correnti

Per le slice applicative rilevanti il ciclo corrente comprende, secondo ambito:

1. Product CI: test → typecheck → lint → build;
2. gate specialistico applicativo (es. K1/X3/HVA);
3. merge su `develop`;
4. Render Beta e verifica stato prodotto esatto/equivalente;
5. gate specialistico sul runtime Beta;
6. evidence/receipt;
7. osservazione Human/visual quando richiesta;
8. aggiornamento della decisione canonica.

Il sistema non deve considerare una failure Vercel per quota come failure applicativa del canale Beta Render.

## 8. Maturità corrente

Valutazione audit del 2026-08-24:

- architettura/dominio: **molto matura**;
- persistenza/sicurezza/RLS: **matura**;
- core operativo docente: **avanzato**;
- Human/UX: **molto avanzato e verificato**;
- Conoscenza: **tra le capability più mature**;
- CI/E2E/HVA: **molto maturo per la fase Beta**;
- operations/produzione: **parzialmente maturo**;
- authoring professionale: **incompleto**;
- azioni AI persistenti: **guardrail pronti, esecuzione non autorizzata**.

Stima orientativa, non gate: **completamento funzionale ~80% / maturità del prodotto esistente ~84%**.

## 9. Rischi e residui prioritari

1. **Authoring X5** — UDA, programmazioni e documentazione devono diventare oggetti professionalmente editabili, versionabili ed esportabili.
2. **X4 minimo** — aprire una sola azione persistente reversibile con preview → effetto → conferma → esecuzione → traccia/annullamento; nessuna espansione generalizzata delle write capability.
3. **Production hardening** — URL/canale produzione, backup/restore, recovery account, monitoring/alerting, data lifecycle, performance con dataset più grandi.
4. **Longitudinal proof** — verificare il comportamento durante settimane e mesi reali: cambi orario, sospensioni, correzioni, accumulo documenti/task/sessioni, fine quadrimestre/anno.
5. **Document governance** — mantenere questo file come stato sintetico corrente e trattare i checkpoint datati come storia, evitando nuove divergenze.

## 10. Ordine di maturazione autorizzato

Il ciclo successivo raccomandato è:

1. consolidamento canonico dello stato — **questa tranche**;
2. X4 limitato e reversibile;
3. X5 authoring professionale;
4. hardening operativo/produzione;
5. pilotaggio continuativo settembre–ottobre e nuove tranche guidate da evidenza reale.

Non introdurre nuove macro-capability non previste per riempire artificialmente la roadmap.
