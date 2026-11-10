# RB-04 — Revisione di sicurezza e collaudo mobile MFA

**Data ricognizione:** 08/11/2026  
**Ambito:** PR #795, ramo `feat/p7-db-real-readiness-pg17`  
**Decisione:** `IMPLEMENTED_AND_CI_QUALIFICATION_PENDING_EXACT_HEAD / MOBILE_REAL_AUTH_NOT_TESTED / DEPLOY_HOLD`.

## 1. Revisione del codice

È stata aggiunta una pagina `/sicurezza/mfa` accessibile soltanto a sessioni Supabase Auth valide, che usa gli strumenti ufficiali `mfa.listFactors`, `mfa.enroll`, `mfa.challengeAndVerify` e `mfa.getAuthenticatorAssuranceLevel`. L'esito `aal2` viene verificato dopo la prova del secondo fattore. L'accesso ordinario allo spazio docente **non** richiede MFA in RB-04: la verifica AAL2 viene richiesta per gli allegati privati attraverso le politiche RLS. In caso di fattore già registrato, la modifica della password mantiene un controllo MFA specifico, applicato prima della mutazione. La verifica MFA per mutazioni di password è **prima** di `updateUser`, non dopo.

L'interfaccia supporta anche la scelta fra più fattori TOTP **già verificati** e l'aggiunta volontaria di un fattore su un secondo dispositivo quando la sessione è `aal2`. Il fattore primario non viene rimosso; la procedura deve essere provata sul backend sintetico prima di qualunque registrazione reale. Non sono previsti codici di recupero generati dall'applicazione.

### Rilievi della revisione e correzioni

| Rilievo | Conseguenza | Correzione |
|---|---|---|
| Un'app Android può chiudere la pagina durante una prima registrazione TOTP | Un fattore non verificato resta associato a Supabase; il segreto visualizzato in precedenza non è più recuperabile dalla pagina | `recover`: elenco delle sole registrazioni TOTP non verificate contrassegnate `Docente OS`, annullamento esplicito di **un tentativo alla volta**; nuovo controllo sul server `listFactors()` prima di ciascun `unenroll`; nessuna eliminazione di fattori `verified` |
| La chiave di registrazione era visibile immediatamente | Rischio di divulgazione in schermate e acquisizioni dello schermo | Chiave inizialmente nascosta, visibile solo a seguito di un gesto esplicito e rimossa dalla vista alla conclusione; nessun salvataggio in URL, registri o repository |
| Nel recupero password, la valutazione MFA avveniva dopo la modifica | Una sessione `aal1` con secondo fattore già registrato poteva tentare una modifica password prima della verifica ulteriore | Spostato il controllo dell'Authenticator Assurance Level **prima** di `auth.updateUser`; in mancanza della conferma si passa a `/sicurezza/mfa` |
| La verifica TOTP può riuscire sul server mentre la risposta si perde | Il pulsante di annullamento poteva eliminare un fattore già verificato | L'interruzione cancella esclusivamente il segreto locale e rilegge lo stato remoto; la rimozione rimane un comando separato in `recover`, previa nuova verifica che il fattore sia ancora `unverified` |

**Prove automatiche:** `mfa-state.test.ts` verifica i passaggi `setup`, `recover`, `challenge` e `ready`, la selezione stretta dei fattori incompleti e il codice a sei cifre. `mfa-security-contract.test.ts` verifica l'ordine della guardia prima della modifica password, la protezione iniziale del segreto e la verifica dei fattori prima della rimozione. Questi test, basati sul codice, non sostituiscono un collaudo sul runtime reale.

## 2. Ambiente di prova isolato — esito della ricognizione

Una distribuzione Vercel del progetto `docente-os-product` risulta **READY** per una precedente versione del ramo PR #795. Il controllo **solo dei metadati** dell'ambiente Vercel ha però mostrato che `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` sono definiti per **preview e production negli stessi record di configurazione**; non sono state lette o pubblicate le relative chiavi né è stato provato un collegamento distinto a un'istanza di prova. È pertanto **vietato considerare questa anteprima isolata o utilizzarla per registrare un fattore TOTP di un account con dati reali**.

È stato inoltre osservato che il progetto Supabase esistente `DOCENTE OS MFA Test` è `INACTIVE`. Non è stato riattivato: sono da evitare consumo di quote, configurazioni non deliberate e connessioni improprie mentre l'organizzazione mostra un avviso di possibili restrizioni dal 14/11/2026.

