# DOCENTE OS — Product Qualification → Execution Trace

**Data:** 29 settembre 2026  
**Stato:** CURRENT EXECUTION TRACE / V1 COMPLETION  
**Baseline verificata:** `develop@608edabe8f1718882e7f1d63fcddee5b77a54191`  
**Perimetro:** Docente OS V1 — Teacher Operating System  
**Regola:** questo documento converte l'audit di prodotto in una sequenza operativa breve. Non apre un nuovo feature train.

## 1. Tesi di prodotto da preservare

Docente OS non deve competere come semplice raccolta di generatori IA.

La proposta di valore da qualificare è:

> **conoscere il lavoro didattico nel tempo e presentare al docente il contesto e il prossimo passo pertinenti, senza appropriarsi delle decisioni professionali.**

Formula canonica:

`Teacher Moment → contesto → prossimo passo → copilota → conferma → traccia`

North star operativa:

`Oggi → Classe → Lezione → Fatto → prossimo passo`

KPI principale:

**Teacher Attention Returned (TAR)** — riduzione misurabile di ricostruzione, ricerca, ricopiatura, navigazione, attesa e reinserimento.

## 2. Qualificazione corrente

### Solido / da preservare

- identità, workspace e MFA/AAL2;
- Supabase + RLS come persistenza autorevole;
- classi, discipline e cattedra;
- Piano annuale / UDA;
- TeachingSession come ricevuta dell'accaduto;
- separazione Orario / Calendario / Temporal Projection;
- Knowledge Base con provenance;
- lifecycle riflessione → proposta → decisione docente;
- write IA governate e non autonome;
- release engineering, recovery e exact-head evidence;
- design system, mobile shell, HIM/HVA e Focus-first invariant;
- separazione Arena authority / Docente OS operational authority.

### Avanzato ma da dimostrare meglio nell'uso reale

- Today + Next;
- Lesson Brief;
- preparazione lezione e Materiali pronti;
- copilota contestuale;
- osservazioni/evidenze;
- continuità sera → domani → prima della lezione → dopo la lezione;
- qualità percepita e rapidità su smartphone.

### Debiti reali da chiudere

- Knowledge retrieval bounded #514;
- Voice/STT: chiusura operativa o defer esplicito;
- sustained HUMAN_USE longitudinale insufficiente;
- WCAG manual/assistive evidence incompleta;
- ASVS requirement-level mapping incompleta;
- SLI/SLO e misure di latenza/reliability da consolidare;
- branch protection / ruleset non ancora applicato a `develop`;
- backlog da mantenere coerente con il reale stato del prodotto.

## 3. Regola di esecuzione

Da questo punto:

1. **nessun nuovo modulo** salvo bug critico o gap professionale osservato;
2. **nessuna nuova micro-fase** per lavori interni a contratti già governati;
3. ogni workstream segue il ciclo:
   `implementa → testa → correggi → verifica → review conclusiva → Human Review se richiesta → merge`;
4. un audit non genera automaticamente nuove issue: genera lavoro solo se il finding è reale, prioritario e verificabile;
5. la priorità è sempre il primo elemento non chiuso della traccia sottostante;
6. dettagli diagnostici, tentativi e fix locali restano nelle PR; questo documento conserva solo stato e direzione.

## 4. Execution Trace — ordine vincolante

### E0 — Chiudere l'orario

**Obiettivo:** completare DOS-TT-IMPORT-01 senza riaprire il disegno.

Done quando:

- #625 è verde sui gate applicabili;
- PDF/immagine → proposta → revisione → conferma → DRAFT funziona;
- nessun `DRAFT → ACTIVE` automatico;
- nessun replan;
- nessun DOS-A1;
- revisione tecnica conclusiva;
- una sola Human Review finale;
- merge su `develop`.

**Stato:** COMPLETE — PR #625 merged in `develop@608edabe8f1718882e7f1d63fcddee5b77a54191`.

### E1 — Congelare il perimetro V1

Dopo #625:

- classificare nuove richieste come `BUG`, `PILOT_FINDING`, `MATURITY_REQUIRED` o `DEFERRED`;
- non aprire nuove capability per aumentare breadth;
- preservare il V1 come sistema di continuità professionale, non come suite di generatori.

**Stato:** COMPLETE — `V1_SCOPE_FROZEN`.

Regola attiva: ogni nuova richiesta deve essere classificata esclusivamente come `BUG`, `PILOT_FINDING`, `MATURITY_REQUIRED` o `DEFERRED`. Nessun nuovo feature train prima della chiusura E2→E5.

### E2 — Chiudere i soli debiti che possono falsare il pilot

Ordine:

