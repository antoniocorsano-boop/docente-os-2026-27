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

## Criterio di accettazione RB-03

`RB-03=PASS` soltanto dopo **generazione e custodia indipendente**, prova di recupero condotta dal custode e attestazione della responsabilità. Al momento tutti questi passaggi restano `PENDING`. Non è necessario installare Termux, ma l'applicazione che custodisce la chiave deve essere realmente disponibile e qualificata; un servizio web arbitrario per la generazione della chiave non è un'alternativa sicura.

## Divieti

Non inserire l'identità privata age in file del repository, secret GitHub, bucket R2, log di esecuzione, messaggi ChatGPT o immagini condivise. Nessun passaggio su dati reali è autorizzato da questo documento.

**Fonti tecniche:** [age — guida ufficiale](https://github.com/FiloSottile/age/blob/main/README.md) e [age-keygen — manuale](https://github.com/FiloSottile/age/blob/main/doc/age-keygen.1.ronn).
