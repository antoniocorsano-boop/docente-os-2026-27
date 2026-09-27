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

Sono dati nominativi effimeri G1.5, senza distinzione di provenienza:

- il cognome digitato dal docente;
- ogni etichetta nominativa grezza estratta dal documento, incluse varianti e ripetizioni;
- tutte le forme intermedie e normalizzate;
- gli eventuali valori nominativi temporanei usati per una scelta in caso di omonimia;
- metadati di caricamento che possono contenere nominativi, inclusi nome originale del file, percorso/nome client e `source_label` derivato dalla fonte.

Tutti questi dati:

- esistono soltanto nella memoria/area temporanea necessaria alla singola elaborazione;
- non sono salvati in database, local storage, session storage, cache persistente o profilo;
- non sono inclusi in parser evidence persistente, diagnostica persistente, log, telemetria, analytics, receipt, error reporting o audit payload;
- non sono usati come `teacher_id`, chiave, slug o altro identificatore persistente;
- non possono essere sottoposti individualmente a hash/digest/fingerprint per creare un surrogato persistente;
- sono eliminati o resi non risolvibili quando l'anteprima è prodotta, annullata o fallisce.

Se uno schema ereditato richiede un `source_label` persistente, G1.5 deve valorizzarlo con un'etichetta **non nominativa generata dal sistema**, mai con nome file originale, cognome o altro testo sorgente potenzialmente nominativo.

### Eccezione stretta: `source_fingerprint` G1.3

Il `source_fingerprint` canonico G1.3 dell'intero documento resta ammesso esclusivamente per integrità, idempotenza e deduplicazione. Non è un fingerprint del docente, non può essere calcolato su sottoinsiemi nominativi, usato per lookup/associazione docente o autorizzare la persistenza del preimage. G1.5 non modifica algoritmo o preimage canonico G1.3. Qualunque digest nominativo specifico è vietato.

### Metadati G1.3 ammessi

La minimizzazione G1.5 **non elimina** i metadati tecnici e di governance non nominativi necessari alle garanzie G1.3. Possono sopravvivere, se previsti dal contratto/schema canonico e privi di contenuto nominativo: `parser_version`, `source_is_provisional`, `source_scope`, `source_completeness`, `source_completeness_provenance`, `effective_from_provenance` e metadati equivalenti richiesti per provenienza, completezza, provvisorietà e sicurezza delle proposte di modifica.

Questa è un'allowlist semantica: non autorizza nomi file, testo sorgente, OCR, ritagli o etichette nominative. Campi di governance capaci di trasportare testo libero devono essere validati/sanificati prima della persistenza oppure il flusso fallisce chiuso.

Gli artefatti successivi possono contenere soltanto dati strutturali minimizzati dell'orario, identificatori canonici Docente OS, `source_fingerprint` e metadati G1.3 non nominativi necessari.

## Normalizzazione deterministica — `TT-TEACHER-NORM-1`

Input e candidati usano la stessa unica funzione normativa. Il profilo è fissato a **Unicode 17.0.0**; codice e test devono dichiarare `UNICODE_VERSION = 17.0.0` e non dipendere dalla versione Unicode implicita della piattaforma.

Pipeline: valori scalari Unicode validi; NFC 17.0.0; `White_Space` 17.0.0 (`U+0009–U+000D`, `U+0020`, `U+0085`, `U+00A0`, `U+1680`, `U+2000–U+200A`, `U+2028`, `U+2029`, `U+202F`, `U+205F`, `U+3000`); trim; compressione a `U+0020`; Unicode Default Case Folding **full non-Turkic** 17.0.0; apostrofi `U+2019/U+2018/U+02BC`→`U+0027`; trattini `U+2010/U+2011/U+2012/U+2013/U+2014/U+2212`→`U+002D`.

Vietati `\s` generico come norma, primitive locale-dependent, rimozione indiscriminata dei diacritici, translitterazione, Levenshtein, ricerca fonetica e fuzzy matching.

## Candidato effimero e prova positiva di aggregazione

La cardinalità non conta celle, righe, pagine o zone. La separazione fisica, da sola, **non prova né identità né omonimia**.

L'unità temporanea è `teacherSelectionCandidate`, non persistente e non canonica. Due o più occorrenze con la stessa etichetta normalizzata possono essere aggregate nello stesso candidato **solo quando esiste una prova positiva, deterministica e riproducibile di appartenenza allo stesso gruppo/persona nella struttura della fonte**.

### Predicato `SAME_TEACHER_EVIDENCE`

La futura materializzazione deve implementare un unico predicato versionato `SAME_TEACHER_EVIDENCE(a,b,sourceStructure)` con esito `SAME`, `DISTINCT` o `UNKNOWN`, usando esclusivamente segnali strutturali deterministici presenti nella fonte, mai probabilità, similarità o inferenze dal solo cognome.

