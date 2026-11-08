# P7 — Classificazione prudenziale dei dati e autorizzazione alla copia reale

**Data:** 06/11/2026  
**Progetto candidato:** `gnshgapmwyjamhmlikeg` (Beta Docente OS)  
**Esito aggiornato all'08/11/2026:** `RB-02=HOLD / DATA_SCOPE_SELF_PERSONAL_PLUS_SYNTHETIC_USER_ATTESTED / THIRD_PARTY_REAL_DATA_DENIED_BY_CUSTODIAN / REAL_BACKUP_FORBIDDEN`

## Attestazione del perimetro dei dati (08/11/2026)

Il custode ha dichiarato esplicitamente: «No, non sono presenti dati reali di studenti, genitori o altri docenti, oltre ai miei dati personali e ai dati fittizi». Registrare quindi **`DATA_SCOPE=SELF_PERSONAL_PLUS_SYNTHETIC / THIRD_PARTY_REAL_DATA=NONE_USER_ATTESTED`**.

**Valore probatorio:** classificazione fondata su dichiarazione diretta del custode, non su verifica del contenuto del database. I conteggi aggregati precedenti (4 identità Auth, 4 spazi di lavoro, 6 sessioni, 9 oggetti Storage) rimangono fatti tecnici, senza potere discriminante sulla natura personale dei record. Non ispezionare account, nomi, allegati, righe o email per confermare questa dichiarazione, a meno di autorizzazione separata e necessità documentata.

**Conseguenze immediate:** il database **NON** deve essere classificato come `SYNTHETIC_ONLY`; include dati personali reali del custode. La precedente categoria generica «potenzialmente personale/scolastico» è affinata, sulla sola attestazione dell'utente, a «personali del custode + sintetici; nessun dato reale di studenti, famiglie o altri docenti dichiarato». Questa attestazione **non** equivale a una verifica tecnica dell'assenza di dati di terzi, né autorizza il trasferimento a R2.

**RB-02 resta HOLD.** Sono da accertare la natura personale o professionale dell'uso della Beta, l'eventuale titolarità/competenza di istituto sui documenti, le condizioni applicabili al trattamento e al servizio di archiviazione, e la decisione espressa di effettuare un backup reale cifrato verso R2. I controlli tecnici su cifratura, privilegi del token e durata 90/91 giorni già attestati non sostituiscono questa decisione. `RB-04` e `RB-05` per dati reali rimangono HOLD, `RB-06/07` non eseguiti, `0104` non autorizzata.

## RB-02 — Esame dei controlli R2 successivo alla verifica UE

**Verifiche confermate dall'utente (06/11/2026):** progetto personale, dati reali propri dichiarati, bucket `docente-os-backup-eu` con giurisdizione **Unione europea**, URL pubblico di sviluppo disabilitato e nessun dominio personalizzato. Nessun record personale è stato esaminato.

**Evidenza tecnica verificata sul ramo main:** il workflow `.github/workflows/p7-db-r2-main-certification.yml` utilizza R2 esclusivamente quando avviato manualmente da `main` per dati sintetici. Le credenziali non sono disponibili nelle richieste di modifica. Lo script `.github/scripts/p7-db-r2-main-synthetic-rehearsal.sh` usa il prefisso `rehearsal/`, non `production/`, e verifica l'eliminazione dell'oggetto fittizio dopo il test.

### Qualifica del contratto di configurazione (07/11/2026)

Lo script [`p7-rb02-rb04-r2-policy-contract.py`](../../.github/scripts/p7-rb02-rb04-r2-policy-contract.py) verifica **soltanto configurazioni fittizie** e il vincolo statico del flusso già approvato per i backup sintetici. I casi negativi respingono: bucket o giurisdizione sbagliati, esposizione pubblica, blocco disabilitato, scadenza prima o alla stessa data del blocco, prefisso lifecycle troppo ampio, accessi di tipo **Admin**, permessi su tutti i contenitori, credenziali incluse nel repository, utilizzo del prefisso `production/` nel collaudo e assenza di una decisione sulla privacy o sulla conservazione. Il test non legge token o impostazioni effettive del pannello Cloudflare e non può portare `RB-02` a PASS.

**Decisione esplicita del custode (07/11/2026):** approvata la **durata di cancellazione automatica di 91 giorni** per gli oggetti con prefisso `production/`, in abbinamento alla regola di blocco `production-backup-90d` di 90 giorni. L'approvazione è limitata alla **durata e al prefisso**: non attesta l'effettiva configurazione di Cloudflare, non costituisce autorizzazione privacy per l'esportazione reale e non dispone l'eliminazione manuale di alcun oggetto. Il controllo sintetico richiede ora `days = 91` anziché accettare qualsiasi durata maggiore di 90 giorni; il CI non legge né scrive l'account R2.

