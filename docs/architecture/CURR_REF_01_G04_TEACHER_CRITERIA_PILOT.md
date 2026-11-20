# CURR-REF-01/G04 — Selezione locale dei criteri in Docente OS

**Stato:** candidato tecnico in ramo separato, non integrato né pubblicato.
**Origine:** TRAMA [G03](https://github.com/antoniocorsano-boop/trama-ecosistema/blob/cdaf1cbdd0a3ddbcc9e0eef5e5eb3608fc2ab8f5/docs/research/curr-ref-01-g03-activity-link.md) e caso G01/G02. **Ambito pilota:** Tecnologia, classe prima, CAN-UDA-1-05, B25, proiezione approvata `HTC-PRIMA-B25-PLAN-v1`.

## Scelta progettuale
Inserire un piccolo riquadro nella fase **Osserva** dello spazio lezione già esistente, senza creare una quinta fase, una nuova pagina, un nuovo contratto di interscambio o un nuovo archivio. L'interfaccia appare **solo** quando identità, titolo, obiettivo, durata, fonte ed evidenza della proiezione B25 coincidono col riferimento verificato; altrimenti non viene mostrata.

I due criteri proposti sono:
- `CR-G01-01`, processo: confronto delle alternative attraverso criteri pertinenti;
- `CR-G01-02`, argomentazione: motivazione della decisione rispetto a requisiti e vincoli.

L'utente può spuntare uno o due criteri e premere **Conferma la scelta**. La conferma è solo un riscontro d'interazione **in memoria di pagina**: cambiando selezione si annulla. Alla ricarica scompare; non viene conservata nel Registro, nel piano annuale o in alcuna base dati. Non identifica studenti e non sostituisce `confirmedByTeacher` / `confirmedAt` delle revisioni valutative, che richiedono una procedura autonoma. La schermata indica esplicitamente il master Arena 1.3 come provvisorio e non vigente. La selezione non crea voti, punteggi, evidenze individuali o giudizi di competenza.

## Controllo operativo
L'intervento interessa solo:
- la fase `observe` dello spazio lezione esistente;
- un componente presentazionale dedicato alla scelta dei criteri;
- una funzione pura che convalida l'identità B25 e controlla selezione/conferma;
- gli stili e le relative verifiche automatiche.

Gli indicatori di osservazione e il pulsante **Registra la lezione** restano invariati. Non viene modificata l'azione server `recordLessonExecution`, né la persistenza. Nessuna operazione di invio, rete, esportazione o scrittura aggiuntiva è prevista. I dati di valutazione rimangono esclusivamente nel perimetro Registro Docente e non vengono letti da G04.

## Qualificazione
Dal repository, in `product`:
```bash
npm run test
npm run typecheck
npm run build
```
Verificare sul navigatore e su dispositivo stretto (320/390 px e ingrandimento testo 200%): selezione tramite tastiera, lettura degli stati, pulsanti, assenza di scorrimento orizzontale, selezione mantenuta passando fra le fasi finché la pagina resta aperta, azzeramento al ricaricamento, contenuti non presenti per B24 e B26. Nessuna prova sui dati reali.

## Verifica automatizzata nel navigatore (senza servizi collegati)
È stata aggiunta alla stessa procedura `Product CI` la prova `npm run test:g04:browser`: una pagina di prova temporanea monta il **vero componente React G04**, utilizzando la vera proiezione didattica B25 già approvata; non è una nuova pagina pubblica dell'applicazione. Chromium verifica interattività, annullamento della conferma, stato accessibile, dimensioni 320/390 px e fattore d'ingrandimento simulato 200%, inclusa l'assenza di scorrimento orizzontale. Non usa Supabase, account, rete o dati individuali.

Il collaudo del componente non equivale ancora a prova sull'intero percorso autenticato o su uno smartphone fisico. Devono restare distinti: controllo del dispositivo reale, navigazione tra schermate, comportamento dei sistemi di ingrandimento testo Android, assistive technology e autorizzazione all'eventuale integrazione con Registro Docente. Una conferma G04 **non** è `CriterionRevision` del Registro.


## Pacchetto autonomo per smartphone — origine univoca
Il file di prova non è una nuova implementazione dei criteri. Il generatore `product/scripts/build-g04-offline-package.mjs` assembla **lo stesso componente React `G04CriteriaPanel`** e la sua stessa logica, con la proiezione B25 approvata e i fogli di stile della schermata. La compilazione autonoma non carica la versione in rete e non dipende da Supabase. Il pacchetto contiene:
- `G04-prova-offline.html`: file unico con codice e stili incorporati;
- `manifest.json`: provenienza del repository, revisione, riferimenti e impronta SHA-256 del file;
- `LEGGIMI.txt`: istruzioni per aprirlo e provarlo su smartphone, senza usare dati reali.

La pipeline `Product CI` ora compila il pacchetto, ne ricalcola l'impronta, lo apre realmente in Chromium e lo conserva come **artefatto di prova della PR #801** per 14 giorni, scaricabile dalla pagina del controllo in GitHub (se autorizzati). Il pacchetto non è una pubblicazione sul web e non modifica l'applicazione installata. Per riprodurre localmente:
```bash
cd product
npm run package:g04:offline
npm run test:g04:package
```

Il collaudo del file scaricato su un Android reale rimane un passaggio separato. Se l'app File non riesce ad aprire il documento HTML con Chrome, non ridurre le protezioni del dispositivo e segnalare il comportamento. Nessuna connessione a servizi scolastici deve essere necessaria.

## Coordinamento fra sistemi — responsabilità non sovrapposte
| Fonte o componente | Responsabilità | Stato G04 |
|---|---|---|
| Arena | Fonte curricolare, versione e applicabilità | Master 1.3 provvisorio; non qualificato come vigente |
| TRAMA CURR-REF-01/G03 | Identificativi e significato del raccordo | Proposta editoriale qualificata |
| Docente OS B25 | Proiezione didattica e evidenze attese | Fonte effettiva del componente G04 |
| Docente OS G04 | Scelta e conferma temporanee dei criteri | Nessuna scrittura o trasferimento |
| Registro Docente `AssessmentEvidenceV1` | Revisioni valutative locali confermate ed eventuali osservazioni individuali | Non toccato; nessun import autorizzato |

La conferma nel pacchetto non costituisce conferma in Registro e non introduce nuovi identificativi istituzionali. Per un'integrazione fra prodotti serviranno un contratto approvato, controllo degli accessi e la validazione professionale E-R4. Non alterare i rami paralleli VAL-01/DOC-01.

## Confini e decisione successiva
Questa è **qualificazione dell'usabilità locale**, non un flusso Arena → Docente OS → Registro né l'approvazione dei criteri. Per rendere la scelta persistente o effettivamente utilizzabile nel Registro serve una decisione distinta su contratto, identità, autorizzazione del docente e vincoli di protezione dei dati; non usare il medesimo formato per trasferire osservazioni individuali.

Non integrare in `main`, non distribuire a studenti e non avviare deploy senza decisione separata. Non interferire con le attività DOC-01/VAL-01 già in corso in Registro Docente.

## Riscontro da smartphone Android — schermate fornite dall'utilizzatore

**Data di acquisizione nel ciclo G04: 20 novembre 2026.** Due immagini dello schermo Android mostrano l'apertura del file HTML come documento locale (`content://`), la visualizzazione della proposta G04 e i due criteri «Confronto delle alternative» e «Motivazione della scelta» entrambi selezionati. La seconda immagine mostra il pulsante **«Scelta confermata»** e il messaggio **«2 criteri confermati solo per questa sessione»**.

**Esito documentabile dalle immagini:**
- APERTURA LOCALE: **OSSERVATA**; documento visualizzato nel navigatore su Android, senza schermo vuoto o errore evidente.
- COMPONENTE B25 E DUE CRITERI: **OSSERVATI**.
- SELEZIONE DI ENTRAMBI I CRITERI: **OSSERVATA**.
- STATO DI CONFERMA DI DUE CRITERI: **OSSERVATO**.
- DISPOSIZIONE VERTICALE DEL CONTENUTO: **VISIBILE SENZA TAGLI EVIDENTI** nelle porzioni acquisite; non costituisce una prova di ogni larghezza o orientamento.

**Da verificare con azioni distinte:** revoca della conferma dopo modifica, azzeramento al ricaricamento, assenza di connessione internet durante l'interazione, ingrandimento caratteri Android, disposizione orizzontale, leggibilità con strumenti assistivi, navigazione autenticata.

**Rilievi di usabilità e terminologia:** il testo è lungo e impone uno scorrimento significativo prima della conferma; informazioni su provvisorietà e assenza di salvataggio sono ripetute fra pagina e riquadro. Il dettaglio «Nucleo del curricolo locale: confrontare soluzioni» andrebbe denominato **«Riferimento curricolare locale proposto»**, poiché `confrontare soluzioni` nella fonte G03 è una competenza locale candidata, non uno dei nove nuclei fondanti verificati. Eventuali modifiche UI richiedono nuovo collaudo.

**Protezione dei dati:** conservare nella documentazione soltanto questi riscontri testuali, non trasferire le schermate originali (che contengono anche informazioni di sistema Android) nel repository. Nessun dato scolastico personale è stato inserito nel caso G04. Il riscontro resta una prova di dispositivo **parziale**, non autorizza integrazione o pubblicazione.

## Secondo riscontro da Android — stati 0, 1 e 2 criteri

Tre ulteriori schermate del 20 novembre 2026 documentano: **(1)** il criterio «Motivazione della scelta» selezionato e lo stato «1 criterio confermato solo per questa sessione»; **(2)** entrambi i criteri selezionati e lo stato «2 criteri confermati solo per questa sessione»; **(3)** entrambi i criteri non selezionati e il pulsante «Conferma la scelta». Il terzo stato è compatibile con l'azzeramento tramite ricaricamento, ma l'azione di ricarica non è visibile nella singola immagine. I tre stati principali di presentazione sono quindi **OSSERVATI** su smartphone, senza evidenti tagli di contenuto.

**Non ancora dimostrato dalle immagini:** lo stato *intermedio* immediatamente successivo alla deselezione di un criterio (prima di ripremere «Conferma la scelta»), che deve revocare la conferma. La logica automatizzata lo verifica, ma le nuove schermate non documentano la sequenza completa. Restano aperte la prova senza rete, l'ingrandimento dei caratteri di sistema, l'orientamento orizzontale e la navigazione autenticata. Le immagini originali non vengono copiate nel repository. Nessuna nuova funzione valutativa o integrazione con Registro è autorizzata da questi riscontri.

## G04e — Semplificazione dopo il collaudo su Android

Le immagini ricevute durante il collaudo reale mostrano che le due caselle e la conferma funzionano, ma che la presentazione iniziale impone uno scorrimento eccessivo. La modifica G04e **interviene sul componente già esistente**, non sul modello della lezione o sui contratti dei prodotti.

- **Gerarchia:** titolo «Cosa vuoi osservare?», due criteri sempre presenti, comando di conferma in posizione più vicina, stato visibile e annunciato.
- **Approfondimento su richiesta:** descrizione originale ed evidenza attesa di ciascun criterio restano integralmente disponibili mediante `details/summary`, inizialmente chiusi. Il contenuto pedagogico non viene sintetizzato né alterato dalla presentazione.
- **Dichiarazioni essenziali:** una breve nota ricorda che la scelta non è salvata, non produce voto e non è inviata al Registro; le spiegazioni estese di provenienza, non vigenza del master e assenza di approvazione sono disponibili in una sezione espandibile. L'intestazione del documento offline non ripete più gli stessi avvisi.
- **Precisione:** «confrontare soluzioni» è una *competenza locale candidata* e ora viene presentata come «Riferimento curricolare locale proposto», non come uno dei nove nuclei fondanti.
- **Compatibilità:** inalterati gli identificativi `HTC-PRIMA-B25-PLAN-v1`, `CR-G01-01/02`, la conferma solo in memoria e la revoca su modifica. Nessun intervento alla persistenza, all'azione di registrazione della lezione o a Registro Docente.

La procedura di prova in Chromium ora verifica la presenza delle due descrizioni complete, la loro apertura su richiesta, la terminologia corretta, l'ingombro verticale ridotto a 320/390 px, lo zoom simulato al 200% e il corretto funzionamento delle selezioni. Il pacchetto offline v1.1 deve essere rigenerato **dalla stessa revisione** del componente e distribuito soltanto come artefatto di prova privato.

**Stato:** modifica candidata in PR #801; il risultato automatico è distinto dal successivo riesame su Android reale. Non considerare il sistema curricolare approvato o l'integrazione con Registro Docente completata.

## G04e — Riscontro dal telefono Android sulla versione compatta v1.1

**Data:** 20 novembre 2026. Quattro ulteriori schermate dell'utilizzatore raffigurano la **nuova** interfaccia semplificata aperta in Chrome mediante documento locale `content://`, non la versione iniziale v1.0.

**Osservazioni documentate dalle immagini:**
- L'intestazione B25, il titolo «Cosa vuoi osservare?» e i due criteri sono visualizzati senza tagli orizzontali evidenti.
- Il pannello «Descrizione ed evidenza» del primo criterio è **aperto** nelle prime tre immagini, mostra la descrizione e il testo completo dell'evidenza attesa; quello del secondo criterio è chiuso. Il meccanismo di approfondimento su richiesta è quindi utilizzabile sul telefono.
- Nella seconda schermata il primo criterio è selezionato e compare **«Scelta confermata»** con **«1 criterio confermato solo per questa sessione»**.
- Nella terza entrambi i criteri sono selezionati e compare **«Conferma la scelta»** con **«2 criteri selezionati, in attesa della tua conferma»**. Il passaggio dalla seconda alla terza schermata è **coerente con la revoca automatica della conferma** dopo l'aggiunta del secondo criterio; la singola immagine non è una registrazione del gesto.
- Nella quarta entrambe le caselle sono vuote, le descrizioni sono chiuse e lo stato indica **«Nessun criterio selezionato»**. È uno stato compatibile con la ricarica; la fotografia non mostra direttamente l'azione di ricaricamento.
- L'espansione «Fonte, limiti e riferimenti» mostra la corretta denominazione **«Riferimento curricolare locale proposto»** e distingue la competenza candidata dal nucleo fondante.

**Esito:** `ANDROID_V1_1_VISUAL_FUNCTIONAL_PASS_WITH_OPEN_GAPS`. Il miglioramento della gerarchia e dell'ingombro rispetto alla versione iniziale risulta visivamente positivo; si conserva integralmente il contenuto pedagogico apribile su richiesta. Restano verifiche non dimostrate dalle fotografie: prova senza connettività abilitata, aumento del testo dalle impostazioni Android, orientamento orizzontale, assistenza alla navigazione e intero percorso autenticato in ambiente dimostrativo. Non sono state copiate nel repository le immagini originali né informazioni identificative del dispositivo.

**Decisione:** non aprire un ulteriore ciclo di rielaborazione cosmetica senza un difetto riproducibile. Conservare G04e come candidata qualificata dal collaudo automatico e dal riscontro visivo Android; passare a definire il **punto di ingresso in Registro Docente** rispettandone i contratti esistenti e impedendo trasmissioni di dati individuali. Nessuna fusione della PR #801, pubblicazione o acquisizione di criteri valutativi viene autorizzata da questo riscontro.