- `SAME`: prova strutturale positiva della stessa entità/gruppo → aggregazione ammessa.
- `DISTINCT`: prova strutturale positiva di entità/gruppi differenti → candidati distinti.
- `UNKNOWN`: prova insufficiente → **non aggregare**, `AMBIGUOUS`/fail-closed.

Se il documento contiene soltanto ripetizioni di `ROSSI` senza struttura deterministica che le colleghi alla stessa entità, il sistema non le fonde automaticamente. La conferma esplicita del docente può risolvere l'ambiguità solo nella sessione corrente e non crea alias persistenti.

La mera distanza fisica non è `DISTINCT`; la sola uguaglianza del cognome non è `SAME`.

Esiti: 0 candidati → nessuna attribuzione; 1 candidato determinato → anteprima aggregata da controllare; più candidati o `UNKNOWN` → `AMBIGUOUS`, nessuna scelta automatica.

## Separazione dall'identità canonica

Cognome, occorrenze, predicato e `teacherSelectionCandidate` sono strumenti effimeri. G1.5 non introduce store docente, alias persistenti o collegamenti cognome→utente.

## Esperienza docente

Percorso ordinario: `carica documento → indica cognome → controlla anteprima`.

Teoria, disegno, disposizione o equivalenti restano specializzazioni successive della cella e non vincolano l'intake. Il percorso deve essere utilizzabile da smartphone e gli errori devono essere espressi in linguaggio non tecnico.

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
10. occorrenze distribuite con prova `SAME` → un candidato/quadro completo;
11. separazione fisica senza altra evidenza → non `DISTINCT`;
12. solo cognome uguale → non `SAME`;
13. prova `DISTINCT` per omonimi → `AMBIGUOUS`;
14. `UNKNOWN` → `AMBIGUOUS`/fail-closed;
15. parsing incerto → fail-closed;
16. Unicode non valido → fail-closed;
17. case folding full/non-Turkic 17.0.0 verificato;
18. tutti i `White_Space` normativi verificati;
19. code point escluso non trasformato;
20. cognome digitato assente da storage persistente;
21. raw labels assenti da storage persistente;
22. forme normalizzate assenti da evidence/log/telemetria/analytics/receipt/error reporting/audit;
23. nessun identificatore/digest persistente derivato dal nominativo;
24. `Orario_Rossi.pdf` non persiste e non diventa `source_label`;
25. `source_label` persistente è non nominativo e non derivato dal nome file;
26. annullamento rende non risolvibili fonte e derivati;
27. errore rende non risolvibili fonte e derivati;
28. anteprima prodotta rende non risolvibili fonte e derivati;
29. OCR/testo estratto non risolvibile nei tre esiti;
30. raster/thumbnail/crop non risolvibili nei tre esiti;
31. extraction table/layout model non risolvibili nei tre esiti;
32. cache/queue/temp artifact non risolvibili nei tre esiti;
33. omonimia risolta solo con evidenza deterministica o decisione esplicita;
34. nessuna scrittura DB, attivazione o ripianificazione durante G1.5;
35. informativa privacy visibile prima dell'elaborazione;
36. nessuna richiesta teoria/disegno/disposizione;
37. stessa `TT-TEACHER-NORM-1` per input/candidati;
38. cambio Unicode senza governance → FAIL;
39. `source_fingerprint` G1.3 stabile per integrità/idempotenza/deduplicazione;
40. nessun fingerprint nominativo specifico;
41. `source_fingerprint` non usato per lookup docente;
42. runtime con Unicode diverso riproduce 17.0.0 o FAIL;
43. documento sorgente non persiste oltre sessione;
44. fingerprint sopravvive senza rendere risolvibile la fonte;
45. `parser_version` preservato se non nominativo;
46. `source_is_provisional` preservato;
47. `source_scope` preservato solo se strutturato/non nominativo;
48. `source_completeness` e provenance preservate;
49. `effective_from_provenance` preservata se non nominativa;
50. metadati G1.3 necessari alla sicurezza delle rimozioni preservati;
51. nome/percorso client upload assente da receipt/log/record persistente;
52. ogni rappresentazione derivata inventariata e verificata non risolvibile su successo/annullamento/errore;
53. fixture reale con docente distribuito e prova `SAME` → quadro completo;
54. fixture con omonimi e prova `DISTINCT` → nessuna fusione;
55. fixture con soli omonimi indistinguibili → `UNKNOWN`/`AMBIGUOUS`.

## Gate prima del runtime

Prima della materializzazione runtime devono esistere test deterministici per tutti i casi sopra. La suite deve includere una **retention matrix** che inventari ogni rappresentazione sorgente/derivata e ne verifichi la non-risolvibilità su successo/anteprima, annullamento ed errore.

Devono inoltre esistere fixture realistiche `SAME`, `DISTINCT`, `UNKNOWN`; test di preservazione dei metadati G1.3 non nominativi; test di sanificazione `source_label`/nome file; test Unicode 17.0.0; compatibilità `source_fingerprint` G1.3.

Qualunque futura autorizzazione runtime richiede un nuovo exact head, controlli automatici, revisione indipendente e decisione umana esplicita.