**Decisione:** `PUBLIC_PREVIEW_FOR_REAL_MFA=NOT_QUALIFIED`; `MFA_SYNTHETIC_TEST_BACKEND=NOT_READY`. Non condividere l'URL precedente come collegamento sicuro per la prova; non creare nuove risorse, non ripristinare progetti inattivi né modificare la configurazione Vercel/Netlify senza una decisione separata sulle condizioni economiche e l'isolamento.

### Aggiornamento operativo — progetto gratuito di prova e destinazione Vercel (08/11/2026)

Dopo la revisione del vincolo economico, Supabase ha confermato per l'organizzazione **EduManag** il piano **Free**, con **un solo progetto attivo su due consentiti** (i progetti sospesi non contano ai fini del limite gratuito). È stata accettata l'operazione di ripristino **del progetto già esistente** `DOCENTE OS MFA Test` (`xyowtnivxnzgwewvvmyz`), senza creare un nuovo progetto o modificare il piano. All'ultimo controllo il progetto risulta `COMING_UP`: **non è attestato operativo**. Sono state consultate soltanto informazioni amministrative e chiavi *pubblicabili* di progetto, senza chiavi di servizio o token utente.

Sul progetto Vercel `docente-os-product` le variabili `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` sono state create come **override limitati al ramo PR** `feat/p7-db-real-readiness-pg17`, target `preview`, verso il progetto MFA Test. La verifica successiva della configurazione restituisce entrambi gli override con il ramo esatto. **Le variabili condivise e l'ambiente Production non sono stati modificati.**

**Vincolo di qualificazione fondamentale:** l'anteprima pubblicata *prima* della creazione degli override può ancora contenere il vecchio indirizzo Supabase, perché le variabili `NEXT_PUBLIC_*` vengono fissate in compilazione. Occorre una **nuova distribuzione di anteprima sul commit successivo**, verificarne la destinazione effettiva *senza rivelare chiavi*, accertare lo stato `ACTIVE_HEALTHY` del progetto di prova e attestare che Auth e contenuti dell'ambiente test non contengano dati reali. Fino a tale evidenza: `ISOLATED_PREVIEW_RUNTIME=HOLD`, `REAL_ACCOUNT_MFA_TEST=PROHIBITED`.

La modifica riguarda soltanto l'anteprima del ramo, **non** Beta, Production, `main`, RLS, schemi, file Storage o RB-02. Il collaudo con account sintetico e la revisione indipendente sul commit finale rimangono requisiti separati.

### Verifica dell'istanza ripristinata e revisione Codex (08/11/2026)

Il progetto `DOCENTE OS MFA Test` è ora `ACTIVE_HEALTHY`. Una query di **soli conteggi aggregati** ha restituito: **0 account Auth**, **0 fattori MFA**, **2 oggetti Storage preesistenti** e **7 tabelle pubbliche**. Non sono stati letti nomi, file, email, segreti o righe. Gli oggetti preesistenti impediscono di definire l'intero progetto «privo di dati», ma il perimetro Auth non contiene account o fattori esistenti; le prove MFA dovranno restare nell'area Auth senza toccare Storage.

Una nuova distribuzione Vercel del ramo `feat/p7-db-real-readiness-pg17` è risultata `READY` sul commit `38a2518f2bec316ef8e40a76de06b44ea44b434e`, successivo alla creazione degli override di ambiente limitati al ramo. Questo conferma la **nuova compilazione**, non da solo la destinazione Supabase effettivamente utilizzata nel browser o l'accessibilità del login: `PREVIEW_RUNTIME_BINDING=HOLD_UNTIL_VERIFIED`. In particolare non utilizzare l'account Beta né le credenziali reali sul collegamento di anteprima.

