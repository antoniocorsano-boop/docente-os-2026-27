# P7-DB-REAL-ACTIVATION — Contratto di attivazione e recuperabilità Beta

**Stato tecnico (aggiornamento RB-02 all'08/11/2026):** `READ_ONLY_INVENTORY_COMPLETE / RENDER_PUBLIC_CONFIG_CONFIRMED / RUNTIME_BUILD_UNATTESTED / RB03_CUSTODY_PASS_USER_ATTESTED / REAL_EXPORT_HOLD`.

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

## 1-bis. Contesto di gestione — progetto professionale autonomo (08/11/2026)

### Accordo Cloudflare e valutazione del fornitore (ricognizione 08/11/2026)

La verifica del [contratto Cloudflare Self-Serve](https://www.cloudflare.com/terms/) (sez. 6.1) ha rilevato l'incorporazione per riferimento del [Cloudflare DPA v6.4](https://www.cloudflare.com/cloudflare-customer-dpa/), efficace dal 03/04/2026, per i trattamenti di dati personali pertinenti. È stata esaminata la previsione di possibili trattamenti internazionali e delle relative garanzie contrattuali (§6), oltre alle condizioni per i sottofornitori (§4). Questa è una **verifica di documentazione pubblica**, non una ricevuta delle condizioni effettivamente applicabili all'account Cloudflare del custode.

L'analisi [RB-02 professionale / R2 / accordi / soglie gratuite](./P7_RB02_PROFESSIONAL_R2_COMPLIANCE_ASSESSMENT.md) distingue fonti, fatti già attestati e decisioni residue: `RB02_CONTRACT_RESEARCH=PASS_DOCUMENTARY`, `RB02_ACCOUNT_LEGAL_AND_TRANSFERS=PRIVATE_REVIEW_PENDING`, `RB02_ZERO_COST_USAGE=NOT_ATTESTED`. Il bucket UE garantisce la giurisdizione dichiarata degli oggetti secondo le condizioni del servizio, non l'assenza totale di metadati o trattamenti all'estero. La franchigia gratuita R2 Standard **non** impedisce automaticamente spese oltre soglia.

**RB-02 resta HOLD** finché non sia documentato in sede riservata il riscontro sull'accordo/condizioni effettivamente applicabili, l'analisi proporzionata dei rischi di trattamento, il perimetro minimo da conservare, il controllo della capacità e una distinta autorizzazione esplicita al backup dei dati reali. Le prove RB-04/05 reali rimangono non qualificate. Nessuna istruzione di export reale viene aggiunta da questo documento.



**Attestazione umana:** il progetto è gestito dal custode **a titolo professionale, senza operare per conto dell'istituto scolastico**. `PROJECT_CONTEXT=INDEPENDENT_PROFESSIONAL_USE / SCHOOL_AGENCY=NO_USER_ATTESTED`. Non attribuire al dirigente scolastico o all'istituto poteri di approvazione del backup di questo progetto per il solo fatto che l'utente è docente.

Non classificare però il trattamento come **puramente personale o domestico**: l'articolo 2, paragrafo 2, lettera c), e il considerando 18 del GDPR distinguono le attività strettamente private da quelle collegate all'attività professionale. La determinazione del soggetto responsabile del trattamento e delle condizioni applicabili resta contestuale e va valutata in funzione dei dati e delle finalità effettivi.

**Conseguenza per RB-02:** `PROFESSIONAL_CONTEXT=PASS_CUSTODIAN_ATTESTED`, mentre `RB-02=HOLD` fino alla verifica delle condizioni contrattuali e tecniche della destinazione R2 in rapporto all'uso professionale, dell'eventuale ruolo privacy e di una **decisione espressa di eseguire il backup reale cifrato**. L'attestazione non autorizza un'esportazione né modifica i blocchi RB-04/05/06/07/08.

Fonti ufficiali: [Regolamento (UE) 2016/679 art. 2 e considerando 18](https://eur-lex.europa.eu/legal-content/IT-EN/ALL/?uri=CELEX%3A32016R0679) e [Commissione europea — Applicazione del GDPR](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/application-gdpr_en).

## 1-bis. Perimetro dei dati — attestazione del custode (08/11/2026)

**Dichiarazione umana sopravvenuta:** nel progetto Beta sono presenti dati personali reali del custode e dati fittizi; il custode **esclude la presenza di dati reali di studenti, genitori o altri docenti**. Ricevuta senza nomi, account né contenuti personali: `SELF_PERSONAL_PLUS_SYNTHETIC=PASS_CUSTODIAN_ATTESTED`; `THIRD_PARTY_REAL_DATA=NONE_USER_ATTESTED`.

Il perimetro non è `SYNTHETIC_ONLY`. I conteggi aggregati rilevati in precedenza non dimostrano né smentiscono la dichiarazione; non è stato effettuato accesso alle righe del database, alle identità Auth o ai byte Storage. La classificazione riduce il rischio dichiarato di dati reali di terzi, ma **non** attesta da sola l'assenza effettiva di dati scolastici né l'idoneità della destinazione Cloudflare R2 per i dati personali del custode.

**Separazione delle autorizzazioni:** `RB-02=HOLD` anche se il custode ha chiarito che la Beta è usata **professionalmente in autonomia, non per conto dell'istituto**. Restano da accertare le condizioni contrattuali e di protezione dati applicabili al trattamento effettivo e al servizio R2, e da ottenere una **decisione espressa di backup reale cifrato**. `RB-04=HOLD` e `RB-05_REAL=HOLD` finché non si qualificano credenziale di origine, perimetro completo e recupero inclusi i file Storage. Nessun nuovo `workflow_dispatch` per dati reali deve essere reso attivabile prima della qualificazione dei gate.



Una verifica **aggregata e in sola lettura** ha rilevato 4 identità Auth, 4 spazi di lavoro, 6 sessioni didattiche e 9 oggetti Storage. Le quantità **non** distinguono dati sintetici da dati personali reali. **L'08/11/2026 il custode ha attestato** che i dati reali sono solo propri, affiancati a dati fittizi, e che non sono presenti dati reali di studenti, genitori o altri docenti. L'attestazione non deriva dalla lettura dei contenuti e non elimina l'obbligo di protezione dei dati personali.

Il documento canonico di classificazione e autorizzazione è [P7_DB_REAL_DATA_PRIVACY_AND_CUSTODY_GATE.md](./P7_DB_REAL_DATA_PRIVACY_AND_CUSTODY_GATE.md): `RB-02=HOLD`, nessuna esportazione reale né trasferimento R2 autorizzato.

**Custodia selezionata e verificata dal custode (07/11/2026):** due smartphone Android personali; Termux con `rage-keygen`/`age`; identità privata sul primo, copia cifrata recuperata autonomamente sul secondo e password conservata separatamente. `RB-03=PASS_CUSTODIAN_ATTESTED`. Il risultato non modifica le condizioni `RB-02`, `RB-04`, `RB-05` né autorizza copie reali.

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
- **Evidenza R2 del 06/11/2026 (15:48–15:52):** dopo la configurazione iniziale, `production-backup-90d` compare nell'elenco delle regole. Aprendo dal menu il dettaglio della regola esistente, la schermata delle 15:52 mostra interruttore abilitato, prefisso completo `production/` e conservazione `90` giorni. Stato: `RB02_R2_BUCKET_LOCK_SAVED_CONFIG=PASS_VISUAL`; prova operativa di immutabilità `NOT_TESTED`. Il ciclo di vita mostra solo `Default Multipart Abort Rule`, che **non** elimina i backup completati a 90 giorni. La protezione non equivale a cifratura o autorizzazione al trattamento: `RB-02=HOLD`; `RB-03=PASS_CUSTODIAN_ATTESTED` rimane un requisito distinto.

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

### RB-03 — percorso grafico preliminare non adottato

In data 06/11/2026 l'utente ha dichiarato la disponibilità di un **secondo smartphone Android**. È documentata una [variante candidata a due dispositivi senza Termux](./P7_RB03_TWO_ANDROID_GUI_CANDIDATE.md), che impiega un'applicazione open source per la gestione di identità age e un recupero di prova autonomo sul secondo telefono. Prima di usare la chiave permanente, bisogna verificare su dati **esclusivamente fittizi** il trasferimento cifrato, la lettura indipendente dal telefono A e la compatibilità con la versione age disponibile nel flusso PostgreSQL/R2. L'esistenza del secondo telefono non qualificava da sola la custodia. Il successivo percorso **Termux**, invece, ha ottenuto `RB03_TWO_ANDROID_RECOVERY=PASS_CUSTODIAN_ATTESTED` su un file cifrato e dati fittizi; resta indipendente dalle autorizzazioni di export.

### RB-03 — predisposizione tecnica distinta dalla custodia reale

Il protocollo [P7_DB_KEY_CUSTODY_RECOVERY_PROTOCOL.md](./P7_DB_KEY_CUSTODY_RECOVERY_PROTOCOL.md) identifica i soggetti autorizzati, le due copie protette, la verifica del ripristino a partire dalla seconda copia, la custodia separata da GitHub/R2 e una ricevuta priva di segreti. Il verificatore [p7-rb03-local-custody-check.sh](../../.github/scripts/p7-rb03-local-custody-check.sh) può certificare **solo** il test crittografico su contenuto fittizio; la CI esegue esclusivamente `--self-test` con chiavi effimere. Nessun job CI può attestare la custodia di un'identità reale o sostituire la responsabilità umana. **RB-03=PASS_CUSTODIAN_ATTESTED (07/11/2026)** sulla prova di recupero indipendente e custodia separata; non autorizza l'esportazione.

**Profilo personale mobile — adottato dal custode tramite Termux il 07/11/2026.** Il [protocollo Android senza PC](./P7_RB03_PERSONAL_ANDROID_CUSTODY.md) definisce una custodia della chiave privata `age` indipendente da GitHub e R2: origine privata in Termux, copia locale cifrata con passphrase, replica cifrata su Google Drive o archivio separato, recupero della **seconda copia** e verifica del destinatario e del test sintetico. La passphrase rimane fuori dai repository e separata dall'archivio. L'assunzione di responsabilità del custode per un progetto personale **non cambia** la necessità di verificare se il database contenga dati scolastici in `RB-02`. **RB-03=PASS_CUSTODIAN_ATTESTED:** chiave creata e recupero indipendente attestato dall'utente sul secondo Android.

**Blocco sul contenuto:** non dichiarare il database sintetico sulla sola base del nome del progetto; l'inventario contiene identità e oggetti Storage non verificati come fittizi. `RB-02=HOLD` fino a decisione del soggetto competente. Nessuna installazione Termux deve essere chiesta all'utente. 

**Blocco obbligatorio:** non creare un workflow con `workflow_dispatch` che riceva connessioni reali finché tutti i requisiti `RB-01`–`RB-05` non siano attestati, compresi `RB-02`–`RB-05` tuttora aperti; non applicare DDL `0104` né promuovere la Beta se `RB-06`–`RB-08` non sono PASS.

### RB-04 e RB-05 — Contratti tecnici verificabili, senza dati reali (07/11/2026)

La verifica ufficiale Cloudflare conferma che l'API S3 di R2 supporta credenziali **Object Read & Write** limitate a specifici contenitori, senza privilegi amministrativi, e che un contenitore EU richiede l'endpoint `https://<ACCOUNT_ID>.eu.r2.cloudflarestorage.com`. Questo specifica il requisito tecnico futuro; **nessuna credenziale nuova è stata creata o consultata**. La regola di blocco a 90 giorni non implica cancellazione automatica; approvazione della scadenza, configurazione del ciclo di vita e prova dei privilegi restano `RB-02=HOLD`.

**RB-04 — verifiche dei privilegi Supabase in sola lettura (07/11/2026).** Un'interrogazione aggregata del catalogo PostgreSQL, senza acquisizione di record o nominativi, conferma:
- `private`: 7 tabelle, `SELECT` diretto disponibile a `anon` su **0** e a `authenticated` su **0**. `anon` non possiede `USAGE` sullo schema; `authenticated` ha `USAGE`, ma non `SELECT` sulle tabelle. L'assenza di RLS sulle 7 tabelle **non prova esposizione pubblica**, ma accessi indiretti tramite funzioni o ruoli privilegiati restano da auditare;
- `public`: 62 tabelle, **62/62 con RLS**; grant `SELECT` a `anon` su 14 e a `authenticated` su 59. I grant da soli **non scavalcano RLS**, né dimostrano che le policy siano corrette;
- `auth`: 27 tabelle, `SELECT` diretto a `anon` e `authenticated` su **0**;
- `storage`: 8 tabelle con RLS, grant `SELECT` a `anon` e `authenticated` su 7; l'effettiva autorizzazione dipende anche dalle policy.

**Limite RB-04:** sono privilegi dei ruoli applicativi, non la qualifica della **futura credenziale di esportazione**. Quest'ultima deve essere autorizzata separatamente e avere il minimo ambito tecnicamente sufficiente per gli schemi da ripristinare, senza finire in CI non protette, log o repository. Non è stata creata alcuna credenziale, né autorizzato l'export.

Per RB-05 la prova [`p7-rb05-synthetic-recovery-contract.py`](../../.github/scripts/p7-rb05-synthetic-recovery-contract.py), collegata al workflow di verifica PG17, esercita un **pacchetto fittizio** con inventario distinto di `public`, `private`, `auth`, `storage`, `supabase_migrations` e byte di allegati sintetici, compreso un file binario. Richiede un'impronta del manifesto ottenuta separatamente. Il test accetta il pacchetto completo, respinge un file mancante, un allegato alterato, un manifesto diverso e la mancanza di `auth`. In CI usa `age` con una chiave **effimera sintetica**, decifra e verifica il contenuto e rifiuta una chiave sbagliata; non contiene configurazioni Supabase, URL di file o R2 e non usa credenziali. Esito subordinato al controllo automatico sul commit esatto.

**Limite vincolante:** si tratta di un **contratto di completezza simulata**, non di un'integrazione alle API Storage né del recupero reale della Beta. Non autorizza una copia del database reale e non qualifica l'identità degli utenti, i ruoli effettivi, le configurazioni del progetto, la consistenza delle scritture o il ripristino degli oggetti veri. `RB-04=HOLD` e `RB-05=HOLD` fino alle approvazioni, al progetto di restore effettivo e alle relative prove isolate. **Non trasformare questa prova in un workflow di esportazione reale.**

Fonti tecniche: [Cloudflare R2 API Tokens](https://developers.cloudflare.com/r2/api/tokens/), [Cloudflare Bucket Locks](https://developers.cloudflare.com/r2/buckets/bucket-locks/), [Cloudflare Object Lifecycles](https://developers.cloudflare.com/r2/buckets/object-lifecycles/), [Supabase Restore from Platform](https://supabase.com/docs/guides/self-hosting/restore-from-platform).

### RB-02/RB-04 — Verifica statica della politica di accesso e conservazione (07/11/2026)

Il nuovo [controllo sintetico delle politiche R2](../../.github/scripts/p7-rb02-rb04-r2-policy-contract.py), eseguito dalla stessa prova PostgreSQL 17, rifiuta in modalità di test: scadenza mancante o non successiva al blocco di 90 giorni, scadenza applicata indistintamente al contenitore, blocco disattivato, bucket o giurisdizione errati, esposizione pubblica, credenziali amministrative o estese a tutti i bucket, utilizzo dei dati reali nelle PR, e assenza della revisione privacy/della durata. Controlla anche che il percorso sintetico esistente resti nel prefisso `rehearsal/` e sia limitato a `main` con avvio esplicito.

**Doppia distinzione:** (a) il test esamina **solo valori fittizi** predisposti per individuare regressioni e non interroga Cloudflare; (b) il **07/11/2026 il custode ha approvato esplicitamente la scadenza automatica a 91 giorni** per il solo prefisso `production/`, mantenendo il blocco a 90 giorni; questa decisione **non è una regola Cloudflare già configurata o verificata**. Il controllo `RB02_RB04_POLICY_CONTRACT=PASS` non qualifica la protezione reale dei dati né equivale al via libera a un'esportazione. I permessi R2 sono verificabili per singolo contenitore e **non è comprovata** una restrizione alle sole chiavi di oggetto con prefisso `production/` o `rehearsal/`; occorre quindi conservare la separazione del processo e una revisione dei privilegi effettivi.

**Gates residui:** `RB-02=HOLD` nonostante la **durata di cancellazione a 91 giorni sia approvata** e il **salvataggio della regola sia attestato dall'utente l'08/11/2026**: restano la decisione sul trattamento e trasferimento di dati reali a R2, la verifica dei privilegi effettivi non sensibili e la futura prova operativa della conservazione/cancellazione senza dati reali. `RB-04=HOLD` finché non sia stata qualificata l'autorizzazione dell'identità di esportazione. La prova sintentica RB-05 è PASS, ma le procedure di ripristino vere restano HOLD. Nessun segreto, utente reale o allegato effettivo è stato esportato.

### Decisione di conservazione approvata (07/11/2026) — configurazione R2 salvata, attestata l'08/11/2026

| Voce | Decisione |
|---|---|
| Contenitore R2 | `docente-os-backup-eu` (giurisdizione UE precedentemente attestata) |
| Prefisso | `production/` (non tutto il contenitore) |
| Regola di blocco | `production-backup-90d`, 90 giorni, già documentata visivamente |
| Regola di ciclo di vita da verificare | Cancellazione automatica degli **oggetti completati dopo 91 giorni** |
| `rehearsal/` | Escluso da questa nuova scadenza |
| Stato della scelta | `RETENTION_91_DAYS=USER_APPROVED` |
| Stato configurazione R2 | `LIVE_LIFECYCLE_91_DAYS=PASS_USER_ATTESTED_SAVED` — screenshot pre-salvataggio e successiva riapertura confermata, senza prova API o cancellazione operativa |

La scadenza si riferisce all'**età di ciascun oggetto**, non a un calendario globale. Secondo Cloudflare, la cancellazione viene normalmente completata entro **24 ore dalla scadenza**, e i tempi possono variare. La regola a 91 giorni non garantisce da sola che esista sempre una copia recuperabile: prima di attivare backup reali occorre definire e qualificare la frequenza di generazione e recupero, evitare che una copia scada come unica fonte disponibile, verificare i permessi di accesso al contenitore e rispettare il vincolo di costo zero. La decisione sulla sola durata non equivale all'approvazione dell'esportazione di dati reali (`RB-02=HOLD`).

**Verifica assistita da smartphone, senza esposizione di segreti:** Cloudflare → R2 Object Storage → `docente-os-backup-eu` → Settings → Object lifecycle rules → Add rule; selezionare cancellazione automatica per gli oggetti dopo **91 giorni**, con prefisso **`production/`**; salvare e riaprire la regola per documentare nome, prefisso, stato e durata, evitando che lo screenshot includa token o altri segreti. Non sostituire o modificare la regola Bucket lock esistente. In data 08/11/2026 il custode ha confermato esplicitamente di aver riaperto la regola trovandola salvata; tale attestazione, insieme alla schermata di configurazione, documenta il salvataggio, ma non una verifica tramite API né l'effettiva cancellazione di oggetti dopo 91 giorni.

Fonti: https://developers.cloudflare.com/r2/buckets/object-lifecycles/ ; https://developers.cloudflare.com/r2/buckets/bucket-locks/ .

### RB-02/RB-04 — Permessi del token R2 già esistente verificati visivamente (08/11/2026)

Tre schermate della pagina Cloudflare «Modifica token API Account» mostrano il token `docente-os-p7-backup` con selezione **Lettura e scrittura di oggetti**, circoscritta a **bucket specifici**, unico bucket visualizzato `docente-os-backup-eu`. Non sono selezionati ruoli amministrativi di lettura/scrittura né di sola lettura. TTL impostato a «Per sempre»; campi per filtri indirizzi IP vuoti. L'utente non ha chiesto, né si è eseguita, alcuna modifica o rigenerazione del token.

**Ricevuta:** `RB02_R2_TOKEN_SCOPED_OBJECT_READ_WRITE=PASS_VISUAL`; `RB02_R2_TOKEN_NON_ADMIN=PASS_VISUAL`; `RB02_R2_TTL=NON_EXPIRING`; `RB02_R2_IP_FILTER=NONE`. Gli ultimi due richiedono una gestione della custodia e una strategia di rotazione, ma non rendono non conforme l'ambito dei permessi R2. La prova riguarda le selezioni nell'interfaccia e non dimostra con un'API quali credenziali GitHub stia effettivamente usando.

**Valutazione dei gate:** la verifica **dell'ambito R2** di RB-02 è superata a livello di evidenza visiva; `RB-02=HOLD` per la distinta autorizzazione al trattamento e al trasferimento dei dati effettivi, altre condizioni contrattuali e resilienza della conservazione. `RB-04=HOLD`: non è ancora stata qualificata l'identità che può leggere/esportare il database Supabase e il suo perimetro minimo. `RB-05_REAL=HOLD`: non è attestato un recupero completo di Auth e dei byte Storage reali. Nessun backup reale né modifica Cloudflare.

Fonti: [Cloudflare R2 Authentication](https://developers.cloudflare.com/r2/api/tokens/), [Cloudflare Restrict tokens](https://developers.cloudflare.com/fundamentals/api/how-to/restrict-tokens/).

## 5. Evidenze ammesse nel repository pubblico

Solo commit esatto, identificativo di prova, stato dei gate, versione PostgreSQL, descrizione dello schema e impronte **dei soli archivi cifrati**. Nessun dato di autenticazione, record scolastico, oggetto Storage, identità `age`, password, token, URL autenticato, configurazione segreta o log applicativo con dati degli utenti.

### Fonti ufficiali
- [Supabase — Database Backups](https://supabase.com/docs/guides/platform/backups)
- [Supabase — Backup and Restore using CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
- [Supabase — CLI db dump](https://supabase.com/docs/reference/cli/supabase-db-dump)
- [Supabase — Restore a Platform Project to Self-Hosted](https://supabase.com/docs/guides/self-hosting/restore-from-platform)
