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

### Verifica umana Storage S3 e controllo RLS — 08/11/2026

**Evidenza fornita dal custode:** nella schermata Supabase **Storage → S3 Configuration** del progetto `gnshgapmwyjamhmlikeg` il commutatore **S3 protocol connection** risulta abilitato, l'endpoint di progetto è visualizzato, la regione è `eu-west-1` e la sezione **Access keys** mostra «No access keys created». La schermata non dimostra una sessione S3 autenticata né la lettura dei byte di alcun file. Non sono state create credenziali né modificata l'impostazione già attiva.

**Verifica aggregata del catalogo PostgreSQL, sola lettura:** per `storage.objects`, `relrowsecurity=true`, `relforcerowsecurity=false`; esistono **2** politiche `SELECT/ALL`, entrambe applicabili a `authenticated` o `public`. Sono stati contati **solo metadati delle politiche**, senza estrarne le espressioni, leggere righe personali, nomi di oggetti o scaricare file. La sola presenza delle politiche **non** dimostra che l'utente/custode possa vedere tutti i 9 oggetti: occorre verificare la loro efficacia in un ambiente autorizzato.

**Due possibili modalità ufficiali di accesso alla sorgente Storage:**
- **Sessione S3 con token utente (JWT)**: rispetta le politiche RLS e limita l'accesso all'identità autenticata; è la candidata a privilegio minimo da **qualificare**, senza comunicare il JWT in chat, GitHub o nei log.
- **Chiavi S3 generate dal progetto**: consentono l'accesso a tutte le operazioni di tutti i bucket e aggirano RLS, secondo la [documentazione ufficiale Supabase](https://supabase.com/docs/guides/storage/s3/authentication). **Nessuna è presente**, e non è autorizzata ora la generazione di una chiave con privilegi così ampi.

**Esito:** `RB04_STORAGE_S3_PROTOCOL=PASS_VISUAL_ENABLED`; `RB04_STORAGE_S3_PERMANENT_KEYS=NONE_USER_SCREENSHOT`; `RB04_STORAGE_RLS_SELECT_POLICIES=2_READ_ONLY_CATALOG`; `RB04_STORAGE_READ_ACCESS_TO_ALL_BYTES=HOLD`. Il catalogo e le schermate non costituiscono credenziali né una prova di esportazione riuscita.

**Vincoli:** non premere «New access key» né «Save», non creare chiavi permanenti, non copiare token di sessione, non eseguire download dei 9 allegati o backup reali prima di RB-02/RB-04/RB-05 e della successiva autorizzazione esplicita. Il servizio S3 è una **origine** Supabase distinta dal contenitore di **destinazione** Cloudflare R2.

### Audit effettivo RLS: MFA e appartenenza (08/11/2026, sola lettura)

Sono state interrogate **esclusivamente le definizioni di politica** nel catalogo `pg_policies` e la definizione della funzione di controllo MFA; non sono state lette righe di `storage.objects`, `workspace_memberships`, identità, percorsi o byte. Le definizioni effettive sul progetto candidato attestano:

| Politica su `storage.objects` | Operazione / modo | Vincolo osservato |
|---|---|---|
| `knowledge_assets_storage_select_member` | `SELECT`, **PERMISSIVE**, `authenticated` | `bucket_id = 'knowledge-assets'` e appartenenza dell'utente corrente allo spazio di lavoro identificato dal primo segmento di `storage.foldername(name)` |
| `mfa_aal2_required` | `ALL`, **RESTRICTIVE**, `authenticated` | `private.current_session_is_aal2()`; la funzione SQL `STABLE`, senza `SECURITY DEFINER`, richiede `auth.jwt()->>'aal' = 'aal2'` |
| `knowledge_assets_storage_insert_member` | `INSERT`, **PERMISSIVE**, `authenticated` | Inserimento consentito secondo appartenenza allo spazio di lavoro |
| `knowledge_assets_storage_delete_own` | `DELETE`, **PERMISSIVE**, `authenticated` | Eliminazione limitata a oggetto proprio e appartenenza allo spazio di lavoro |

**Correzione interpretativa essenziale:** la politica MFA `ALL` è **RESTRICTIVE**, non permissiva. Per `SELECT` PostgreSQL combina l'autorizzazione dello spazio di lavoro con il requisito `aal2`; la presenza di MFA **non** apre accesso indipendente a tutti gli oggetti. Non è stato effettuato alcun tentativo di accesso con un JWT di utente e non è quindi confermata la copertura degli attuali nove oggetti.

