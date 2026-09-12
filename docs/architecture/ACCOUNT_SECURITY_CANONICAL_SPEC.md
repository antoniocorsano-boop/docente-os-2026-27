# DOCENTE OS — Account e sicurezza — Specifica canonica di sviluppo

Data: **2026-09-12**  
Stato: **CANONICAL / IMPLEMENTED IN PR #348 / NOT YET INTEGRATED**  
Ambito: autenticazione applicativa, account management, MFA, password, sessioni

## 1. Decisione architetturale

La gestione account è una capability applicativa separata dal dominio professionale del docente.

L'autorità sull'identità e sulle credenziali resta **Supabase Auth**. DOCENTE OS espone una superficie di gestione governata, ma non replica password, segreti TOTP, token o stato auth in una seconda sorgente di verità applicativa.

## 2. Confini

### Dentro il perimetro

- identità email dell'utente autenticato;
- stato dei fattori TOTP verificati;
- assurance level della sessione;
- enrollment e rimozione di fattori ridondanti;
- cambio password;
- revoca delle altre sessioni;
- logout della sessione corrente;
- redirect sicuri tra login, callback, MFA e password setup.

### Fuori perimetro

- profilo docente professionale;
- dati anagrafici scolastici;
- ruoli amministrativi multiutente;
- recovery code non supportati dal provider;
- gestione provider da pannello interno;
- storage locale di credenziali o fattori.

## 3. Rotte canoniche

- `/account` — centro account autenticato;
- `/account/mfa` — gestione dei fattori TOTP;
- `/mfa` — challenge/enrollment per promozione della sessione ad AAL2;
- `/imposta-password?source=email` — prima impostazione password dopo email verificata e AAL2;
- `/imposta-password?source=recovery` — recupero password dopo AAL2;
- `/imposta-password?source=account` — cambio password dalla superficie Account;
- `/auth/confirm` — callback email/OTP e creazione della sessione AAL1;
- `/auth/signout` — terminazione sessione corrente.

Le rotte auth esenti dal gate globale MFA restano esenti solo per poter completare il protocollo di autenticazione. L'esenzione di rotta non costituisce autorizzazione a mutare la password.

## 4. Invarianti di sicurezza

1. Una sessione operativa richiede **AAL2**.
2. Ogni mutazione password richiede **AAL2**, indipendentemente dalla sorgente `email`, `recovery` o `account`.
3. Un parametro URL non costituisce prova di autorizzazione.
4. I return path MFA sono same-origin e normalizzati.
5. Le destinazioni password ammesse devono essere esatte: un solo parametro `source` con valore previsto.
6. `/api/*` non può essere usato come destinazione di ritorno MFA.
7. L'ultimo fattore TOTP verificato non può essere rimosso dalla superficie di gestione.
8. Nessun segreto TOTP, password o token deve essere scritto nei log o nelle receipt.
9. Il client non è autorità di sicurezza: i guard sensibili devono esistere lato server quando l'operazione modifica lo stato dell'account.
10. Il workspace applicativo non viene usato come prova dell'identità auth.

## 5. Flussi canonici

### Login ordinario

`password → sessione AAL1 → /mfa → TOTP valido → AAL2 → superficie richiesta`

### Primo accesso email

`callback email valida → AAL1 → /mfa?next=/imposta-password?source=email → AAL2 → setPassword → workspace`

### Recovery

`callback recovery valida → AAL1 → /mfa?next=/imposta-password?source=recovery → AAL2 → setPassword → workspace`

### Cambio password da account

`/account → /imposta-password?source=account → guard AAL2 → updateUser(password) → /account?password=updated`

### Gestione MFA

`/account/mfa → listFactors → enroll → challenge → verify → refresh factors`

La rimozione è consentita soltanto quando il numero dei fattori verificati resta almeno pari a uno.

### Sessioni

- revoca delle altre sessioni usa il contratto provider senza invalidare quella corrente;
- logout corrente passa dalla rotta server dedicata.

## 6. Policy di redirect

`normalizeMfaNextPath` è il boundary canonico per le destinazioni post-MFA.

Sono ammessi:

- percorsi applicativi same-origin non API;
- le sole destinazioni password esenti esplicitamente autorizzate per `email`, `recovery`, `account`.

Sono respinti:

- URL assoluti esterni;
- protocol-relative URL;
- auth callback arbitrarie;
- API;
- `/imposta-password` senza sorgente valida;
- parametri aggiuntivi nelle destinazioni password;
- sorgenti sconosciute.

