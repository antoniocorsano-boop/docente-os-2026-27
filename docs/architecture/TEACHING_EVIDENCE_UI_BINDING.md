# TE-1B — Collegamento UI Osserva → Registra

## Scopo

TE-1B chiude il primo collegamento visibile tra la superficie esistente `Osserva` della workspace lezione e il boundary atomico TeachingSession + Observation introdotto da TE-1A.

Non introduce una nuova area Evidence e non estende il perimetro Tier 1.

## Contratto utente

La workspace conserva il flusso esistente:

`Prepara → Svolgi → Osserva → Registra`

In `Osserva`:

- gli indicatori testuali della proiezione didattica restano promemoria locali e non sono trasformati automaticamente in dati canonici;
- il docente può aggiungere, in modo facoltativo, una sola osservazione professionale esplicita sulla classe;
- l'osservazione richiede una dimensione canonica e uno stato esplicito;
- una breve nota è facoltativa;
- non sono ammessi nomi di alunni, identità individuali o gruppi identificabili.

Il draft resta nel `sessionStorage` del browser finché la lezione non viene registrata con successo.

## Boundary di registrazione

La registrazione conserva due percorsi intenzionali:

1. **nessuna osservazione professionale** → il comando continua a usare il boundary TeachingSession semplice;
2. **osservazione esplicita presente** → il comando usa `recordTeachingSessionWithEvidence(...)` e `SupabaseTeachingEvidenceRepository`, quindi TeachingSession e Observation vengono registrate nella stessa transazione TE-1A.

Il server ricostruisce l'Observation canonica e impone:

- `scope = CLASS`;
- `anonymousGroupKey = null`;
- dimensione e stato appartenenti al vocabolario canonico;
- source derivata dal gesto del docente (`TEACHER_QUICK_MARK` o `TEACHER_NOTE`).

Il client non può scegliere scope, source o identità.

## EvidenceReference

La stringa `projection.evidence` descrive l'evidenza didattica attesa, ma non prova che tale evidenza esista realmente.

TE-1B pertanto **non crea alcuna `EvidenceReference` automatica**. Una EvidenceReference richiederà un riferimento reale a un prodotto, asset o documento e rimane fuori da questo slice.

## Idempotenza e provenienza

TE-1B non modifica il contratto temporale e di idempotenza consolidato da #361 e TE-1A:

- stessa selezione di ProjectedOccurrence / fallback MANUAL;
- stessa `registration_key` UUID;
- stessa provenance `lesson_workspace` e `canonical_generation`;
- stesso duplicate guard per le sessioni manuali;
- stesso boundary AAL2/RLS.

Il draft locale viene eliminato soltanto dopo una receipt positiva. Un errore server conserva il draft per correzione o retry.

## Confine con il Piano annuale

`Registra la lezione` documenta ciò che è accaduto. Anche con Observation:

- non conclude automaticamente il blocco Bxx;
- non modifica automaticamente UDA o Piano annuale;
- non genera una proposta curricolare;
- non assegna voti;
- non produce inferenze longitudinali automatiche.

Le decisioni sul Piano restano separate e human-gated.

## Fuori scope

Restano fuori da TE-1B:

- dati individuali degli alunni / Tier 2;
- gruppi identificabili;
- allegati o copie di elaborati degli alunni;
- EvidenceReference automatica;
- scrittura su Drive/Diario;
- proposta automatica di revisione UDA;
- integrazione Arena;
- modifica dello stato `AnnualPlanBlockProgress`.

## Acceptance minima

TE-1B è accettabile solo se:

1. registrare una lezione senza Observation continua a funzionare come prima;
2. una Observation esplicita usa il boundary atomico TE-1A;
3. nessuna semantica canonica viene inferita dalle spunte testuali della proiezione;
4. nessuna EvidenceReference viene inventata dalla descrizione dell'evidenza attesa;
5. un errore server non cancella il draft locale;
6. il Piano annuale non viene mutato implicitamente;
7. Product CI e i gate di sicurezza/interazione applicabili sono PASS sullo stesso exact head.
