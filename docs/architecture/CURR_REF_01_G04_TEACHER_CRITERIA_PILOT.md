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
