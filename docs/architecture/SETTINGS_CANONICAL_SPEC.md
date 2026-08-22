# Impostazioni canoniche DOCENTE OS

Data: 2026-08-22  
Stato: **CANONICAL**

## Scopo

Le **Impostazioni** costituiscono la sorgente del contesto personale e professionale usato dai moduli di DOCENTE OS. Non sono una copia dell'Orario, del Piano annuale o del Calendario.

Formula di dominio:

```text
workspace / anno scolastico
        ↓
Impostazioni
  ├─ identità / istituto
  ├─ discipline
  ├─ classi / sezioni
  ├─ cattedra
  └─ preset organizzativi
        ↓
moduli operativi indipendenti
```

Il contratto di esperienza associato è `docs/product/SETTINGS_EXPERIENCE_CONTRACT.md`.

## Principi

1. Le informazioni personali/professionali sono persistenti in Supabase e protette da RLS.
2. Le classi non vengono duplicate: la schermata usa `annual_plan_sections`.
3. Le discipline hanno un registro canonico annuale `teaching_disciplines`.
4. La Cattedra usa gli stessi `teaching_assignments` letti dall'Orario: non esiste una seconda associazione classe-disciplina.
5. I dati di organizzazione scolastica presenti nelle Impostazioni sono **preset di costruzione**, non l'Orario ufficiale.
6. Le versioni e gli slot dell'Orario mantengono il proprio lifecycle indipendente.
7. Il Calendario è un dominio indipendente e non viene configurato nelle Impostazioni di base.
8. Le sezioni o associazioni provvisorie non diventano confermate senza un'azione esplicita.
9. Le Impostazioni definiscono il contesto; i moduli esecutivi mantengono storico, versioni e identità proprie.

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

Questi dati sono modificabili dall'utente autenticato nel proprio workspace.

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
- il monte ore settimanale è espresso in minuti per evitare assunzioni sulla durata dell'ora;
- una Cattedra provvisoria non diventa confermata automaticamente;
- creare o modificare una Cattedra non genera slot nell'Orario;
- creare o modificare una Cattedra non modifica Piano annuale, attività o Calendario;
- Impostazioni e Orario leggono gli stessi record.

La Cattedra appartiene al **contesto professionale**; l'Orario la usa come sorgente per scegliere quali lezioni inserire nella settimana tipo.

## Organizzazione scolastica / preset Orario

I preset derivano funzionalmente dalle specifiche storiche ricostruite da `DocenteDocAi_Beta`, ma sono generalizzati:

- 4–10 periodi giornalieri;
- ora iniziale libera in formato `HH:MM`;
- durata standard configurabile;
- giorni di lezione configurabili da lunedì a sabato.

Questi valori servono a preparare l'interfaccia/griglia iniziale. Una volta esistenti versioni e slot Orario, ciascuno conserva i propri `start_time` e `end_time` e non viene riscritto automaticamente da un cambio di preset.

## UX canonica

Rotta canonica: `/impostazioni`.

Le aree, nell'ordine di configurazione, sono:

1. **Tu e la scuola**;
2. **Discipline**;
3. **Classi**;
4. **Cattedra**;
5. **Organizzazione scolastica**.

La stessa pagina opera in due modalità:

- configurazione guidata quando il contesto è incompleto/da controllare;
- gestione del contesto quando le aree necessarie risultano complete.

Gli stati user-facing sono `Completo`, `Da completare`, `Da controllare`, `Facoltativo`.

Per tono, microcopy, feedback, vicoli ciechi e regole di spiegazione è vincolante `SETTINGS_EXPERIENCE_CONTRACT.md`.

## Vincoli di integrazione con l'Orario

L'Orario deve:

- leggere le discipline attive da `teaching_disciplines`;
- leggere le classi/sezioni da `annual_plan_sections`;
- leggere la Cattedra da `teaching_assignments`;
- leggere i preset da `teacher_workspace_settings` soltanto come base di costruzione;
- non duplicare nome scuola/docente nei record dell'Orario;
- non promuovere automaticamente classi o Cattedre provvisorie;
- non dipendere dal Calendario.

Le Impostazioni, simmetricamente, non devono creare slot o versioni Orario come effetto collaterale di una modifica del contesto.

## Relazione con il Calendario

Nessuna dipendenza diretta.

Le Impostazioni non definiscono festività, eventi, sospensioni o occorrenze reali. Il Calendario mantiene un proprio dominio secondo `TEMPORAL_COMPOSITION_CANONICAL_SPEC.md`.

## Decisione

Le Impostazioni sono il **master data layer leggero del contesto professionale** di DOCENTE OS.

La catena concettuale lato utente è:

```text
Classe = esiste nel mio contesto
Cattedra = la insegno
Orario = quando la insegno ricorrentemente
```

Nessuno dei tre passaggi viene implicitamente materializzato dal precedente.
