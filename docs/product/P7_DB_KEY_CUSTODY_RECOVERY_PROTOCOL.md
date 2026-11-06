# RB-03 — Protocollo di custodia e recupero della chiave age

**Stato:** `DESIGN_ONLY / KEY_NOT_CREATED / REAL_EXPORT_NOT_AUTHORIZED`.

Il percorso di cifratura con PostgreSQL 17 e la prova off-site R2 sono già qualificati **solo con dati sintetici**. Una chiave di recupero reale non può essere generata esclusivamente nel sistema temporaneo GitHub Actions: alla sua distruzione seguirebbe l'impossibilità di decifrare la copia.

## Responsabilità e collocazione

- **Titolare e soggetti autorizzati:** individuare chi può autorizzare una copia di dati scolastici, chi custodisce la chiave e chi può approvare il recupero. Le persone e le funzioni devono essere registrate **fuori dal repository pubblico**.
- **Identità privata:** generata in un ambiente attendibile scelto e controllato dal custode; custodita al di fuori di GitHub, Cloudflare R2 e dei runner temporanei. Evitare chiavi inserite in chat, issue, cronologie del browser, note pubbliche e log. Preferire almeno due copie protette, in ubicazioni o sistemi distinti, con accesso autorizzato e recupero documentato.
- **Destinatario pubblico:** l'unico materiale crittografico che può essere consegnato al sistema di cifratura GitHub, dopo la sua convalida. Il destinatario pubblico non consente di decifrare gli archivi. Non derivarlo automaticamente creando anche la chiave privata dentro il runner.
- **Indipendenza:** chi possiede le credenziali R2 o GitHub non deve, per ciò solo, disporre anche della chiave privata di decifratura. La custodia deve essere compatibile con l'organizzazione e le autorizzazioni privacy.
- **Rinnovamento e compromissione:** documentare cosa accade in caso di perdita o sospetta esposizione della chiave. Sostituire il destinatario pubblico non rende automaticamente nuovamente cifrati gli archivi esistenti.

## Collaudo preliminare obbligatorio, senza dati scolastici

1. Il custode verifica che il proprio ambiente affidabile possa generare una coppia age. I due valori sono diversi: **recipient (pubblico)** e **identity (privato)**.
2. Il custode conserva l'identità privata nel proprio spazio protetto e una copia di recupero separata, senza inviarla a GitHub né a ChatGPT.
3. Usando il solo destinatario pubblico, si cifra un piccolo file senza dati personali con un processo separato dal luogo di custodia.
4. Il custode prova la decifratura nel proprio ambiente utilizzando la copia conservata e confronta l'esatto contenuto originale.
5. Si verifica anche che una identità diversa non possa decifrare il file. Eventuali errori impediscono di considerare pronta la gestione della chiave.
6. La ricevuta, senza identità privata né testo originale, documenta soltanto: data, funzione del custode, metodo di custodia, esito del recupero **PASS/FAIL**, tipo e versione dello strumento, identificatore non sensibile della prova.
7. Solo quando il collaudo è PASS il destinatario pubblico può essere configurato nel processo futuro e sottoposto a revisione.

## Attuazione operativa: custode responsabile, mai GitHub

**Decisione di progettazione (06/11/2026):** il sistema GitHub può preparare controlli e cifrare verso un destinatario pubblico, ma non può assumere il ruolo di custode della chiave privata. La generazione e la custodia sono operazioni **organizzative**, da svolgere in un ambiente fidato sotto responsabilità del titolare dei dati. Per dati scolastici occorrono le autorizzazioni pertinenti. Per un progetto personale, il titolare può essere anche il custode, con metodo Android senza PC descritto in [P7_RB03_PERSONAL_ANDROID_CUSTODY.md](./P7_RB03_PERSONAL_ANDROID_CUSTODY.md); questa scelta **non** autorizza l'esportazione di dati scolastici. Non è autorizzata la delega implicita a ChatGPT, runner CI, Render, Supabase o R2.

**Sequenza obbligatoria, senza dati scolastici:**

