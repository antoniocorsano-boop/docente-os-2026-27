# P7-B — Decisione topologia dati produzione

Data: 2026-08-24
Stato: DECIDED / NOT DEPLOYED

## Decisione

Il primo ambiente Production di DOCENTE OS dovrà usare una topologia dati completamente separata dal Beta.

Sono obbligatori:

- progetto Supabase Production distinto;
- PostgreSQL distinto;
- Supabase Auth distinto;
- bucket Storage distinti;
- segreti e chiavi environment-scoped distinti;
- nessuna write cross-environment;
- nessun riuso di credenziali tecniche Beta;
- nessuna copia automatica dei dati Beta verso Production.

## Primo rilascio

Il primo rilascio Production è limitato a `SINGLE_OWNER_PILOT`.

Non sono autorizzati nel primo rilascio:

- signup pubblico;
- onboarding multi-tenant;
- migrazione automatica dei dati Beta;
- promozione automatica Beta → Production;
- migrazioni DB distruttive;
- rollback DB automatico;
- rollback Storage distruttivo senza backup verificato.

Un eventuale import manuale di dati dal Beta richiederà una decisione esplicita dell'owner e una procedura separata, verificabile e reversibile.

## Motivazione

La separazione è necessaria per rendere reali, e non solo nominali:

1. isolamento degli incidenti;
2. rollback applicativo indipendente;
3. prove di restore senza rischio sui dati operativi;
4. politiche retention/cancellazione distinte;
5. test load/scale isolati;
6. segregazione delle credenziali;
7. audit della provenienza dei dati Production.

Una topologia condivisa col Beta renderebbe questi gate ambigui e aumenterebbe il blast radius di errori applicativi o operativi.

## Stato dell'ambiente

La decisione sulla topologia non autorizza ancora la creazione o attivazione dell'ambiente Production.

`productionEnvironmentState` resta `NOT_CREATED`.

Il prossimo gate, P7-C, dovrà predisporre la specifica infrastrutturale Production senza segreti reali e senza attivazione, quindi verificare che non esistano riferimenti al progetto Supabase Beta o al dominio Beta nei parametri Production.
