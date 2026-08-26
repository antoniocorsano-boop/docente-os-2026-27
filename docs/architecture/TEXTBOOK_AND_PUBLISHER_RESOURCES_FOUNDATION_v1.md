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
3. acquisizione da fonte esterna prima della conferma;
4. decisione docente esplicita prima della promozione a dato confermato;
5. **nessuna catalogazione manuale completa del libro**: il docente non deve riscrivere titolo, autori, editore, edizione o URL;
6. nessun effetto collaterale su Piano annuale, UDA, Orario, Calendario o TeachingSession;
7. test, typecheck, lint, build e gate infrastrutturali prima del merge.

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

- `MIM_OPEN_DATA` — proposta derivata dai dataset ufficiali MIM;
- `ISBN_LOOKUP` — fallback in cui il docente fornisce solo l'ISBN e i metadati vengono recuperati automaticamente;
- `MANUAL` — valore legacy riconoscibile a storage, non ammesso per nuovi inserimenti dal prodotto.

Lifecycle:

```text
SOURCE DISCOVERY / ISBN LOOKUP
             ↓
         PROPOSED
             ↓ azione esplicita del docente
         CONFIRMED
```

Il database rifiuta insert già `CONFIRMED`, nuovi record `MANUAL` e transizioni inverse `CONFIRMED → PROPOSED`. La conferma passa da una RPC dedicata che rappresenta il confine di autorità umana.

## Fonte MIM

Il Portale Unico dei Dati della Scuola pubblica dataset regionali delle adozioni con licenza IODL 2.0 e campi utili alla risoluzione automatica: codice scuola, anno di corso, sezione, disciplina, ISBN, autori, titolo, volume, editore e indicatori di adozione/consiglio.

Il codice meccanografico salvato in `Tu e la scuola` è il binding canonico per la discovery. La slice T2 realizza l'allineamento diretto:

```text
school_code + classe/sezione + disciplina
        ↓
dataset MIM
        ↓
candidate match
        ↓
TextbookAdoption(PROPOSED)
        ↓
conferma docente
```

T1 non scarica né indicizza ancora l'intero dataset regionale. In attesa della discovery MIM completa, il fallback operativo accetta **solo l'ISBN** e recupera automaticamente i metadati bibliografici; se la fonte non restituisce dati sufficienti, DOCENTE OS non chiede al docente di compilare manualmente il catalogo.

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

T2 non introduce un secondo canale manuale: se la fonte MIM non produce una corrispondenza, resta disponibile il fallback ISBN-only.

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

La UX ammessa è:

1. proposta automatica MIM quando disponibile;
2. in fallback, inserimento/scansione del solo ISBN;
3. recupero automatico dei metadati;
4. revisione della proposta;
5. conferma o rimozione del collegamento.

È vietato mostrare un form che richieda al docente di compilare titolo, autori, editore, volume, sottotitolo, edizione o URL del libro.

## Privacy

I dati di T1 sono professionali/non personali:

- libro;
- ISBN;
- editore;
- classe/sezione professionale;
- disciplina;
- adozione.

Nel fallback ISBN viene inviato a una fonte bibliografica esterna soltanto il codice ISBN, senza dati di alunni, docente o scuola. Non vengono introdotti dati degli alunni né credenziali di editori.

## Acceptance T1

T1 è completa solo quando:

1. ISBN-13 è validato;
2. lo stesso libro è riusabile da più Cattedre;
3. ogni adozione è legata a un `TeachingAssignment` reale dello stesso workspace/anno;
4. la proposta non equivale a conferma e il database impedisce bypass del lifecycle;
5. RLS protegge le nuove tabelle;
6. nessuna nuova catalogazione manuale completa è possibile dalla UI o dal repository applicativo;
7. gli errori del lookup ISBN sono mostrati nel contesto del form;
8. tutti i libri `CONFIRMED` sono conteggiati, mentre la copertura della Cattedra considera solo `ADOPTED` confermati;
9. la UI spiega serve a / usato in / non modifica / accesso editore;
10. mobile e tastiera restano utilizzabili;
11. nessun login editore viene richiesto;
12. test, typecheck, lint, build e restore rehearsal sono verdi.
