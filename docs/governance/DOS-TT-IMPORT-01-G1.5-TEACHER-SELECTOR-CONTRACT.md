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

Per rendere vera questa promessa, documento sorgente e ogni sua rappresentazione derivata sono transitori: PDF, fotografia, scansione, tabella, nome originale del file, testo estratto/OCR, raster di pagina, miniature, ritagli, tabelle di estrazione, modelli di layout, artefatti intermedi del parser, payload di code e cache temporanee devono essere eliminati o resi non risolvibili al completamento dell'anteprima, all'annullamento o all'errore. Restano ammessi esclusivamente il `source_fingerprint` opaco G1.3, i dati strutturali minimizzati dell'orario e i metadati di governance non nominativi esplicitamente richiesti da G1.3.

## Privacy e minimizzazione

Sono dati nominativi effimeri G1.5, senza distinzione di provenienza: cognome digitato; etichette nominative grezze estratte; forme intermedie/normalizzate; valori nominativi temporanei usati per disambiguazione; nome/percorso client del file e `source_label` derivato dalla fonte.

Tali dati esistono soltanto nell'area temporanea della singola elaborazione; non sono salvati in DB/storage/cache persistente/profilo; non compaiono in evidence persistente, diagnostica, log, telemetria, analytics, receipt, error reporting o audit; non diventano identificatori; non possono essere trasformati individualmente in digest persistenti; sono eliminati o resi non risolvibili su anteprima, annullamento o errore.

Se uno schema richiede `source_label`, il valore persistente deve essere non nominativo e generato dal sistema.

### Eccezione stretta: `source_fingerprint` G1.3

Il `source_fingerprint` canonico dell'intero documento resta ammesso esclusivamente per integrità, idempotenza e deduplicazione. Non è un fingerprint del docente, non può essere calcolato su sottoinsiemi nominativi, usato per lookup/associazione docente o autorizzare la persistenza del preimage. G1.5 non modifica algoritmo/preimage G1.3. Digest nominativi specifici sono vietati.

### Metadati G1.3 ammessi

Possono sopravvivere, se previsti dal contratto canonico e non nominativi: `parser_version`, `source_is_provisional`, `source_scope`, `source_completeness`, `source_completeness_provenance`, `effective_from_provenance` e metadati equivalenti necessari a provenienza, completezza, provvisorietà e sicurezza. Campi liberi devono essere validati/sanificati oppure il flusso fallisce chiuso.

## Normalizzazione deterministica — `TT-TEACHER-NORM-1`

Input e candidati usano la stessa unica funzione normativa. Profilo fissato a **Unicode 17.0.0**; codice e test dichiarano `UNICODE_VERSION = 17.0.0` e non dipendono dalla versione Unicode implicita della piattaforma.

Pipeline: valori scalari validi; NFC 17.0.0; `White_Space` 17.0.0 (`U+0009–U+000D`, `U+0020`, `U+0085`, `U+00A0`, `U+1680`, `U+2000–U+200A`, `U+2028`, `U+2029`, `U+202F`, `U+205F`, `U+3000`); trim; compressione a `U+0020`; Unicode Default Case Folding **full non-Turkic** 17.0.0; apostrofi `U+2019/U+2018/U+02BC`→`U+0027`; trattini `U+2010/U+2011/U+2012/U+2013/U+2014/U+2212`→`U+002D`.

Vietati `\s` generico come norma, primitive locale-dependent, rimozione indiscriminata dei diacritici, translitterazione, Levenshtein, ricerca fonetica e fuzzy matching.

## Candidato effimero e prova positiva di aggregazione

La cardinalità non conta celle, righe, pagine o zone. La separazione fisica, da sola, non prova identità né omonimia. L'unità temporanea è `teacherSelectionCandidate`, non persistente e non canonica. Occorrenze con la stessa etichetta normalizzata possono essere aggregate solo con prova positiva deterministica e riproducibile.

### Predicato `SAME_TEACHER_EVIDENCE`

La materializzazione deve implementare un unico predicato versionato `SAME_TEACHER_EVIDENCE(a,b,sourceStructure)` con esito `SAME`, `DISTINCT` o `UNKNOWN`, usando soltanto segnali strutturali deterministici governati, mai probabilità, similarità o il solo cognome.

