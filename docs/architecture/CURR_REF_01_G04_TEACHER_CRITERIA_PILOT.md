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

## Confini e decisione successiva
Questa è **qualificazione dell'usabilità locale**, non un flusso Arena → Docente OS → Registro né l'approvazione dei criteri. Per rendere la scelta persistente o effettivamente utilizzabile nel Registro serve una decisione distinta su contratto, identità, autorizzazione del docente e vincoli di protezione dei dati; non usare il medesimo formato per trasferire osservazioni individuali.

Non integrare in `main`, non distribuire a studenti e non avviare deploy senza decisione separata. Non interferire con le attività DOC-01/VAL-01 già in corso in Registro Docente.
