# P7-DB-REAL-ACTIVATION — Contratto di attivazione e recuperabilità Beta

**Stato al 06/11/2026:** `READ_ONLY_INVENTORY_COMPLETE / BINDING_UNATTESTED / RECOVERY_IDENTITY_UNCONFIGURED / REAL_EXPORT_HOLD`.

Collegato alla [PR #795](https://github.com/antoniocorsano-boop/docente-os-2026-27/pull/795) e al blocco [#792](https://github.com/antoniocorsano-boop/docente-os-2026-27/issues/792).

## 1. Origine: cosa è stato verificato

| Controllo | Evidenza non sensibile | Esito |
|---|---|---|
| Servizio Beta | Render `docente-os-2026-27-beta`, ramo `develop`, pubblicazione automatica abilitata | VERIFICATO |
| Progetto Supabase candidato | `gnshgapmwyjamhmlikeg`, `eu-west-1`, PostgreSQL 17.6, attivo | VERIFICATO |
| Versione schema del candidato | `0103_material_reference_safety`; tabella contributi civici `0104` assente | VERIFICATO |
| Contratto del repository | Il controllo di separazione della produzione in `.github/scripts/production-runtime-smoke.mjs` identifica il ref candidato come Beta e ne vieta l'uso nella prova Production | EVIDENZA DOCUMENTALE |
| Associazione effettiva Render Beta → ref Supabase | Il connettore Render espone solo metadati del servizio, **non** il valore delle variabili private; ricerca di riscontri nei log della Beta senza esito | **NON ATTESTATA** |

**ATTENZIONE:** la corrispondenza di un nome, di un ref nei sorgenti o di una URL nella documentazione non dimostra la configurazione effettiva della Beta in esecuzione. Non assumere `BINDING_PASS` per deduzione.

### Modalità corretta per chiudere il collegamento (senza esportare dati)

Una persona autorizzata accede a **Render → docente-os-2026-27-beta → Environment** e controlla *solo* che l'host della variabile `NEXT_PUBLIC_SUPABASE_URL` identifichi esattamente il ref Supabase candidato. La verifica va associata all'identificativo del servizio e alla revisione pubblicata.

- Non copiare la variabile con credenziali di connessione PostgreSQL, `SUPABASE_SECRET_KEY`, chiavi di autenticazione o valori di altri segreti; non inviare schermate della pagina contenenti segreti.
- Una conferma del solo valore pubblico `NEXT_PUBLIC_SUPABASE_URL` attesta l'identità configurata dell'origine applicativa, **non** la validità delle credenziali per il dump o la completezza del restore.
- Registrare nella segnalazione #792 soltanto `BETA_SUPABASE_BINDING=PASS/FAIL`, riferimento servizio e data; se FAIL, bloccare qualsiasi esportazione senza tentare correzioni automatiche.

## 2. Inventario per la recuperabilità

I metadati sono stati rilevati tramite interrogazioni **in sola lettura**; non sono stati esportati record, allegati, utenti né nomi di file.

| Ambito | Presenza | Da recuperare / dimostrare |
|---|---|---|
| `public` | 62 tabelle, RLS su tutte le tabelle | Schema, dati, funzioni, trigger, grant, policy RLS, chiavi/relazioni, progressivi |
| `private` | 7 tabelle | Determinare dati applicativi necessari e ordine di ripristino, senza esporli al servizio dati |
| `auth` | 27 tabelle, identità presenti | Valutare recupero degli utenti e dei dati di autenticazione con il metodo ufficiale Supabase, preservando proprietari e autorizzazioni |
| `storage` | 8 tabelle, un archivio con oggetti presenti | Metadati **e byte effettivi degli oggetti**: la copia SQL non incorpora i file caricati |
| `supabase_migrations` | Storico presente | Allineamento migrazioni e marker di schema senza duplicazioni o esecuzioni improprie |
| `vault`, `realtime`, estensioni PostgreSQL | Presenti | Identificare dipendenze gestite dalla piattaforma, chiavi di cifratura e configurazione necessari alla ricostruzione |

**Distinzione essenziale:** il comando `supabase db dump` applica filtri agli schemi amministrati da Supabase, perciò non si può promettere di recuperare `auth` o `storage` usando automaticamente il suo dump predefinito. D'altra parte un `pg_dump` PostgreSQL diretto di tutti gli schemi potrebbe violare le assunzioni sui ruoli proprietari del servizio gestito. Il piano di ripristino deve dichiarare esplicitamente le due classi di dati e adottare le procedure Supabase compatibili.

**Coerenza del punto di ripristino:** per tabelle e oggetti Storage prevedere una finestra di acquisizione coerente, eventuale sospensione controllata delle scritture, e ricevute d'integrità che permettano di riconciliare i due insiemi senza duplicare o perdere allegati.

## 3. Destinazione e cifratura

- Il percorso GitHub Actions → `age` → Cloudflare R2 → scaricamento → ripristino è già **PASS con dati sintetici** (run [#42172909680](https://github.com/antoniocorsano-boop/docente-os-2026-27/actions/runs/42172909680)).
- La prova PostgreSQL 17.6 con esportazione *direttamente cifrata* è **PASS con dati sintetici** (run [#42174807962](https://github.com/antoniocorsano-boop/docente-os-2026-27/actions/runs/42174807962)).
- L'oggetto reale, se mai autorizzato, dovrà essere cifrato **prima** del trasferimento, non pubblicato come allegato di GitHub Actions, non inserito nel repository e non stampato nei log.
- L'identità privata di recupero `age` deve essere **recuperabile e custodita separatamente** dai runner GitHub e dal bucket R2, con gestione degli accessi e un collaudo di decifratura. Il destinatario pubblico può essere reso disponibile al flusso dopo tale verifica.
- Non generare una chiave privata soltanto all'interno di un processo temporaneo destinato a distruggerla; questo renderebbe la copia inutilizzabile.
- Il Bucket Lock verificato sul prefisso `production/` ha una finestra tecnica di 90 giorni. La conformità della conservazione e l'idoneità della destinazione per dati scolastici **richiedono decisione privacy separata**: l'immutabilità non equivale a cifratura o autorizzazione.

## 4. Condizioni di attivazione del backup reale

| Codice | Condizione | Stato |
|---|---|---|
| `RB-01` | Identità Render Beta → Supabase confermata dalla configurazione attiva | HOLD |
| `RB-02` | Titolarità, autorizzazione al trattamento, trasferimento e conservazione in R2 approvati | HOLD |
| `RB-03` | Chiave privata `age` custodita indipendentemente e recupero dimostrato | HOLD |
| `RB-04` | Credenziale di esportazione protetta e perimetro minimo documentati | HOLD |
| `RB-05` | Piano per `public`, `private`, `auth`, metadati/oggetti Storage, ruoli, migrazioni e dipendenze approvato | HOLD |
| `RB-06` | Copia reale cifrata creata e trasferita, ricevuta senza informazioni personali | NON ESEGUITO |
| `RB-07` | Recupero reale su ambiente isolato protetto, con verifica di dati, permessi e oggetti | NON ESEGUITO |
| `RB-08` | Revisione umana del recupero e autorizzazione specifica prima della migrazione `0104` | HOLD |

**Blocco obbligatorio:** non creare un workflow con `workflow_dispatch` che riceva connessioni reali finché `RB-01`–`RB-05` non siano attestati; non applicare DDL `0104` né promuovere la Beta se `RB-06`–`RB-08` non sono PASS.

## 5. Evidenze ammesse nel repository pubblico

Solo commit esatto, identificativo di prova, stato dei gate, versione PostgreSQL, descrizione dello schema e impronte **dei soli archivi cifrati**. Nessun dato di autenticazione, record scolastico, oggetto Storage, identità `age`, password, token, URL autenticato, configurazione segreta o log applicativo con dati degli utenti.

### Fonti ufficiali
- [Supabase — Database Backups](https://supabase.com/docs/guides/platform/backups)
- [Supabase — Backup and Restore using CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
- [Supabase — CLI db dump](https://supabase.com/docs/reference/cli/supabase-db-dump)
- [Supabase — Restore a Platform Project to Self-Hosted](https://supabase.com/docs/guides/self-hosting/restore-from-platform)
