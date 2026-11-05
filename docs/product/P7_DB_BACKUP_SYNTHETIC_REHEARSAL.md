# P7-DB-SYN-01 — Prova della copia cifrata del database (solo dati sintetici)

**Stato iniziale:** IN REVIEW. Questa attività non produce una copia del database Supabase reale e non autorizza la migrazione `0104`.

## Obiettivo

Dimostrare, in esecuzione automatica su GitHub, il percorso tecnico:

`PostgreSQL temporaneo → pg_dump formato personalizzato → cifratura age → [trasferimento facoltativo R2] → verifica byte → decifratura → pg_restore su database nuovo → confronto dei risultati`.

Non è richiesto Termux né un computer dell'utente. L'esecuzione non modifica Docente OS, Supabase Beta/Production o i contenuti didattici.

## Componenti

- `.github/scripts/p7-db-synthetic-backup-rehearsal.sh`: funzione **deliberatamente limitata** ai dati sintetici; impone `PGHOST=127.0.0.1`, `PGPORT=5432`, `PGUSER=postgres`, `PGDATABASE=postgres`, `PGPASSWORD=postgres` e `P7_SYNTHETIC_ONLY=yes`. Non accetta stringhe di connessione Supabase.
- `.github/workflows/p7-db-backup-synthetic-rehearsal.yml`: prova locale su ogni PR che modifica il percorso; prova R2 **solo su attivazione manuale dal ramo develop** dopo integrazione e review. La prova sulle PR non riceve credenziali R2.
- Un archivio `pg_dump -Fc` contenente **solo due record fittizi** creati in PostgreSQL temporaneo. Nessuna anagrafica, sessione didattica reale o elemento Storage.
- `age`: chiave privata temporanea generata nello spazio del runner, distrutta a fine lavoro. Non è e non deve diventare la chiave di recupero del futuro backup reale.

## Condizioni di sicurezza comprovabili

1. Il controllo locale viene eseguito su un database PostgreSQL isolato, mai sul progetto reale.
2. Il file non cifrato è creato solo in `RUNNER_TEMP`, con permessi ristretti, e viene eliminato al termine.
3. Su R2 è trasferito **esclusivamente il file con estensione `.age`**. È usato il prefisso `rehearsal/p7-db-synthetic/`, non `production/`.
4. La prova confronta i byte dell'oggetto cifrato prima e dopo il trasferimento, verifica la decifratura autorizzata e il rifiuto di una chiave privata diversa.
5. Viene creato un secondo database PostgreSQL vuoto; `pg_restore` e un confronto dei due record devono avere esito positivo.
6. In modalità R2, l'oggetto fittizio viene cancellato; qualsiasi errore di pulizia fa fallire il processo.
7. Nessun file di database o chiave privata viene pubblicato come artefatto GitHub; il riepilogo riporta soltanto risultati e hash del **cifrato sintetico**.

## Esecuzione e lettura delle prove

La PR attiva automaticamente **`local-rehearsal`**: deve terminare con `P7_DB_SYNTHETIC_BACKUP_RESTORE_PASS mode=local`.

Dopo revisione e integrazione del flusso in `develop`, da GitHub **Actions → P7 Database Backup Synthetic Rehearsal → Run workflow → transfer=r2**, si può eseguire la prova R2. In questo caso devono concludersi con esito positivo sia `local-rehearsal` sia `r2-rehearsal`, con la ricevuta `mode=r2`.

La prova R2 riusa le credenziali già configurate per la destinazione privata `docente-os-backup-eu`, ma utilizza soltanto dati sintetici. Se le credenziali non sono disponibili, **fallisce chiusa**, senza crearne o esporne di nuove.

## Quello che queste prove NON dimostrano

- Che il progetto Supabase Beta attuale sia quello collegato alle variabili Render.
- Che una copia completa di Supabase (compresi utenti Auth, oggetti Storage, estensioni e privilegi) sia stata realizzata.
- Che le migrazioni, i ruoli e le politiche RLS siano ripristinabili integralmente nel progetto reale.
- Che esista un'identità di decifratura protetta e recuperabile per la copia reale.
- Che il trasferimento, il recupero su una macchina diversa e una conservazione conforme dei **dati scolastici reali** siano stati autorizzati.
- Che la migrazione `0104` possa essere applicata senza un backup reale verificato.

La sola disponibilità del bucket R2, pur con Bucket Lock già verificato sul prefisso `production/`, non costituisce un'autorizzazione al trattamento di dati professionali reali. Non depositare file originali in `GitHub Actions Artifacts` o nel repository pubblico.

## Uscita verso il backup reale (attività successiva, non implementata)

1. Approvazione della destinazione e delle misure privacy; verificare titolarità, accessi e periodo di conservazione.
2. Verificare senza esporre segreti che la Beta Render punti al ref Supabase previsto; predisporre una credenziale di lettura coerente con il perimetro dell'esportazione.
3. Definire e custodire la **chiave privata di recupero indipendentemente** dai runner GitHub e dal bucket R2; il solo destinatario pubblico sarà disponibile al processo di cifratura.
4. Progettare l'esportazione dei dati reali, chiarendo cosa comprende e cosa esclude (inclusi Supabase Auth/Storage e metadati delle migrazioni).
5. Eseguire un collaudo del ripristino in ambiente isolato con garanzie di protezione dei dati; attestare dimensione, hash, tempi e integrità senza scrivere dati professionali nei log.
6. Soltanto a seguito di revisione umana del backup reale, riaprire il gate DDL della migrazione `0104` in [#792](https://github.com/antoniocorsano-boop/docente-os-2026-27/issues/792). L'applicazione della migrazione e il deploy Beta sono attività distinte.

**Vincoli:** nessun uso di API a pagamento, nuove credenziali comunicate in chat, modifica ai dati reali, merge o distribuzione per effetto di questa specifica.
