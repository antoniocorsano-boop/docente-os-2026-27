# DOCENTE OS — Contratto Beta → produzione

Data: 2026-08-24  
Stato: **P7-A / CONTRACT ONLY — PRODUCTION NOT CREATED**

## 1. Scopo

Questo contratto definisce quando un commit già verificato sul Beta può diventare un candidato di produzione. Non crea un ambiente produzione e non autorizza automaticamente alcun deploy.

Principio: **produzione è una decisione di rilascio tracciata, non il nome di un servizio**.

## 2. Invarianti

1. Il candidato nasce da `develop` ed è identificato da uno SHA immutabile.
2. Il Beta deve aver servito quello SHA o uno stato `product/` dimostrabilmente equivalente.
3. La decisione finale di promozione resta umana ed esplicita.
4. Nessuna promozione automatica verso produzione è autorizzata.
5. La topologia dati della produzione deve essere decisa esplicitamente prima dell'attivazione: ambiente separato oppure condivisione eccezionale formalmente approvata. `UNDECIDED` blocca la produzione.
6. Segreti e URL di produzione devono essere environment-scoped; non si riutilizzano implicitamente configurazioni Beta.
7. Migrazioni distruttive del database non sono ammesse nel percorso ordinario di promozione.
8. Il rollback applicativo può tornare soltanto a uno SHA precedentemente certificato.
9. Il rollback del database non è automatico: finché il restore rehearsal non è provato, si opera per forward recovery.
10. Storage non viene modificato/distrutto come parte di un rollback applicativo senza backup verificato.
11. Ogni rilascio richiede una receipt con candidato, gate, decisione, destinazione e rollback target.

## 3. Gate minimi di un candidato

Prima della decisione umana devono risultare verdi, sul candidato o sullo stato prodotto equivalente previsto dal relativo gate:

- Product CI;
- `ops-security/supabase`;
- `ops-security/dependencies`;
- `ops-health/render-beta`;
- `p6-performance/render-beta`;
- `x3-e2e/render-beta`;
- `x4-planner/render-beta`;
- `x5-authoring/render-beta`;
- `x5b-export/render-beta`;
- `hva/runtime`.

Un gate assente non equivale a PASS. Se una capability non è toccata e il workflow non viene eseguito per path filtering, la release receipt deve collegare l'ultima evidenza ancora applicabile e spiegare perché il commit corrente è equivalente per quel perimetro.

## 4. Precondizioni non ancora soddisfatte

Al momento della definizione P7-A:

- l'ambiente produzione non è creato;
- la topologia dati produzione è `UNDECIDED`;
- il restore rehearsal isolato non è stato eseguito perché l'ambiente Supabase isolato disponibile tramite Branching richiede un piano superiore;
- la replica/backup off-site degli oggetti Storage non è ancora definita;
- il load/scale su dataset significativamente maggiori non è ancora provato.

Questi elementi non impediscono di definire il contratto, ma impediscono di dichiarare una produzione definitiva pronta.

## 5. Procedura di promozione

1. **Congelare il candidato**: registrare SHA, data, baseline dati e release scope.
2. **Raccogliere evidenze**: verificare i gate minimi e produrre una matrice PASS/FAIL/NOT-RUN con motivazione per ogni NOT-RUN.
3. **Verificare migrazioni**: nessuna migrazione distruttiva; ogni cambiamento schema deve essere compatibile con rollback applicativo o forward recovery.
4. **Verificare dati e segreti**: topologia dati non `UNDECIDED`, URL e segreti production-scoped, nessun riuso implicito del Beta.
5. **Definire rollback target**: SHA precedente certificato e ancora compatibile con schema/dati correnti.
6. **Decisione umana**: `PROMOTE`, `HOLD` oppure `REJECT`, con motivazione registrata.
7. **Deploy**: soltanto dopo `PROMOTE`, senza mutare lo SHA candidato.
8. **Smoke post-deploy**: build-info, login, Auth, DB/RLS, superfici critiche e capability di scrittura controllata.
9. **Receipt finale**: URL produzione, SHA effettivo, esiti smoke, timestamp, decisione e rollback target.

## 6. Rollback

### Applicazione

Rollback = redeploy dello **SHA certificato precedente**. Non si ricostruisce il codice da un branch mobile e non si produce un nuovo artefatto logicamente diverso sotto lo stesso identificatore di release.

### Database

Nessun rollback automatico di schema o dati. Finché il restore rehearsal non è `PASS`, un problema dati richiede `HOLD`/incident response e forward recovery. Una migrazione che richiederebbe un rollback distruttivo non è promuovibile con questo contratto.

### Storage

Un rollback applicativo non cancella o sovrascrive oggetti Storage. Operazioni distruttive richiedono backup verificato e procedura separata.

## 7. Release receipt minima

La receipt deve contenere almeno:

- `candidateSha`;
- `previousCertifiedSha`;
- `betaObservedSha` o equivalenza prodotto dimostrata;
- `productionUrl`;
- `productionDataTopology`;
- elenco gate con stato e evidence URL/run id;
- elenco migrazioni incluse;
- `rollbackTargetSha`;
- decisione umana e motivazione;
- timestamp promozione;
- smoke post-deploy;
- eventuali watch/residui accettati.

## 8. Stato P7-A

**CONTRACT READY / PRODUCTION NOT CREATED.**

Il contratto è sufficientemente definito per impedire promozioni accidentali o ambigue. La tranche successiva non deve creare produzione finché la topologia dati, il livello di backup/restore richiesto e il perimetro di release iniziale non sono stati esplicitamente risolti.
