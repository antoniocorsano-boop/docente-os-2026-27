# DOCENTE OS — PWA installabile e Share Target documentale

**Data:** 29 settembre 2026  
**Stato:** CANONICAL PILOT FINDING / E3→E4  
**Issue:** #629  
**Classificazione:** PILOT_FINDING — non apre un nuovo feature train durante E3.

## 1. Problema professionale osservato

Molti documenti rilevanti per il lavoro docente arrivano fuori da Docente OS: circolari, PDF, immagini, nuovi orari, materiali didattici, allegati ricevuti tramite email, browser, file manager o altre app.

Il percorso attuale richiede di:

`aprire Docente OS → raggiungere Conoscenza → aprire acquisizione → cercare il file → selezionarlo → caricarlo`.

Questo introduce navigazione e ricostruzione non produttive e riduce il Teacher Attention Returned (TAR).

## 2. Stato corrente verificato

La Beta corrente:
- è LIVE su Render sul commit `bc8bc5690a6fc5a336fe9a8aa251570fc75f7836`;
- è responsive/mobile;
- usa HTTPS;
- espone application name, theme color e icona applicativa;
- possiede già un boundary canonico di upload nella Conoscenza con autenticazione, workspace, content validation, privacy preflight, provenance, originale preservato e limite dimensionale;
- possiede già workflow governati per circolare→Calendario e documento-orario→proposta→review→DRAFT.

Il runtime `product` non espone ancora:
- Web App Manifest completo per una PWA installabile;
- `start_url`, `display: standalone` e set icone PWA dichiarato nel manifest;
- service worker;
- gestione esplicita dell'install prompt;
- Web Share Target (`share_target`);
- intake locale temporaneo dei file ricevuti dal sistema operativo.

Quindi Docente OS è oggi un'app web mobile, ma non ancora una PWA completa come destinazione di condivisione del dispositivo.

## 3. Direzione di prodotto

Docente OS deve poter diventare una destinazione del menu di condivisione del dispositivo.

Esperienza-obiettivo:

`documento in app sorgente → Condividi → Docente OS → intake temporaneo → proposta contestuale → conferma docente → capability canonica`

L'utente non deve prima aprire Docente OS e ricercare manualmente il file.

Questa direzione è coerente con la formula V1:

`Teacher Moment → contesto → prossimo passo → copilota → conferma → traccia`.

## 4. Un solo ingresso, nessun nuovo modulo

Non introdurre un generico Inbox o un secondo archivio.

L'ingresso condiviso deve riusare i boundary già esistenti e proporre una destinazione contestuale:

- **Aggiungi alla Conoscenza**;
- **Circolare / verifica impegni e scadenze** → workflow Calendario;
- **Nuovo orario / verifica aggiornamento** → pipeline import orario;
- **Collega a una lezione o preparazione**;
- **Conserva soltanto**;
- **Annulla**.

Il sistema può suggerire il tipo di documento, ma la destinazione canonica e gli effetti operativi restano sotto controllo umano.

## 5. Intake locale ed effimero

La ricezione tramite Share Target non deve equivalere a una scrittura automatica nella Knowledge Base.

Pattern preferito:

1. il sistema operativo consegna il file alla PWA;
2. il file entra in uno staging locale/effimero quando tecnicamente possibile;
3. Docente OS mostra provenienza, nome, tipo e dimensione;
4. esegue o prepara il privacy/content preflight;
5. propone il routing;
6. il docente conferma;
7. solo allora avviene la persistenza canonica o l'avvio del workflow governato.

Tecnologie web candidate da validare in implementazione:
- Web App Manifest;
- Web Share Target;
- service worker;
- Cache Storage e/o IndexedDB per staging effimero;
- route same-origin dedicata all'intake.

## 6. Casi prioritari

### Circolare

`Gmail/File manager → Condividi → Docente OS`

Docente OS:
- preserva l'originale;
- propone acquisizione nella Conoscenza;
- rileva possibili date, orari, classi e scadenze;
- mostra la proposta;
- registra nel Calendario solo dopo conferma.

### Nuovo orario

`PDF/foto → Condividi → Docente OS`

Docente OS:
- riconosce che il documento potrebbe essere un orario;
- propone “Verifica aggiornamento orario”;
- riusa DOS-TT-IMPORT-01;
- mantiene estrazione → review → DRAFT → conferma;
- non attiva automaticamente l'orario;
- non esegue replan;
- non abilita DOS-A1.

### Materiale didattico

`file → Condividi → Docente OS`

Docente OS:
- propone Conoscenza, lezione o preparazione;
- preserva provenance;
- evita copie/archivi paralleli.

## 7. Invarianti

- nessuna persistenza canonica automatica alla ricezione;
- nessun effetto operativo senza conferma;
- privacy/preflight prima della persistenza;
- originale preservato;
- provenance preservata;
- workspace e AAL2 invariati;
- nessun secondo archivio;
- nessun secondo motore di import;
- nessuna nuova authority;
- Arena/Atlas/Docente OS mantengono i rispettivi confini;
- DOS-A1 resta `RUNTIME_DEFERRED`.

## 8. Relazione con E3 ed E4

### E3 — osservare, non implementare per ipotesi

Durante il sustained pilot annotare:
- quante volte arriva un documento che sarebbe naturale condividere direttamente a Docente OS;
- quale app/dispositivo è la sorgente;
- tipo e dimensione del file;
- destinazione desiderata;
- quanti passaggi richiede oggi il caricamento manuale;
- se il docente rinuncia, rimanda o usa un workaround;
- tempo perso nella ricerca/selezione del file.

Finding minimo da registrare:

`SHARE_TARGET_OPPORTUNITY: sorgente / tipo / destinazione / passaggi evitabili / esito`.

### E4 — implementare solo con evidenza

Se il pilot conferma frequenza e impatto, il lavoro entra nel Focus-first correction round con perimetro circoscritto:

1. PWA manifest/installability;
2. service worker minimo e governato;
3. Web Share Target file;
4. intake/staging effimero;
5. routing ai boundary esistenti;
6. test Android/mobile, installazione, aggiornamento, share sheet e recovery;
7. nessuna nuova area funzionale.

## 9. Criteri di successo

La capability è riuscita quando il docente può:

- installare Docente OS sul dispositivo mobile con identità applicativa corretta;
- scegliere Docente OS dal menu “Condividi” per i formati supportati;
- vedere il file ricevuto senza importazione silenziosa;
- capire subito cosa può farne;
- confermare la destinazione con pochi passaggi;
- riusare gli stessi contratti di Knowledge, Calendario, Orario e Lezione;
- recuperare da errore senza perdita o duplicazione;
- ridurre in modo osservabile tap, navigazione e ricerca file.

## 10. Decisione corrente

**FOLLOW / EVIDENCE-DRIVEN.**

La direzione viene preservata come parte della strategia V1, ma durante E3 resta un PILOT_FINDING. Non deve interrompere il sustained pilot né trasformarsi in un nuovo feature train.

Se l'evidenza E3 conferma il gap, diventa una correzione E4 ad alta priorità perché porta Docente OS dentro il flusso operativo del dispositivo e aumenta il Teacher Attention Returned.
