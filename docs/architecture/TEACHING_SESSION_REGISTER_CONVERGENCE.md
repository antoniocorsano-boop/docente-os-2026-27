# DOCENTE OS — TeachingSession Register Convergence

Data: 2026-09-14
Stato: DRAFT / RUNTIME SLICE

## Decisione

Ogni azione utente denominata **Registra la lezione** deve produrre una `TeachingSession` autorevole.

La registrazione dell'accaduto e la decisione sullo stato del Piano annuale sono due atti professionali distinti:

```text
Lezione reale
    ↓
Registra la lezione
    ↓
TeachingSession + eventuali TeachingSessionAllocation
    ↓
receipt / timeline / Diario

separatamente:

TeachingSession correnti + minuti allocati
    ↓
Proposta di completamento Bxx
    ↓
Decisione docente
    ↓
AnnualPlanBlockProgress
```

## Design classification

**COMPATIBLE**.

La slice non crea una nuova superficie, non modifica la navigazione e non introduce una grammatica visuale locale. La schermata `Registra` mantiene il proprio ruolo ma sostituisce il vecchio selettore di stato del Piano con i due fatti appartenenti realmente alla TeachingSession: **data della lezione** e **minuti effettivi**. Stili, token, comportamento mobile e gerarchia delle azioni restano nel sistema visuale canonico.

## Invarianti

1. Nessun `Registra la lezione` aggiorna direttamente `AnnualPlanBlockProgress`.
2. Un workspace Bxx registra una `TeachingSession` e alloca i minuti al Bxx corrente.
3. Il Bxx resta `PIANIFICATO` finché il docente non compie una decisione di Piano separata.
4. La data reale e i minuti effettivi appartengono alla TeachingSession.
5. Una nota della lezione appartiene alla TeachingSession, non viene usata come surrogato dello stato di Piano.
6. Il boundary di scrittura è unico e riusabile dalle diverse superfici.
7. Nessuna nuova fonte di verità viene introdotta.
8. La convergenza non autorizza ancora la persistenza di Observation/Evidence TE.
9. Un ritentativo della stessa registrazione non può creare una seconda TeachingSession.
10. La stessa chiave di registrazione non può essere riusata con un payload differente.
11. Se Orario + Calendario risolvono una occorrenza valida e non ancora registrata, la TeachingSession deve conservarla come `PROJECTED_OCCURRENCE` prima di ricorrere al fallback `MANUAL`.
12. Una TeachingSession non può essere registrata con data futura.

## Boundary applicativo condiviso

Le superfici utente non chiamano direttamente il repository come decisione locale. Usano il comando applicativo condiviso:

```text
recordTeachingSession(input, writer)
        ↓
validateTeachingSessionAllocations
        ↓
TeachingSessionWriter.record
        ↓
TeachingSessionReceipt
```

La receipt contiene l'identità della sessione e i minuti allocati/non allocati. Questo consente alle superfici di convergere senza duplicare le regole del dominio.

## Idempotenza delle registrazioni Bxx

Ogni modulo Bxx riceve una `registrationKey` UUID per la singola intenzione di registrazione. La chiave viene trasportata nella provenance come:

```text
registration_key:<uuid>
```

Le `ProjectedOccurrence` conservano inoltre la propria identità temporale canonica e la relativa unicità database. La `registrationKey` non sostituisce tale identità: protegge retry e doppio invio della stessa intenzione del modulo, sia quando la sessione mantiene una occurrence sia quando ricade sul fallback `MANUAL`.

La migrazione `0052_teaching_session_registration_idempotency.sql` introduce una receipt interna associata a:

```text
workspace + academic_year + section + recorded_by + registration_key
```

con una firma del payload. Il boundary garantisce:

- stessa chiave + stesso payload → restituzione della stessa `TeachingSession`;
- stessa chiave + payload diverso → rifiuto fail-closed;
- doppio invio concorrente → rollback della seconda scrittura e restituzione della receipt già esistente;
- nessuna esposizione diretta della tabella receipt a `authenticated` o `anon`;
- mantenimento dei gate RLS/AAL2 applicati al piano dati.

La chiave identifica una **intenzione di registrazione**, non una giornata o un Bxx: due lezioni reali distinte sullo stesso blocco devono produrre chiavi distinte e quindi TeachingSession distinte.

## Provenienza temporale

La baseline corrente può aprire il workspace Bxx sia dalla Classe sia direttamente da Home/Oggi per la lezione corrente o prossima. La route Bxx non trasporta necessariamente l'identità della occurrence attraverso tutti i passaggi `prepare → teach → observe → record`.

Per non perdere la provenienza e per non inventarla lato client, `recordLessonExecution` la risolve **lato server al momento della registrazione**:

1. usa la data confermata dal docente;
2. legge le TeachingSession della sezione e il `TemporalProjection` Orario + Calendario per quella data;
3. esclude occurrence già storicizzate;
4. per oggi considera solo occurrence già iniziate; per una data passata considera l'intera giornata;
5. sceglie l'ultima occurrence eleggibile della sezione;
6. se esiste, costruisce la sessione tramite `teachingSessionCandidateFromOccurrence(...)` e conserva `PROJECTED_OCCURRENCE`;
7. se non esiste, usa `MANUAL` senza inventare start/end;
8. nel fallback manuale rifiuta una seconda sessione corrente già allocata allo stesso Bxx nella stessa data;
9. una data futura viene rifiutata sia in UI sia lato server.

La vista Classe mantiene il proprio percorso già canonico basato sulle occurrence materializzate. I due ingressi convergono quindi sulla stessa `TeachingSession`, senza imporre al docente di ricostruire manualmente l'origine temporale.

## Scope della slice

- estrarre un comando applicativo condiviso per la registrazione;
- riusarlo dalla vista Classe già esistente;
- migrare il workspace `/classi/<sectionId>/lezioni/<Bxx>` dal write diretto del Piano alla TeachingSession;
- rendere espliciti data e minuti effettivi nella chiusura Bxx;
- preservare la `ProjectedOccurrence` quando risolvibile e usare `MANUAL` solo come fallback governato;
- impedire la registrazione di date future e i duplicati manuali silenziosi sullo stesso Bxx/data;
- mantenere la decisione `AnnualPlanBlockProgress` sul boundary umano già esistente (`confirmTeachingBlockCompletion`);
- rendere retry-safe la registrazione senza modificare la firma pubblica dell'RPC.

## Gate di regressione

La slice deve impedire automaticamente che:

- `recordLessonExecution` torni a chiamare `saveProgress(...)`;
- la UI `Registra` reintroduca un campo `status` del Piano;
- spariscano data reale o minuti effettivi;
- input invalido raggiunga il writer applicativo;
- un retry produca due sessioni per la stessa chiave;
- una occurrence valida venga ignorata a favore di una sessione sempre `MANUAL`;
- una data futura venga accettata.

## Fuori scope

- Observation persistence;
- EvidenceReference persistence;
- insight longitudinali;
- modifica automatica UDA/Piano;
- profili individuali degli alunni.
