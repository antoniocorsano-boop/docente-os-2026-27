# P7 / RB-04–RB-05 — Identità di origine e recupero completo di Supabase

**Verifica:** 08/11/2026  
**Stato:** `CATALOG_READ_ONLY_PASS / CREDENTIALS_REAL_UNQUALIFIED / STORAGE_RECONCILIATION_SYNTHETIC_CONTRACT_IN_CI / REAL_RESTORE_HOLD`  
**Ambiente:** Beta Docente OS, progetto candidato `gnshgapmwyjamhmlikeg`. Nessuna credenziale, dump reale, byte di oggetti Storage o dato personale acquisito per redigere questo documento.

## 1. Distinguere origine, autorizzazione e destinazione

Esistono **tre ruoli tecnici diversi**:

| Identità | Compito | Evidenza disponibile | Decisione |
|---|---|---|---|
| Connessione PostgreSQL di origine | Leggere ruoli, schema, tabelle, autenticazione, migrazioni e metadati Storage nei limiti permessi dall'esportazione | Origine Beta/progetto attestata via URL pubblico Render; client PostgreSQL 17.6 collaudato solo su dati sintetici | **RB-04 HOLD**. Nessuna connessione reale provata; non assumere che i ruoli `anon`/`authenticated` o un nuovo ruolo con soli SELECT siano sufficienti |
| Lettore degli oggetti Supabase Storage | Enumerare i contenitori autorizzati, acquisire i byte dei file privati, verificare dimensioni/impronte, senza alterare i file | 1 contenitore non pubblico, 9 oggetti: inventario aggregato in sola lettura; protocollo S3/CLI documentato | **RB-04/05_REAL HOLD**. Sorgente e modalità di autenticazione non qualificate su oggetti reali |
| Destinazione Cloudflare R2 | Ricevere esclusivamente archivi **già cifrati** nel prefisso `production/` | Token `docente-os-p7-backup` con **Object Read & Write** sul solo bucket `docente-os-backup-eu`; lock 90 giorni e scadenza 91 giorni attestati | Permessi visivamente PASS; l'identità effettivamente usata dall'esecutore reale resta da verificare; **RB-02 complessivo HOLD** |

**Non equiparare i tre account.** Nessuna chiave R2 autorizza la lettura del database Supabase, nessuna chiave Supabase va usata per caricare su R2. Le autorizzazioni reali andranno custodite nel solo ambiente protetto che eseguirà il backup, dopo revisione privacy e autorizzazione esplicita, mai esposte in PR, registri o test da contributi esterni.

### Ricognizione delle capacità dei ruoli standard — sola lettura (08/11/2026)

Una query del catalogo `pg_roles`, che **non accede ai dati delle tabelle**, ha restituito la seguente matrice per i soli ruoli standard di Supabase:

| Ruolo | `LOGIN` | `BYPASSRLS` | `CREATEDB` / `CREATEROLE` |
|---|---|---|---|
| `anon` | NO | NO | NO / NO |
| `authenticated` | NO | NO | NO / NO |
| `service_role` | NO | SÌ | NO / NO |
| `postgres` | SÌ | SÌ | SÌ / SÌ |

La parola `service_role` identifica qui un **ruolo interno PostgreSQL**, non prova l'idoneità di una chiave API omonima a eseguire `pg_dump`. `postgres` **non è superuser** nel catalogo, ma ha comunque ampi privilegi (`BYPASSRLS`, `CREATEDB`, `CREATEROLE`) e non deve essere chiamato «backup reader a privilegi minimi». I ruoli senza `LOGIN` non sono identità autonome per collegarsi a PostgreSQL.

**Conseguenza:** la credenziale effettiva di esportazione non è stata scoperta né usata; non è attestato che esista già una credenziale a privilegi minimi capace di esportare tutti gli schemi necessari. Prima di RB-04 PASS occorre verificare senza pubblicare segreti il metodo di autenticazione scelto, gli accessi a `auth` e `private`, l'effettiva necessità degli eventuali privilegi elevati e le modalità di custodia delle credenziali. **Non creare un ruolo SQL o una credenziale in questa PR.**

