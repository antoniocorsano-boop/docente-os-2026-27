# P7 — RB-02 | Valutazione documentale R2 per Docente OS professionale autonomo

**Data della ricognizione:** 08/11/2026  
**Stato:** `SOURCE_REVIEW_PASS / SCOPE_CUSTODIAN_ATTESTED / CLOUDFARE_ACCOUNT_CONTRACT_RECEIPT_PENDING / REAL_DATA_EXPORT_HOLD`  
**Ambito:** Docente OS Beta, Supabase candidato `gnshgapmwyjamhmlikeg`, destinazione R2 `docente-os-backup-eu`. **Nessuna acquisizione di dati o di credenziali**. Documento pubblico privo di segreti, nominativi e allegati; non costituisce consulenza legale definitiva.

## 1. Fatti sul progetto (attestazioni, non ispezione di dati)

- Il custode dichiara **uso professionale autonomo, non per conto dell'istituto scolastico**. Non attribuire automaticamente la titolarità del progetto all'istituto.
- Il custode dichiara la presenza di **dati personali propri e dati fittizi**, ed esclude dati reali di studenti, genitori e altri docenti. Non è stata eseguita una verifica riga per riga dei contenuti né dei 9 oggetti Storage.
- La Beta contiene quindi dati personali **nonostante** l'ambiente sia denominato «Beta» e la copia sia pianificata come cifrata. Non classificarla `SYNTHETIC_ONLY`.
- L'esclusione per attività esclusivamente personali/domestiche dell'art. 2(2)(c) GDPR **non è presunta** per un progetto dichiaratamente professionale. Il ruolo concreto di titolare/responsabile e la necessità delle specifiche misure vanno valutati in relazione al trattamento effettivo; non automaticamente in base al tipo di abbonamento.
- Non archiviare in GitHub l'identità privata `age`, la passphrase, ricevute con credenziali, dati del profilo utente o record Supabase.

## 2. Fonti contrattuali Cloudflare — fatti verificati sul testo pubblicato