Codex ha eseguito una **revisione indipendente** sul commit `27fefda5a3dd98a458f454f3b471a95b48de94b5`, individuando **P1** (reindirizzamento MFA applicato solo dopo login, aggirabile aprendo direttamente le viste) e **tre P2** (nome duplicato per il fattore di recupero, mancato azzeramento del segreto al cambio account, eliminazione pericolosa del fattore dopo una verifica con risposta persa). Le correzioni adottate restringono intenzionalmente il perimetro: nessuna MFA globale fittizia per tutte le viste, RLS AAL2 conservata solo sugli allegati privati; nomi distinti per i fattori di recupero; ascolto degli eventi Auth e invalidazione delle richieste precedenti; interruzione senza cancellazione remota, con rimozione consentita solo per registrazioni ancora non verificate. Questa è una **risposta tecnica ai rilievi, non un'approvazione indipendente dell'ultimo commit**: nuovo Product CI e nuova review rimangono necessari.

## 3. Protocollo di revisione umana sullo smartphone (NON ESEGUITO)

*Prerequisito:* un'istanza autorizzata e qualificata per il test, con **identità sintetica**, Auth e Storage non collegati alla Beta reale. Nessun JWT, codice TOTP o segreto deve essere archiviato in una PR, nel sistema di segnalazione o nelle schermate trasmesse.

1. Con identità fittizia già autenticata, verificare la pagina `/sicurezza/mfa` su Android a larghezza mobile e l'ingresso dalle Impostazioni. La chiave deve essere nascosta all'apertura.
2. Avviare una registrazione TOTP fittizia, mostrare la chiave solo quando necessario, configurare l'app di autenticazione e confermare con codice. Verificare che l'interfaccia riporti `aal2` **solo dopo** la verifica ufficiale Supabase e che il browser non pubblichi segreti nei parametri URL.
3. Ripetere in ambiente sintetico: codice sbagliato; scadenza della sessione; ritorno al browser dopo passaggio all'app TOTP; chiusura/ricaricamento durante `enroll`; rimozione **esplicita e selettiva** della sola registrazione incompleta. Un fattore verificato non deve essere rimosso.
4. Eseguire un nuovo accesso con fattore già verificato. Confermare che le schermate didattiche ordinarie rimangano accessibili senza AAL2 e che l'accesso agli allegati privati protetti da RLS richieda `aal2`; la mutazione di password su account MFA deve richiedere il controllo preventivo. Non estendere implicitamente MFA a tutte le tabelle applicative.
5. Verificare la navigazione Android, la dimensione dei controlli, lo stato del caricamento, il ritorno alla schermata precedente, i messaggi di errore e la possibilità di completare l'operazione con lo stesso telefono.
6. Registrare soltanto una ricevuta **senza segreti**: commit, dispositivo/versione browser, percorso, `aal1→aal2`, esito di ogni controllo, anomalie e autorizzazione umana.

### Revisione Codex sul commit `ced45cee69cd…` — due P2 successivi, rework 09/11/2026

La seconda revisione indipendente ha confermato la necessità di intervenire su **due scenari** non qualificati dai test precedenti:

1. **Recupero password dopo MFA:** `setPassword` rifiutava correttamente una mutazione in `aal1`, ma dopo il secondo fattore rinviava a `/workspace`, abbandonando la modifica richiesta. Ora il server passa esclusivamente l'intento codificato `?return=password`, senza accettare destinazioni arbitrarie. `/sicurezza/mfa` lo valida con confronto letterale e, **solo dopo conferma `aal2`**, propone un collegamento a `/imposta-password?source=mfa`. La password non viene conservata né trasmessa nel percorso e deve essere **reinserita e salvata esplicitamente**. Il modulo segnala che la modifica precedente non era stata eseguita.
2. **Cambio sessione dello stesso utente:** Supabase include il claim `session_id` nel JWT dell'utente. È stato introdotto il solo identificatore di sessione **a uso di interfaccia**, estratto dal JWT per confrontare vecchia e nuova sessione. Non è usato per autorizzazioni: il controllo dell'identità resta `auth.getUser()`, mentre permessi e allegati dipendono dalle politiche RLS e dal livello `aal2` effettivo. Su `SIGNED_IN` con **nuovo** identificatore di sessione, anche quando l'identificativo utente non cambia, il componente cancella il segreto TOTP, il codice, le viste di conferma e incrementa l'epoca delle operazioni asincrone; poi ricalcola lo stato remoto. Il semplice segnale `SIGNED_IN` della medesima sessione non provoca un azzeramento non necessario. Restano gestiti `SIGNED_OUT` e `TOKEN_REFRESHED`.