## 2. Inventario Supabase osservato — soli aggregati (08/11/2026)

Eseguita una sola interrogazione aggregata in sola lettura; non sono stati letti nomi di file, account, record, URL o allegati.

| Indicatore | Valore |
|---|---:|
| Tabelle `public` | 62 |
| Tabelle `private` | 7 |
| Account nella tabella `auth.users` | 4 |
| Contenitori Storage | 1 |
| Oggetti Storage | 9 |
| Oggetti con dimensione numerica presente nei metadati | 9 |
| Somma dimensioni indicate nei metadati | **5.371.962 byte** |

Le dimensioni dei metadati non sostituiscono il controllo dei byte reali né provano che tutti gli oggetti siano recuperabili. La dimensione del dump del database **non** è stimabile dal solo numero di tabelle; non sommare il valore a ipotesi di compressione per promettere l'assenza di addebiti.

## 3. Perimetro minimo di una copia realmente ripristinabile

1. **Ruoli, schema e dati.** La procedura ufficiale Supabase CLI differenzia `--role-only`, schema e `--data-only`; `pg_dump -Fc --schema=public` eseguito nel collaudo PG17 non rappresenta la copia completa dell'applicazione. Il ripristino dovrà preservare tabelle `private`, funzioni, trigger, RLS, migrazioni e dipendenze. Non assumere che il comando CLI standard comprenda gli schemi gestiti `auth` e `storage`: verificare contenuto ed esclusioni sullo strumento e sulla versione adottata.
2. **Autenticazione.** Prevedere una componente esplicita, verificabile, per i dati Auth e per l'eventuale ricostruzione delle configurazioni che non si trovano nel database. Le chiavi API, configurazioni di provider e segreti non vanno dedotti dal dump.
3. **Storage.** Esportare un inventario completo di coppie `(bucket, nome_oggetto)`, salvato **all'interno dell'archivio cifrato**; per ogni file registrare dimensione in byte e impronta SHA-256 calcolata **sui byte effettivamente ottenuti**, non presumere che ETag S3 equivalga sempre a SHA-256 o MD5. Scaricare **i byte** di ciascun oggetto e confrontare con l'inventario. Due bucket possono contenere lo stesso nome: il solo nome non è una chiave univoca.
4. **Coerenza temporale.** Il dump PostgreSQL e l'esportazione Storage non sono automaticamente un'unica istantanea atomica. Definire una finestra di scrittura sospesa o altro protocollo di coerenza con verifica di elementi aggiunti, cancellati o modificati durante l'operazione. Non proclamare una copia consistente dai soli timestamp.
5. **Protezione e ricevuta.** Cifrare prima del trasferimento R2 con il destinatario pubblico `age` del custode; mai esportare la chiave privata in CI. Riconciliare un'impronta del manifesto contro una **ricevuta indipendente** e non registrare in chiaro nomi di oggetti, percorsi personali o contenuti.
6. **Ripristino isolato.** Dimostrare su destinazione distinta e approvata la ricostruzione di ruoli, schemi, dati, Auth, configurazioni necessarie, Storage e permessi. I file devono essere importati tramite le **API Storage/S3 del progetto di ripristino**, non mediante una semplice copia sul filesystem di un server: Supabase mantiene strutture e metadati gestiti.

