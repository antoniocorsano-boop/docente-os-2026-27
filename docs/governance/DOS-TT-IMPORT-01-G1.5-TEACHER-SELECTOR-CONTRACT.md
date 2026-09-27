# DOS-TT-IMPORT-01 — G1.5 Teacher Selector Contract

## Stato

`CONTRACT_ONLY / PREVIEW_ONLY / FAIL_CLOSED`

Baseline: `develop@126a90f9845613e2f0352bb25f560444616a6b76` (G1.4 intake preview #613).

Restano attivi: `HOLD_PRODUCTION_APPLY / HOLD_REPLAN / HOLD_MERGE`.

Questa fase non autorizza scritture DB, attivazione di versioni orario, ripianificazione o modifica delle lezioni.

## Scopo

Consentire al docente di indicare il cognome che vede nel documento-orario e ottenere esclusivamente l'anteprima delle righe/celle pertinenti, senza trasformare il cognome in identità persistente.

Principio UX: il docente deve compiere una sola azione comprensibile: indicare il cognome da cercare; il sistema gestisce le differenze tecniche di rappresentazione della stessa stringa senza chiedere conoscenze informatiche.

## Informativa obbligatoria

Accanto al campo di ricerca deve essere sempre visibile, prima dell'elaborazione:

> **Il cognome serve solo per trovare il tuo orario nel documento. Non viene salvato.**

L'informativa non può essere nascosta in tooltip, condizioni d'uso o schermate successive.

## Privacy e minimizzazione

Il cognome digitato e le forme normalizzate:

- esistono soltanto nella memoria volatile necessaria alla singola elaborazione;
- non sono salvati in database, local storage, session storage, cache persistente o profilo;
- non sono inclusi in log applicativi, telemetria, analytics, receipt, error reporting o audit payload;
- non sono usati come `teacher_id`, chiave, slug, digest persistente o altro identificatore;
- sono eliminati dal contesto di elaborazione quando l'anteprima è prodotta, annullata o fallisce.

Gli artefatti successivi possono contenere solo i dati dell'orario necessari al flusso canonico e gli identificatori canonici di Docente OS; non devono conservare la stringa usata per la ricerca.

## Normalizzazione deterministica

La normalizzazione serve esclusivamente al confronto temporaneo e non modifica il documento sorgente.

Pipeline minima, nello stesso ordine per input docente e candidati estratti:

1. validazione come stringa Unicode valida; input non valido => `NO_MATCH_SAFE`;
2. normalizzazione Unicode `NFC`;
3. rimozione degli spazi iniziali/finali;
4. compressione delle sequenze di spazi Unicode interni a un singolo spazio;
5. case folding deterministico e indipendente dalla locale;
6. equivalenza controllata degli apostrofi tipografici con apostrofo ASCII (`’`, `‘`, `ʼ` → `'`);
7. equivalenza controllata dei trattini tipografici comuni con `-` (`‐`, `‑`, `‒`, `–`, `—`, `−` → `-`).

Non sono consentiti: rimozione indiscriminata di accenti/diacritici, translitterazione, distanza di Levenshtein, ricerca fonetica, completamento probabilistico o fuzzy matching automatico. Cognomi differenti non devono diventare equivalenti per comodità.

## Cardinalità e decisione docente

Il matching avviene solo sui candidati effettivamente estratti dal documento corrente.

- **0 corrispondenze** — nessuna supposizione: mostrare «Nessuna corrispondenza. Controlla il cognome come compare nell'orario.»; nessuna anteprima attribuita.
- **1 corrispondenza** — produrre l'anteprima delle sole celle pertinenti e chiedere al docente di controllarla; nessuna applicazione automatica.
- **più corrispondenze** — stato `AMBIGUOUS`: il sistema non sceglie. Presenta alternative sufficienti a distinguerle usando esclusivamente contesto già presente nel documento (per esempio classi/giorni/ore), evitando di persistere il cognome. La scelta esplicita del docente vale solo per la sessione corrente.

Qualunque incertezza di parsing o cardinalità è fail-closed.

## Separazione dall'identità canonica

Il cognome è una chiave di ricerca effimera del documento, non l'identità del docente e non l'identità delle lezioni.

Dopo la selezione, il flusso G1.4/#613 deve continuare usando esclusivamente il modello canonico dell'orario e gli identificatori canonici già previsti. G1.5 non introduce un nuovo store docente, una tabella di alias o un collegamento persistente cognome→utente.

## Esperienza docente

Percorso ordinario:

`carica documento → indica cognome → controlla anteprima`

Non devono essere richieste in questa fase specializzazioni della singola lezione (teoria, disegno, disposizione o equivalenti): restano funzioni successive già proprie della cella/orario e non vincolano l'importazione del quadro settimanale.

Il percorso deve essere utilizzabile da smartphone, con campo e informativa immediatamente leggibili e stati di errore espressi in linguaggio non tecnico.

## Casi governati minimi

1. stesso cognome con maiuscole/minuscole diverse → una corrispondenza;
2. spazi iniziali/finali → equivalenti;
3. più spazi interni → equivalenti a un singolo spazio;
4. Unicode NFC vs forma decomposta equivalente → corrispondenza;
5. apostrofo ASCII vs tipografico → corrispondenza;
6. trattino ASCII vs trattino tipografico previsto → corrispondenza;
7. cognomi realmente diversi che differiscono per accento/diacritico → non fonderli automaticamente;
8. errore ortografico di una lettera → nessun fuzzy match;
9. nessuna corrispondenza → `NO_MATCH_SAFE`, nessuna attribuzione;
10. due o più candidati equivalenti → `AMBIGUOUS`, scelta esplicita;
11. parsing incerto → fail-closed;
12. input Unicode non valido → fail-closed;
13. cognome assente da DB/localStorage/sessionStorage/cache dopo successo;
14. cognome assente da log/telemetria/analytics/receipt/error reporting;
15. nessun identificatore persistente derivato dal cognome;
16. annullamento → eliminazione del contesto effimero;
17. errore → eliminazione del contesto effimero;
18. anteprima prodotta → eliminazione della stringa di ricerca dal payload successivo;
19. omonimia risolta usando solo contesto del documento e decisione esplicita;
20. nessuna scrittura DB, attivazione o ripianificazione durante G1.5;
21. informativa «Il cognome serve solo per trovare il tuo orario nel documento. Non viene salvato.» visibile prima dell'elaborazione;
22. nessuna richiesta di teoria/disegno/disposizione durante l'intake.

## Gate prima del runtime

Prima di qualsiasi materializzazione runtime devono esistere test deterministici per tutti i casi sopra, inclusi controlli negativi sulla persistenza e sui log. La review deve verificare anche che la normalizzazione sia condivisa da input e candidati e non abbia due implementazioni divergenti.

Qualunque futura autorizzazione runtime richiede un nuovo exact head, controlli automatici, revisione indipendente e decisione umana esplicita.
