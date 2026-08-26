# Impostazioni canoniche DOCENTE OS

Data: 2026-08-26  
Stato: **CANONICAL**

## Scopo

Le **Impostazioni** costituiscono la sorgente del contesto personale e professionale usato dai moduli di DOCENTE OS. Non sono una copia dell'Orario, del Piano annuale, delle UDA o del Calendario.

Formula di dominio:

```text
workspace / anno scolastico
        ↓
Impostazioni
  ├─ identità / istituto
  ├─ discipline
  ├─ classi / sezioni
  ├─ cattedra
  ├─ libri di testo
  └─ preset organizzativi
        ↓
moduli operativi indipendenti
```

Il contratto di esperienza associato è `docs/product/SETTINGS_EXPERIENCE_CONTRACT.md`.
Per il dominio libri/editore è inoltre autorevole `docs/architecture/TEXTBOOK_AND_PUBLISHER_RESOURCES_FOUNDATION_v1.md`.

## Principi

1. Le informazioni personali/professionali sono persistenti in Supabase e protette da RLS.
2. Le classi non vengono duplicate: la schermata usa `annual_plan_sections`.
3. Le discipline hanno un registro canonico annuale `teaching_disciplines`.
4. La Cattedra usa gli stessi `teaching_assignments` letti dall'Orario: non esiste una seconda associazione classe-disciplina.
5. I libri di testo si collegano alla Cattedra tramite `textbook_adoptions`: non creano una seconda relazione classe-disciplina.
6. I dati di organizzazione scolastica sono preset di costruzione, non l'Orario ufficiale.
7. Le versioni e gli slot dell'Orario mantengono il proprio lifecycle indipendente.
8. Il Calendario è un dominio indipendente e non viene configurato nelle Impostazioni di base.
9. Classi, Cattedre o libri proposti non diventano confermati senza azione esplicita.
10. Le Impostazioni definiscono il contesto; i moduli esecutivi mantengono storico, versioni e identità proprie.

## Profilo docente / istituto

Tabella `teacher_workspace_settings`, un record per:

```text
workspace_id + academic_year_id + user_id
```

Campi correnti:

- nome visualizzato docente;
- nome istituto;
- codice meccanografico opzionale;
- città;
- ordine/tipo di scuola;
- numero di periodi giornalieri predefinito;
- ora di inizio della giornata;
- durata standard del periodo;
- giorni settimanali abituali di lezione.

Il codice meccanografico è anche il binding previsto per la futura discovery delle adozioni dal Portale Unico dei Dati della Scuola. Non avvia da solo import o modifiche.

## Discipline

`teaching_disciplines` definisce il catalogo discipline del workspace/anno.

Regole:

- nome univoco senza distinzione di maiuscole/minuscole;
- stato attiva/non attiva;
- provenienza dall'utente che ha creato il record;
- nessuna cancellazione necessaria nel flusso ordinario: una disciplina può essere disattivata e successivamente riattivata.

Una disciplina attiva può essere usata per costruire la Cattedra. Disattivarla non deve cancellare associazioni o storico già esistenti.

## Classi e sezioni

Le Impostazioni riusano `annual_plan_sections`.

Stati:

- `PROVVISORIA` — derivata da continuità o altra evidenza non ufficiale;
- `DA_CONFERMARE` — inserita manualmente ma non validata;
- `CONFERMATA` — assegnazione validata esplicitamente.

Aggiungere una classe nelle Impostazioni la rende immediatamente disponibile anche nel Piano annuale. Non esiste una seconda tabella di classi.

Una classe non implica automaticamente una Cattedra né uno slot Orario.

## Cattedra

Oggetto canonico: `TeachingAssignment`, tabella `teaching_assignments`.

Rappresenta la relazione professionale annuale:

```text
section_id
discipline_id
weekly_minutes
status = PROVISIONAL | CONFIRMED
source_note?
```

Regole:

