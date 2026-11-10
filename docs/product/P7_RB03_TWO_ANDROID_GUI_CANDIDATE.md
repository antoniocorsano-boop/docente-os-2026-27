# P7 / RB-03 — Percorso candidato: due smartphone Android senza Termux né PC

**Data:** 06/11/2026. **Stato:** `TWO_ANDROID_AVAILABLE_DECLARED / GUI_CANDIDATE_ONLY / DEVICE_TRIAL_NOT_RUN / PRIVATE_KEY_NOT_CREATED / RB-03=HOLD`.

## Decisione e perimetro

L'utente ha confermato la disponibilità di **un secondo smartphone Android**. Questo permette di proporre un recupero indipendente dal primo dispositivo senza obbligare l'utente a usare Termux o un computer personale.

**Applicazione candidata, non approvata né installata tramite il progetto:** **AgePony per Android**, a codice aperto, compatibile con il formato `age`, con archivio chiavi protetto e trasferimento cifrato tra telefoni tramite connessione Wi-Fi locale, secondo la documentazione del produttore. Non è affiliata al progetto ufficiale age e le dichiarazioni del produttore richiedono collaudo con il flusso GitHub esistente.

Fonti consultate: 
- https://f-droid.org/packages/com.agepony.app/
- https://github.com/norsehorse-dev/AgePonyAndroid
- https://github.com/norsehorse-dev/AgePonyAndroid/releases
- https://github.com/FiloSottile/age/blob/main/doc/age.1.ronn

## Assetto proposto

- **Telefono A (primario):** generazione e custodia della chiave privata soltanto dentro il contenitore protetto dell'app, con blocco del dispositivo; destinatario pubblico separabile. 
- **Telefono B (recupero):** ricezione della medesima identità privata **esclusivamente attraverso la funzione di trasferimento cifrato** e conservazione protetta; deve poter decifrare un file di prova anche quando il telefono A è indisponibile.
- **Separazione:** i dispositivi devono essere sotto controllo di un custode legittimato, con schermo bloccato, sistema aggiornato e accessi diversi; conservarli in luoghi distinti quando possibile, evitando un unico punto di perdita. Se il telefono B appartiene a terzi, occorre autorizzazione esplicita del custode prima di qualunque operazione.
- **Materiale pubblico:** il solo `recipient` potrà essere fornito successivamente al flusso di cifratura, dopo la qualifica. Identità privata, codici di trasferimento, password, archivio cifrato di recupero e screenshot sensibili NON vanno in chat, issue, GitHub, R2 o registri.

## Gate di compatibilità (obbligatorio prima di qualsiasi chiave di produzione)

La prova di cifratura già attestata sul runner Ubuntu utilizza il pacchetto `age` disponibile nell'ambiente di lavoro, non una qualifica delle nuove chiavi post-quantistiche o hardware della GUI.

1. Verificare che la versione Android e la provenienza dell'app siano compatibili sui due telefoni; preferire una distribuzione verificabile e stabile. Non trattare l'app come tecnologia già qualificata.
2. Per la **prima prova esclusivamente sintetica** scegliere una identità classica **X25519** con destinatario `age1...` standard. **Non** selezionare per ora destinatari `age1pq1...`, `age1tag...`, chiavi hardware non esportabili o altri formati, prima di una prova esplicita di compatibilità con la versione `age` usata dal futuro processo di backup.
3. Generare **una chiave di prova usa e getta** nello smartphone A, senza dati personali; trasferirla al B con la funzione cifrata prevista dall'app. Verificare che nessuna identità in chiaro sia salvata in cartelle condivise, fotografie, appunti o copie cloud.
4. Cifrare una frase fittizia sul telefono A al destinatario pubblico della prova; sul B decifrarla **autonomamente**, usando esclusivamente la chiave recuperata. Ripetere il controllo supponendo A indisponibile.
5. Eseguire un controtest con destinatario o identità non corrispondente e verificare che la decifratura venga rifiutata. Ripetere la prova di compatibilità interoperabile su una installazione `age` del processo sintetico, **senza mai trasferire la chiave privata reale sul runner**. Per tale prova sono ammesse solo chiavi effimere sintetiche create per il test.
6. Registrare solo esiti e identificatori tecnici non sensibili. Non conservare nel repository screenshot di chiavi, codici, password o file privati.

**Condizione critica:** per il recupero dopo perdita completa di A, il B deve essere *realmente autonomo*, non semplicemente contenere una copia criptata che può essere decifrata soltanto con A. Un trasferimento riuscito non equivale da solo a un recupero dimostrato.

## Ricevuta di prova, senza segreti

```text
RB03_TWO_ANDROID_GUI_PILOT
Stato iniziale: CANDIDATE_ONLY
App e versione verificate su A/B: PENDING / PASS / FAIL
Custodia autorizzata e dispositivi protetti: PENDING / PASS / FAIL
Identità di prova classica X25519 (non reale): PENDING / PASS / FAIL
Compatibilità recipient sintetico con age CLI: PENDING / PASS / FAIL
Trasferimento locale cifrato A -> B: PENDING / PASS / FAIL
Decrittazione autonoma del file sintetico su B: PENDING / PASS / FAIL
Chiave errata rifiutata: PENDING / PASS / FAIL
Indipendenza fisica e accessi di recupero: PENDING / PASS / FAIL
Nessun segreto trasmesso o pubblicato: PENDING / PASS / FAIL
Esito: PILOT_PENDING / PILOT_PASS_SYNTHETIC / PILOT_FAIL
Gate professionale: RB-03=HOLD fino a custodia della chiave vera, seconda copia e attestazione
```

## Sequenza successiva, NON autorizzata da questo documento

Soltanto dopo prova sintetica e scelta consapevole del custode si potrà **proporre** la creazione di una nuova identità permanente e il controllo della sua recuperabilità. Questa dovrà restare sotto la custodia indipendente dei due dispositivi; solo il destinatario pubblico potrà essere usato dal processo di cifratura. È necessaria una prova di recupero dalla copia protetta e una attestazione umana senza segreti.

**Vincoli invariati:** `RB-02=HOLD`, `RB-03=HOLD`, `RB-04/RB-05=HOLD` per i requisiti non qualificati, `RB-06/07=NOT_RUN`, `REAL_EXPORT_FORBIDDEN`; nessuna migrazione `0104`, richiesta di credenziali, backup reale, merge o distribuzione Beta.
