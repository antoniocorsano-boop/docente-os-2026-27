# CURR-DELIVERY-02C — Lettura privata Arena da Google Drive

**Perimetro:** soltanto il progetto Supabase di collaudo `gnshgapmwyjamhmlikeg` e un workspace personale di cui l'utente autenticato è proprietario. Non modifica il progetto Docente OS Production.

## Motivazione
Il trasferimento binario diretto tra connettori ChatGPT e Supabase non è disponibile come azione autorizzata. L'interfaccia non deve imporre un caricamento manuale. È quindi implementato un percorso di **consultazione diretta dal Drive privato** che riutilizza l'OAuth già presente in Docente OS. La copia resta in Google Drive: questa PR **non sostiene** di averla trasferita in Supabase Storage.

## Vincoli del prototipo
- La richiesta Google `purpose=arena` include `drive.readonly`, solo mediante consenso esplicito, con PKCE e tokens cifrati dal meccanismo già esistente. La normale connessione per il diario conserva gli scope precedenti.
- Il server verifica sessione Supabase, proprietario del workspace personale, identità corrispondente dell'account Google, assegnazione di Tecnologia e progetto sperimentale preciso; altri workspace o la produzione falliscono chiusi.
- La sorgente è l'**ID fisso della copia privata canonica**, non una URL o un file indicato dal browser. Le richieste sono esclusivamente in lettura. Il server verifica 725.968 byte e l'impronta SHA-256 `2d34d69a8e3e4df92b2282d0b232353bfe9fd0174ed3335ca0cae878184c9998` prima di interpretare il curricolo.
- Quando le variabili dell'archivio Storage sono configurate, prevale **sempre** il canale privato Storage già presente nella PR #788: il fallback Google non aggira RLS o una revoca.
- Nessun contenuto del master o credenziale viene inserito nel repository, nessuna scrittura curricolare, nessuna adozione istituzionale, nessun dato alunno.

## Prove
`tsx --test src/core/infrastructure/google/arena-provisional-drive-source.test.ts` e suite generale `npm test`; inoltre collaudo autenticato personale da smartphone e desktop, negazioni account diverso, SHA errato, scope non concesso, master assente, sconfinamento produzione.

## Stato di attuazione
Questa PR crea il **percorso applicativo**, non verifica ancora un token OAuth Google reale nel progetto di collaudo. Nella tabella `google_oauth_connections` risultavano zero connessioni al 21/11/2026. Occorre configurazione OAuth Google già prevista dal prodotto e **un consenso personale al nuovo scope**, non upload manuale. Fino ad allora: `NOT_CONFIGURED`, mai `AVAILABLE` simulato.

## Separazione adozione
L'integrazione è un prototipo personale. Quando si proporrà il prodotto a un istituto scolastico, identità, fonte, ruoli, contratto di delivery e autorizzazioni saranno rivalutati; la sperimentazione non equivale a delibera.
