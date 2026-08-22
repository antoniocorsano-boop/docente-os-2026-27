# Orario T1 — cattedra, versione e slot persistenti

## Stato

T1 implementa la prima slice runtime del contratto `TIMETABLE_CANONICAL_SPEC.md`.

Catena attiva:

`Impostazioni → classi/sezioni + discipline → cattedra → versione DRAFT → slot ricorrenti`

Non sono ancora attivi:

`calendario/eccezioni → occorrenze reali → sessioni → allocazione CAN-PLAN B01–B33`.

## Tabelle

### `teaching_assignments`

Associazione esplicita tra:

- `annual_plan_sections`;
- `teaching_disciplines`;
- minuti settimanali;
- stato `PROVISIONAL | CONFIRMED`;
- nota/fonte.

La sezione e la disciplina devono appartenere allo stesso workspace/anno. La disciplina deve essere attiva.

### `timetable_versions`

Versione dell'orario con:

- `DRAFT | ACTIVE | ARCHIVED`;
- data di efficacia;
- origine `MANUAL | INSTITUTION_DOCUMENT | IMPORT`;
- riferimento fonte opzionale.

T1 materializza una sola bozza corrente per workspace/anno. L'attivazione e il versionamento storico completo saranno chiusi con calendario/eccezioni.

### `timetable_slots`

Pattern ricorrente settimanale:

- giorno 1–6;
- `start_time` / `end_time` reali;
- `LESSON | DISPOSITION | RECEPTION | OTHER`;
- cattedra/sezione/disciplina per `LESSON`;
- aula, nota e numero d'ora opzionali.

Vincoli:

- nessun overlap nello stesso giorno/versione;
- solo una versione `DRAFT` è modificabile;
- uno slot `LESSON` deve coincidere con la cattedra scelta;
- impegni speciali non acquisiscono automaticamente sezione/disciplina.

## Sorgenti dalle Impostazioni

La rotta `/orario` legge:

- `teacher_workspace_settings` per preset di giornata;
- `teaching_disciplines` per discipline attive;
- `annual_plan_sections` per classi/sezioni.

Non duplica questi dati.

I preset generano soltanto proposte di orario (ora iniziale, durata standard, numero di periodi e giorni). Ogni slot persistito mantiene in proprio `start_time` e `end_time`.

## Runtime `/orario`

La schermata offre:

1. configurazione della versione DRAFT;
2. composizione della cattedra;
3. confronto minuti settimanali dichiarati/collocati;
4. inserimento di lezioni ricorrenti;
5. inserimento di disposizione/ricevimento/altro;
6. elenco cronologico degli slot;
7. rimozione degli slot finché la versione è DRAFT.

## Regola CAN-PLAN

T1 **non consuma alcun Bxx**.

La presenza di uno slot settimanale non dimostra che una lezione sia avvenuta. Il consumo di capacità didattica verrà derivato solo dopo:

- calendario scolastico;
- sospensioni/eccezioni;
- occorrenza concreta;
- sessione effettiva.

## Gate eseguito

Gate transazionale sul database:

- creazione cattedra: PASS;
- creazione versione DRAFT: PASS;
- creazione slot LESSON: PASS;
- tentativo di slot sovrapposto: correttamente BLOCCATO;
- rollback: PASS;
- residui test: 0.

## Prossima slice

**T2 — griglia Settimana/Giorno** sullo stesso read model, senza modificare schema o identità T1 salvo bug/invarianti emerse dai gate.