**Condizioni di sicurezza ancora aperte:** prima di considerare il ciclo di vita operativo occorre verificare nel pannello Cloudflare la presenza di una regola abilitata di **cancellazione automatica** con `prefix=production/`, scadenza `91 giorni`, senza modificare `rehearsal/` o la regola preesistente di blocco; conservare una prova non segreta del dettaglio salvato. Per non perdere l'unica copia ripristinabile, programmare nuove copie verificate entro i 91 giorni e controllare eventuali errori. La scadenza può comportare la perdita irreversibile di una copia quando non ne è stata creata un'altra: il ciclo di vita non garantisce da solo la continuità dei backup. Cloudflare specifica che la cancellazione avviene **tipicamente entro 24 ore** dalla scadenza, non precisamente allo scoccare del 91° giorno. La regola per gli upload incompleti non equivale alla scadenza degli oggetti completati.

**Autorizzazioni R2:** le credenziali S3 con permesso `Object Read & Write` possono essere limitate al contenitore `docente-os-backup-eu`. La documentazione R2 descrive il vincolo **per contenitore**, non garantisce un isolamento degli accessi fra i prefissi `rehearsal/` e `production/` del medesimo contenitore. Il collaudo sintetico resta dunque vincolato per codice a `rehearsal/` e all'avvio manuale su `main`; il percorso reale deve essere progettato e approvato separatamente. Non condividere codici di accesso, chiavi segrete né screenshot che li contengano.

**Limite operativo:** per completare RB-02 occorre una **attestazione reale non segreta** dei privilegi di Cloudflare e una **decisione di trattamento e conservazione**. Nessuna di esse può essere sostituita da un risultato PASS di prova sintetica.

**Aggiornamento R2 — 08/11/2026.** Il custode ha mostrato la configurazione della regola `Cancel backup` prima del salvataggio (abilitata, `production/`, eliminazione dopo `91` giorni) e ha confermato successivamente «Ho riaperto e la regola è salvata». `RB02_R2_LIFECYCLE_91D_SAVED=PASS_USER_ATTESTED`. Rimangono NON attestati i permessi effettivi delle credenziali R2, l'approvazione del trattamento/trasferimento di dati reali e la prova pratica di scadenza. **RB-02 complessivo = HOLD.**

**Aggiornamento permessi R2 — 08/11/2026.** Dal pannello di modifica del token API account esistente `docente-os-p7-backup` sono stati verificati visivamente i radio selezionati: **Lettura e scrittura di oggetti (Object Read & Write)**, applicato **solo a bucket specifici**, con unico bucket mostrato `docente-os-backup-eu`. Le opzioni amministrative sono **non selezionate**. TTL del token: `Per sempre`; filtri IP `Includi`/`Escludi` vuoti. Nessun token o segreto è stato esposto, modificato o rigenerato. `RB02_R2_TOKEN_PERMISSION_BUCKET_SCOPE=PASS_VISUAL` e `RB02_R2_TOKEN_TTL_IP_RISK=REVIEW_REQUIRED`. Questa prova descrive le impostazioni visualizzate per il token esistente, **non** identifica con certezza quali credenziali siano effettivamente impiegate dal processo GitHub né autorizza la copia reale. I token R2 per oggetti operano con API compatibile S3 e il limite è per contenitore; non attribuire vincoli ai soli prefissi `production/` o `rehearsal/` non dimostrati. Per la durata senza scadenza mantenere una custodia sicura, procedura di revoca e un piano di rotazione controllata che non interrompa i backup. **`RB-02=HOLD`** fino ad autorizzazione di trattamento/trasferimento e residui controlli operativi.

### Condizioni ancora da attestare