- una Cattedra può essere creata solo su una classe/sezione esistente nello stesso workspace/anno;
- una Cattedra può usare solo una disciplina esistente nello stesso workspace/anno;
- il monte ore settimanale è espresso in minuti;
- una Cattedra provvisoria non diventa confermata automaticamente;
- creare o modificare una Cattedra non genera slot nell'Orario;
- creare o modificare una Cattedra non modifica Piano annuale, attività o Calendario;
- Impostazioni e Orario leggono gli stessi record.

Formula canonica:

> **Cattedra = la insegno.**

## Libri di testo

I libri sono **contesto didattico-professionale opzionale** collegato alla Cattedra.

Oggetti persistenti:

- `textbooks` — catalogo workspace/anno univoco per ISBN-13;
- `textbook_adoptions` — relazione tra Cattedra e libro.

Formula:

```text
TeachingAssignment
        ↓
TextbookAdoption
        ↓
Textbook
```

Regole:

- uno stesso ISBN può essere riusato da più Cattedre senza duplicare il libro;
- una Cattedra può avere più libri;
- `usage_kind` distingue `ADOPTED`, `RECOMMENDED`, `OTHER`;
- `source_kind` distingue `MANUAL` e `MIM_OPEN_DATA`;
- lifecycle `PROPOSED → CONFIRMED`;
- una proposta MIM o manuale non è confermata finché il docente non compie un'azione esplicita;
- l'assenza di un libro non blocca l'uso di DOCENTE OS;
- il libro non modifica curricolo, coverage, Piano annuale, Orario, UDA o TeachingSession;
- nessuna credenziale di editore viene conservata nelle Impostazioni.

Formula canonica:

> **Libro di testo = risorsa adottata per quella Cattedra, non fonte normativa.**

## Organizzazione scolastica / preset Orario

I preset comprendono:

- 4–10 periodi giornalieri;
- ora iniziale libera in formato `HH:MM`;
- durata standard configurabile;
- giorni di lezione configurabili da lunedì a sabato.

Servono a preparare la griglia iniziale. Una volta esistenti versioni e slot Orario, ciascuno conserva i propri orari e non viene riscritto automaticamente da un cambio di preset.

## UX canonica

Rotta primaria: `/impostazioni`.

Le aree, nell'ordine di configurazione, sono:

1. **Tu e la scuola**;
2. **Discipline**;
3. **Classi**;
4. **Cattedra**;
5. **Libri di testo**;
6. **Organizzazione scolastica**.

La stessa pagina opera in due modalità:

- configurazione guidata quando il contesto necessario è incompleto/da controllare;
- gestione del contesto quando le aree necessarie risultano complete.

`Libri di testo` può risultare `Facoltativo`: la sua assenza non blocca il contesto. Se esistono proposte non confermate, diventa `Da controllare`.

Gli stati user-facing sono `Completo`, `Da completare`, `Da controllare`, `Facoltativo`.

La gestione dettagliata dei libri vive in `/impostazioni/libri-di-testo` ma appartiene alla stessa area Impostazioni e usa gli stessi principi di esperienza.

## Vincoli di integrazione

L'Orario deve leggere Cattedra e preset senza dipendere dai libri.

Piano annuale, UDA e TeachingSession potranno leggere i libri come risorse pertinenti, ma non devono:

- trasformare l'indice del libro in curricolo;
- dichiarare coverage curricolare sulla sola base del libro;
- scaricare contenuti editoriali senza un contratto di accesso/uso esplicito.

Le Impostazioni non devono creare slot, UDA, attività o eventi come effetto collaterale della modifica di un libro.

## Relazione con CurManLight Arena

Arena resta authority per curricolo applicabile e requirements. DOCENTE OS è authority per adozione/uso operativo del libro da parte del docente.

Catena ammessa:

```text
Arena requirement
      ↓
Piano/UDA docente
      ↓
Textbook resource suggestion
```

Non è ammessa la catena inversa `indice libro → requisito curricolare canonico`.

## Decisione

Le Impostazioni sono il **master data layer leggero del contesto professionale** di DOCENTE OS.

Catena concettuale:

```text
Classe = esiste nel mio contesto
Cattedra = la insegno
Libro = quale risorsa editoriale adotto/uso
Orario = quando la insegno ricorrentemente
```

Nessun passaggio materializza automaticamente il successivo.
