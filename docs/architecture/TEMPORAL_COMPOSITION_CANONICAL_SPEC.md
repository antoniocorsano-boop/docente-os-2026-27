# DOCENTE OS — Temporal Composition Canonical Spec

Data: 2026-09-24  
Stato: CANONICAL

## 1. Decisione

DOCENTE OS mantiene **Orario** e **Calendario** come domini autonomi.

Nessuno dei due importa tipi, repository o policy dell'altro.

La relazione avviene esclusivamente tramite un livello applicativo di composizione denominato **Temporal Projection**.

```text
Timetable domain ─────┐
                     ├── Temporal Projection ──> occurrence read models
Calendar domain ─────┘
```

## 2. Timetable domain

Responsabilità:

- cattedra / teaching assignments;
- versioni dell'orario;
- slot settimanali ricorrenti;
- validità temporale delle versioni;
- tipi `LESSON | DISPOSITION | RECEPTION | OTHER`;
- controllo di sovrapposizioni;
- confronto tra minuti assegnati e minuti settimanali configurati.

Il dominio Orario non conosce:

- festività;
- eventi d'istituto;
- attività del Planner;
- Bxx del Piano annuale;
- occorrenze concrete future.

Può essere configurato e usato autonomamente.

## 3. Calendar domain

Responsabilità:

- date scolastiche;
- giorni di lezione / sospensione;
- festività;
- eventi d'istituto;
- eventi temporali espliciti;
- eccezioni puntuali riferite a date reali.

Il dominio Calendario non conosce:

- struttura della cattedra;
- versioni dell'orario;
- slot settimanali;
- Bxx;
- attività del Planner salvo eventuali riferimenti applicativi espliciti.

Può essere configurato e usato autonomamente.

## 4. Temporal Projection

È un application service / read-model builder.

Input logici:

```text
TimetableVersionReadModel
TimetableSlotReadModel[]
CalendarDayReadModel[]
CalendarEventReadModel[]
TemporalExceptionReadModel[]
intervallo date
```

Output:

```text
ProjectedOccurrence[]
```

Campi minimi di una occorrenza proiettata:

```text
logical_id
local_date
start_at
end_at
kind
section_id?
discipline?
timetable_version_id?
timetable_slot_id?
calendar_state
exception_state
provenance[]
```

## 5. Invarianti

1. Proiettare non modifica Orario.
2. Proiettare non modifica Calendario.
3. Una nuova versione Orario cambia soltanto le proiezioni nel proprio intervallo di validità.
4. Una sospensione calendario può impedire la materializzazione di una lezione in una data, ma non cancella lo slot ricorrente.
5. Un evento Calendario può esistere senza uno slot Orario.
6. Uno slot Orario può esistere senza una data Calendario materializzata.
7. La proiezione deve essere rigenerabile deterministicamente a parità di input.
8. Le sessioni già registrate conservano snapshot/provenienza e non vengono riscritte da una nuova proiezione.

## 6. Relazione con Oggi

`Oggi` può leggere separatamente:

- attività operative;
- eventi Calendario;
- occorrenze proiettate dell'Orario;
- segnali del Piano annuale.

La vista aggrega, ma non fonde i domini.

Ogni card mantiene `kind` e provenienza per rendere comprensibile se si tratta di:

- attività;
- lezione;
- evento;
- segnale didattico.

## 7. Relazione con Piano annuale

Il Piano annuale non dipende dal Calendario né dall'Orario per esistere.

La sua attuazione può usare le occorrenze proiettate come capacità temporale reale per associare sessioni ai blocchi B01–B33.

Catena applicativa target:

```text
CAN-PLAN / Bxx
        +
ProjectedOccurrence
        ↓
TeachingSession / execution evidence
        ↓
registro di attuazione
```

## 8. Roadmap corretta

### T3A — Timetable lifecycle

- attivazione versione;
- archiviazione versione precedente;
- `effective_from/effective_to`;
- nessuna dipendenza da Calendar.

### T3B — Calendar core

- giorni scolastici;
- sospensioni;
- eventi e vincoli reali;
- nessuna dipendenza da Timetable.

### T3C — Temporal Projection

- composizione read-only di T3A + T3B;
- occorrenze reali;
- prima integrazione nella vista Oggi.

### T4 — Didactic allocation

- collegamento delle sessioni/occorrenze al CAN-PLAN B01–B33;
- avanzamento basato su minuti/sessioni effettive;
- nessuna riscrittura del canone.

## 9. Dependency rule per agenti

Sono vietati:

```text
TimetableRepository -> CalendarRepository
CalendarRepository -> TimetableRepository
Timetable domain import Calendar domain
Calendar domain import Timetable domain
```

È consentito:

```text
TemporalProjectionService -> Timetable read port
TemporalProjectionService -> Calendar read port
```

Questo vincolo deve essere verificato nelle review delle slice T3.


## 10. Temporal Exception — variazioni puntuali

La specifica rende operativo l'input già previsto `TemporalExceptionReadModel[]`.

Una **Temporal Exception** modifica la proiezione di una singola data senza riscrivere lo slot ricorrente né creare copie nel Calendario.

Tipi minimi:

```ts
type TemporalExceptionKind =
  | 'CANCELLED'
  | 'TIME_CHANGED'
  | 'REPLACED'
  | 'ADDED'
```

Campi minimi:

```ts
interface TemporalExceptionReadModel {
  id: string
  localDate: string
  kind: TemporalExceptionKind
  timetableVersionId?: string | null
  timetableSlotId?: string | null
  startTime?: string | null
  endTime?: string | null
  sectionId?: string | null
  disciplineId?: string | null
  title?: string | null
  note?: string | null
  sourceKind: 'TEACHER' | 'INSTITUTION' | 'IMPORT'
}
```

Regole:

1. `CANCELLED` sopprime soltanto l'occorrenza della data;
2. `TIME_CHANGED` conserva l'identità logica dello slot e sostituisce l'intervallo per quella data;
3. `REPLACED` può sostituire contesto/classe/disciplina della singola occorrenza;
4. `ADDED` crea una occorrenza puntuale non ricorrente;
5. ogni eccezione è reversibile/auditabile;
6. la proiezione espone `exception_state` e provenance completa;
7. una modifica strutturale futura usa invece il lifecycle/versioning dell'Orario.

## 11. Calendario operativo del docente

Il Calendario come dominio resta autonomo. La **vista calendario operativa**, invece, può visualizzare insieme:

```text
CalendarEvent
+ Projected timetable occurrence
+ Temporal Exception
= giornata visibile al docente
```

Questa composizione non duplica gli slot Orario dentro `calendar_events`.

La UI deve rendere percepibile la provenienza:

- `Orario`;
- `Calendario`;
- `Modificato per oggi`.

## 12. Relazione con TodayProjection

`TemporalProjection` risponde: **che cosa accade temporalmente oggi?**

`TodayProjection` risponde: **che cosa richiede l'attenzione professionale del docente adesso e dopo?**

Dipendenza consentita:

```text
TodayProjectionService -> TemporalProjectionService
TodayProjectionService -> Planner read port
TodayProjectionService -> lesson readiness / TeachingSession read ports
```

Sono vietati write impliciti durante la composizione.
