# DOCENTE OS — Recovery Runbook

Data baseline: 2026-08-24
Stato: OPERATIONAL HARDENING P2

## Obiettivo

Ripristinare DOCENTE OS senza confondere tre piani distinti:

1. **Database/Auth** — schema, dati PostgreSQL, utenti Auth, RLS, funzioni e migrazioni.
2. **Storage** — oggetti binari reali del bucket `knowledge-assets`.
3. **Applicazione** — codice GitHub e runtime Render.

Un backup del database non è sufficiente per ricostruire gli oggetti Storage cancellati: il database conserva i metadati, non una seconda copia dei file.

## Baseline verificata sul Beta

Manifest catturato il 2026-08-24 19:29:25 UTC:

- utenti Auth: 3;
- workspace: 2;
- anni scolastici: 2;
- planner task: 17;
- knowledge assets: 66;
- knowledge documents: 62;
- knowledge processing generations: 65;
- assistant write proposals: 36;
- authored documents: 0;
- authored document versions: 0;
- bucket Storage: 1 (`knowledge-assets`);
- oggetti Storage: 30;
- dimensione registrata nei metadati Storage: 5,052,771 byte;
- migrazioni applicate: 33, ultima `operational_security_hardening`.

Questi numeri sono una fotografia di controllo, non valori che un restore futuro deve necessariamente replicare: il confronto va eseguito contro il manifest catturato immediatamente prima del backup/restore da provare.

## Strategia di backup

### Database/Auth

La strategia ammessa deve essere una delle seguenti, scelta in base al piano Supabase effettivo:

- backup gestito Supabase / PITR, se disponibile e abilitato;
- dump logico con Supabase CLI `db dump` se il piano non offre una retention gestita adeguata.

Non assumere che un backup esista soltanto perché il progetto è attivo. Prima della produzione deve essere verificata la disponibilità reale della retention e deve esistere almeno una prova di restore su ambiente isolato.

### Storage

Gli oggetti del bucket `knowledge-assets` devono avere una strategia separata dal backup PostgreSQL. Prima della produzione occorre una copia esportabile/off-site o una procedura automatizzata equivalente. Il restore del database da solo non ricrea file Storage rimossi dopo il punto di backup.

### Codice e configurazione applicativa

- codice e migrazioni: GitHub;
- runtime canonico Beta: Render;
- segreti/variabili di ambiente non fanno parte di un dump PostgreSQL e devono avere un inventario amministrativo separato;
- eventuali Auth/SMTP/provider settings devono essere ricostruibili anche dopo un progetto Supabase nuovo.

## Procedura di restore rehearsal

La prova deve essere eseguita su un progetto/branch Supabase isolato, mai ripristinando distruttivamente il Beta canonico.

1. Catturare il manifest pre-backup: conteggi DB/Auth + inventario Storage.
2. Creare il backup/dump secondo la strategia disponibile.
3. Creare un ambiente Supabase isolato.
4. Ripristinare schema e dati.
5. Eseguire `product/supabase/recovery/verify_restore.sql`.
6. Verificare che:
   - utenti Auth e workspace siano presenti;
   - migrazioni attese siano presenti;
   - RLS e RPC critiche siano presenti;
   - `anon` non riottenga `EXECUTE` sulle RPC X5;
   - i conteggi delle entità critiche coincidano con il manifest del backup;
   - i metadati Storage coincidano con l'inventario atteso.
7. Ripristinare/copiare separatamente gli oggetti Storage e verificare che il numero oggetti e la dimensione complessiva siano coerenti.
8. Collegare un runtime di prova all'ambiente ripristinato.
9. Eseguire almeno login, K1 Knowledge, X3 read-only, X4 Planner e X5 authoring.
10. Distruggere l'ambiente di rehearsal al termine.

## Account recovery

Il flusso applicativo autorizzato è:

`Ho dimenticato la password → resetPasswordForEmail → callback recovery → sessione verificata → nuova password`

Invarianti:

- il recovery non deve creare nuovi utenti;
- la risposta alla richiesta non deve rivelare se l'indirizzo esiste;
- una sessione recovery non deve offrire il bypass “continua senza modificare la password”;
- la password non viene salvata in chiaro da DOCENTE OS;
- leaked-password protection resta una configurazione Supabase da verificare/abilitare quando il piano lo consente.

## Gate P2

P2 non è `PASS` finché non sono vere entrambe le condizioni:

1. recovery account applicativo verificato;
2. restore rehearsal su ambiente isolato completato con DB/Auth + Storage e gate funzionali.

Il solo manifest di recovery è `PREPARED`, non prova di restore.
