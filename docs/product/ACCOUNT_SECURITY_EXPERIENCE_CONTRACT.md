# DOCENTE OS — Account e sicurezza — Contratto canonico di esperienza

Data: **2026-09-12**  
Stato: **CANONICAL / IMPLEMENTED IN PR #348 / NOT YET INTEGRATED**  
Classificazione M5: **PROFESSIONAL_GAP_CONFIRMED**

## 1. Scopo

La superficie **Account e sicurezza** governa esclusivamente l'identità di accesso del docente e i controlli connessi alla sicurezza della sessione.

Non è un'estensione delle Impostazioni professionali e non gestisce istituto, classi, discipline, cattedra, orario o preferenze didattiche.

La distinzione canonica è:

- **Account e sicurezza** → identità digitale, password, MFA, sessioni, uscita;
- **Impostazioni** → contesto professionale del docente;
- **workspace didattici** → contenuti, progettazione, classi, diario e lavoro scolastico.

## 2. Domanda a cui deve rispondere

La superficie deve permettere al docente di capire, senza linguaggio tecnico non necessario:

> **Con quale account sono entrato, quanto è protetta la sessione e dove posso gestire password, secondo fattore e sessioni attive?**

## 3. Informazioni primarie

La vista principale `/account` deve mostrare:

1. **identità di accesso** — email dell'utente autenticato;
2. **stato MFA** — presenza dei fattori TOTP verificati e stato della sessione;
3. **password** — accesso al cambio password protetto;
4. **sessioni** — revoca delle altre sessioni e uscita dalla sessione corrente;
5. collegamento esplicito alle **Impostazioni professionali**, senza confondere i due domini.

La superficie non deve mostrare password, segreti TOTP persistenti, token di sessione o metadati interni non necessari.

## 4. Gerarchia delle azioni

### Cambio password

Il cambio password dall'account è un'azione sensibile e richiede una sessione **AAL2**.

Flusso canonico:

`Account → Cambia password → eventuale MFA → nuova password → conferma → Account`

Il prodotto non chiede di reinserire o mostrare la password corrente se il provider di autenticazione non lo richiede per il contratto adottato.

### Gestione MFA

La gestione dei fattori avviene in `/account/mfa`.

Regole:

- l'utente può aggiungere un nuovo autenticatore TOTP;
- il nuovo fattore diventa utilizzabile solo dopo challenge e verifica;
- una configurazione incompleta può essere annullata;
- l'ultimo fattore TOTP verificato non può essere rimosso dalla UI;
- il QR è il percorso principale di enrollment;
- la chiave manuale è fallback esplicito durante l'enrollment, non informazione persistente da riesporre in seguito;
- non vengono inventati recovery code se il provider non li fornisce.

### Gestione sessioni

Sono distinte due azioni:

- **Revoca le altre sessioni** → mantiene attiva la sessione corrente;
- **Esci da questa sessione** → termina la sessione corrente.

Le due azioni non devono essere fuse in un unico controllo ambiguo.

## 5. Stati utente

La UI deve rendere distinguibili almeno questi stati:

- account autenticato con MFA attiva;
- account autenticato senza fattore TOTP verificato;
- sessione AAL2;
- operazione completata con esito positivo;
- errore di revoca sessioni;
- errore di gestione MFA;
- sessione non più valida → ritorno al login.

I termini `AAL1` e `AAL2` possono apparire come dettaglio di assurance, ma non devono essere l'unica spiegazione comprensibile dello stato.

## 6. Primo accesso, recupero e cambio password

Ogni mutazione della password richiede AAL2.

Flussi canonici:

- **primo accesso email**: `email verificata → AAL1 → MFA → AAL2 → imposta password`;
- **recupero password**: `recovery email → AAL1 → MFA → AAL2 → nuova password`;
- **cambio da account**: `sessione autenticata → AAL2 → nuova password`.

Nessun parametro URL, da solo, autorizza una mutazione della password.

## 7. Confini di prodotto

La superficie Account non deve:

- modificare il contesto professionale;
- creare una seconda anagrafica docente;
- duplicare Supabase Auth in tabelle applicative;
- memorizzare password o segreti in chiaro;
- introdurre un percorso di bypass MFA;
- esporre funzioni amministrative multiutente;
- trasformarsi in pannello tecnico del provider.

## 8. Linguaggio e interazione

Il linguaggio deve privilegiare termini comprensibili:

- “Secondo fattore” / “Autenticatore” prima di gergo provider-specifico;
- “Revoca le altre sessioni” prima di termini come global/local scope;
- “Sessione protetta” come concetto utente, mantenendo AAL2 come dettaglio tecnico verificabile.

Le azioni sensibili devono avere effetto esplicito e feedback successivo.

## 9. Accessibilità e mobile

La superficie segue integralmente:

- Design System V2;
- Brand Identity;
- Human Interaction Model;
- Mobile Rules;
- WCAG 2.2 AA Assurance.

Requisiti minimi:

- utilizzo completo a 320–430 px;
- focus visibile;
- label esplicite per codice TOTP e password;
- messaggi di stato annunciabili;
- nessuna informazione essenziale affidata esclusivamente al colore;
- target touch coerenti con la baseline del prodotto.

## 10. Evidenza e maturità

La disponibilità del codice non equivale a integrazione o promozione Production.

Stato della slice al 12 settembre 2026:

- issue di origine: **#347**;
- implementazione: **PR #348**;
- base: **PR #346 / MFA V6.3.3**;
- stato: implementata su branch dedicato, **non ancora integrata in `develop`**;
- merge autorizzabile solo dopo stabilizzazione e integrazione della base MFA e gate final-head applicabili.

Dopo integrazione, `PROJECT_STATUS_CURRENT.md` deve promuovere la capability da “gap UI” a superficie consolidata. Prima dell'integrazione deve restare esplicitamente indicato lo stato pending.

## 11. Fonti subordinate e superiori

Prevalgono, in ordine:

1. Security / RLS / domain invariants;
2. `docs/product/ASVS_5_0_ASSURANCE_CANONICAL.md`;
3. `docs/architecture/ACCOUNT_SECURITY_CANONICAL_SPEC.md`;
4. questo contratto di esperienza;
5. Product Experience Masterplan;
6. Design System, Human Interaction Model e Language & Collaboration System.

Questo documento governa il significato e l'esperienza della superficie Account; non sostituisce il contratto di sicurezza o le receipt ASVS.