# P7 — DB Restore Rehearsal receipt

Stato: **PASS / POSTGRESQL LOGICAL RESTORE PROVEN / SUPABASE AUTH SERVICE NOT YET PROVEN**

Data prova: 2026-08-25

## Evidenza eseguita

Il gate `P7 DB Restore Rehearsal` è stato eseguito in GitHub Actions su PostgreSQL 16 effimero e completamente isolato da Beta e Production.

Esecuzione certificata:

- workflow run: `32837945388`;
- job: `97770909888`;
- head testato: `d2488cdf4399131696ba54bee375e87d7934446a`;
- risultato: `PASS`;
- ambiente: `EPHEMERAL_GITHUB_ACTIONS_POSTGRES`;
- dati usati: esclusivamente sintetici;
- Beta toccato: false;
- Production toccata: false.

## Procedura provata

Il gate ha:

1. creato un database PostgreSQL effimero;
2. predisposto il catalogo minimo locale necessario a eseguire le migrazioni che dipendono dagli schemi Supabase `auth` e `storage`;
3. applicato tutti i **35 file SQL canonici attualmente presenti** in `product/supabase/migrations`;
4. inserito sentinelle sintetiche per Auth catalog, profilo, workspace, membership, anno scolastico e Planner;
5. verificato il bucket privato `knowledge-assets` nel catalogo Storage;
6. creato un backup logico `pg_dump` in formato custom;
7. distrutto completamente il database;
8. ripristinato il backup in un database fresco con `pg_restore --exit-on-error`;
9. confrontato il fingerprint strutturale prima/dopo;
10. verificato nuovamente dati sentinella, relazioni e tabelle con RLS.

## Risultati

- backup prodotto: `259526` byte;
- schema fingerprint post-restore: `4edad5ed83db226ebad83b0e915b684a`;
- tabelle `public` con RLS preservate: `26`;
- riga Auth sintetica: ripristinata;
- workspace sintetico: ripristinato;
- membership: ripristinata;
- anno scolastico: ripristinato;
- Planner sentinel: ripristinato;
- catalogo bucket Storage: ripristinato.

## Limiti della prova

Questa evidenza chiude il **componente database/logical restore** del precedente blocker `RESTORE_REHEARSAL`, ma non deve essere interpretata come prova completa della piattaforma Supabase.

Restano non provati:

- recupero del **servizio Supabase Auth** come servizio, inclusa la capacità di autenticare un'identità dopo un restore reale della piattaforma;
- recupero binario degli oggetti Supabase Storage, che resta nel blocker separato `OFFSITE_STORAGE_RECOVERY`.

La riga sintetica in `auth.users` dimostra che il catalogo PostgreSQL viene preservato dal backup/restore; non equivale a certificare GoTrue/Supabase Auth end-to-end.

## Verdetto di governance

- `DB_LOGICAL_RESTORE`: **PASS**;
- `SUPABASE_AUTH_SERVICE_RECOVERY`: **OPEN / BLOCKER**;
- `OFFSITE_STORAGE_RECOVERY`: **OPEN / BLOCKER**;
- `INCIDENT_ESCALATION_MINIMUM`: **OPEN / BLOCKER**;
- Production activation: **HOLD**;
- dati reali autorizzati: **false**.

Il gate permanente introdotto è `p7-recovery/db-restore-rehearsal` e viene rieseguito quando cambiano le migrazioni o la relativa infrastruttura di test.
