# RB-03-PERSONAL-ANDROID — Custodia indipendente della chiave di recupero senza PC

**Decisione di metodo (06/11/2026):** `PERSONAL_ANDROID_CUSTODY_DESIGN_READY / NO_REAL_KEY_CREATED / RB-03=HOLD`.

**Perimetro:** metodo per l'amministratore/custode di un *progetto personale* che dispone di uno smartphone Android affidabile. Non richiede PC, licenze a pagamento, credenziali inviate in chat o accesso a GitHub/Cloudflare R2 per decifrare. Il custode esegue personalmente, sul proprio dispositivo, le operazioni locali di creazione e recupero. Questo documento **non** avvia la generazione della chiave.

**Vincolo sui dati:** la qualificazione del progetto come «personale» non rende automaticamente personali o liberamente esportabili i dati scolastici eventualmente presenti in Supabase. L'autorizzazione privacy e la destinazione dei dati reali restano soggette a `RB-02=HOLD` indipendentemente da `RB-03`.

## 1. Decisione architetturale

- **Origine privata locale:** `age` su Android tramite Termux aggiornato da una fonte attendibile; identità segreta generata *sul telefono*, non in un runner CI o servizio web. Il file non cifrato resta confinato nella directory privata di Termux con permessi restrittivi. Proteggere il telefono con blocco robusto, cifratura del dispositivo, sistema aggiornato e senza accesso root o applicazioni inaffidabili.
- **Destinatario pubblico:** `age1...` derivato sul dispositivo; è l'**unico** elemento trasferibile in seguito al processo di cifratura, dopo controllo e governance. Non contiene la chiave privata.
- **Copia principale:** identità privata nella directory privata di Termux, accessibile soltanto al custode sul dispositivo protetto; non è sufficiente da sola, perché la rimozione dell'app o la perdita del telefono potrebbero distruggerla.
- **Copia di recupero indipendente:** stessa identità **cifrata localmente con una passphrase robusta e distinta** usando `age -p`, conservata come file `.age` su Google Drive personale o altro spazio dell'utente **diverso** da GitHub e R2. Il cloud vede solo il cifrato, mai la chiave privata in chiaro. Una copia nell'archivio del telefono e quella su Drive contano come due collocazioni; due file nella stessa cartella/nel solo telefono no.
- **Terza copia consigliata:** un supporto USB-C/OTG custodito separatamente con il **solo file cifrato** (non obbliga all'acquisto se non disponibile). È un ulteriore presidio contro la contemporanea perdita del telefono e l'indisponibilità di Drive.
- **Passphrase di recupero:** non deve stare accanto ai file cifrati, nei messaggi, in GitHub, in R2 o in una nota Drive dello stesso account. Il custode ne conserva un promemoria **separato** e protetto, senza comunicarlo a ChatGPT. Se si perde anche la passphrase, la copia cifrata può diventare inutilizzabile.
- **Indipendenza effettiva:** l'accesso al Google Drive scelto e alla passphrase deve essere possibile anche dopo la perdita del telefono; verificare le modalità di recupero dell'account senza dipendere esclusivamente dall'autenticatore o dai codici contenuti nello stesso telefono.

**Alternativa:** se il custode preferisce una cassaforte KeePassDX `.kdbx`, può importare l'identità `age` come allegato testuale o nota protetta, e copiarne il file cifrato in un'ubicazione indipendente. Questa alternativa va **collaudata separatamente** (compresa l'estrazione e il confronto dell'identità da una copia di recupero); non è un percorso già qualificato.

## 2. Preparazione su Android (nessuna chiave trasmessa)

Prerequisiti verificabili dal custode: Termux affidabile già disponibile o installato da fonte ufficiale, pacchetto `age` presente, permessi Android consapevoli, connessione al proprio spazio di archiviazione solo per trasferire il **file già cifrato**. Non eseguire comandi copiati da siti sconosciuti; non attivare registrazione dello schermo, registrazione della sessione o tracciamento shell `set -x`.

I seguenti comandi sono **istruzioni per il custode sul suo smartphone**, non comandi da eseguire nei workflow CI o da ChatGPT. Richiedono una decisione esplicita del custode prima di creare l'identità:

```bash
# Sullo smartphone e soltanto dopo avere predisposto i luoghi di custodia:
pkg install age
umask 077
KEY_DIR="$HOME/.local/share/docente-os/rb03"
mkdir -p "$KEY_DIR" && chmod 700 "$KEY_DIR"

# Impedisce una rigenerazione accidentale che sovrascriverebbe l'identità.
test ! -e "$KEY_DIR/identity.agekey" || { echo "RB03_BLOCKED: identity exists"; exit 1; }
age-keygen -o "$KEY_DIR/identity.agekey"
age-keygen -y "$KEY_DIR/identity.agekey" > "$KEY_DIR/recipient.txt"

# La passphrase viene richiesta INTERATTIVAMENTE sul telefono.
# Non passarla come parametro, variabile d'ambiente, testo di chat o log.
age -p -o "$KEY_DIR/identity.agekey.age" "$KEY_DIR/identity.agekey"
test -s "$KEY_DIR/identity.agekey.age" && echo "RB03_LOCAL_ENCRYPTED_COPY_READY"
```

La creazione avviene offline, dopo l'eventuale installazione iniziale del software. **Non inviare qui l'output, il file identity o la passphrase.** Se il comando fallisce, conservare il blocco `RB-03=HOLD`.

## 3. Deposito della copia cifrata e recupero senza PC

1. **Consegna cifrata soltanto:** concedere l'accesso di Termux alla cartella condivisa Android *solo se necessario* (`termux-setup-storage`). Copiare il solo `identity.agekey.age` nella cartella condivisa e caricarlo in Google Drive con l'app Android. La copia di lavoro nella cartella condivisa va eliminata dopo verifica; **non** copiare `identity.agekey` (non cifrato), `recipient.txt` è pubblico.
2. **Seconda collocazione:** conservare il file cifrato nel proprio Google Drive o in un archivio indipendente; annotare fuori dal repository quale sistema contiene la copia. Eventuale terza copia cifrata su supporto OTG separato, senza passphrase nello stesso supporto.
3. **Prova reale della copia di recupero:** scaricare da Drive sul telefono il file cifrato appena depositato, come nuova copia distinta dall'originale, e riporlo nella directory privata di Termux. Usare `age -d` **con passphrase inserita interattivamente** per estrarre l'identità recuperata nella cartella privata, senza stamparla sullo schermo o negli output.
4. **Prova crittografica:** confrontare il destinatario pubblico derivato dalla copia recuperata con `recipient.txt` e decifrare un contenuto sintetico. Se il repository è disponibile in Termux in versione attendibile, usare il verificatore `.github/scripts/p7-rb03-local-custody-check.sh --check`, indicando **il file recuperato**, mai l'originale. Esito necessario: `RB03_OFFLINE_RECOVERY_COPY_TEST_PASS` con rifiuto della chiave errata.
5. **Pulizia controllata:** rimuovere dai percorsi condivisi i file non necessari e le identità recuperate temporaneamente; mantenere solo l'identità principale nella directory privata e le copie **cifrate** su destinazioni designate. La cancellazione di file dalla memoria flash non garantisce da sola una cancellazione fisica irreversibile; evitare fin dall'inizio di collocare il file privato in chiaro su memoria condivisa.
6. **Recupero dopo perdita del telefono:** prima di dichiarare PASS, documentare come accedere alla copia cifrata e alla passphrase da un altro dispositivo affidabile. Preferibile provare su un altro Android, senza usare PC; se non disponibile, segnalare esplicitamente che il recupero in caso di perdita totale del telefono **non è stato collaudato su secondo dispositivo**.

**Vietati:** esportare la chiave privata in chiaro sul cloud, allegarla in chat/issue/PR, inserirla in GitHub Secrets o R2, usare servizi web arbitrari di generazione/decifratura, far eseguire `--check` sui runner GitHub, o considerare la prova locale come autorizzazione a trattare dati scolastici.

## 4. Ricevuta minimale (senza segreti, nessun automatismo di PASS)

```text
RB03_PERSONAL_ANDROID_CUSTODY
Ambito: progetto personale (DATO SCOLASTICO PRESENTE? VERIFICARE IN RB-02)
Custode: amministratore personale (identità non pubblicata)
Android locale protetto e age verificato: SÌ/NO
Identità age generata solo in locale: SÌ/NO
Copia originale privata accessibile: SÌ/NO
Copia cifrata indipendente da GitHub/R2: SÌ/NO
Passphrase separata dai file cifrati: SÌ/NO
Recupero da copia SCARICATA (non dall'originale): PASS/FAIL
Destinatario ↔ identità recuperata: PASS/FAIL
Decifratura di testo sintetico e chiave errata: PASS/FAIL
Recupero possibile senza telefono originale: DIMOSTRATO / PROCEDURA DOCUMENTATA / NON DIMOSTRATO
Versione age: __________
Data prova e riferimento non sensibile: __________
Verdetto: RB-03=HOLD / RB-03=PASS_CONDIZIONATO_A_HUMAN_REVIEW
```

Senza prove e ricevuta firmata o convalidata dal custode, il verdetto rimane `HOLD`. In ogni caso `RB-02`, `RB-04`, `RB-05` e la revisione prima del DDL `0104` rimangono separati e non autorizzati da RB-03.

## 5. Fonti e limiti

- [age, manuale ufficiale](https://github.com/FiloSottile/age/blob/main/README.md): generazione di identità e cifratura con destinatario.
- [Pacchetto age per Termux](https://github.com/termux/termux-packages/blob/master/packages/age/build.sh): presenza di `age` e `age-keygen`.
- [KeePassDX, documentazione del progetto](https://github.com/Kunzisoft/KeePassDX/wiki/Attachments): solo alternativa, nessuna dipendenza obbligatoria.

**Stato canonico:** progettazione mobile disponibile; nessun deposito, test di recupero sul telefono, attestazione di accesso alternativo, modifica alle credenziali o backup reale è stato compiuto da GitHub/ChatGPT. `RB-03=HOLD`.
