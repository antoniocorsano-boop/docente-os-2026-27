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

## Invarianti

1. Nessun `Registra la lezione` aggiorna direttamente `AnnualPlanBlockProgress`.
2. Un workspace Bxx registra una `TeachingSession` e alloca i minuti al Bxx corrente.
3. Il Bxx resta `PIANIFICATO` finché il docente non compie una decisione di Piano separata.
4. La data reale e i minuti effettivi appartengono alla TeachingSession.
5. Una nota della lezione appartiene alla TeachingSession, non viene usata come surrogato dello stato di Piano.
6. Il boundary di scrittura è unico e riusabile dalle diverse superfici.
7. Nessuna nuova fonte di verità viene introdotta.
8. La convergenza non autorizza ancora la persistenza di Observation/Evidence TE.

## Primo scope

- estrarre un comando applicativo condiviso per la registrazione;
- riusarlo dalla vista Classe già esistente;
- migrare il workspace `/classi/<sectionId>/lezioni/<Bxx>` dal write diretto del Piano alla TeachingSession;
- rendere espliciti data e minuti effettivi nella chiusura Bxx;
- mantenere la decisione `AnnualPlanBlockProgress` sul boundary umano già esistente (`confirmTeachingBlockCompletion`).

## Fuori scope

- Observation persistence;
- EvidenceReference persistence;
- insight longitudinali;
- modifica automatica UDA/Piano;
- profili individuali degli alunni.
