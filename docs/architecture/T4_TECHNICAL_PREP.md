# DOCENTE OS — T4 Technical Prep

Data: 2026-08-23  
Stato: PRE-GATE / NON-PERSISTENT

## Obiettivo

Preparare i contratti deterministici di `TeachingSession` e dell'allocazione ai blocchi B01–B33 senza introdurre alcuna scrittura didattica persistente prima della decisione professionale registrata in `T4_DIDACTIC_ALLOCATION_REVIEW.md`.

## Cosa è già implementabile senza decisione professionale

- una `ProjectedOccurrence` di classe può diventare **candidato** a TeachingSession;
- il candidato conserva uno snapshot della provenienza temporale;
- la durata prevista viene calcolata come riferimento e non diventa durata effettiva;
- i minuti effettivi restano un input separato;
- una sessione può essere suddivisa quantitativamente fra più Bxx;
- la somma delle allocazioni non può superare i minuti effettivi;
- lo stesso target canonico non può essere allocato due volte nella stessa sessione;
- ogni allocazione è vincolata a Piano e generazione canonica espliciti;
- solo gli identificativi B01–B33 sono ammessi;
- il raggiungimento del monte minuti può produrre soltanto una proposta: `mayAutoComplete = false`, `requiresHumanDecision = true`.

## Cosa resta intenzionalmente bloccato

Finché la review T4 non è approvata non vengono introdotti:

- tabelle `teaching_sessions` / `teaching_session_allocations`;
- RPC o Server Action che registrano sessioni reali;
- aggiornamenti automatici o indiretti di `annual_plan_block_progress`;
- promozioni automatiche a `SVOLTO`;
- riallocazioni persistenti fra blocchi/UDA.

## Invarianti del contratto

```text
ProjectedOccurrence != TeachingSession attestata
plannedMinutes != actualMinutes
sum(allocation.minutes) <= TeachingSession.actualMinutes
allocation.blockId ∈ B01..B33
allocation.canonicalPlanAssetId == current reviewed plan asset
allocation.canonicalGenerationId == current reviewed generation
same session + same canonical generation + same Bxx => one allocation target
quantitative threshold reached => suggestion only
```

## Relazione con T3

T3C continua a essere read-only. Il contratto T4 copia i riferimenti necessari (`logicalId`, versione Orario, slot, Calendar state, provenance) dentro lo snapshot candidato. Nessuna modifica successiva di Orario o Calendario deve poter riscrivere quella fotografia una volta che la persistenza sarà autorizzata.

## Gate

La persistenza T4 può iniziare soltanto dopo approvazione esplicita della regola professionale della PR di review. Questa preparazione tecnica non costituisce approvazione implicita e non modifica lo stato di alcun Bxx.
