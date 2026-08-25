# DOCENTE OS — Specifica infrastrutturale Production

Stato: **P7-C / SPECIFICATION ONLY / NOT PROVISIONED**

Questa specifica traduce la decisione P7-B in requisiti infrastrutturali verificabili. Non crea, attiva o configura alcun ambiente Production reale.

## Decisione operativa

La Production deve essere un ambiente separato dal Beta in tutti i confini che possono contenere dati, identità o credenziali:

- progetto Supabase separato;
- database separato;
- Auth separato;
- Storage separato;
- segreti e variabili d'ambiente production-scoped;
- nessuna write tra Beta e Production;
- nessuna copia automatica dei dati Beta;
- nessun riuso di credenziali Beta.

Il primo rilascio resta `SINGLE_OWNER_PILOT`, audience `named_owner_only`, senza signup pubblico e senza onboarding multi-tenant.

## Stato di provisioning

P7-C mantiene intenzionalmente:

- `provisioningState = NOT_PROVISIONED`;
- provider hosting Production = `UNDECIDED`;
- servizio Production = `UNASSIGNED`;
- progetto Supabase Production = `NOT_PROVISIONED`;
- project ref e project URL = `UNASSIGNED`.

Non vengono inseriti placeholder che assomiglino a credenziali reali e non vengono registrati nel repository valori Production sensibili.

## Contratto di deploy

Quando sarà autorizzato il provisioning:

1. il deploy dovrà usare uno SHA immutabile già certificato sul Beta;
2. l'auto-deploy Production resterà disabilitato;
3. la promozione richiederà decisione umana esplicita;
4. il servizio Production dovrà usare variabili d'ambiente proprie;
5. il progetto Supabase Production dovrà essere distinto materialmente da quello Beta;
6. schema, RLS e policy Storage dovranno essere verificati prima dell'attivazione;
7. dovrà esistere un rollback target applicativo già certificato;
8. dovrà essere prodotta una release receipt.

## Dati iniziali

Lo stato dati iniziale ammesso è `EMPTY_OR_EXPLICIT_OWNER_IMPORT`.

Non esiste una migrazione automatica Beta → Production. Un eventuale import manuale deve essere una decisione esplicita dell'owner e deve poter essere ricondotto a una ricevuta di rilascio/import.

## Gate

`.github/scripts/validate-production-infrastructure-spec.mjs` fallisce se:

- la topologia non è separata;
- vengono abilitate write cross-environment o copie automatiche;
- vengono riusate credenziali Beta;
- vengono inseriti nella specifica l'URL/app Beta o il project ref Supabase Beta;
- vengono commesse chiavi Supabase reali nella specifica;
- Production viene dichiarata attiva senza provisioning coerente e senza contratto di promozione attivo;
- i prerequisiti di attivazione vengono indeboliti.

## Cosa P7-C non fa

P7-C non:

- crea un nuovo progetto Supabase;
- crea un servizio Render/altro hosting Production;
- assegna un dominio;
- configura DNS;
- crea o modifica segreti;
- migra dati;
- applica migrazioni al database;
- abilita utenti Production;
- promuove alcun commit.

Il passo successivo può quindi essere una **readiness review P7-D**: verificare quali prerequisiti mancanti devono essere chiusi prima di autorizzare il provisioning reale, mantenendo Production non attiva finché restore/off-site backup e gli altri blocker concordati non hanno una decisione esplicita.
