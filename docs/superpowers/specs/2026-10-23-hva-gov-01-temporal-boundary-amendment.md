# HVA-GOV-01 — Temporal Boundary Safety Amendment

**Data:** 2026-10-23  
**Stato:** IMPLEMENTATION-PLANNING AMENDMENT — da leggere insieme al design HVA-GOV-01 approvato  
**Spec di riferimento:** `docs/superpowers/specs/2026-10-23-hva-gov-01-governed-qualification-baseline-design.md`  
**Repository:** `antoniocorsano-boop/docente-os-2026-27`

## 1. Perché esiste questo emendamento

Durante la pianificazione è emerso che l'ACTIVE attuale è la sorgente storica di una TeachingSession tecnica già registrata il `2026-10-26`, blocco B01.

La prima versione del design prevedeva di attivare retroattivamente la nuova baseline sull'intervallo che comprende il 26 ottobre e poi migrare la TeachingSession tramite `supersedes_session_id`.

Questa strada è tecnicamente possibile, ma non è la più conservativa: introdurrebbe una nuova registrazione soltanto per riallineare una fixture storica a un cambio di orario tecnico.

Il dominio di Docente OS considera correttamente le sessioni superseded come storia e usa solo la chain head per lo stato corrente, ma non c'è motivo di creare quella storia artificiale se possiamo evitare il conflitto temporale alla radice.

## 2. Evidenza aggiuntiva

Nel workspace HVA canonico è stato verificato in lettura che, nell'intervallo `2026-10-27` → `2026-11-08`:

- non esistono TeachingSession persistenti;
- non esistono eventi Calendario persistenti;
- non esistono giorni Calendario persistenti.

Il `2026-11-02` è un lunedì e può quindi usare la stessa struttura settimanale della baseline desiderata.

## 3. Decisione correttiva

HVA-GOV-01 mantiene invariati architettura, governo, fingerprint, preflight/postflight e principio read-only durante le run, ma cambia il confine temporale:

- **nuova DRAFT `effective_from`: `2026-10-27`;**
- **vecchia ACTIVE valida fino al `2026-10-26`;**
- **nuova giornata canonica HVA: `2026-11-02`;**
- **nuovo clock canonico: `2026-11-02T08:30:00+01:00`;**
- timezone browser/runtime: `Europe/Rome`;
- evento Calendario canonico: `2026-11-02`, `10:30–11:00`;
- due lezioni baseline del lunedì: `07:00–08:00` e `08:00–09:00`.

L'offset `+01:00` è intenzionale: il 2 novembre Roma è in ora standard CET.

## 4. Conseguenza sullo storico del 26 ottobre

L'attivazione canonica di una DRAFT con `effective_from = 2026-10-27` porta il lifecycle a chiudere la precedente ACTIVE al `2026-10-26`.

Di conseguenza la TeachingSession tecnica del 26 ottobre:

- resta legata alla versione e allo slot che erano realmente in vigore nella sua data;
- non deve essere clonata;
- non deve essere superseded per esigenze HVA-GOV-01;
- non deve essere cancellata o riscritta;
- deve continuare a essere verificata dal reader come fixture occurrence-bound storicamente coerente.

Questo emendamento **sostituisce** tutte le parti della spec principale che richiedevano una migrazione della TeachingSession del 26 ottobre a seguito dell'attivazione della baseline v1.

## 5. Fingerprint v1 corretto

Il fingerprint semantico atteso usa:

```json
{
  "baseline": "HVA-GOV-01/v1",
  "canonicalNow": "2026-11-02T08:30:00+01:00",
  "timetable": {
    "effectiveFrom": "2026-10-27",
    "date": "2026-11-02",
    "assignment": {
      "class": "2A",
      "discipline": "Tecnologia",
      "status": "CONFIRMED",
      "weeklyMinutes": 120,
      "marker": "HVA · Oggi · Cattedra canonica"
    },
    "lessons": [
      { "start": "07:00", "end": "08:00", "recorded": false },
      { "start": "08:00", "end": "09:00" }
    ]
  },
  "calendar": {
    "date": "2026-11-02",
    "start": "10:30",
    "end": "11:00",
    "kind": "MEETING",
    "marker": "HVA-GOV-01/v1"
  }
}
```

Gli ID runtime restano diagnostici e non fanno parte del fingerprint semantico atteso.

## 6. Requisiti aggiuntivi di preflight

Prima dell'attivazione, il dry-run deve provare che:

1. la DRAFT target è ancora la DRAFT attesa e deriva dalla baseline corrente;
2. `effective_from` può essere impostato a `2026-10-27` senza sovrapporre fixture persistenti note;
3. il 26 ottobre è ancora coperto dalla ACTIVE corrente;
4. la TeachingSession B01 del 26 ottobre è occurrence-bound alla ACTIVE corrente;
5. dal 27 ottobre all'8 novembre non sono comparsi nuovi dati persistenti incompatibili;
6. il lunedì `07:00–08:00` è libero nella DRAFT;
7. l'assignment 2A/Tecnologia resta `CONFIRMED` con `weekly_minutes = 120`.

Se uno di questi punti cambia, provisioning e attivazione si fermano.

## 7. Post-attivazione

Dopo l'attivazione deve risultare:

- precedente ACTIVE: `ARCHIVED`, copertura valida fino al `2026-10-26`;
- nuova ACTIVE: copertura da `2026-10-27`;
- TeachingSession B01 del 26 ottobre ancora valida rispetto alla propria source version/slot;
- nessuna nuova TeachingSession creata da HVA-GOV-01;
- giornata HVA del 2 novembre con la coesistenza richiesta;
- evento Calendario canonico del 2 novembre presente una sola volta.

## 8. Cosa non cambia

Restano invariati:

- un solo workspace HVA;
- AAL2;
- nessuna modifica diretta dell'ACTIVE;
- nessun service-role;
- nessun SQL ad hoc in CI;
- baseline read-only durante le run;
- nessun self-healing;
- preflight e postflight fail-closed;
- fingerprint semantico e ricevuta diagnostica;
- nessun merge/deploy automatico della PR #726.

## 9. Regola di prevalenza

In caso di conflitto tra la spec HVA-GOV-01 originale e questo emendamento, **questo documento prevale esclusivamente per date, clock, `effective_from` e trattamento della TeachingSession legacy del 26 ottobre**.

Tutte le altre decisioni della spec principale restano in vigore.
