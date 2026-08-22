# Impostazioni canoniche Docente OS

## Scopo

Le **Impostazioni** costituiscono la sorgente iniziale del contesto personale e didattico usato dai moduli di Docente OS. Non sono una copia dell'orario né del piano annuale.

Catena di riferimento:

`utente/workspace → impostazioni → discipline + classi/sezioni → cattedra → versione orario → sessioni → CAN-PLAN`

## Principi

1. Le informazioni personali/professionali sono persistenti in Supabase e protette da RLS.
2. Le classi non vengono duplicate: la schermata usa `annual_plan_sections`.
3. Le discipline hanno un registro canonico annuale `teaching_disciplines`.
4. I dati di orario presenti nelle Impostazioni sono **preset di costruzione**, non l'orario ufficiale.
5. Un futuro cambio orario non modifica retroattivamente le Impostazioni né il piano annuale.
6. Le sezioni provvisorie non diventano confermate senza un'azione esplicita.

## Profilo docente/istituto

Tabella `teacher_workspace_settings`, un record per:

`workspace_id + academic_year_id + user_id`.

Campi iniziali:

- nome visualizzato docente;
- nome istituto;
- codice meccanografico opzionale;
- città;
- ordine/tipo di scuola;
- numero di ore giornaliere predefinito;
- ora di inizio della giornata;
- durata standard dell'ora;
- giorni settimanali di lezione.

Questi dati sono modificabili dall'utente autenticato nel proprio workspace.

## Discipline

`teaching_disciplines` definisce il catalogo discipline del workspace/anno.

- nome univoco senza distinzione di maiuscole/minuscole;
- stato attiva/non attiva;
- provenienza dall'utente che ha creato il record;
- nessuna cancellazione necessaria nel flusso ordinario: una disciplina può essere disattivata e successivamente riattivata.

Per il workspace corrente viene materializzata inizialmente **Tecnologia**, già coerente con programmazioni, UDA e CAN-PLAN esistenti.

## Classi e sezioni

Le Impostazioni riusano `annual_plan_sections`.

Stati:

- `PROVVISORIA` — derivata da continuità o altra evidenza non ufficiale;
- `DA_CONFERMARE` — inserita manualmente ma non validata;
- `CONFERMATA` — assegnazione validata esplicitamente.

Aggiungere una classe nelle Impostazioni la rende immediatamente disponibile anche nel Piano annuale. Non esiste una seconda tabella di classi.

## Preset orario

I preset derivano funzionalmente dalle specifiche storiche ricostruite da `DocenteDocAi_Beta`, ma sono generalizzati:

- 4–10 periodi giornalieri;
- ora iniziale libera in formato `HH:MM`;
- durata standard 30–120 minuti;
- giorni di lezione configurabili da lunedì a sabato.

Il futuro `timetable_versions` userà questi valori per inizializzare una bozza. Una volta creata una versione ufficiale, ogni slot avrà `start_time` e `end_time` propri e non dipenderà più dal preset.

## UX

Rotta canonica: `/impostazioni`.

Sezioni:

1. Docente;
2. Istituto;
3. Preset orario;
4. Discipline;
5. Classi e sezioni.

La voce **Impostazioni** è un ingresso stabile della navigazione principale.

## Vincoli di integrazione con l'orario

La slice T1 dell'orario dovrà:

- leggere le discipline attive da `teaching_disciplines`;
- leggere le classi/sezioni da `annual_plan_sections`;
- leggere i preset da `teacher_workspace_settings`;
- non duplicare nome scuola/docente nei record dell'orario;
- non promuovere automaticamente classi `PROVVISORIA`/`DA_CONFERMARE`;
- costruire `teaching_assignments` soltanto su classi e discipline esistenti.

## Decisione

Le Impostazioni diventano il **master data layer leggero** per personalizzare Docente OS e fornire i dati iniziali ai moduli didattici. I moduli esecutivi (orario, piano annuale, registro) mantengono invece il proprio storico e le proprie identità versionate.