| Verifica | Evidenza necessaria | Stato |
|---|---|---|
| Giurisdizione R2 UE | Impostazioni del contenitore, conferma umana | PASS |
| Esposizione pubblica | URL di sviluppo disabilitato e assenza di domini | PASS visivo |
| Regola di blocco degli oggetti | Screenshot del 06/11/2026: regola `production-backup-90d` comparsa nell'elenco alle 15:48; riapertura dal menu della regola esistente alle 15:52 con interruttore abilitato, prefisso esatto `production/`, durata `90` giorni. Controllo **visivo della configurazione salvata**; non è stata effettuata una prova di immutabilità su un oggetto reale. | `RB02_R2_BUCKET_LOCK_SAVED_CONFIG=PASS_VISUAL / OBJECT_LOCK_EFFECTIVENESS=NOT_TESTED` |
| Regola di scadenza | `Cancel backup`, abilitata; prefisso `production/`; azione eliminazione oggetti dopo **91 giorni**. Screenshot di configurazione prima del salvataggio e conferma esplicita dell'utente in data 08/11/2026 di aver **riaperto** la regola trovandola salvata. | **PASS_USER_ATTESTED_SAVED** (senza verifica tramite API o test operativo di scadenza) |
| Permessi del processo R2 | Schermate della modifica token esistente `docente-os-p7-backup` (08/11/2026): selezionata **Lettura e scrittura di oggetti**, applicata solo a `docente-os-backup-eu`, non autorizzazioni amministrative. TTL `Per sempre`, nessun filtro IP. | **PASS_VISUAL_SCOPE_AND_PERMISSION / SECURITY_REVIEW_RESIDUAL** |
| Condizioni e conservazione dei dati personali | Ricevuta di decisione personale con perimetro e durata | NON APPROVATA |
| Recupero crittografico indipendente | Recupero su secondo Android e custodia della password cartacea in luogo separato, attestati dal custode il 07/11/2026 | `RB-03=PASS_CUSTODIAN_ATTESTED` |

**Distinzione tecnica:** il blocco impedisce la cancellazione anticipata, mentre la regola di ciclo di vita salvata imposta la scadenza. Per la regola di blocco 90 giorni esiste evidenza visiva della configurazione salvata; per la scadenza a 91 giorni esiste lo screenshot del modulo abilitato e la successiva attestazione del custode che la regola è stata riaperta e risultava salvata. Questa è **evidenza di configurazione**, non prova operativa di resistenza alla cancellazione anticipata o dell'effettiva eliminazione al 91° giorno. Non sono stati caricati oggetti reali per provare il ciclo di vita.

**Controllo richiesto:** leggere soltanto le sezioni delle impostazioni R2 relative a regole di blocco e ciclo di vita degli oggetti. Non modificare o rimuovere regole, non aprire credenziali, non avviare upload di dati reali.

**Fonti tecniche:** https://developers.cloudflare.com/r2/buckets/bucket-locks/ e https://developers.cloudflare.com/r2/buckets/object-lifecycles/ .

**Esito complessivo RB-02:** HOLD, anche con giurisdizione UE confermata. Nessuna esportazione reale è autorizzata.

---

## 1. Evidenze ottenute senza accedere ai contenuti

La verifica è stata eseguita mediante **sole interrogazioni aggregate**, senza leggere email, nomi, profili, informazioni sugli studenti, nomi di file o altri contenuti.

| Inventario | Quantità verificata |
|---|---:|
| Identità nello schema `auth` | 4 |
| Spazi di lavoro applicativi | 4 |
| Sessioni didattiche registrate | 6 |
| Oggetti presenti in Supabase Storage | 9 |
| Voci dello storico delle migrazioni | 113 |

Le quantità dimostrano che il progetto non è vuoto, ma **non permettono di distinguere dati inventati da persone reali**. La successiva **attestazione diretta del custode dell'08/11/2026** classifica il perimetro in dati personali propri + fittizi, senza dati reali di terzi dichiarati; questa dichiarazione resta distinta dall'inventario tecnico e non giustifica una classificazione `SYNTHETIC_ONLY`.

**Classificazione conservativa:** trattare tutti i dati come **potenzialmente personali e/o scolastici**, fino a un'attestazione separata della loro natura. Non occorre ispezionare o pubblicare alcuna riga per adottare la misura cautelativa.

## 2. Decisione di trattamento (RB-02)

Prima di autorizzare l'upload di una copia reale su R2 occorre una decisione del soggetto titolato a disporre di tali dati. La decisione deve essere custodita **in sede riservata, non nel repository pubblico**, e attestare almeno:

1. Chi è il titolare del trattamento per le categorie di dati effettivamente presenti; quali soggetti sono autorizzati alla custodia e al recupero.
2. Se gli account, i documenti e le registrazioni riguardano persone reali (docenti, studenti, famiglie) oppure sono esclusivamente dati sintetici; in mancanza di prova, mantenere la classificazione prudenziale.
3. Necessità, finalità e base giuridica della copia di sicurezza; minimizzazione del contenuto effettivamente esportato.
4. Valutazione e approvazione di Cloudflare R2 quale destinazione, inclusi accordi, localizzazione, controlli d'accesso, durata di conservazione, cancellazione e ripristino.
5. Chi può attivare una copia, approvare un ripristino e riesaminare le ricevute; gestione di incidente, compromissione o mancato recupero.
6. Confini di `auth`, `public`, `private`, metadati Storage e **byte dei file Storage**, ruoli, migrazioni e dipendenze gestite. Nessuna delle classi può essere ritenuta automaticamente inclusa nel dump `public`.