- `SAME`: prova strutturale positiva governata → aggregazione ammessa.
- `DISTINCT`: prova strutturale positiva governata di entità/gruppi differenti → candidati distinti.
- `UNKNOWN`: prova insufficiente/non governata → non aggregare, `AMBIGUOUS`/fail-closed.

La mera distanza fisica non è `DISTINCT`; la sola uguaglianza del cognome non è `SAME`.

### `TeacherEvidenceProfile` per formato/adattatore

`SAME_TEACHER_EVIDENCE` non può interpretare liberamente la struttura della fonte. **Ogni formato/adattatore supportato deve dichiarare prima dell'uso un `TeacherEvidenceProfile` versionato e sottoposto a test/review.** Senza un profilo applicabile e riconosciuto, l'esito è `UNKNOWN`; il formato può essere acquisito/mostrato secondo i confini precedenti, ma non può aggregare automaticamente occorrenze omonime.

Ogni profilo deve dichiarare almeno:

- `profile_id` e `profile_version` stabili;
- `parser_version`/famiglia di parser a cui si applica;
- criteri di riconoscimento del formato e condizioni che rendono il profilo applicabile;
- **allowlist dei segnali sufficienti per `SAME`**, con regola combinatoria esplicita (un segnale, congiunzione, chiave strutturale ecc.);
- **allowlist dei segnali sufficienti per `DISTINCT`**, con regola combinatoria esplicita;
- segnali vietati o insufficienti, che devono produrre `UNKNOWN` se non esiste altra prova governata;
- comportamento in caso di segnale mancante, contraddittorio, duplicato o parsing parziale;
- fixture positive `SAME`, negative `DISTINCT`, ambigue `UNKNOWN` e fixture realistica multi-giorno/multi-classe;
- impronta/versione deterministica delle regole usate, priva di dati nominativi.

Un segnale può essere usato come prova solo se è elencato nel profilo applicabile e la sua semantica è deterministica per quel formato. Non è sufficiente che un implementatore lo ritenga plausibile. Esempi di categorie **potenzialmente** ammissibili, solo se il profilo le governa: identificatore strutturale interno della fonte non derivato dal nominativo; appartenenza esplicita a una stessa intestazione/gruppo con semantica univoca; chiave di relazione dichiarata dal formato. Giorno, ora, classe, pagina, coordinate, prossimità grafica o ripetizione testuale, presi isolatamente, **non sono prova di identità** e non possono produrre `SAME` salvo che un profilo dimostri e governi una semantica strutturale ulteriore che li renda parte di una regola sufficiente.

Per `DISTINCT`, analogamente, la mera collocazione in celle/pagine differenti non basta. Serve un segnale governato che il formato definisca come separazione di entità/gruppi.

Se più segnali governati producono risultati contraddittori, l'esito è sempre `UNKNOWN`, mai una precedenza implicita. La precedenza è ammessa soltanto se dichiarata esplicitamente e testata nel profilo.

La conferma esplicita del docente può risolvere un `UNKNOWN` esclusivamente per la sessione corrente; non modifica il profilo, non crea alias e non diventa prova riutilizzabile.

### Gate del profilo

Un nuovo `TeacherEvidenceProfile`, una nuova versione o una modifica alle regole `SAME/DISTINCT/UNKNOWN` è una modifica governata: richiede fixture, test deterministici, revisione indipendente ed exact head. Non può essere introdotta come semplice configurazione runtime non revisionata.

La receipt/evidence tecnica può registrare esclusivamente `profile_id`, `profile_version`, `parser_version` ed esito (`SAME/DISTINCT/UNKNOWN`) se non nominativi; non deve registrare cognome, raw labels o valori nominativi che hanno partecipato alla selezione.

Esiti finali: 0 candidati → nessuna attribuzione; 1 candidato determinato → anteprima da controllare; più candidati o `UNKNOWN` → `AMBIGUOUS`, nessuna scelta automatica.

## Separazione dall'identità canonica

Cognome, occorrenze, predicato, profilo e `teacherSelectionCandidate` sono strumenti di selezione; nessuno introduce store docente, alias persistenti o collegamenti cognome→utente.

## Esperienza docente

Percorso ordinario: `carica documento → indica cognome → controlla anteprima`. Teoria, disegno, disposizione o equivalenti restano specializzazioni successive della cella. Il percorso deve funzionare su smartphone e gli errori devono essere espressi in linguaggio non tecnico.

## Casi governati minimi