| Fonte ufficiale | Evidenza rilevata il 08/11/2026 | Limite e conseguenza |
|---|---|---|
| [Self-Serve Subscription Agreement](https://www.cloudflare.com/terms/) (aggiornamento 12/09/2025), sezione 6.1 | Quando il contenuto del cliente include dati personali rilevanti, il testo **incorpora per riferimento** il Data Processing Addendum. L'accordo si applica secondo le condizioni di accettazione indicate sul sito. | È provata la previsione **documentale**, non una ricevuta dell'accordo effettivamente associato all'account specifico. |
| [Cloudflare DPA](https://www.cloudflare.com/cloudflare-customer-dpa/) versione **6.4**, in vigore dal **03/04/2026** | Regola il trattamento effettuato da Cloudflare come responsabile (o subresponsabile), definisce ruoli, istruzioni, misure di sicurezza, cancellazione/restituzione, notifiche e sottofornitori. | Verificare se le condizioni applicabili all'account siano quelle pubblicate e conservarne l'evidenza riservata, senza dichiarare una «firma» non verificata. |
| [DPA §4.4 e sottofornitori](https://www.cloudflare.com/gdpr/subprocessors/) | Il DPA prevede pubblicazione dei sottofornitori e notifica di nuovi/sostitutivi almeno 30 giorni prima, con termini per obiezioni. | Documentare presa visione e rischio relativo; l'elenco presente sul sito non certifica da solo un singolo flusso R2. |
| [DPA §6](https://www.cloudflare.com/cloudflare-customer-dpa/) | Il testo contempla che Cloudflare o subresponsabili possano trattare **alcuni dati personali fuori SEE** e include clausole contrattuali standard/ulteriori salvaguardie in caso di trasferimento ristretto. | **Giurisdizione R2 UE non equivale a garanzia assoluta di assenza di ogni trattamento internazionale**, soprattutto per informazioni operative, metadati o supporto. |
| [Cloudflare Privacy Policy](https://www.cloudflare.com/privacypolicy/) | Distingue informazioni dell'account/amministrazione, trattate in parte da Cloudflare come titolare, dai contenuti dei clienti, per cui Cloudflare opera come responsabile secondo le condizioni applicabili. | Non confondere cancellazione degli oggetti cifrati a 91 giorni con tempi di conservazione di informazioni amministrative/registri del fornitore. |

**Valutazione:** `RB02_CLOUDFLARE_CONTRACT_SOURCES=REVIEWED`. È **pendente** la ricevuta di verifica contrattuale dell'account da parte del custode: tipologia di abbonamento utilizzata, condizioni/DPA effettivamente applicabili ed eventuali misure richieste dai trasferimenti. Non allegare documenti identificativi o schermate con dati di fatturazione al repository.

## 3. Controlli R2 rilevati e verifiche ancora necessarie

| Controllo | Stato e valore probatorio |
|---|---|
| Bucket R2 | `docente-os-backup-eu`, restrizione di giurisdizione **UE** attestata dal custode; endpoint tecnico previsto `https://<ACCOUNT_ID>.eu.r2.cloudflarestorage.com`. Non scrivere l'ID account in prove pubbliche se non necessario. |
| Visibilità | Nessun dominio pubblico o URL pubblico di sviluppo, attestato visivamente. |
| Blocco | `production-backup-90d`: prefisso `production/`, 90 giorni, configurazione salvata attestata visivamente; non equivale a prova su un oggetto reale. |
| Eliminazione | `Cancel backup`: prefisso `production/`, scadenza 91 giorni, schermata configurata + conferma di riapertura/salvataggio dell'08/11/2026. L'eliminazione reale non è stata simulata con dati personali. |
| Autorizzazioni token | Token account `docente-os-p7-backup`, permesso **Lettura e scrittura di oggetti**, applicato al solo bucket `docente-os-backup-eu`, non amministrativo, da schermate del custode. **Non** è provato che l'identità impiegata dal futuro processo di esportazione coincida con questo token. |
| Scadenza e IP | Token con durata «Per sempre», senza restrizione IP: rischio residuo. Definire revoca/rotazione; non richiedere la rotazione durante la qualificazione documentale. |
| Chiave cifratura | `RB-03=PASS_CUSTODIAN_ATTESTED`: identità `age` su Android A, copia cifrata e prova di recupero indipendente su Android B, password custodita separatamente. |
| Esportazione reale e Storage | `RB-04=HOLD` e `RB-05_REAL=HOLD`: mancata qualifica della credenziale di origine, del manifesto completo Auth/Storage, del piano di restore e del recupero dei **byte** degli oggetti. |

Fonte tecnica: [R2 Data location](https://developers.cloudflare.com/r2/reference/data-location/). Per il bucket con giurisdizione **UE**, l'endpoint S3 **deve specificare** `.eu.r2.cloudflarestorage.com`. Un indizio di posizione geografica «Europa» non è equivalente a una restrizione giurisdizionale.

## 4. Vincolo costo zero — soglie, non garanzia

La [tariffazione R2 pubblicata al 01/10/2026](https://developers.cloudflare.com/r2/pricing/) prevede per **Standard** una franchigia mensile di **10 GB-mese**, **1.000.000 operazioni classe A** e **10.000.000 classe B**. Il livello gratuito **non si applica** a `Infrequent Access`, per cui sono previsti anche costi di recupero. Le soglie sono una **franchigia**, non uno sbarramento certo alla spesa.

Prima di attivare una copia reale:
1. verificare la classe `Standard`, senza effettuare transizioni automatiche a `Infrequent Access`;
2. rilevare dal pannello, senza dati personali, consumo GB-mese e operazioni già effettuate, includendo gli altri progetti che condividono la fatturazione;
3. definire frequenza di backup e limite massimo stimato delle copie conservate per 91 giorni, **includendo gli oggetti Supabase Storage** oltre al solo database. Non dedurre la dimensione dai conteggi di file;
4. definire un controllo di consumi e comportamento di arresto sicuro prima di raggiungere le soglie; evitare di affermare «zero costi garantiti».

La cancellazione a 91 giorni non protegge da una saturazione anticipata della quota se la frequenza di acquisizione o la dimensione cresce.

## 5. Rischi di recuperabilità e misure non negoziabili

- Cifrare **prima** dell'invio a R2, usando soltanto il destinatario pubblico `age` qualificato, mai l'identità privata nei processi GitHub.
- Evitare nomi di oggetto e manifesti che includano identità, nomi di file personali o dati scolastici; conservare ricevute limitate a stato, data, quantità aggregate e impronte dei cifrati.
- L'archivio SQL non comprende automaticamente gli **oggetti Storage**. Richiedere un percorso autorizzato per il ripristino coerente di database, `auth`, metadati e byte dei file, ruoli, politiche RLS e dipendenze.
- Per la scadenza a 91 giorni, il piano operativo deve impedire che venga meno **l'ultima copia verificata e recuperabile**; verificare la presenza di almeno una nuova copia integra prima della scadenza della precedente.
- I collaudi PG17 e RB-05 attuali impiegano **solo dati fittizi** e non sostituiscono un vero ripristino completo.

## 6. Ricevuta di valutazione RB-02 (soltanto in sede riservata)

| Voce da attestare senza segreti | Stato |
|---|---|
| Perimetro: professionale autonomo, dati propri + fittizi, nessun terzo reale per dichiarazione | `PASS_USER_ATTESTED` |
| Applicabilità documentale Self-Serve §6.1 e DPA pubblicato | `SOURCE_VERIFIED` |
| Accordo/DPA concretamente applicabili all'account | `PRIVATE_REVIEW_PENDING` |
| Valutazione dei possibili trattamenti/trasferimenti fuori SEE | `REVIEW_PENDING` |
| Finalità e necessità della copia, minimizzazione e 91 giorni | `TECHNICAL_POLICY_DOCUMENTED / PURPOSE_DECISION_PENDING` |
| Verifica classe Standard, budget gratuito e monitoraggio dei consumi | `COST_ASSESSMENT_PENDING` |
| Permessi di destinazione R2 e policy di conservazione | `PASS_VISUAL_OR_USER_ATTESTED` |
| Approvazione **espressa** dell'esportazione reale cifrata | `NOT_GRANTED` |
| RB-02 complessivo | **`HOLD`** |

**Decisione vincolante:** questo documento **non autorizza** workflow con credenziali di origine reale, dump Supabase, trasferimento effettivo, deploy, merge o migrazione `0104`. `RB-03=PASS_CUSTODIAN_ATTESTED`, `RB-04=HOLD`, `RB-05_REAL=HOLD`, `RB-06/07=NOT_RUN`, `RB-08=HOLD`.

La documentazione generale del fornitore **non** costituisce una ricevuta dell'account specifico né una decisione di trattamento presa dal custode.
