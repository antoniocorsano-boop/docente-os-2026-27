# P7-DB-REAL-ACTIVATION — Contratto di attivazione e recuperabilità Beta

**Stato al 07/11/2026:** `READ_ONLY_INVENTORY_COMPLETE / RENDER_PUBLIC_CONFIG_CONFIRMED / RUNTIME_BUILD_UNATTESTED / RB03_CUSTODY_PASS_USER_ATTESTED / REAL_EXPORT_HOLD`.

**Aggiornamento operativo RB-03 (07/11/2026).** La chiave `age` permanente è stata generata *sul primo smartphone Android* con `rage-keygen`, custodita nella directory privata Termux e protetta mediante copia cifrata `recovery.age`. Il custode ha documentato una prova locale `PASS`; ha trasferito la copia cifrata e il messaggio sintetico cifrato al secondo smartphone e **attestato** `RB03_RECUPERO_INDIPENDENTE_PASS`. Ha inoltre confermato di aver custodito la passphrase su supporto cartaceo in luogo separato dai due telefoni. **`RB-03=PASS_CUSTODIAN_ATTESTED` limitatamente a recuperabilità e custodia; non è un'autorizzazione a esportare dati reali.** Restano `RB-02/04/05=HOLD` per la parte operativa non qualificata, `RB-06/07=NOT_RUN` e i vincoli del blocco `0104`. Tenere una copia cifrata sul telefono B in luogo stabile, preservare le copie originali fino a verifica di tale conservazione; poi eliminare solo gli artefatti transitori in Download. La custodia della passphrase deve restare separata dai file cifrati.

*Nota di lettura:* i paragrafi seguenti che descrivono `RB-03=HOLD`, assenza di chiave o percorso Termux «non adottato» documentano uno **stato storico precedente alla prova**, ora superato dalla presente attestazione e dal [protocollo aggiornato](./P7_DB_KEY_CUSTODY_RECOVERY_PROTOCOL.md).