**Limite del privilegio:** una sessione S3 basata su JWT **non è una credenziale intrinsecamente di sola lettura**: nel medesimo schema esistono politiche di `INSERT` e `DELETE`. Un esecutore limitato per codice a `ListObjectsV2`, `HeadObject` e, solo dopo autorizzazione separata, `GetObject` riduce le operazioni svolte ma non revoca i privilegi sottostanti della sessione. Non chiamare questa identità `read_only_role` né equipararla a una credenziale di backup dedicata e non scrivente.

**Decisione RB-04 sul percorso S3: `RLS_POLICY_STRUCTURE_PASS_READ_ONLY_CATALOG / USER_SESSION_AND_NINE_OBJECT_COVERAGE_HOLD`.** Non usare una connessione amministrativa al database o una chiave `service_role` per simulare la visibilità di un utente: aggirerebbe RLS e produrrebbe un falso positivo.

#### Protocollo minimo di qualificazione successivo (NON ESEGUITO)

1. **Prima di accedere a metadati nominativi o file reali:** autorizzare esplicitamente la prova di accesso e predisporre un ambiente protetto, evitando JWT, chiavi, percorsi e nominativi in chat, PR, CI e registri. `RB-02` resta separatamente `HOLD` per l'esportazione e il trasferimento effettivi.
2. Usare **una sessione utente reale con MFA `aal2`** nel progetto esatto. La [documentazione Supabase su S3 Authentication](https://supabase.com/docs/guides/storage/s3/authentication) prevede `accessKeyId = project_ref`, chiave anonima **legacy** e `sessionToken = JWT`; allo stato della documentazione, la chiave pubblicabile nuova non è intercambiabile nel protocollo S3. Non generare chiavi S3 permanenti e non esporre il token.
3. In ambiente protetto verificare **solo con operazioni non mutanti** l'accesso consentito al contenitore e la quantità degli oggetti visibili. Confrontare il totale con l'inventario aggregato di **9**; effettuare eventuale controllo di dimensioni e percorso solo in evidenza riservata, mai in uscita testuale pubblica. Un totale coincidente **non** prova da solo l'identità byte-per-byte degli oggetti né la loro recuperabilità.
4. Se un oggetto è invisibile o `aal2` non è disponibile, riportare **`HOLD`** senza indebolire RLS, aggiungere permessi, eseguire `GetObject` o creare chiavi S3 generali.
5. Solo dopo la distinta autorizzazione RB-02 e una soluzione qualificata di lettura DB + Storage potranno essere verificate acquisizione dei byte, SHA-256, coerenza e ripristino RB-05; il percorso reale non è un effetto implicito della ricognizione.

Questa è un'evidenza di **configurazione effettiva e disegno di prova**, non una qualifica di accesso reale; nessun backup, file o migrazione è stato avviato.

### Verifica preparatoria MFA/S3 — contratto sintetico di sessione (08/11/2026)

**Implementazione disponibile, senza rete né credenziali:** [`p7-rb04-s3-session-visibility-contract.py`](../../.github/scripts/p7-rb04-s3-session-visibility-contract.py). Lo strumento esegue soltanto `--self-test` su un elenco interamente fittizio di nove file; non dispone di modalità reale, non legge l'ambiente Supabase, non richiama API e rifiuta la presenza di variabili di credenziali reali. L'esecuzione è inserita nel workflow [PG17 sintetico](../../.github/workflows/p7-db-real-readiness-pg17.yml), che non ha `workflow_dispatch` né accesso a segreti e si attiva solo in PR verso `main`.

La matrice artificiale copre: utente autenticato con `aal2` e appartenenza a tre spazi (tutti e nove visibili), assenza di MFA, identità anonima, progetto errato, zero appartenenze e appartenenza parziale; rifiuta `GetObject`, `HeadObject`, `PutObject`, `DeleteObject`, `ListBuckets`, paginazione incompleta, chiavi duplicate e discordanza degli aggregati di conteggio/dimensione. Il risultato è ridotto a **stati e conteggi sintetici**, senza stampare identità o nomi. **Non si tratta di una prova S3 contro la sorgente reale**, né del risultato di una chiamata SQL RLS eseguita con la sessione utente.

**Precisazione sull'identità:** il `sessionToken` descritto nella [documentazione ufficiale Supabase S3](https://supabase.com/docs/guides/storage/s3/authentication) è un JWT di **Supabase Auth per l'utente applicativo Docente OS**, non un token di accesso al pannello amministrativo Supabase. La stessa fonte richiede, per questa modalità, `accessKeyId = project_ref` e la chiave pubblica `anonKey` legacy come `secretAccessKey` S3 (la nuova `publishableKey` non è attualmente supportata); la sicurezza deriva dal JWT e dalle RLS verificate dal servizio, non dalla segretezza della chiave anonima. **Non** esportare JWT da smartphone/browser verso GitHub, chat, registri, file del repository o job sintetici. Le sessioni del pannello Supabase per [accesso PostgreSQL temporaneo](https://supabase.com/docs/guides/platform/temporary-access) appartengono a un meccanismo diverso e non vanno sostituite al JWT applicativo Storage.

**Passo eseguibile dopo separata autorizzazione:** occorrerà individuare o predisporre un contesto *già autenticato nell'applicazione* con MFA effettivo `aal2`; eseguire in ambiente protetto una richiesta `ListObjectsV2` verso il contenitore autorizzato; elaborare tutte le pagine senza esporre `Key`, identificativi, token o dimensioni per singolo file; confrontare il conteggio con l'inventario aggregato indipendente di **9** e la somma precedentemente rilevata **5.371.962 byte**, assicurando l'assenza di modifiche concorrenti. In caso di rifiuto, elenco vuoto o discordanza: `HOLD` senza allargamento delle policy. Solo dopo RB-02 e altre autorizzazioni potranno essere trattati i byte, le impronte e il ripristino.

**Soglia di evidenza:** anche il confronto positivo di numero e dimensioni **non dimostra identità dei file, autorizzazione al download, correttezza dei byte o recuperabilità**. `RB04_SESSION_RUNTIME=NOT_RUN`, `RB04_S3_REAL_LIST=NOT_RUN`, `RB04_S3_BYTE_RECOVERY=NOT_RUN`. Il PASS del solo contratto sintetico non cambia `RB-02`, `RB-04` o `RB-05`.

### MFA applicativa — implementazione proposta e collaudo richiesto (08/11/2026)

La configurazione **TOTP abilitata** è stata attestata dall'utente nel pannello Supabase (08/11/2026). Questa impostazione di progetto **non** registra automaticamente un fattore sugli account Docente OS né prova una sessione `aal2`.

Nella presente PR, senza distribuirla, sono stati aggiunti:
- `product/src/app/sicurezza/mfa/page.tsx`: pagina riservata a sessioni Supabase Auth già valide, con verifica server `getClaims()`.
- `product/src/app/sicurezza/mfa/mfa-access.tsx`: flusso mobile TOTP con `mfa.listFactors()`, `mfa.getAuthenticatorAssuranceLevel()`, `mfa.enroll()`, `mfa.challengeAndVerify()`; controllo finale esplicito di `aal2`. L'utente inserisce la chiave TOTP in un'app di autenticazione e poi il codice di sei cifre nella pagina. **Solo durante l'attivazione** la chiave è visualizzata nel componente, senza salvarla nel repository, URL, archivio del progetto o log. Un fattore non verificato creato in questo flusso può essere annullato con un'azione esplicita. Non è prevista cancellazione di fattori già verificati.
- L'accesso con password indirizza al controllo MFA se risulta necessario un secondo fattore già registrato; nelle Impostazioni compare un collegamento a `/sicurezza/mfa`.
- `mfa-state.ts` e `mfa-state.test.ts` con test unitari dell'instradamento e della validazione del codice, integrati nel test `npm test`. Le prove isolate non costituiscono test di autenticazione reale.

**Vincoli:** la pagina non contiene operazioni S3, lettura di Storage, backup, chiavi S3 permanenti, ruoli privilegiati o cambi di RLS. Registrare un fattore TOTP modifica soltanto lo stato Auth dell'utente che lo attiva; la procedura sarà utilizzabile **solo dopo revisione, approvazione e distribuzione controllata** dell'applicazione. Supabase indica che la verifica di un nuovo fattore può terminare le altre sessioni attive. Per non perdere l'accesso, predisporre prima un metodo di recupero sicuro per l'app di autenticazione (i codici di recupero MFA nativi non sono disponibili).

**Human Review prima di qualunque distribuzione:** verificare su smartphone con identità di prova l'assenza di segreti in schermate condivise, registri e URL; la leggibilità del passaggio di chiave manuale e codice TOTP; gli errori per `aal1`, codice errato, fattore inesistente, sessione scaduta; la persistenza dei permessi del workspace; e la continuità di accesso dopo verifica `aal2`. Non registrare screenshot contenenti la chiave temporanea o codici.

**Successiva qualificazione RB-04 reale (non eseguita):** su ambiente autorizzato e isolato, l'utente completa il secondo fattore sull'app; si attesta `aal2` con prova riservata che non espone JWT. Separatamente, quando permesso, un esecutore di sola enumerazione verifica la visibilità degli oggetti RLS. `aal2` **non** autorizza automaticamente la copia reale: `RB-02`, `RB-04` e `RB-05` restano `HOLD` in assenza dei rispettivi riscontri. Nessun merge, deploy, lettura dei nove byte privati o DDL `0104` è implicitamente autorizzato.

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
