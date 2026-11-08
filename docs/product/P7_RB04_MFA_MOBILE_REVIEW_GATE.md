# RB-04 — Revisione di sicurezza e collaudo mobile MFA

**Data ricognizione:** 08/11/2026  
**Ambito:** PR #795, ramo `feat/p7-db-real-readiness-pg17`  
**Decisione:** `IMPLEMENTED_AND_CI_QUALIFICATION_PENDING_EXACT_HEAD / MOBILE_REAL_AUTH_NOT_TESTED / DEPLOY_HOLD`.

## 1. Revisione del codice

È stata aggiunta una pagina `/sicurezza/mfa` accessibile soltanto a sessioni Supabase Auth valide, che usa gli strumenti ufficiali `mfa.listFactors`, `mfa.enroll`, `mfa.challengeAndVerify` e `mfa.getAuthenticatorAssuranceLevel`. L'esito `aal2` viene verificato dopo la prova del secondo fattore. L'accesso ordinario e il recupero password instradano al secondo fattore quando l'utente ne possiede già uno verificato. La verifica MFA per mutazioni di password è **prima** di `updateUser`, non dopo.

L'interfaccia supporta anche la scelta fra più fattori TOTP **già verificati** e l'aggiunta volontaria di un fattore su un secondo dispositivo quando la sessione è `aal2`. Il fattore primario non viene rimosso; la procedura deve essere provata sul backend sintetico prima di qualunque registrazione reale. Non sono previsti codici di recupero generati dall'applicazione.

### Rilievi della revisione e correzioni

| Rilievo | Conseguenza | Correzione |
|---|---|---|
| Un'app Android può chiudere la pagina durante una prima registrazione TOTP | Un fattore non verificato resta associato a Supabase; il segreto visualizzato in precedenza non è più recuperabile dalla pagina | `recover`: elenco delle sole registrazioni TOTP non verificate contrassegnate `Docente OS`, annullamento esplicito di **un tentativo alla volta**; nuovo controllo sul server `listFactors()` prima di ciascun `unenroll`; nessuna eliminazione di fattori `verified` |
| La chiave di registrazione era visibile immediatamente | Rischio di divulgazione in schermate e acquisizioni dello schermo | Chiave inizialmente nascosta, visibile solo a seguito di un gesto esplicito e rimossa dalla vista alla conclusione; nessun salvataggio in URL, registri o repository |
| Nel recupero password, la valutazione MFA avveniva dopo la modifica | Una sessione `aal1` con secondo fattore già registrato poteva tentare una modifica password prima della verifica ulteriore | Spostato il controllo dell'Authenticator Assurance Level **prima** di `auth.updateUser`; in mancanza della conferma si passa a `/sicurezza/mfa` |
| Dopo annullamento remoto di un tentativo TOTP il nuovo caricamento dei fattori può non riuscire | La UI poteva rimanere in una vista priva di chiave/ID | Ritorno sicuro alla vista iniziale prima dell'aggiornamento della lista; nessuna cancellazione automatica di fattori verificati |

**Prove automatiche:** `mfa-state.test.ts` verifica i passaggi `setup`, `recover`, `challenge` e `ready`, la selezione stretta dei fattori incompleti e il codice a sei cifre. `mfa-security-contract.test.ts` verifica l'ordine della guardia prima della modifica password, la protezione iniziale del segreto e la verifica dei fattori prima della rimozione. Questi test, basati sul codice, non sostituiscono un collaudo sul runtime reale.

## 2. Ambiente di prova isolato — esito della ricognizione

Una distribuzione Vercel del progetto `docente-os-product` risulta **READY** per una precedente versione del ramo PR #795. Il controllo **solo dei metadati** dell'ambiente Vercel ha però mostrato che `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` sono definiti per **preview e production negli stessi record di configurazione**; non sono state lette o pubblicate le relative chiavi né è stato provato un collegamento distinto a un'istanza di prova. È pertanto **vietato considerare questa anteprima isolata o utilizzarla per registrare un fattore TOTP di un account con dati reali**.

È stato inoltre osservato che il progetto Supabase esistente `DOCENTE OS MFA Test` è `INACTIVE`. Non è stato riattivato: sono da evitare consumo di quote, configurazioni non deliberate e connessioni improprie mentre l'organizzazione mostra un avviso di possibili restrizioni dal 14/11/2026.

**Decisione:** `PUBLIC_PREVIEW_FOR_REAL_MFA=NOT_QUALIFIED`; `MFA_SYNTHETIC_TEST_BACKEND=NOT_READY`. Non condividere l'URL precedente come collegamento sicuro per la prova; non creare nuove risorse, non ripristinare progetti inattivi né modificare la configurazione Vercel/Netlify senza una decisione separata sulle condizioni economiche e l'isolamento.

## 3. Protocollo di revisione umana sullo smartphone (NON ESEGUITO)

*Prerequisito:* un'istanza autorizzata e qualificata per il test, con **identità sintetica**, Auth e Storage non collegati alla Beta reale. Nessun JWT, codice TOTP o segreto deve essere archiviato in una PR, nel sistema di segnalazione o nelle schermate trasmesse.

1. Con identità fittizia già autenticata, verificare la pagina `/sicurezza/mfa` su Android a larghezza mobile e l'ingresso dalle Impostazioni. La chiave deve essere nascosta all'apertura.
2. Avviare una registrazione TOTP fittizia, mostrare la chiave solo quando necessario, configurare l'app di autenticazione e confermare con codice. Verificare che l'interfaccia riporti `aal2` **solo dopo** la verifica ufficiale Supabase e che il browser non pubblichi segreti nei parametri URL.
3. Ripetere in ambiente sintetico: codice sbagliato; scadenza della sessione; ritorno al browser dopo passaggio all'app TOTP; chiusura/ricaricamento durante `enroll`; rimozione **esplicita e selettiva** della sola registrazione incompleta. Un fattore verificato non deve essere rimosso.
4. Eseguire un nuovo accesso con fattore già verificato. Accertare che login/password-reset non consentano di saltare la verifica quando `aal2` è richiesto.
5. Verificare la navigazione Android, la dimensione dei controlli, lo stato del caricamento, il ritorno alla schermata precedente, i messaggi di errore e la possibilità di completare l'operazione con lo stesso telefono.
6. Registrare soltanto una ricevuta **senza segreti**: commit, dispositivo/versione browser, percorso, `aal1→aal2`, esito di ogni controllo, anomalie e autorizzazione umana.

## 4. Condizioni per la fase successiva

- Concludere Product CI e la revisione del nuovo codice sull'**exact head**.
- Qualificare un backend di prova veramente distinto, utilizzando soltanto dati e account fittizi; riconoscere come bloccante qualsiasi condivisione di credenziali o dati con Beta/produzione.
- Completare la revisione mobile con esito **PASS** su un'istanza isolata prima di discutere la distribuzione della funzionalità in Beta.
- Soltanto dopo, e **con autorizzazione separata**, attivare un fattore dell'account reale. Un MFA `aal2` attestato non equivale a RB-04 PASS: resta da qualificare la visibilità autorizzata dei nove oggetti. RB-02/05 continuano a impedire download, backup reale e ripristino.

**Nessun merge, deploy, creazione reale di fattori MFA, accesso ai file privati o modifica RLS viene autorizzato da questo documento.**
