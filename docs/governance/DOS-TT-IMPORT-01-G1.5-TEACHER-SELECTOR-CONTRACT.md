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

Sono dati nominativi effimeri G1.5, senza distinzione di provenienza:

- il cognome digitato dal docente;
- ogni etichetta nominativa grezza estratta dal documento, incluse varianti tipografiche e ripetizioni nelle celle;
- tutte le forme intermedie e normalizzate prodotte per il confronto;
- gli eventuali valori nominativi temporanei usati per costruire la scelta in caso di omonimia.

Tutti questi dati:

- esistono soltanto nella memoria volatile necessaria alla singola elaborazione;
- non sono salvati in database, local storage, session storage, cache persistente o profilo;
- non sono inclusi in parser evidence persistente, diagnostica persistente, log applicativi, telemetria, analytics, receipt, error reporting o audit payload;
- non sono usati come `teacher_id`, chiave, slug o altro identificatore persistente;
- non possono essere sottoposti individualmente a hash/digest/fingerprint per creare un surrogato persistente del nominativo;
- sono eliminati dal contesto di elaborazione quando l'anteprima è prodotta, annullata o fallisce.

### Eccezione stretta: `source_fingerprint` G1.3

Il divieto precedente **non vieta** il `source_fingerprint` canonico ereditato da G1.3, purché resti l'impronta crittografica opaca della rappresentazione meaning-preserving dell'**intero documento sorgente** prevista dal contratto G1.3. Tale fingerprint può quindi dipendere indirettamente anche dai byte/valori nominativi presenti nel documento, ma è ammesso esclusivamente per integrità, idempotenza e deduplicazione del documento completo.

Il `source_fingerprint`:

- non è un fingerprint del cognome o del docente;
- non può essere calcolato su un sottoinsieme nominativo, su una singola etichetta o sulla forma normalizzata del cognome;
- non può essere indicizzato, confrontato o interrogato per identificare/ricercare un docente;
- non può essere usato come `teacher_id`, alias, chiave di associazione o surrogato persistente del nominativo;
- non autorizza la persistenza del preimage, delle raw candidate labels o delle forme normalizzate oltre quanto già consentito dal contratto sorgente G1.3;
- non modifica l'algoritmo o il preimage canonico di deduplicazione G1.3: G1.5 introduce soltanto questa classificazione privacy esplicita.

Qualunque nuovo digest/fingerprint specifico del nominativo è vietato. Se una futura modifica richiedesse di cambiare il preimage del `source_fingerprint`, essa sarebbe una modifica di G1.3 e richiederebbe una fase governata separata.

Se una fase precedente dell'intake ammette temporaneamente etichette nominative per consentire selezione/review, G1.5 ne restringe il ciclo di vita: tali etichette restano esclusivamente volatili e non possono attraversare il confine verso artefatti persistenti, fatta salva esclusivamente l'impronta opaca dell'intero documento appena definita.

Gli artefatti successivi possono contenere solo i dati dell'orario necessari al flusso canonico e gli identificatori canonici di Docente OS; non devono conservare né la stringa usata per la ricerca né alcuna etichetta nominativa grezza estratta dal documento.

## Normalizzazione deterministica

La normalizzazione serve esclusivamente al confronto temporaneo e non modifica il documento sorgente.

### Profilo normativo `TT-TEACHER-NORM-1`

Input docente e candidati estratti devono attraversare **la stessa unica funzione normativa**. Non sono ammesse implementazioni divergenti client/server/parser.

`TT-TEACHER-NORM-1` è fissato a **Unicode 17.0.0**. NFC, proprietà e case folding devono riprodurre i dati normativi Unicode 17.0.0. La materializzazione runtime deve includere nel repository le tabelle/dati minimi necessari derivati da Unicode 17.0.0 oppure un artefatto deterministico equivalente verificabile contro Unicode 17.0.0; codice e test devono dichiarare esplicitamente `UNICODE_VERSION = 17.0.0`. Non è consentito delegare il risultato a una versione Unicode implicita della piattaforma.

Un aggiornamento oltre Unicode 17.0.0, una sostituzione delle tabelle o una modifica del profilo costituiscono modifica del contratto e richiedono nuovi test, review ed exact head.

Pipeline, nello stesso ordine:

