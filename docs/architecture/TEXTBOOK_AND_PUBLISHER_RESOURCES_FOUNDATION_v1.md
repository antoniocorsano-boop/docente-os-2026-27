# DOCENTE OS — Textbook & Publisher Resources Foundation v1

Data: 2026-08-26  
Stato: **FOUNDATION / CANONICAL FOR T1**

## Obiettivo

Collegare a ogni `TeachingAssignment` uno o più libri di testo adottati/consigliati senza duplicare la relazione classe-disciplina e senza confondere il libro con il curricolo.

Formula:

```text
TeachingAssignment
  = classe + disciplina + incarico docente
        ↓
TextbookAdoption
        ↓
Textbook
        ↓
PublisherResource (slice successive)
```

Il libro è una **risorsa didattica** di DOCENTE OS. Il curricolo applicabile e i requisiti obbligatori restano governati da CurManLight Arena.

## Principi di sviluppo

La tranche segue il modello di sviluppo Human Interaction Model già canonico:

1. dominio prima della UI;
2. persistenza/RLS separata dalla presentazione;
3. proposta automatica o manuale prima della conferma;
4. decisione docente esplicita prima della promozione a dato confermato;
5. nessun effetto collaterale su Piano annuale, UDA, Orario, Calendario o TeachingSession;
6. test, typecheck, lint, build e gate infrastrutturali prima del merge.

## Modello dati T1

### `textbooks`

Catalogo workspace/anno scolastico, univoco per ISBN-13.

Campi principali:

- `isbn13`;
- titolo/sottotitolo;
- autori;
- editore;
- etichetta edizione;
- volume;
- URL ufficiale opzionale;
- riferimento prodotto editore opzionale.

Lo stesso libro può essere riutilizzato da più Cattedre senza duplicazione.

### `textbook_adoptions`

Relazione tra:

```text
teaching_assignment_id + textbook_id + usage_kind
```

`usage_kind`:

- `ADOPTED`;
- `RECOMMENDED`;
- `OTHER`.

`source_kind`:

- `MANUAL`;
- `MIM_OPEN_DATA`.

Lifecycle:

```text
PROPOSED → CONFIRMED
```

Una fonte MIM non è mai sufficiente a produrre `CONFIRMED` senza azione esplicita del docente.

## Fonte MIM

Il Portale Unico dei Dati della Scuola pubblica dataset regionali delle adozioni con licenza IODL 2.0 e campi utili alla risoluzione automatica: codice scuola, anno di corso, sezione, disciplina, ISBN, autori, titolo, volume, editore e indicatori di adozione/consiglio.

T1 prepara il dominio e il riferimento `MIM_OPEN_DATA` ma **non scarica né indicizza ancora il dataset regionale**. La discovery MIM è una slice successiva per evitare di introdurre nella stessa tranche rete, caching e matching semantico.

## Confine publisher

T1 non implementa login o scraping dei siti editoriali.

Invarianti:

- nessuna password/editore salvata in DOCENTE OS;
- nessuna sessione editore replicata nel database;
- nessun contenuto protetto copiato automaticamente;
- l'URL ufficiale è un riferimento, non una licenza di ingestione;
- le future risorse editore devono dichiarare accesso e policy d'uso.

## Evoluzione prevista

### T2 — MIM Adoption Discovery

`school_code → dataset MIM → candidate matches → teacher review → TextbookAdoption(PROPOSED)`.

### T3 — Publisher Resource Manifest

Adapter per editore; Zanichelli come reference implementation.

Categorie previste:

- programmazione;
- materiali docente;
- verifiche;
- presentazioni;
- BES;
- video/audio/podcast;
- esercizi;
- ebook/link riservati.

Access class:

- `PUBLIC_RESOURCE`;
- `TEACHER_AUTHENTICATED_RESOURCE`;
- `USER_IMPORTED_LICENSED_RESOURCE`.

### T4 — Curriculum/Textbook Alignment

DOCENTE OS potrà proporre collegamenti tra requirements Arena, Piano annuale, capitoli del libro e risorse disponibili. Il mapping resta suggerimento revisionabile dal docente e non trasforma l'indice del libro in curricolo.

## Impostazioni

`Libri di testo` è la sesta area del contesto professionale e dipende dalla Cattedra:

```text
Discipline + Classi
      ↓
Cattedra
      ↓
Libri di testo
```

Non è requisito tecnico per usare DOCENTE OS: una Cattedra può restare senza libro. Tuttavia, se esiste una proposta di adozione, la superficie diventa **Da controllare** finché il docente non decide.

Il codice meccanografico in `Tu e la scuola` è il binding previsto per la futura discovery MIM.

## Privacy

I dati di T1 sono professionali/non personali:

- libro;
- ISBN;
- editore;
- classe/sezione professionale;
- disciplina;
- adozione.

Non vengono introdotti dati degli alunni né credenziali di editori.

## Acceptance T1

T1 è completa solo quando:

1. ISBN-13 è validato;
2. lo stesso libro è riusabile da più Cattedre;
3. ogni adozione è legata a un `TeachingAssignment` reale dello stesso workspace/anno;
4. la proposta non equivale a conferma;
5. RLS protegge le nuove tabelle;
6. la UI spiega serve a / usato in / non modifica / accesso editore;
7. mobile e tastiera restano utilizzabili;
8. nessun login editore viene richiesto;
9. test, typecheck, lint, build e restore rehearsal sono verdi.
