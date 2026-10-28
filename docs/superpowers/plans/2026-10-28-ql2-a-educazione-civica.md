# QL2-A — Educazione civica come contributo trasversale

## Obiettivo

Correggere il modello operativo di Educazione civica senza introdurla come disciplina settimanale o nuova Cattedra. Una lezione reale mantiene classe, disciplina e occorrenza di origine; il docente può dichiarare che una parte dei minuti effettivamente svolti contribuisce anche a Educazione civica, con evidenza opzionale e progressione annuale derivata dalle TeachingSession correnti.

## Baseline e vincoli

- Baseline congelata: `develop@fd5a7d7ca1c5e8d246ac7f49c2499a9ba62a79ff`.
- Branch: `feat/ql2-a-educazione-civica`.
- Nessun merge o deploy automatico.
- Nessuna nuova `teaching_assignment` per Educazione civica.
- Nessuna modifica all'orario per generare ore civiche.
- La `disciplineId` reale della TeachingSession non viene sostituita.
- Le revisioni di una TeachingSession non devono causare doppio conteggio.
- La persistenza deve restare nel confine atomico `record_teaching_session`.

## Modello proposto

La TeachingSession acquisisce un contributo civico opzionale:

```ts
civicEducation: {
  minutes: number
  evidenceNote: string | null
} | null
```

Regole:

1. `minutes` è intero positivo.
2. `minutes <= actualMinutes` della TeachingSession.
3. `evidenceNote` è facoltativa e limitata a 4000 caratteri.
4. Senza minuti non esiste contributo civico.
5. Il contributo civico non modifica le allocazioni del Piano annuale della disciplina.
6. La progressione annuale somma solo le TeachingSession correnti, escludendo le revisioni superseded.

## Piano TDD

### Task 1 — Contratto dominio RED

Aggiungere test che richiedano:

- normalizzazione di un contributo valido;
- rifiuto di minuti zero/negativi/non interi;
- rifiuto di minuti civici superiori ai minuti effettivi;
- rifiuto di evidenza oltre 4000 caratteri;
- somma annuale basata su `currentTeachingSessions()`;
- preservazione della disciplina reale della sessione.

Eseguire il test e acquisire RED causale per API dominio mancante.

### Task 2 — Dominio GREEN

Estendere `TeachingSession` / `TeachingSessionDraft` e implementare le funzioni di validazione e aggregazione minime. Eseguire test mirati.

### Task 3 — Persistenza atomica

Aggiungere migrazione `0104` che estende `teaching_sessions` e il confine RPC mantenendo autorizzazione, idempotenza e semantica transazionale. Aggiornare `SupabaseTeachingSessionRepository` e i relativi contratti.

### Task 4 — Flusso di registrazione

Estendere `recordTeachingSession` per leggere il contributo civico opzionale e allegarlo alla stessa TeachingSession senza alterare `disciplineId`, timetable provenance o allocazioni canoniche.

### Task 5 — Interfaccia docente

Nella registrazione lezione aggiungere una sezione a progressive disclosure: “Questa lezione contribuisce anche a Educazione civica”, con minuti ed evidenza facoltativa. Nessuna nuova disciplina o ora fittizia.

### Task 6 — Progressione annuale

Mostrare nel contesto classe il totale annuale derivato dalle TeachingSession correnti. La slice non introduce un obiettivo normativo hard-coded: eventuale target istituzionale resta configurazione separata.

### Task 7 — Qualificazione

Eseguire test mirati, suite completa, typecheck/build e CI exact-SHA. Aprire PR Draft verso `develop`; nessun merge/deploy. Richiedere revisione indipendente prima di dichiarare la slice qualificata.

## Criteri di accettazione

- Una lezione di Tecnologia resta Tecnologia anche quando contribuisce a Educazione civica.
- I minuti civici non generano ore settimanali, slot di orario o nuove Cattedre.
- Il contributo è validato rispetto ai minuti effettivi della lezione.
- Le revisioni non duplicano la progressione annuale.
- La persistenza è atomica con la TeachingSession.
- Il docente vede una scelta comprensibile e opzionale nel flusso di registrazione.
- Il totale annuale è leggibile nel contesto classe.
