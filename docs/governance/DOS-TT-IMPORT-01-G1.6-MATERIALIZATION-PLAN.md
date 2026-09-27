# DOS-TT-IMPORT-01 — G1.6 Materializzazione controllata

## Stato

`IMPLEMENTATION_PREP / PREVIEW_ONLY / FAIL_CLOSED`

Baseline governata: `develop@e5a792e11192a41a38cb39796d305b4239aa6c85` — merge G1.5/#614.

Restano attivi: `HOLD_PRODUCTION_APPLY / HOLD_REPLAN`.

G1.6 autorizza esclusivamente la materializzazione e il collaudo del percorso di anteprima. Non autorizza applicazione del nuovo orario, scritture di attivazione, ripianificazione delle lezioni o modifica retroattiva dello storico.

## Obiettivo docente

Percorso ordinario unico:

`carica documento → indica cognome → controlla anteprima`

Il docente non deve configurare parser, regole Unicode, profili di evidenza o parametri tecnici. Teoria, disegno, disposizione e altre specializzazioni della singola lezione restano successive all'importazione del quadro settimanale.

L'interfaccia deve mostrare prima dell'elaborazione:

> **Il cognome serve solo per trovare il tuo orario nel documento. Non viene salvato.**

## Invarianti ereditati da G1.5

- `TT-TEACHER-NORM-1`, Unicode 17.0.0, unica implementazione condivisa;
- nessun fuzzy matching, translitterazione o rimozione indiscriminata dei diacritici;
- `TeacherEvidenceProfile` governato e versionato per ogni formato/adattatore abilitato;
- `SAME / DISTINCT / UNKNOWN`, con `UNKNOWN → AMBIGUOUS` e nessuna fusione automatica;
- cognome, raw labels, forme normalizzate, nome file nominativo e dati di disambiguazione esclusivamente effimeri;
- fonte e derivati non risolvibili dopo successo/anteprima, annullamento o errore;
- `source_fingerprint` G1.3 ammesso solo per integrità/idempotenza/deduplicazione;
- metadati G1.3 non nominativi necessari preservati;
- nessuna identità canonica del docente derivata dal cognome.

## Slice G1.6-A — nucleo deterministico

Materializzare prima, senza UI operativa:

1. `TT-TEACHER-NORM-1` con dati Unicode 17.0.0 congelati/versionati;
2. tipi `TeacherEvidenceProfile`, `TeacherEvidenceResult = SAME | DISTINCT | UNKNOWN` e `teacherSelectionCandidate` effimero;
3. validatore dei profili: profilo assente/non riconosciuto/non valido → `UNKNOWN`;
4. `SAME_TEACHER_EVIDENCE` che accetta esclusivamente segnali ammessi dal profilo;
5. fixture positive `SAME`, negative `DISTINCT`, ambigue `UNKNOWN`, inclusa fixture realistica multi-giorno/multi-classe;
6. test negativi su segnali non governati e contraddittori.

Gate A: nessun accesso DB e nessuna dipendenza dalla UI.

## Slice G1.6-B — confine privacy e retention

Materializzare un contesto di elaborazione effimero con inventario esplicito degli artefatti:

- upload originale e nome/percorso client;
- buffer/rappresentazione sorgente;
- testo estratto/OCR;
- raster pagina, miniature e ritagli;
- tabelle di estrazione e modelli di layout;
- raw labels e forme normalizzate;
- cache, code e file temporanei.

Costruire una `retention matrix` eseguibile che dimostri la non-risolvibilità di ciascuna voce su:

1. anteprima completata;
2. annullamento;
3. errore/eccezione.

Sono persistibili soltanto gli artefatti esplicitamente ammessi da G1.5: `source_fingerprint`, dati strutturali minimizzati dell'orario e metadati G1.3 non nominativi necessari. `source_label`, se richiesto, è generato dal sistema e non nominativo.

Gate B: test negativi devono fallire se un dato nominativo raggiunge log, receipt, audit payload, storage persistente o identificatori.

## Slice G1.6-C — anteprima docente

Solo dopo A+B verdi:

- campo cognome e informativa privacy immediatamente visibili;
- caricamento documento con stato comprensibile;
- 0 candidati → messaggio semplice e nessuna attribuzione;
- 1 candidato determinato → anteprima del quadro settimanale da controllare;
- più candidati/`UNKNOWN` → richiesta di scelta/conferma con solo contesto non nominativo necessario;
- conferma dell'ambiguità valida solo per la sessione;
- annulla sempre disponibile;
- nessun pulsante/azione capace di applicare l'orario in produzione durante G1.6.

Gate C: smartphone-first, tastiera, focus, semantica accessibile, riflusso e assenza di scorrimento orizzontale non necessario.

## Slice G1.6-D — compatibilità temporale, ancora senza apply

L'anteprima deve rappresentare il modello temporale già deciso:

- `effective_from` obbligatorio e visibile prima di qualsiasi futura applicazione;
- nessuna `effective_to` inventata quando non nota;
- una futura versione successiva chiuderà la precedente secondo il contratto governato;
- lezioni/stati antecedenti a `effective_from` non vengono modificati;
- l'eventuale ripianificazione riguarda soltanto il futuro e resta **non autorizzata** in G1.6.

Gate D: fixture temporali verificano che nessuna operazione di anteprima tocchi lezioni storiche o pianificate.

## Strategia di integrazione

Ordine obbligatorio: `A → B → C → D`.

Ogni slice deve avere test deterministici prima di ampliare il perimetro. Non si abilita un formato reale finché il relativo `TeacherEvidenceProfile` non è governato, revisionato e coperto da fixture.

La prima implementazione deve preferire il formato reale già usato nel pilota dell'orario, senza costruire un parser universale prematuro. Un formato non riconosciuto o senza profilo valido deve degradare in modo sicuro, mai inferire.

## Gate G1.6

Per considerare G1.6 pronta alla review umana devono essere contemporaneamente veri:

- suite A/B/C/D PASS;
- retention matrix PASS sui tre esiti;
- nessun dato nominativo persistente nelle prove;
- profilo di evidenza del formato pilota versionato e testato;
- anteprima mobile/desktop comprensibile e accessibile;
- nessuna scrittura/attivazione/ripianificazione raggiungibile;
- exact head congelato;
- revisione indipendente PASS;
- decisione umana esplicita.

Solo una fase successiva potrà proporre la rimozione di `HOLD_PRODUCTION_APPLY` e, separatamente, di `HOLD_REPLAN`.