1. **Nomina e autorizzazione esterna.** Il titolare individua le funzioni di custode primario e sostituto e autorizza un ambiente affidabile (postazione istituzionale protetta, cifratura del dispositivo, controlli d'accesso e copie di recupero non sincronizzate involontariamente). I nominativi, l'ubicazione precisa e l'eventuale modalità di sblocco NON vanno pubblicati nel repository.
2. **Creazione locale.** Il custode genera un'identità `age` originale esclusivamente nel proprio ambiente, verifica lo strumento installato e ricava il destinatario pubblico con `age-keygen -y`. La chiave privata non deve mai passare da servizi web di generazione, terminali remoti gestiti da terzi, sistemi CI, allegati, chat o registrazioni video.
3. **Due copie recuperabili.** Il custode conserva una copia protetta primaria e una copia protetta di recupero, in sistemi/ubicazioni separati con autorizzazioni di accesso esplicite. Un secondo file nello stesso percorso, oppure nello stesso account cloud, **non** soddisfa l'indipendenza. Devono essere documentate la possibilità di accesso in caso d'assenza del primo custode e la procedura di revoca.
4. **Prova dal recupero, non dall'originale.** Il custode preleva la *copia di recupero* e usa un file di prova privo di dati personali. La verifica del binomio destinatario/identità, dell'impronta del contenuto ripristinato e del rifiuto di una chiave estranea è obbligatoria. Il recupero deve essere dimostrato senza dipendere da GitHub né dal bucket R2.
5. **Attestazione fuori dai segreti.** Il custode registra una ricevuta con soli esiti non sensibili; la responsabilità e l'autorizzazione restano archiviate nel sistema documentale riservato del titolare. Solo dopo review della ricevuta è possibile proporre `RB-03=PASS`. La prova resta separata dalle successive autorizzazioni privacy `RB-02` e operative `RB-04/05`.

### Verificatore locale (nessuna chiave reale nel repository)

È disponibile `.github/scripts/p7-rb03-local-custody-check.sh`. Il verificatore è pensato **solo** per il custode su ambiente locale fidato: non installa strumenti, non usa la rete, non carica file e non crea backup scolastici. Richiede `age`, `age-keygen`, `sha256sum` e Bash. Legge l'identità privata già esistente **dal percorso locale indicato**, senza modificarla o copiarla. Crea e cancella solo materiale di test sintetico in una directory temporanea con permessi restrittivi.

```bash
# Controllo preventivo esclusivamente sintetico (utilizzabile anche in CI).
bash .github/scripts/p7-rb03-local-custody-check.sh --self-test

# Solo il custode, sul dispositivo autorizzato e usando la copia RECUPERATA:
# Sostituire i segnaposto localmente; NON incollare chiavi in chat o GitHub.
bash .github/scripts/p7-rb03-local-custody-check.sh --check \
  /percorso/protetto/copia-recuperata.agekey 'age1DESTINATARIO_PUBBLICO'
```

Il verificatore rifiuta espressamente la modalità `--check` in GitHub Actions; controlla che il destinatario sia derivabile dalla copia recuperata, cifra solo una stringa fittizia, verifica l'impronta del testo decifrato *in condotto* e rifiuta una chiave errata. L'eventuale messaggio `RB03_OFFLINE_RECOVERY_COPY_TEST_PASS` qualifica **soltanto il test crittografico locale**: non prova autonomamente che la copia risieda in un luogo indipendente, sia effettivamente recuperabile dal sostituto o che il trattamento dei dati sia stato autorizzato. La verifica dell'indipendenza è una responsabilità umana separata.

Il verificatore supporta una **identità age nativa** leggibile dal programma; se il custode usa una custodia con chiave avvolta/cifrata o un dispositivo hardware, la decifratura e il controllo devono essere adattati e verificati con un protocollo equivalente, senza disattivare la protezione scelta.

### Ricevuta minimale da registrare (mai allegare la chiave)

```text
RB-03 RECOVERY RECEIPT — NO SECRETS
Data e ora (fuso): __________________
Identificativo non personale della prova: __________________
Versione age / sistema custodiale: __________________
Funzione autorizzante (senza nominativi pubblici): __________________
Funzione custode primario / sostituto: __________________
Due collocazioni protette e distinte (categorie soltanto): SÌ / NO
Recupero da seconda copia anziché dall'originale: SÌ / NO
Verifica indipendenza da GitHub e R2: PASS / FAIL
Verifica destinatario ↔ copia recuperata: PASS / FAIL
Decifratura contenuto sintetico e digest: PASS / FAIL
Rifiuto identità estranea: PASS / FAIL
Riservatezza, accessi, sostituzione e revoca documentati: SÌ / NO
Attestazione custodiale in archivio riservato: SÌ / NO
Valutazione finale RB-03: HOLD / PASS
```

**Regola di fallimento:** qualunque risposta negativa, prova non verificabile o assenza della responsabilità autorizzata mantiene `RB-03=HOLD`. Anche con `RB-03=PASS`, nessuna esportazione reale parte senza approvazione separata dei gate `RB-02`, `RB-04` e `RB-05`.

### Smarrimento, sostituzione, conservazione

- Conservare la chiave recuperabile per tutta la vita degli archivi cifrati che ne dipendono, secondo una decisione formale del titolare, distinta dal tempo di conservazione dei backup.
- In caso di compromissione, sospendere l'uso del destinatario, valutare l'esposizione degli archivi già prodotti e definire un piano di nuova cifratura sotto una nuova chiave. **La rotazione del solo destinatario non ricifra le copie precedenti.**
- Prevedere un collaudo periodico di recupero e una verifica dopo ogni cambio di custode o sistema, mantenendo lo storico delle ricevute nel luogo riservato.

## Criterio di accettazione RB-03

`RB-03=PASS` soltanto dopo **generazione e custodia indipendente**, prova di recupero condotta dal custode e attestazione della responsabilità. Al momento tutti questi passaggi restano `PENDING`. Il profilo personale Android prevede Termux come *possibile ambiente locale*, senza richiedere un PC, e non autorizza a generare chiavi da GitHub. Gli altri profili non sono obbligati a usare Termux; lo strumento impiegato dal custode deve essere realmente disponibile e qualificato. Un sito arbitrario per la generazione delle chiavi non è un'alternativa sicura.

## Divieti

Non inserire l'identità privata age in file del repository, secret GitHub, bucket R2, log di esecuzione, messaggi ChatGPT o immagini condivise. Nessun passaggio su dati reali è autorizzato da questo documento.

**Fonti tecniche:** [age — guida ufficiale](https://github.com/FiloSottile/age/blob/main/README.md) e [age-keygen — manuale](https://github.com/FiloSottile/age/blob/main/doc/age-keygen.1.ronn).