1. validazione come sequenza di valori scalari Unicode; surrogate isolati o sequenze non valide => `NO_MATCH_SAFE`;
2. normalizzazione canonica `NFC` secondo Unicode 17.0.0;
3. trattamento come spazio **esclusivamente** dei code point della proprietà Unicode 17.0.0 `White_Space`: `U+0009–U+000D`, `U+0020`, `U+0085`, `U+00A0`, `U+1680`, `U+2000–U+200A`, `U+2028`, `U+2029`, `U+202F`, `U+205F`, `U+3000`;
4. rimozione di tali spazi all'inizio e alla fine;
5. compressione di ogni sequenza interna di uno o più code point dell'insieme precedente a un singolo `U+0020`;
6. **Unicode Default Case Folding completo (full), non Turkic**, mediante `CaseFolding.txt` Unicode 17.0.0; nessuna locale può alterare il risultato;
7. equivalenza controllata degli apostrofi `U+2019`, `U+2018`, `U+02BC` con apostrofo ASCII `U+0027`;
8. equivalenza controllata dei trattini `U+2010`, `U+2011`, `U+2012`, `U+2013`, `U+2014`, `U+2212` con `U+002D`.

Non sono consentiti: uso generico di `\s` come definizione normativa dello spazio; `toLocaleLowerCase` o equivalenti dipendenti dalla locale; rimozione indiscriminata di accenti/diacritici; translitterazione; distanza di Levenshtein; ricerca fonetica; completamento probabilistico o fuzzy matching automatico. Cognomi differenti non devono diventare equivalenti per comodità.

## Unità di corrispondenza e cardinalità

Il matching avviene solo sui candidati effettivamente estratti dal documento corrente, ma la cardinalità **non** conta le singole celle contenenti il cognome.

L'unità conteggiata è il **blocco docente sorgente** (`sourceTeacherBlock`): un'entità strutturale temporanea derivata esclusivamente dalla struttura del documento (per esempio riga, intestazione o gruppo di celle che il parser può dimostrare appartenere allo stesso docente). `sourceTeacherBlock`:

- esiste solo durante parsing/selezione;
- non è un'identità canonica del docente e non viene persistito;
- può contenere più occorrenze della stessa etichetta nominativa: tutte valgono **una sola corrispondenza**;
- non può essere creato fondendo blocchi distinti solo perché le etichette normalizzate coincidono.

Due blocchi sorgente distinti con la stessa etichetta normalizzata rappresentano **due candidati distinti** e quindi producono `AMBIGUOUS`. Se il parser non può determinare in modo affidabile i confini dei blocchi, il risultato è fail-closed e non può essere ridotto a una singola corrispondenza.

Esiti:

- **0 blocchi corrispondenti** — nessuna supposizione: mostrare «Nessuna corrispondenza. Controlla il cognome come compare nell'orario.»; nessuna anteprima attribuita.
- **1 blocco corrispondente** — produrre l'anteprima delle sole celle pertinenti e chiedere al docente di controllarla; nessuna applicazione automatica.
- **più blocchi corrispondenti** — stato `AMBIGUOUS`: il sistema non sceglie. Presenta alternative sufficienti a distinguerle usando esclusivamente contesto non nominativo già presente nel documento (per esempio classi/giorni/ore). La scelta esplicita del docente vale solo per la sessione corrente.

Qualunque incertezza di parsing, appartenenza delle occorrenze al blocco o cardinalità è fail-closed.

## Separazione dall'identità canonica

Il cognome e `sourceTeacherBlock` sono strumenti effimeri di selezione del documento, non l'identità del docente e non l'identità delle lezioni.

Dopo la selezione, il flusso G1.4/#613 deve continuare usando esclusivamente il modello canonico dell'orario e gli identificatori canonici già previsti. G1.5 non introduce un nuovo store docente, una tabella di alias o un collegamento persistente cognome→utente.

## Esperienza docente

Percorso ordinario:

`carica documento → indica cognome → controlla anteprima`

Non devono essere richieste in questa fase specializzazioni della singola lezione (teoria, disegno, disposizione o equivalenti): restano funzioni successive già proprie della cella/orario e non vincolano l'importazione del quadro settimanale.

Il percorso deve essere utilizzabile da smartphone, con campo e informativa immediatamente leggibili e stati di errore espressi in linguaggio non tecnico.

## Casi governati minimi