1. maiuscole/minuscole → equivalenza;
2. spazi normativi → equivalenza;
3. più spazi interni → `U+0020`;
4. NFC/decomposto → equivalenza;
5. apostrofi normativi → equivalenza;
6. trattini normativi → equivalenza;
7. differenza reale per accento/diacritico → non fusione;
8. errore ortografico → nessun fuzzy match;
9. nessuna corrispondenza → `NO_MATCH_SAFE`;
10. occorrenze distribuite con prova `SAME` governata dal profilo → un candidato/quadro completo;
11. separazione fisica senza altra evidenza → non `DISTINCT`;
12. solo cognome uguale → non `SAME`;
13. prova `DISTINCT` governata → candidati distinti/`AMBIGUOUS`;
14. `UNKNOWN` → `AMBIGUOUS`/fail-closed;
15. parsing incerto → fail-closed;
16. Unicode non valido → fail-closed;
17. case folding full/non-Turkic 17.0.0 verificato;
18. tutti i `White_Space` normativi verificati;
19. code point escluso non trasformato;
20. cognome/raw labels/forme normalizzate assenti da storage/evidence/log/telemetria/receipt/audit;
21. nessun identificatore/digest persistente derivato dal nominativo;
22. nome file nominativo non persiste e non diventa `source_label`;
23. `source_label` persistente non nominativo;
24. successo/annullamento/errore rendono non risolvibili fonte e derivati;
25. OCR/testo/raster/thumbnail/crop/extraction table/layout/cache/queue/temp artifact non risolvibili nei tre esiti;
26. nessuna scrittura DB, attivazione o ripianificazione durante G1.5;
27. informativa privacy visibile prima dell'elaborazione;
28. nessuna richiesta teoria/disegno/disposizione;
29. stessa `TT-TEACHER-NORM-1` per input/candidati;
30. cambio Unicode senza governance → FAIL;
31. `source_fingerprint` G1.3 stabile e non usato per lookup docente;
32. nessun fingerprint nominativo specifico;
33. runtime con Unicode diverso riproduce 17.0.0 o FAIL;
34. metadati G1.3 non nominativi necessari preservati;
35. `TeacherEvidenceProfile` assente/non riconosciuto → `UNKNOWN`, mai aggregazione automatica;
36. segnale non presente nell'allowlist del profilo → non può produrre `SAME`/`DISTINCT`;
37. `SAME` prodotto soltanto dalla regola combinatoria dichiarata nel profilo;
38. `DISTINCT` prodotto soltanto dalla regola combinatoria dichiarata nel profilo;
39. segnali governati contraddittori senza precedenza esplicita → `UNKNOWN`;
40. cambio `profile_version`/regole senza nuova governance → gate FAIL;
41. fixture positiva `SAME` per ogni profilo;
42. fixture negativa `DISTINCT` per ogni profilo;
43. fixture ambigua `UNKNOWN` per ogni profilo;
44. fixture realistica multi-giorno/multi-classe per ogni profilo che supporta tale struttura;
45. receipt tecnica, se prevista, contiene solo identificativi/versioni/esito non nominativi;
46. conferma docente su `UNKNOWN` resta session-only e non modifica profilo/alias;
47. formato riconosciuto ma profilo non applicabile → `UNKNOWN`;
48. parsing parziale secondo condizione non autorizzata dal profilo → `UNKNOWN`;
49. chiave strutturale derivata dal nominativo → vietata come evidence;
50. giorno/ora/classe/pagina/coordinate/prossimità/ripetizione, isolati e senza semantica ulteriore governata → insufficienti per `SAME`.

## Gate prima del runtime

Prima della materializzazione runtime devono esistere test deterministici per tutti i casi sopra e una **retention matrix** per ogni rappresentazione sorgente/derivata sui tre esiti successo/anteprima, annullamento, errore.

Per ogni formato/adattatore abilitato devono inoltre esistere un `TeacherEvidenceProfile` revisionato, fixture `SAME/DISTINCT/UNKNOWN`, fixture realistica pertinente, test della regola combinatoria e test negativi per segnali non ammessi/contraddittori. Devono restare coperti Unicode 17.0.0, sanificazione `source_label`/nome file, metadati G1.3 e compatibilità `source_fingerprint`.

Qualunque futura autorizzazione runtime richiede un nuovo exact head, controlli automatici, revisione indipendente e decisione umana esplicita.