Una copia in locale e una copia off-site cifrata non sono equivalenti dal punto di vista della protezione dei dati. La qualificazione tecnica del bucket R2 **con dati fittizi** non costituisce autorizzazione per materiale reale.

### Ricevuta minima, senza dati personali

```text
RB-02 — DECISIONE PRIVACY E BACKUP (senza segreti)
Data: __________
Progetto: Docente OS Beta
Classificazione: DATI SINTETICI ATTESTATI / POTENZIALMENTE PERSONALI / DATI REALI
Funzione autorizzante: __________
Titolarità e ruoli verificati: PASS / HOLD
Destinazione R2 e condizioni contrattuali valutate: PASS / HOLD
Periodo di conservazione e misure di cancellazione approvate: PASS / HOLD
Perimetro dati e motivazione della copia approvati: PASS / HOLD
Attestazione riservata disponibile: SÌ / NO
RB-02: PASS / HOLD
```

Fino a completa attestazione, **`RB-02=HOLD`**. Non acquisire copie dei documenti di autorizzazione nel repository pubblico.

## 3. Custodia della chiave — collaudo completato dal custode (07/11/2026)

L'utente ha successivamente **scelto di usare Termux su due smartphone Android sotto il proprio controllo**, superando la precedente preferenza per il percorso senza Termux. Il programma `age-keygen` del primo telefono presentava un errore; il collaudo interoperabile con `rage-keygen` e `age` è stato eseguito con dati sintetici e ha avuto esito PASS. La chiave privata permanente è custodita nella directory privata del primo smartphone; una copia cifrata `recovery.age` è stata trasferita al secondo. L'utente ha confermato la decifratura autonoma della copia e del testo sintetico di verifica sul secondo dispositivo e, il 07/11/2026, **la conservazione cartacea separata della password**.

**Esito:** `RB-03=PASS_CUSTODIAN_ATTESTED`, con grado di prova esplicitamente basato su screenshot e attestazioni dell'utente. La prova non è una verifica remota dei dispositivi né dimostra la custodia a tempo indeterminato; preservare almeno una copia di recupero cifrata sul secondo smartphone e non esportare mai l'identità privata in chiaro. Le credenziali, la password e la chiave privata non sono state acquisite dal repository.

**Separazione dei requisiti:** il PASS di RB-03 non attribuisce al custode autorizzazioni ulteriori a esportare dati personali/scolastici. `RB-02=HOLD`, fino alla decisione sul trattamento, sulla destinazione R2, sui privilegi e sulla durata di conservazione. `RB-04/05=HOLD` fino alla qualifica tecnica dei processi reali. Il documento di riferimento per i dettagli di custodia resta [P7_DB_KEY_CUSTODY_RECOVERY_PROTOCOL.md](./P7_DB_KEY_CUSTODY_RECOVERY_PROTOCOL.md).

## 4. Stato dei controlli

| Controllo | Esito |
|---|---|
| Collegamento URL pubblico configurato Render Beta→Supabase | `RB-01=PASS_RENDER_PUBLIC_CONFIG` |
| Classificazione prudenziale del contenuto | `ASSUMED_PROTECTED`, senza leggere contenuti |
| Autorizzazione per backup reale su R2 | **RB-02 HOLD** |
| Generazione, custodia e recupero della chiave privata | **RB-03 PASS_CUSTODIAN_ATTESTED** (07/11/2026) |
| Perimetro completo, credenziali di lettura e procedure di recupero | **RB-04/05 HOLD** |
| Copia reale cifrata e ripristino indipendente | **RB-06/07 NON ESEGUITI** |
| Revisione e autorizzazione alla migrazione 0104 | **RB-08 HOLD** |

Non effettuare export Supabase, upload di copie reali su R2, migrazione `0104`, merge su `develop` o deploy Beta a seguito di questo documento.

**Riferimenti:** [P7_DB_REAL_BACKUP_ACTIVATION_GATE.md](./P7_DB_REAL_BACKUP_ACTIVATION_GATE.md), [P7_DB_KEY_CUSTODY_RECOVERY_PROTOCOL.md](./P7_DB_KEY_CUSTODY_RECOVERY_PROTOCOL.md) e [Supabase — Database Backups](https://supabase.com/docs/guides/platform/backups).