1. #514 Knowledge bounded retrieval;
2. decisione Voice/STT: `CLOSE` oppure `DEFER_FROM_RC1`;
3. eventuali bug di latenza, state loss o navigation osservabili;
4. protezione di `develop` con ruleset/required checks coerenti con la pipeline;
5. nessun refactoring cosmetico non necessario.

**Exit:** `PILOT_BLOCKERS_CLEARED`.

### E3 — Sustained Pilot reale

Usare Docente OS per più giorni normali di lavoro.

Percorso minimo da osservare:

`sera → domani → prima della lezione → materiale pronto → classe → lezione → registra → riflessione → prossimo passo`

Per ogni giornata misurare soltanto:

- tempo al prossimo passo;
- numero di decisioni/tap prima dell'azione;
- cambi di superficie;
- informazioni reinserite;
- ricerca manuale esterna necessaria;
- workaround;
- errori;
- latenza percepita;
- correttezza del contesto proposto;
- materiale già pronto vs da ricostruire.

Non introdurre un sistema metrico complesso: confrontare gli stessi compiti nel tempo.

**Exit:** `DOCENTE_OS_SUSTAINED_PILOT_EVIDENCE_PASS`.

### E4 — Focus-first correction round

Correggere **solo** ciò che il pilot dimostra.

Priorità:

- rimuovere scelte concorrenti;
- accorciare lo scroll;
- rendere evidente una sola azione primaria;
- evitare che il docente debba conoscere il Product Model;
- portare Knowledge, materiali e copilota nel contesto senza obbligare l'utente a “visitare i moduli”.

Non aggiungere nuove capability durante questo round.

**Exit:** `V1_HUMAN_USE_PASS`.

### E5 — RC1 e maturity closure

Solo dopo E3/E4:

- freeze RC1 exact SHA;
- versione/tag/GitHub Release/changelog/receipt;
- WCAG manuale/assistive evidence applicabile;
- ASVS requirement-level mapping applicabile;
- SLI/SLO da evidence reale;
- recovery/continuity pertinente;
- smoke di release e rollback target;
- Human Release Decision.

**Exit:** `DOCENTE_OS_RC1_CERTIFIED`.

## 5. Cosa NON fare

Finché E0→E5 non sono chiusi:

- niente nuovo LMS;
- niente esperienza studente ampia;
- niente secondo assistente;
- niente nuovo archivio materiali;
- niente nuovo planner;
- niente dashboard concorrente;
- niente automazioni autonome;
- niente agente che scrive senza conferma;
- niente “altri 30 strumenti IA” per inseguire la breadth dei concorrenti;
- niente migrazione architetturale big-bang;
- niente perfezionamento documentale senza effetto sul prodotto.

## 6. Benchmark operativo

Usare i concorrenti solo per capire le aspettative del mercato, non per copiare il loro catalogo.

Dimensioni da osservare:

- rapidità dal bisogno all'output;
- integrazione nel flusso di lavoro;
- qualità dei materiali;
- anticipazione del bisogno;
- semplicità mobile;
- continuità tra una sessione e la successiva;
- controllo umano;
- affidabilità e recupero.

La dimensione su cui Docente OS deve eccellere è:

**continuità professionale contestuale nel tempo**.

Se questa non emerge dal pilot, la differenziazione non è ancora dimostrata.

## 7. Regola per le nuove sessioni di sviluppo

All'avvio:

1. leggere questo documento;
2. verificare `develop` e PR/workflow attivi;
3. individuare il primo step E0→E5 non chiuso;
4. recuperare solo le fonti necessarie;
5. proseguire dal next valid action;
6. non riaprire l'audit generale salvo nuova evidence che cambi la diagnosi.

## 8. Criterio di successo del sistema

Docente OS è pronto a uscire dal solo pilota controllato quando un docente può usarlo per più giorni consecutivi e:

- trova rapidamente cosa fare;
- non ricostruisce il contesto;
- non ricopia informazioni già note;
- non cerca continuamente chat/file/moduli esterni;
- non deve comprendere l'architettura;
- mantiene sempre la decisione professionale;
- può recuperare da errore senza perdere il lavoro;
- percepisce un vantaggio netto in attenzione restituita.

## 9. Stato corrente sintetico

**Architettura:** avanzata.  
**Governance e sicurezza:** avanzate.  
**Prodotto:** sostanzialmente completo nel core V1.  
**UX percepita:** promettente ma da qualificare longitudinalmente.  
**Scalabilità/distribuzione:** non ancora qualificata oltre il single-owner pilot.  
**Priorità assoluta:** E2 — chiudere i soli pilot blocker reali; poi sustained pilot, correzioni evidence-driven e RC1.
