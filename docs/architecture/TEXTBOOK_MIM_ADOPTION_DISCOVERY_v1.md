# DOCENTE OS — MIM Adoption Discovery v1

Data: 2026-08-26  
Stato: **T2 / IMPLEMENTED FOR REVIEW**

## Obiettivo

Trovare le adozioni dei libri di testo senza chiedere al docente di reinserire dati già presenti nelle Impostazioni.

Flusso canonico:

```text
Impostazioni
  school_code
  academic_year
  classi/sezioni
  discipline
  TeachingAssignment
        ↓
Open Data MIM — Adozioni libri di testo
        ↓
matching deterministico
        ↓
TextbookAdoption(PROPOSED)
        ↓
conferma esplicita docente
        ↓
TextbookAdoption(CONFIRMED)
```

## Dati riusati dalle Impostazioni

T2 non introduce un secondo profilo docente e non chiede nuovamente:

- codice meccanografico;
- anno scolastico attivo;
- classe/anno di corso;
- sezione;
- disciplina;
- relazione classe + disciplina della Cattedra.

La sorgente canonica resta:

- `teacher_workspace_settings.school_code`;
- `annual_plan_sections`;
- `teaching_disciplines`;
- `teaching_assignments`.

## Fonte ufficiale

La discovery usa il Portale Unico dei Dati della Scuola, area **Adozioni libri di testo**, tramite gli endpoint SPARQL regionali pubblici.

Il tracciato MIM espone i campi necessari al matching e alla costruzione del libro:

- `CodiceScuola`;
- `AnnoCorso`;
- `SezioneAnno`;
- `TipoGradoScuola`;
- `Combinazione`;
- `Disciplina`;
- `CodiceISBN`;
- `Autori`;
- `Titolo`;
- `Sottotitolo`;
- `Volume`;
- `Editore`;
- `Prezzo`;
- `NuovaAdoz`;
- `DaAcquist`;
- `Consigliato`.

La fonte è interrogata server-side. Nessun dato alunno viene coinvolto.

## Risoluzione del dataset regionale

Il codice meccanografico viene normalizzato e il prefisso provinciale viene usato per selezionare il dataset regionale più probabile.

Regola fail-safe:

1. prova il dataset regionale coerente con il prefisso;
2. se la fonte regionale risponde, il risultato è autorevole anche quando non contiene righe per la scuola;
3. se la fonte regionale è irraggiungibile, il client può cercare negli altri endpoint;
4. indisponibilità della fonte e assenza di adozioni sono stati distinti e non vengono presentati come equivalenti.

Non viene aggiunta una nuova impostazione `Regione` solo per supportare la discovery.

## Matching

Una riga MIM diventa candidata solo quando soddisfa:

- stesso anno di corso;
- stessa sezione;
- disciplina con similarità deterministica >= 0.75;
- ISBN-13 formalmente valido.

Il matching non usa AI e non può confermare autonomamente una proposta.

La copertura della Cattedra continua a richiedere un libro `ADOPTED` confermato; un record MIM `Consigliato` viene mappato a `RECOMMENDED`.

## Persistenza

Ogni match valido viene passato al repository T1 come:

```text
source_kind = MIM_OPEN_DATA
status = PROPOSED
```

Il `source_ref` conserva dataset, scuola, anno di corso, sezione e ISBN sufficienti a riconoscere la provenienza della proposta.

Il boundary T1 già canonico resta invariato:

- insert `CONFIRMED` vietato;
- `CONFIRMED → PROPOSED` vietato;
- conferma solo tramite RPC autenticata;
- nessun nuovo inserimento `MANUAL`.

## UX

La superficie `/impostazioni/libri-di-testo` mostra l'azione:

**Cerca adozioni ufficiali MIM**

Il docente non compila parametri di ricerca: DOCENTE OS usa il contesto già configurato.

Esiti distinti:

- fonte disponibile + match trovati → proposte da controllare;
- fonte disponibile + nessuna adozione della scuola → nessun dato creato;
- scuola trovata ma nessun match affidabile con la Cattedra → nessun dato creato;
- fonte MIM indisponibile → errore esplicito, senza trasformarlo in “nessuna adozione”.

Il fallback ISBN resta disponibile solo per un libro non proposto dalla discovery.

## Human authority

Il MIM è una fonte autorevole per la proposta, non per la decisione del docente.

```text
MIM row != confirmed adoption
```

Nessuna procedura di discovery può invocare `confirm_textbook_adoption`.

## Acceptance T2

T2 è pronta al merge solo se:

1. usa dati già presenti nelle Impostazioni;
2. non introduce campi duplicati per classe, disciplina o scuola;
3. risolve la fonte MIM senza richiedere manualmente la regione;
4. distingue fonte irraggiungibile da nessun dato trovato;
5. filtra anno di corso e sezione esatti;
6. usa matching disciplina deterministico e testabile;
7. scarta ISBN non validi;
8. salva soltanto `PROPOSED` con `source_kind=MIM_OPEN_DATA`;
9. nessuna conferma avviene implicitamente;
10. Product CI, Human + Visual Acceptance e gate applicabili sono verdi.