1. stesso cognome con maiuscole/minuscole diverse → una corrispondenza;
2. spazi iniziali/finali del set `White_Space` Unicode 17.0.0 → equivalenti;
3. più spazi interni del set Unicode 17.0.0 → equivalenti a un singolo `U+0020`;
4. Unicode 17.0.0 NFC vs forma decomposta equivalente → corrispondenza;
5. apostrofo ASCII vs `U+2019/U+2018/U+02BC` → corrispondenza;
6. trattino ASCII vs uno dei sei trattini normativi → corrispondenza;
7. cognomi realmente diversi che differiscono per accento/diacritico → non fonderli automaticamente;
8. errore ortografico di una lettera → nessun fuzzy match;
9. nessuna corrispondenza → `NO_MATCH_SAFE`, nessuna attribuzione;
10. due `sourceTeacherBlock` distinti con la stessa etichetta normalizzata → `AMBIGUOUS`, mai deduplicati per cognome;
11. cognome ripetuto in più celle dello stesso `sourceTeacherBlock` → conta una sola corrispondenza;
12. impossibilità di stabilire se due occorrenze appartengano allo stesso blocco → fail-closed;
13. parsing incerto → fail-closed;
14. input Unicode con surrogate isolati/sequenza non valida → fail-closed;
15. comportamento del case folding Unicode 17.0.0 full/non-Turkic verificato con fixture che distinguano simple/full e locale-dipendente/indipendente;
16. ogni code point del set `White_Space` Unicode 17.0.0 è trattato in modo identico su tutti i runtime supportati;
17. code point non appartenente al set `White_Space` non viene trasformato in spazio per effetto di primitive di piattaforma;
18. cognome digitato assente da DB/localStorage/sessionStorage/cache dopo successo;
19. etichette nominative grezze estratte dal documento assenti da DB/localStorage/sessionStorage/cache dopo successo;
20. input, raw candidate labels e forme normalizzate assenti da parser evidence persistente/log/telemetria/analytics/receipt/error reporting/audit payload;
21. nessun identificatore persistente derivato dal cognome, dall'etichetta grezza o da `sourceTeacherBlock`;
22. annullamento → eliminazione di input, raw candidate labels, forme normalizzate e blocchi effimeri;
23. errore → stessa eliminazione del caso precedente;
24. anteprima prodotta → nessun dato nominativo di selezione nel payload successivo;
25. omonimia risolta usando solo contesto non nominativo del documento e decisione esplicita;
26. nessuna scrittura DB, attivazione o ripianificazione durante G1.5;
27. informativa «Il cognome serve solo per trovare il tuo orario nel documento. Non viene salvato.» visibile prima dell'elaborazione;
28. nessuna richiesta di teoria/disegno/disposizione durante l'intake;
29. input e candidati usano la medesima implementazione `TT-TEACHER-NORM-1` fissata a Unicode 17.0.0;
30. cambio di tabelle/versione oltre Unicode 17.0.0 senza aggiornamento contrattuale → gate FAIL;
31. `source_fingerprint` G1.3 dell'intero documento resta stabile e ammesso per integrità/idempotenza/deduplicazione anche quando il documento contiene etichette nominative;
32. nessun hash/digest/fingerprint di cognome, raw candidate label, forma normalizzata o `sourceTeacherBlock` viene persistito o usato come surrogato identificativo;
33. `source_fingerprint` non è utilizzabile per query, lookup, indicizzazione o associazione del docente e non modifica il preimage canonico G1.3;
34. runtime con versione Unicode implicita diversa da 17.0.0 deve comunque riprodurre esattamente `TT-TEACHER-NORM-1`/Unicode 17.0.0 oppure il gate fallisce.

## Gate prima del runtime

Prima di qualsiasi materializzazione runtime devono esistere test deterministici per tutti i casi sopra, inclusi controlli negativi su persistenza, parser evidence, log e digest nominativi. La review deve verificare che normalizzazione, dati Unicode 17.0.0 e unità di cardinalità siano condivisi e non abbiano implementazioni divergenti.

La materializzazione deve includere fixture per omonimi in blocchi distinti, ripetizioni dello stesso docente nello stesso blocco, caratteri che distinguono full/simple case folding, tutti i code point `White_Space` normativi, almeno un code point deliberatamente escluso, la compatibilità del `source_fingerprint` G1.3 e l'assenza di digest nominativi paralleli.

Qualunque futura autorizzazione runtime richiede un nuovo exact head, controlli automatici, revisione indipendente e decisione umana esplicita.
