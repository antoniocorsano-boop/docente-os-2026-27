# DOCENTE OS — TeachingSession Register Convergence

Data: 2026-09-13
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

## Idempotenza delle registrazioni manuali

Le `ProjectedOccurrence` possiedono già una identità temporale canonica e una unicità database. Per le registrazioni `MANUAL` del workspace Bxx viene invece emessa una `registrationKey` UUID per la singola intenzione di registrazione.

La chiave viene trasportata nella provenance come:

```text
registration_key:<uuid>
```

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

Nel runtime corrente:

- la registrazione dalla Classe usa una `ProjectedOccurrence` quando Orario + Calendario materializzano la lezione;
- il workspace Bxx viene aperto dalla Classe come percorso didattico modellato e pertanto registra correttamente una sessione `MANUAL` con provenance del workspace e della generazione canonica.

Se in futuro Oggi/Orario aprirà direttamente il workspace Bxx, la route dovrà trasportare l'`occurrenceLogicalId` e la registrazione dovrà preferire `PROJECTED_OCCURRENCE` a `MANUAL`.

## Scope della slice

- estrarre un comando applicativo condiviso per la registrazione;
- riusarlo dalla vista Classe già esistente;
- migrare il workspace `/classi/<sectionId>/lezioni/<Bxx>` dal write diretto del Piano alla TeachingSession;
- rendere espliciti data e minuti effettivi nella chiusura Bxx;
- mantenere la decisione `AnnualPlanBlockProgress` sul boundary umano già esistente (`confirmTeachingBlockCompletion`);
- rendere retry-safe la registrazione manuale senza modificare la firma pubblica dell'RPC.

## Gate di regressione

La slice deve impedire automaticamente che:

- `recordLessonExecution` torni a chiamare `saveProgress(...)`;
- la UI `Registra` reintroduca un campo `status` del Piano;
- spariscano data reale o minuti effettivi;
- input invalido raggiunga il writer applicativo;
- una registrazione manuale duplicata produca due sessioni per la stessa chiave.

## Fuori scope

- Observation persistence;
- EvidenceReference persistence;
- insight longitudinali;
- modifica automatica UDA/Piano;
- profili individuali degli alunni.