Il fallback sicuro resta la destinazione autenticata canonica definita nella policy MFA.

## 7. Contratto `setPassword`

L'azione server deve:

1. normalizzare e validare `source`;
2. validare robustezza minima e conferma password;
3. recuperare le claims lato server;
4. richiedere `hasAal2(claims)` per tutte le sorgenti ammesse;
5. respingere sorgente assente o sconosciuta;
6. invocare `supabase.auth.updateUser({ password })` soltanto dopo i guard;
7. non registrare mai la password;
8. riportare l'utente a una destinazione coerente con la sorgente.

## 8. Contratto MFA management

Il gestore MFA può eseguire mutazioni client-side tramite SDK Auth solo all'interno di una superficie già protetta AAL2.

Vincoli:

- fattori iniziali caricati dal server quando possibile;
- fattori non verificati precedenti vengono trattati come enrollment incompleti, non come fattori attivi;
- `challenge` e `verify` sono entrambi necessari;
- il secret è mostrato soltanto durante l'enrollment corrente;
- il controllo “non rimuovere l'ultimo fattore” deve avere test di policy;
- l'eventuale hardening provider-side futuro non deve cambiare il contratto di esperienza.

## 9. Contratto di navigazione

`Account e sicurezza` è una destinazione canonica dell'AppShell distinta da `Impostazioni`.

Non è ammesso riutilizzare `active="settings"` per la superficie Account. La navigazione deve rendere percepibile la differenza tra sicurezza dell'identità e configurazione professionale.

## 10. Testing minimo obbligatorio

Ogni modifica alla capability deve coprire almeno:

- policy AAL1/AAL2;
- exact password continuation per `email`, `recovery`, `account`;
- rifiuto di URL esterni, API e parametri aggiuntivi;
- preservazione di almeno un fattore MFA verificato;
- presenza separata della destinazione Account nella navigazione;
- typecheck;
- lint;
- build;
- browser MFA governato quando la fixture provider è disponibile e coerente.

Modifiche UI richiedono inoltre i gate Human/Visual, mobile e accessibility applicabili.

## 11. Fixture e segreti di collaudo

La fixture E2E MFA è un asset governato separato dal codice.

Regole:

- email, password e seed TOTP della fixture non devono comparire in documentazione pubblica o receipt;
- GitHub Actions secrets restano fuori dal repository e dalla conversazione;
- un `invalid_credentials` prima della challenge MFA deve essere classificato come problema di fixture/credential synchronization finché non esiste evidenza contraria;
- non si introducono bypass, credenziali hardcoded o skip per ottenere un gate verde.

## 12. Relazione con ASVS

Questa capability si appoggia alla closure già documentata di **ASVS V6.3.3** per MFA e session assurance, ma non trasforma tale closure in dichiarazione ASVS L2 complessiva.

Una modifica futura che cambi autenticazione, sessione, password policy o gestione fattori deve aggiornare:

- `ASVS_5_0_ASSURANCE_CANONICAL.md` quando cambia l'interpretazione del requisito;
- `ops/asvs50-assurance.json` quando cambia lo stato machine-readable;
- receipt provider/runtime quando necessarie.

## 13. Stato di integrazione

Al 12 settembre 2026:

- foundation MFA: PR **#346**, ancora da stabilizzare/integrate secondo i gate final-head;
- Account e sicurezza: PR **#348**, impilata su #346;
- issue prodotto: **#347**;
- questa specifica descrive il contratto implementato su branch, non una capability già presente in `develop` o Production.

## 14. Regola per gli agenti di sviluppo

Prima di modificare Account/auth/MFA/password/sessioni leggere, in ordine:

1. `docs/product/PROJECT_STATUS_CURRENT.md`;
2. `docs/product/ASVS_5_0_ASSURANCE_CANONICAL.md`;
3. questo documento;
4. `docs/product/ACCOUNT_SECURITY_EXPERIENCE_CONTRACT.md`;
5. `docs/architecture/ADR-001-product-stack.md`;
6. `docs/architecture/ADR-002-experience-platform.md`;
7. `docs/product/DOCENTE_OS_PRODUCT_EXPERIENCE_MASTERPLAN.md`;
8. Human Interaction Model e Design System per modifiche di interfaccia.

Nessun agente deve creare una seconda policy auth parallela quando il comportamento può essere espresso estendendo i boundary canonici esistenti.