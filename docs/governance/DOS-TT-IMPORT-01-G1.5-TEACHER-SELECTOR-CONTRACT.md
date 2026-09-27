# DOS-TT-IMPORT-01 — G1.5 Teacher Selector Contract

## Stato

`CONTRACT_ONLY / PREVIEW_ONLY / FAIL_CLOSED`

Baseline: `develop@126a90f9845613e2f0352bb25f560444616a6b76` (G1.4 intake preview #613).

Restano attivi: `HOLD_PRODUCTION_APPLY / HOLD_REPLAN / HOLD_MERGE`.

Questa fase non autorizza scritture DB, attivazione di versioni orario, ripianificazione o modifica delle lezioni.

## Scopo

Consentire al docente di indicare il cognome che vede nel documento-orario e ottenere esclusivamente l'anteprima delle celle pertinenti, senza trasformare il cognome in identità persistente.

Principio UX: il docente compie una sola azione comprensibile — indicare il cognome da cercare — e il sistema gestisce le differenze tecniche di rappresentazione della stessa stringa senza richiedere conoscenze informatiche.

## Informativa obbligatoria

Accanto al campo di ricerca deve essere sempre visibile, prima dell'elaborazione:

> **Il cognome serve solo per trovare il tuo orario nel documento. Non viene salvato.**

L'informativa non può essere nascosta in tooltip, condizioni d'uso o schermate successive.

Per rendere vera e non ambigua questa promessa nel flusso G1.5, anche il documento sorgente caricato è **transitorio**: può essere mantenuto soltanto nella memoria/area temporanea necessaria a parsing, selezione e produzione dell'anteprima e deve essere eliminato o reso non risolvibile al completamento, annullamento o errore della sessione G1.5. Non è consentita una retention persistente del PDF, immagine, scansione o tabella sorgente in questo flusso. Restano ammessi esclusivamente il `source_fingerprint` opaco definito sotto e i dati strutturali minimizzati autorizzati dal contratto.

## Privacy e minimizzazione

Sono dati nominativi effimeri G1.5, senza distinzione di provenienza:

- il cognome digitato dal docente;
- ogni etichetta nominativa grezza estratta dal documento, incluse varianti tipografiche e ripetizioni nelle celle;
- tutte le forme intermedie e normalizzate prodotte per il confronto;
- gli eventuali valori nominativi temporanei usati per costruire una scelta in caso di omonimia.

Tutti questi dati:

- esistono soltanto nella memoria volatile necessaria alla singola elaborazione;
- non sono salvati in database, local storage, session storage, cache persistente o profilo;
- non sono inclusi in parser evidence persistente, diagnostica persistente, log applicativi, telemetria, analytics, receipt, error reporting o audit payload;
- non sono usati come `teacher_id`, chiave, slug o altro identificatore persistente;
- non possono essere sottoposti individualmente a hash/digest/fingerprint per creare un surrogato persistente del nominativo;
- sono eliminati dal contesto di elaborazione quando l'anteprima è prodotta, annullata o fallisce.

### Eccezione stretta: `source_fingerprint` G1.3

Il divieto precedente non vieta il `source_fingerprint` canonico ereditato da G1.3, purché resti l'impronta crittografica opaca della rappresentazione meaning-preserving dell'**intero documento sorgente** prevista dal contratto G1.3. Tale fingerprint può dipendere indirettamente anche dai valori nominativi presenti nel documento, ma è ammesso esclusivamente per integrità, idempotenza e deduplicazione del documento completo.

Il `source_fingerprint`:

- non è un fingerprint del cognome o del docente;
- non può essere calcolato su un sottoinsieme nominativo, su una singola etichetta o sulla forma normalizzata del cognome;
- non può essere indicizzato, confrontato o interrogato per identificare/ricercare un docente;
- non può essere usato come `teacher_id`, alias, chiave di associazione o surrogato persistente del nominativo;
- non autorizza la persistenza del preimage, del documento sorgente, delle raw candidate labels o delle forme normalizzate;
- non modifica algoritmo o preimage canonico di deduplicazione G1.3: G1.5 introduce soltanto una classificazione privacy e una retention più restrittiva della fonte per questo flusso.

Qualunque nuovo digest/fingerprint specifico del nominativo è vietato. Un futuro cambio del preimage del `source_fingerprint` resta modifica di G1.3 e richiede una fase governata separata.

Gli artefatti successivi possono contenere solo i dati strutturali dell'orario necessari al flusso canonico e gli identificatori canonici di Docente OS; non devono conservare la stringa di ricerca, etichette nominative grezze o il documento sorgente.

## Normalizzazione deterministica

La normalizzazione serve esclusivamente al confronto temporaneo e non modifica il documento sorgente.

### Profilo normativo `TT-TEACHER-NORM-1`

Input docente e candidati estratti devono attraversare **la stessa unica funzione normativa**. Non sono ammesse implementazioni divergenti client/server/parser.

`TT-TEACHER-NORM-1` è fissato a **Unicode 17.0.0**. NFC, proprietà e case folding devono riprodurre i dati normativi Unicode 17.0.0. La materializzazione runtime deve includere nel repository le tabelle/dati minimi necessari derivati da Unicode 17.0.0 oppure un artefatto deterministico equivalente verificabile contro Unicode 17.0.0; codice e test devono dichiarare esplicitamente `UNICODE_VERSION = 17.0.0`. Non è consentito delegare il risultato a una versione Unicode implicita della piattaforma.

Un aggiornamento oltre Unicode 17.0.0, una sostituzione delle tabelle o una modifica del profilo costituiscono modifica del contratto e richiedono nuovi test, review ed exact head.

Pipeline, nello stesso ordine:

1. validazione come sequenza di valori scalari Unicode; surrogate isolati o sequenze non valide => `NO_MATCH_SAFE`;
2. normalizzazione canonica `NFC` secondo Unicode 17.0.0;
3. trattamento come spazio esclusivamente dei code point della proprietà Unicode 17.0.0 `White_Space`: `U+0009–U+000D`, `U+0020`, `U+0085`, `U+00A0`, `U+1680`, `U+2000–U+200A`, `U+2028`, `U+2029`, `U+202F`, `U+205F`, `U+3000`;
4. rimozione di tali spazi all'inizio e alla fine;
5. compressione di ogni sequenza interna di uno o più code point dell'insieme precedente a un singolo `U+0020`;
6. **Unicode Default Case Folding completo (full), non Turkic**, mediante `CaseFolding.txt` Unicode 17.0.0; nessuna locale può alterare il risultato;
7. equivalenza controllata degli apostrofi `U+2019`, `U+2018`, `U+02BC` con `U+0027`;
8. equivalenza controllata dei trattini `U+2010`, `U+2011`, `U+2012`, `U+2013`, `U+2014`, `U+2212` con `U+002D`.

Non sono consentiti: uso generico di `\s` come definizione normativa dello spazio; `toLocaleLowerCase` o equivalenti dipendenti dalla locale; rimozione indiscriminata di accenti/diacritici; translitterazione; distanza di Levenshtein; ricerca fonetica; completamento probabilistico o fuzzy matching automatico.

## Candidato nominativo effimero e aggregazione delle occorrenze

La cardinalità **non conta le celle, righe, pagine o zone del documento** in cui compare il cognome. Un orario generale può legittimamente contenere lo stesso docente in molte celle separate: tali occorrenze devono poter essere aggregate per ricostruire il suo quadro settimanale.

L'unità temporanea è il `teacherSelectionCandidate`: un candidato nominativo effimero costruito a partire dall'etichetta normalizzata e dall'evidenza strutturale del documento. Non è un'identità canonica e non viene persistito.

Regole:

- tutte le occorrenze distribuite che hanno la stessa etichetta normalizzata e **non presentano evidenza strutturale di persone differenti** possono appartenere allo stesso candidato e vengono aggregate nel quadro proposto;
- la mera distanza fisica, appartenenza a celle, giorni, classi, righe, colonne, pagine o blocchi differenti **non costituisce evidenza di omonimia**;
- non è consentito dedurre automaticamente che due persone siano la stessa persona sulla base del solo cognome quando il documento contiene un separatore/identificatore strutturale che dimostra candidati distinti;
- se la fonte fornisce evidenza strutturale di due o più persone differenti con la stessa etichetta normalizzata, si creano candidati distinti e l'esito è `AMBIGUOUS`;
- se il parser non può stabilire con sufficiente certezza se occorrenze incompatibili appartengano allo stesso candidato o a omonimi distinti, l'esito è `AMBIGUOUS`/fail-closed, mai una fusione silenziosa;
- nessun `teacherSelectionCandidate`, gruppo di occorrenze o chiave di aggregazione viene persistito o trasformato in identità docente.

Esiti:

- **0 candidati** — «Nessuna corrispondenza. Controlla il cognome come compare nell'orario.»; nessuna anteprima attribuita;
- **1 candidato** — aggregare tutte le sue occorrenze strutturalmente compatibili e produrre l'anteprima del quadro settimanale, che il docente deve controllare;
- **più candidati omonimi** — `AMBIGUOUS`: nessuna scelta automatica. Presentare alternative usando soltanto contesto non nominativo già presente nella fonte (per esempio classi/giorni/ore); la scelta esplicita vale solo nella sessione corrente.

## Separazione dall'identità canonica

Il cognome, le occorrenze e `teacherSelectionCandidate` sono strumenti effimeri di selezione, non identità del docente o delle lezioni.

Dopo la selezione, il flusso G1.4/#613 continua esclusivamente con il modello canonico dell'orario e gli identificatori canonici già previsti. G1.5 non introduce store docente, tabella alias o collegamento persistente cognome→utente.

## Esperienza docente

Percorso ordinario:

`carica documento → indica cognome → controlla anteprima`

Non devono essere richieste in questa fase specializzazioni della singola lezione (teoria, disegno, disposizione o equivalenti): restano funzioni successive proprie della cella/orario.

Il percorso deve essere utilizzabile da smartphone, con campo e informativa immediatamente leggibili e stati di errore espressi in linguaggio non tecnico.

## Casi governati minimi

1. stesso cognome con maiuscole/minuscole diverse → equivalenza;
2. spazi iniziali/finali del set `White_Space` Unicode 17.0.0 → equivalenza;
3. più spazi interni normativi → singolo `U+0020`;
4. NFC vs forma decomposta equivalente → corrispondenza;
5. apostrofi normativi equivalenti → corrispondenza;
6. trattini normativi equivalenti → corrispondenza;
7. cognomi differenti per accento/diacritico → non fonderli automaticamente;
8. errore ortografico → nessun fuzzy match;
9. nessuna corrispondenza → `NO_MATCH_SAFE`;
10. stesso cognome dello stesso docente in celle di giorni/classi differenti → un candidato, tutte le celle aggregate;
11. stesso cognome dello stesso docente in righe/colonne/pagine differenti → la separazione fisica non genera `AMBIGUOUS`;
12. due persone strutturalmente distinte con lo stesso cognome → candidati distinti, `AMBIGUOUS`;
13. impossibilità di distinguere con certezza aggregazione legittima da omonimia → `AMBIGUOUS`/fail-closed;
14. parsing incerto → fail-closed;
15. input Unicode non valido → fail-closed;
16. case folding Unicode 17.0.0 full/non-Turkic verificato con fixture simple/full e locale-independent;
17. ogni code point `White_Space` normativo trattato identicamente sui runtime supportati;
18. code point escluso da `White_Space` non trasformato per primitive di piattaforma;
19. cognome digitato assente da DB/localStorage/sessionStorage/cache dopo successo;
20. etichette nominative grezze assenti da storage persistente dopo successo;
21. input, raw labels e forme normalizzate assenti da evidence persistente/log/telemetria/analytics/receipt/error reporting/audit payload;
22. nessun identificatore persistente derivato da cognome, raw label o `teacherSelectionCandidate`;
23. annullamento → eliminazione di input, raw labels, forme normalizzate, candidati e documento sorgente;
24. errore → stessa eliminazione del caso precedente;
25. anteprima prodotta → eliminazione del documento sorgente e nessun dato nominativo di selezione nel payload successivo;
26. omonimia risolta con contesto non nominativo e decisione esplicita;
27. nessuna scrittura DB, attivazione o ripianificazione durante G1.5;
28. informativa «Il cognome serve solo per trovare il tuo orario nel documento. Non viene salvato.» visibile prima dell'elaborazione;
29. nessuna richiesta di teoria/disegno/disposizione durante l'intake;
30. input e candidati usano la stessa implementazione `TT-TEACHER-NORM-1` Unicode 17.0.0;
31. cambio tabelle/versione Unicode senza aggiornamento contrattuale → gate FAIL;
32. `source_fingerprint` G1.3 dell'intero documento resta stabile e ammesso per integrità/idempotenza/deduplicazione;
33. nessun hash/digest/fingerprint nominativo specifico viene persistito;
34. `source_fingerprint` non è usabile per lookup/associazione docente e non modifica il preimage G1.3;
35. runtime con Unicode implicito diverso deve riprodurre esattamente Unicode 17.0.0 oppure gate FAIL;
36. PDF/immagine/scansione/tabella sorgente non persiste oltre produzione anteprima, annullamento o errore;
37. `source_fingerprint` può sopravvivere alla cancellazione della fonte senza rendere nuovamente risolvibile il documento;
38. dati strutturali minimizzati dell'orario sopravvivono solo se ammessi dal contratto e non contengono etichette nominative;
39. documento con molte occorrenze distribuite dello stesso docente produce un unico quadro settimanale completo, non una falsa omonimia;
40. separatore strutturale che dimostra due persone omonime impedisce la fusione automatica.

## Gate prima del runtime

Prima di qualsiasi materializzazione runtime devono esistere test deterministici per tutti i casi sopra, inclusi controlli negativi su persistenza, evidence, log, digest nominativi e retention della fonte.

La materializzazione deve includere fixture realistiche di orario generale con lo stesso docente distribuito su giorni/classi differenti, omonimi realmente distinti, casi ambigui, caratteri che distinguono full/simple case folding, tutti i code point `White_Space` normativi, almeno un code point deliberatamente escluso, compatibilità del `source_fingerprint` G1.3 e verifica che la fonte non sia più risolvibile dopo la sessione.

Qualunque futura autorizzazione runtime richiede un nuovo exact head, controlli automatici, revisione indipendente e decisione umana esplicita.
