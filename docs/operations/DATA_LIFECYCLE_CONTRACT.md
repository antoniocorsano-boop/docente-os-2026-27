# DOCENTE OS — Data lifecycle contract

Data: 2026-08-24
Stato: P3 BASELINE / NON-DESTRUCTIVE

## Obiettivo

Definire la sequenza sicura per export, retention e cancellazione dei dati senza introdurre ancora una capability distruttiva nell'interfaccia.

## Evidenza corrente

Il database usa il workspace come principale boundary di isolamento e cancellazione. La maggior parte delle tabelle operative possiede `workspace_id → workspaces(id) ON DELETE CASCADE`.

Il legame identità è deliberatamente più prudente:

- `workspaces.owner_user_id → auth.users(id) ON DELETE RESTRICT`;
- `workspace_memberships.user_id → auth.users(id) ON DELETE CASCADE`;
- `workspace_memberships.workspace_id → workspaces(id) ON DELETE CASCADE`.

Quindi un utente Auth proprietario non può essere cancellato prima del suo workspace. Questo evita di lasciare dati applicativi orfani.

## Sequenza canonica di cancellazione

Una futura cancellazione account deve essere orchestrata nell'ordine seguente:

1. **PREVIEW / MANIFEST** — mostrare all'utente cosa verrà eliminato e cosa può essere esportato;
2. **EXPORT** — produrre un export leggibile dei dati applicativi e un inventario degli oggetti Storage;
3. **STORAGE DELETE** — eliminare gli oggetti fisici del workspace dai bucket privati e verificare che il conteggio sia zero;
4. **WORKSPACE DELETE** — eliminare il workspace; i record dipendenti con `ON DELETE CASCADE` vengono rimossi dal database;
5. **VERIFY DB** — verificare che non restino record appartenenti al workspace e che i vincoli `RESTRICT` non abbiano impedito la chiusura;
6. **AUTH DELETE** — soltanto dopo la chiusura del workspace eliminare l'utente Auth;
7. **RECEIPT** — registrare una ricevuta non contenente dati sensibili con timestamp e conteggi finali.

## Invarianti

- Non usare `auth.users` come primo punto di cancellazione.
- Non assumere che il cascade PostgreSQL elimini file Supabase Storage.
- Nessuna cancellazione account deve essere avviata da chat o da una write assistita X4 senza una capability separata e un gate umano dedicato.
- La cancellazione deve essere idempotente e riprendibile in caso di errore intermedio.
- Un fallimento nello Storage deve bloccare la cancellazione finale dell'identità finché non è stato registrato e risolto o esplicitamente adjudicato.
- I riferimenti `RESTRICT` esistenti sono segnali di integrità, non ostacoli da rimuovere automaticamente.

## Retention

Non è ancora definita una retention automatica per documenti, task, sessioni didattiche, receipt o generazioni KB. Fino a una policy esplicita, il principio è **no silent deletion**: nessuna cancellazione temporale automatica dei dati professionali dell'utente.

Artefatti CI/HVA seguono invece le retention tecniche già definite nei workflow GitHub e non fanno parte dei dati professionali primari.

## Stato capability

- Workspace cascade DB: **VERIFIED**.
- Auth ownership restriction: **VERIFIED**.
- Storage lifecycle: **OPEN**.
- User export completo: **OPEN**.
- Account deletion orchestrata: **NOT IMPLEMENTED**.
- Retention professionale: **POLICY NOT YET DEFINED**.

La prossima slice P3 deve partire dall'**export/manifest non distruttivo**, non dal pulsante di cancellazione.