Fonti ufficiali:
- [Supabase — Database Backups](https://supabase.com/docs/guides/platform/backups): backup del database **non** include i byte Storage.
- [Supabase — CLI db dump](https://supabase.com/docs/reference/cli/supabase-db-dump): esclusioni degli schemi gestiti, ruoli e dati opzionali; non assumere che `auth`/`storage` siano già coperti.
- [Supabase — Backup and Restore using CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).
- [Supabase — Download Objects](https://supabase.com/docs/guides/storage/management/download-objects): CLI `storage` e S3 supportati.
- [Supabase — Copy Storage Objects from Platform](https://supabase.com/docs/guides/self-hosting/copy-from-platform-s3): ripristino mediante protocollo Storage, non copia diretta nel filesystem.

## 4. Nuovo controllo eseguibile: provenienza e integrità con dati fittizi

Lo script [`p7-rb04-rb05-source-storage-contract.py`](../../.github/scripts/p7-rb04-rb05-source-storage-contract.py), collegato al workflow PG17, usa un **progetto fittizio** e non possiede alcun componente di rete. Costruisce ruoli **immaginari**, sei componenti fittizie di database, due contenitori fittizi con lo stesso nome di file, un oggetto binario e un oggetto di lunghezza zero.

Si rifiutano, tramite prove negative:
- progetto di origine differente, esportazione dati e file da progetti diversi, istantanee non corrispondenti;
- assenza di lettura dichiarata di Auth o degli oggetti Storage, identità con privilegi amministrativi o di scrittura, chiavi dichiarate provenienti dal repository;
- componenti assenti `auth_users`, `storage_metadata`, `migration_history`, `roles` oppure alterazione dei dati Auth;
- file mancante, aggiunto, alterato, scambiato tra contenitori, voce duplicata, percorso relativo non sicuro;
- modifica del manifesto rispetto a una ricevuta di integrità indipendente e assenza del protocollo fittizio di coerenza.

**Interpretazione del PASS:** prova di regole di rifiuto e coerenza dei dati inventati; **non** dimostra che Supabase conceda effettivamente un ruolo denominato come nella fixture, che PostgreSQL e Storage reali possano essere congelati in modo atomico, o che sia stato eseguito un ripristino autentico.

## 4-bis. Verifica PostgreSQL 17 su cinque schemi fittizi (08/11/2026)

Lo script [`p7-db-real-readiness-pg17.sh`](../../.github/scripts/p7-db-real-readiness-pg17.sh) ha esteso il collaudo cifrato a tabelle inventate negli schemi `public`, `private`, `auth`, `storage` e `supabase_migrations`, tutte create **esclusivamente** nel database PostgreSQL 17 effimero di GitHub Actions. `pg_dump` esporta i cinque schemi direttamente verso `age`, quindi `pg_restore` ripristina un secondo database fittizio, verificando il contenuto atteso di ciascuno. Il controllo crittografico respinge ancora una chiave privata non pertinente e non scrive copie SQL in chiaro sul filesystem del job.

**Evidenza sul commit esatto `e8f765a99cd447b6555f36e7cf103b4b11cb7e20`:** [PG17 run #42490032994](https://github.com/antoniocorsano-boop/docente-os-2026-27/actions/runs/42490032994) = PASS, compreso il passaggio di esportazione/ripristino multischema. Il controllo non riproduce definizioni, dati, dipendenze, privilegi o configurazioni gestite di `auth` e `storage` della piattaforma reale.

**Distinzione irrinunciabile:** il flusso `pg_dump` usato qui con `--schema` espliciti non coincide con la procedura standard `supabase db dump`, che può escludere schemi gestiti. Non considerare superato `RB-05_REAL` prima di qualificare la selezione effettiva delle componenti necessarie e di provare un recupero con autenticazione e file tramite API Storage/S3, in ambiente isolato e autorizzato.

## 5. Uscita dei gate

| Gate | Condizione ancora necessaria |
|---|---|
| `RB-02` | Verifica del contratto/servizio applicabile all'account, impatto sul trattamento e trasferimenti, spazio gratuito disponibile e **decisione espressa del custode** di consentire una copia reale; restano HOLD |
| `RB-04` | Attestazione in ambiente protetto **dell'identità di origine effettivamente utilizzata**, progetto esatto e privilegi sufficienti e non eccessivi; verifica distinta lettura DB e Storage; non estrarre segreti |
| `RB-05` | Piano effettivo di esportazione Auth/Storage, controllo dei byte, coerenza, cifratura e prova isolata di ripristino completo con dati autorizzati |
| `RB-06/07` | NON ESEGUITI; nessuna copia reale deve essere creata prima del superamento e autorizzazione dei gate |
| `RB-08` | Revisione umana finale; nessuna autorizzazione a merge, deploy o migrazione `0104` |

**Nessuna operazione su dati veri è richiesta o autorizzata dal presente documento.**