I test `mfa-state.test.ts` verificano l'estrazione di identificativi fittizi, il rifiuto di JWT malformati e la distinzione fra sessioni; `mfa-security-contract.test.ts` verifica che soltanto la destinazione password ammessa possa attraversare il percorso e che un nuovo accesso dello stesso account invalidi lo stato precedente. **Queste prove non sostituiscono l'esecuzione reale su Android né la revisione indipendente dell'ultimo commit.**

**Nuovo gate:** `REWORK_PASSWORD_RETURN=CODED`, `REWORK_SAME_USER_SESSION=CODED`, `REAL_MFA_AAL2=NOT_RUN`, `REAL_PRIVATE_STORAGE=NOT_RUN`; `RB-02/05=HOLD`. Nessun segreto, fattore o contenuto privato è stato acquisito.

### Diagnosi errore reale dell'anteprima Android — 10/11/2026

**Evidenza determinante:** Vercel Runtime Logs, ambiente `Preview`, ramo `feat/p7-db-real-readiness-pg17`, richiesta `GET /` delle **19:08:37 CET**. Il server restituisce: `Could not find the function public.current_workspace_context without parameters in the schema cache` (`digest 1284875912`). Il problema non deriva dal TOTP: la pagina iniziale invocava `SupabaseWorkspaceRepository.getCurrentContext()` **prima** di verificare se fosse presente una sessione.

**Controllo del backend isolato:** la query di sola lettura su `xyowtnivxnzgwewvvmyz` conferma che `public.current_workspace_context()` e `bootstrap_personal_workspace` **non esistono**. Sono presenti soltanto sette tabelle pubbliche e lo schema applicativo completo (es. `academic_years`) non è installato. Nessuna migrazione o funzione fittizia è stata inserita; il progetto non deve diventare una copia della Beta.

**Soluzione delimitata al collaudo Auth/MFA:**

- `product/src/app/page.tsx`: autenticare con `auth.getClaims()` **prima** di accedere al contesto; se manca la sessione, rimandare al login senza richiamare RPC non disponibili.
- `isIsolatedMfaPreview`: solo `VERCEL_ENV=preview` **e** indirizzo Supabase **identico** a `https://xyowtnivxnzgwewvvmyz.supabase.co`. Ogni altra combinazione, incluse produzione, sviluppo e Beta, mantiene l'applicazione completa. Il confronto serve solo a decidere una **destinazione di navigazione**, mai ad autorizzare l'accesso ai dati.
- Nel solo ambiente così delimitato, login già autenticato, accesso con password, conferma del collegamento monouso e `/workspace` rimandano alla pagina `/sicurezza/mfa`, evitando deliberatamente la creazione dello spazio docente. L'identità resta verificata da Supabase Auth e la stessa pagina MFA richiede una sessione reale.
- Le prove `mfa-isolated-preview.test.ts` verificano che il bypass non possa essere attivato da un indirizzo Beta o in produzione, e che `GET /` senza sessione non tenti la RPC.

**Limiti:** questa è una **soluzione temporanea di anteprima**, da riesaminare esplicitamente prima di un'eventuale integrazione. Non certifica `/workspace`, il backend didattico, la persistenza delle UDA o la leggibilità degli allegati privati. Il prossimo test deve accertare il collegamento runtime in Android e l'effettivo comportamento con un'**identità sintetica**. Fino ad allora `MFA_PREVIEW_RUNTIME=HOLD`, `ANDROID_MFA_HPR=REWORK`.

## 4. Condizioni per la fase successiva

- Concludere Product CI e la revisione del nuovo codice sull'**exact head**.
- Qualificare un backend di prova veramente distinto, utilizzando soltanto dati e account fittizi; riconoscere come bloccante qualsiasi condivisione di credenziali o dati con Beta/produzione.
- Completare la revisione mobile con esito **PASS** su un'istanza isolata prima di discutere la distribuzione della funzionalità in Beta.
- Soltanto dopo, e **con autorizzazione separata**, attivare un fattore dell'account reale. Un MFA `aal2` attestato non equivale a RB-04 PASS: resta da qualificare la visibilità autorizzata dei nove oggetti. RB-02/05 continuano a impedire download, backup reale e ripristino.

**Nessun merge, distribuzione Beta/Production, creazione reale di fattori MFA, accesso ai file privati o modifica RLS viene autorizzato da questo documento.** Le anteprime automatiche GitHub/Vercel sono separate e non rappresentano promozione della Beta.