Collegato alla [PR #795](https://github.com/antoniocorsano-boop/docente-os-2026-27/pull/795) e al blocco [#792](https://github.com/antoniocorsano-boop/docente-os-2026-27/issues/792).

## 1. Origine: cosa è stato verificato

| Controllo | Evidenza non sensibile | Esito |
|---|---|---|
| Servizio Beta | Render `docente-os-2026-27-beta`, ramo `develop`, pubblicazione automatica abilitata | VERIFICATO |
| Progetto Supabase candidato | `gnshgapmwyjamhmlikeg`, `eu-west-1`, PostgreSQL 17.6, attivo | VERIFICATO |
| Versione schema del candidato | `0103_material_reference_safety`; tabella contributi civici `0104` assente | VERIFICATO |
| Contratto del repository | Il controllo di separazione della produzione in `.github/scripts/production-runtime-smoke.mjs` identifica il ref candidato come Beta e ne vieta l'uso nella prova Production | EVIDENZA DOCUMENTALE |
| Render Beta → progetto Supabase configurato | Verifica umana del 06/11/2026 nella schermata **Render Environment** del servizio Beta, con URL pubblico comunicato `https://gnshgapmwyjamhmlikeg.supabase.co` | **PASS — CONFIGURAZIONE PUBBLICA** |

**Precisazione:** la configurazione pubblica della Beta è stata verificata direttamente dall'utente nell'interfaccia Render, non dedotta dal repository. Il controllo dei bundle pubblici della versione servita ha dato esito inconcludente (9 file esaminati): la corrispondenza con la **compilazione attualmente distribuita** resta distinta e non è qui attestata. La verifica non concede permessi di lettura/esportazione del database.

### Ricevuta della verifica umana (senza esportare dati)

- **Data:** 06/11/2026. **Origine:** servizio Render `srv-da5gcjrncjis738rfov0`, `docente-os-2026-27-beta`, schermata Environment consultata dall'utente.
- **Variabile applicativa:** `NEXT_PUBLIC_SUPABASE_URL` (valore pubblico, non credenziale). **Ref verificato:** `gnshgapmwyjamhmlikeg`.
- **Risultato:** `RB-01=PASS_RENDER_PUBLIC_CONFIG`. Nessuna richiesta di ripetere la verifica di questa configurazione. Screenshot originale **non archiviato nel repository pubblico**.
- **Limite:** `BETA_SERVING_BUNDLE_REF=UNATTESTED`; il controllo automatico dei bundle pubblici non ha fornito conferme. Inoltre questa verifica non prova la disponibilità di credenziali per l'esportazione né la completezza del recupero.
- **Protezione:** non acquisire, ripubblicare o copiare password, `SUPABASE_SECRET_KEY`, credenziali PostgreSQL o altre variabili d'ambiente della schermata Render.

## 1-bis. Classificazione prudenziale dei dati e autorizzazione

Una nuova verifica **aggregata e in sola lettura** ha rilevato 4 identità Auth, 4 spazi di lavoro, 6 sessioni didattiche e 9 oggetti Storage. Le quantità **non** distinguono dati sintetici da dati personali reali; di conseguenza il contenuto della Beta deve essere trattato come **potenzialmente personale/scolastico**, finché il titolare o un soggetto autorizzato non attesta il contrario.

Il documento canonico di classificazione e autorizzazione è [P7_DB_REAL_DATA_PRIVACY_AND_CUSTODY_GATE.md](./P7_DB_REAL_DATA_PRIVACY_AND_CUSTODY_GATE.md): `RB-02=HOLD`, nessuna esportazione reale né trasferimento R2 autorizzato.

**Preferenza operativa:** nessuna installazione di Termux o utilizzo del PC personale dell'utente. Il metodo Android/Termux descritto negli altri documenti è **opzionale e non adottato**; se serve una chiave reale, la custodia deve essere effettuata da un responsabile autorizzato in un ambiente affidabile già disponibile, con recupero da una seconda copia dimostrato. `RB-03=HOLD`.

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

## 2-bis. RB-05 — Ricognizione tecnica aggiornata, sola lettura (06/11/2026)

**Origine dei dati:** interrogazioni aggregate `SELECT` sul progetto Supabase candidato, senza leggere righe personali, identificativi di utenti, nomi di oggetti, contenuti dei file, password o segreti. **Nessun trasferimento o dump**. Il progetto risulta attivo, con PostgreSQL 17.6.1.155.

| Risorsa | Ricognizione | Limite della prova |
|---|---:|---|
| Tabelle `public` | 62; RLS abilitata su 62/62 | Non qualifica da sola la corretta applicazione delle singole policy dopo il recupero |
| Tabelle `private` | 7; RLS abilitata su 0/7 | Schema non automaticamente pubblico: permessi di connessione, `GRANT` e accesso Data API da verificare; non dedurre esposizione |
| Tabelle `auth` | 27 | Piano di trasferimento e ripristino delle identità da qualificare |
| Tabelle `storage` | 8 | Metadati SQL distinti dai byte effettivi dei file |
| Tabelle `supabase_migrations` | 1 | Verificare storico e corretta ricostruzione senza riapplicare migrazioni incompatibili |
| Contenitori Storage | 1, non pubblico | Ripristino delle impostazioni e delle autorizzazioni da verificare |
| Oggetti Storage | 9 | Nessun byte né nome di file esportato: integrità/consistenza ancora da qualificare |
| Trigger applicativi `public`/`private` | 46 | Ordine di creazione e dipendenze da verificare nel ripristino |
| Estensioni PostgreSQL installate | 6 | Disponibilità e configurazione nel target non verificate |

**Contratto di recupero non eludibile:**

1. Ricostruire schema applicativo, relazioni, funzioni, trigger, ruoli, privilegi e policy RLS; verificare i percorsi autenticati e il diniego dei percorsi non autorizzati.
2. Separare la ricostruzione delle identità `auth`, le configurazioni del servizio e gli schemi gestiti da Supabase dal semplice `pg_dump` applicativo.
3. Per Storage, recuperare **i metadati SQL e i byte dei 9 oggetti** mediante un percorso compatibile con le API ufficiali, senza affidarsi alla sola copia PostgreSQL. La documentazione Supabase afferma esplicitamente che i backup del database non includono gli oggetti Storage: https://supabase.com/docs/guides/platform/backups .
4. Verificare la coerenza temporale fra dati e oggetti, la riservatezza della destinazione, i controlli sui file, i metadati di migrabilità e le dipendenze esterne (Vault, Realtime, estensioni, configurazione Auth) prima di qualificare un recupero.
5. Eseguire l'eventuale recupero reale **solo** in ambiente isolato approvato dopo `RB-02`, `RB-03`, `RB-04` e `RB-05` operativamente qualificati. Non provare sui dati reali tramite GitHub Actions.

**Esito corretto:** `RB05_METADATA_INVENTORY=PASS_READ_ONLY` / `RB05_RECOVERY_PLAN_AND_RESTORE=HOLD`. Il censimento è una prova preparatoria, **non** autorizza copie, accessi privilegiati, restore, migrazione `0104` o distribuzione Beta.

## 3. Destinazione e cifratura

- Il percorso GitHub Actions → `age` → Cloudflare R2 → scaricamento → ripristino è già **PASS con dati sintetici** (run [#42172909680](https://github.com/antoniocorsano-boop/docente-os-2026-27/actions/runs/42172909680)).
- La prova PostgreSQL 17.6 con esportazione *direttamente cifrata* è **PASS con dati sintetici** (run [#42174807962](https://github.com/antoniocorsano-boop/docente-os-2026-27/actions/runs/42174807962)).
- L'oggetto reale, se mai autorizzato, dovrà essere cifrato **prima** del trasferimento, non pubblicato come allegato di GitHub Actions, non inserito nel repository e non stampato nei log.
- L'identità privata di recupero `age` deve essere **recuperabile e custodita separatamente** dai runner GitHub e dal bucket R2, con gestione degli accessi e un collaudo di decifratura. Il destinatario pubblico può essere reso disponibile al flusso dopo tale verifica.
- Non generare una chiave privata soltanto all'interno di un processo temporaneo destinato a distruggerla; questo renderebbe la copia inutilizzabile.
- **Evidenza R2 del 06/11/2026 (15:48–15:52):** dopo la configurazione iniziale, `production-backup-90d` compare nell'elenco delle regole. Aprendo dal menu il dettaglio della regola esistente, la schermata delle 15:52 mostra interruttore abilitato, prefisso completo `production/` e conservazione `90` giorni. Stato: `RB02_R2_BUCKET_LOCK_SAVED_CONFIG=PASS_VISUAL`; prova operativa di immutabilità `NOT_TESTED`. Il ciclo di vita mostra solo `Default Multipart Abort Rule`, che **non** elimina i backup completati a 90 giorni. La protezione non equivale a cifratura o autorizzazione al trattamento: `RB-02` e `RB-03` restano HOLD.

## 4. Condizioni di attivazione del backup reale

| Codice | Condizione | Stato |
|---|---|---|
| `RB-01` | Identità Render Beta → Supabase confermata dalla configurazione pubblica in Render Environment | **PASS_RENDER_PUBLIC_CONFIG** (runtime bundle separatamente non attestato) |
| `RB-02` | Titolarità, autorizzazione al trattamento, trasferimento e conservazione in R2 approvati | HOLD |
| `RB-03` | Chiave privata `age` custodita indipendentemente e recupero dimostrato | PASS_CUSTODIAN_ATTESTED (07/11/2026); nessuna autorizzazione export |
| `RB-04` | Credenziale di esportazione protetta e perimetro minimo documentati | HOLD |
| `RB-05` | Piano per `public`, `private`, `auth`, metadati/oggetti Storage, ruoli, migrazioni e dipendenze approvato | HOLD |
| `RB-06` | Copia reale cifrata creata e trasferita, ricevuta senza informazioni personali | NON ESEGUITO |
| `RB-07` | Recupero reale su ambiente isolato protetto, con verifica di dati, permessi e oggetti | NON ESEGUITO |
| `RB-08` | Revisione umana del recupero e autorizzazione specifica prima della migrazione `0104` | HOLD |

### RB-03 — candidato senza computer: due Android con interfaccia grafica

In data 06/11/2026 l'utente ha dichiarato la disponibilità di un **secondo smartphone Android**. È documentata una [variante candidata a due dispositivi senza Termux](./P7_RB03_TWO_ANDROID_GUI_CANDIDATE.md), che impiega un'applicazione open source per la gestione di identità age e un recupero di prova autonomo sul secondo telefono. Prima di usare la chiave permanente, bisogna verificare su dati **esclusivamente fittizi** il trasferimento cifrato, la lettura indipendente dal telefono A e la compatibilità con la versione age disponibile nel flusso PostgreSQL/R2. L'esistenza del secondo telefono **non qualifica** la custodia: `RB03_TWO_ANDROID_CANDIDATE=DOCUMENTED / DEVICE_TEST=NOT_RUN / RB-03=HOLD`.

### RB-03 — predisposizione tecnica distinta dalla custodia reale

Il protocollo [P7_DB_KEY_CUSTODY_RECOVERY_PROTOCOL.md](./P7_DB_KEY_CUSTODY_RECOVERY_PROTOCOL.md) identifica i soggetti autorizzati, le due copie protette, la verifica del ripristino a partire dalla seconda copia, la custodia separata da GitHub/R2 e una ricevuta priva di segreti. Il verificatore [p7-rb03-local-custody-check.sh](../../.github/scripts/p7-rb03-local-custody-check.sh) può certificare **solo** il test crittografico su contenuto fittizio; la CI esegue esclusivamente `--self-test` con chiavi effimere. Nessun job CI può attestare la custodia di un'identità reale o sostituire la responsabilità umana. **RB-03=HOLD** fino a prova della seconda copia custodita e attestazione separata del titolare.

**Profilo personale mobile — metodo opzionale, non selezionato dall'utente e non eseguito.** Il [protocollo Android senza PC](./P7_RB03_PERSONAL_ANDROID_CUSTODY.md) definisce una custodia della chiave privata `age` indipendente da GitHub e R2: origine privata in Termux, copia locale cifrata con passphrase, replica cifrata su Google Drive o archivio separato, recupero della **seconda copia** e verifica del destinatario e del test sintetico. La passphrase rimane fuori dai repository e separata dall'archivio. L'assunzione di responsabilità del custode per un progetto personale **non cambia** la necessità di verificare se il database contenga dati scolastici in `RB-02`. **RB-03 rimane HOLD: nessuna chiave è stata creata e nessuna prova di recupero personale è stata ricevuta.**

**Blocco sul contenuto:** non dichiarare il database sintetico sulla sola base del nome del progetto; l'inventario contiene identità e oggetti Storage non verificati come fittizi. `RB-02=HOLD` fino a decisione del soggetto competente. Nessuna installazione Termux deve essere chiesta all'utente. 

**Blocco obbligatorio:** non creare un workflow con `workflow_dispatch` che riceva connessioni reali finché tutti i requisiti `RB-01`–`RB-05` non siano attestati, compresi `RB-02`–`RB-05` tuttora aperti; non applicare DDL `0104` né promuovere la Beta se `RB-06`–`RB-08` non sono PASS.

## 5. Evidenze ammesse nel repository pubblico

Solo commit esatto, identificativo di prova, stato dei gate, versione PostgreSQL, descrizione dello schema e impronte **dei soli archivi cifrati**. Nessun dato di autenticazione, record scolastico, oggetto Storage, identità `age`, password, token, URL autenticato, configurazione segreta o log applicativo con dati degli utenti.

### Fonti ufficiali
- [Supabase — Database Backups](https://supabase.com/docs/guides/platform/backups)
- [Supabase — Backup and Restore using CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
- [Supabase — CLI db dump](https://supabase.com/docs/reference/cli/supabase-db-dump)
- [Supabase — Restore a Platform Project to Self-Hosted](https://supabase.com/docs/guides/self-hosting/restore-from-platform)
