# DOCENTE OS — Release Engineering Canonical

Data: **2026-09-12**  
Programma: **M5-01 — Repository Hygiene & Release Engineering**  
Stato: **CANONICAL ON MERGE**

## 1. Scopo

Questa specifica aggiunge una disciplina di release sopra i meccanismi di promozione Production già esistenti. Non introduce un secondo deploy system e non sostituisce `ops/production-promotion-contract.json`.

Principio:

> **una release è una versione leggibile e tracciabile che identifica uno SHA immutabile già sottoposto ai gate applicabili; la promozione Production resta una decisione umana separata e certificata.**

## 2. Confini

Restano invariati:

- `develop` come branch sorgente dei candidati;
- promozione Production tramite exact SHA immutabile;
- Production separata dal Beta;
- auto-deploy Production disabilitato;
- rollback applicativo verso SHA precedentemente certificato;
- nessun rollback distruttivo automatico del database;
- nessuna cancellazione Storage implicita nel rollback applicativo.

## 3. Versioning

DOCENTE OS adotta **Semantic Versioning** come identità di release.

### Prima di M5

Finché il prodotto resta M4:

- il major resta `0`;
- le release promuovibili assumono forma `0.MINOR.PATCH`;
- una release candidate assume forma `0.MINOR.PATCH-rc.N`;
- una modifica del codice dopo il freeze di una RC richiede una nuova RC;
- lo SHA associato a una RC non può essere spostato.

### M5

`1.0.0` è riservata alla decisione esplicita **M5 — GENERALLY DISTRIBUTABLE MATURE PRODUCT**. Non può essere usata per anticipare una maturità non dimostrata.

La versione presente in `product/package.json` resta la sorgente package/runtime; l'adozione della policy non forza un bump immediato.

## 4. Stati di release

- `DRAFT` — versione proposta, non congelata;
- `RC` — candidata congelata su exact SHA;
- `CERTIFIED` — RC con tutti i gate richiesti PASS o con equivalenza formalmente documentata;
- `PROMOTED` — release certificata effettivamente promossa nell'ambiente target;
- `SUPERSEDED` — release/candidata superata da una successiva;
- `ROLLED_BACK` — release ritirata operativamente tramite redeploy di un precedente SHA certificato.

`CERTIFIED` non significa automaticamente `PROMOTED`.

## 5. Freeze di una Release Candidate

Una RC deve dichiarare almeno:

- `releaseVersion`;
- `candidateSha`;
- `sourceBranch = develop`;
- scope della release;
- elenco delle capability/moduli modificati;
- changelog;
- matrice dei gate applicabili;
- inventario delle migrazioni incluse;
- precedente SHA certificato;
- rollback target previsto;
- known residuals/watch.

Il tag deve avere forma `v<versione>` e deve risolvere allo SHA candidato esatto.

## 6. Matrice dei gate

I gate non sono un elenco fisso identico per ogni cambiamento. Sono composti da:

### Permanenti

- Product CI;
- operational security;
- dependency security;
- Production Readiness Review;
- Production Promotion Contract.

### Condizionali per superficie

- DPG-1/DPG-2 se cambia UI/design;
- Human Interaction Model se cambia interazione;
- Human + Visual Acceptance se cambia esperienza/runtime;
- P6 se il cambiamento può influire su prestazioni;
- K1 per Conoscenza;
- X4 per write assistita Planner;
- X5/X5B per authoring/export UDA;
- P7/privacy gates per percorsi dati e anonimizzazione;
- altri gate verticali già canonici quando la release tocca il relativo dominio.

Un gate non eseguito non equivale a PASS. La receipt deve indicare `NOT_APPLICABLE` oppure collegare un'evidenza ancora valida e motivarne l'equivalenza.

## 7. RC → Certified

Una RC può diventare `CERTIFIED` soltanto quando:

1. il tag punta allo SHA congelato;
2. la build è riproducibile dal medesimo SHA;
3. tutti i gate applicabili sono PASS;
4. il changelog è coerente con il diff;
5. le migrazioni sono inventariate e non richiedono rollback distruttivi non provati;
6. esiste un precedente SHA certificato compatibile come rollback target, salvo la prima release assoluta;
7. known residuals e limitazioni sono espliciti;
8. la decisione di certificazione è registrata.

## 8. Certified → Promoted

La promozione usa **esclusivamente** il contratto già esistente:

- `ops/production-promotion-contract.json`;
- `ops/production-readiness-review.json`;
- `ops/production-release-receipt.json`;
- workflow Production Runtime Smoke.

La release versionata aggiunge identità e tracciabilità; non autorizza deploy automatici.

Dopo il deploy deve essere dimostrato che Production serve lo SHA esatto promosso.

## 9. Rollback

Il rollback ordinario è:

`release problematica → HOLD/incident → redeploy previousCertifiedSha`

Vincoli:

- il target deve essere già certificato;
- la compatibilità con lo schema corrente deve essere verificata;
- il database non viene automaticamente retrocesso;
- Storage non viene distrutto o riscritto automaticamente;
- il rollback deve produrre una receipt con causa, SHA ritirato, SHA ripristinato, esito smoke e follow-up.

## 10. Changelog

`CHANGELOG.md` è il registro umano delle modifiche di release.

Regole:

- sezione `Unreleased` sempre presente;
- ogni release promossa sposta le voci applicabili sotto la propria versione/data;
- distinguere almeno `Added`, `Changed`, `Fixed`, `Security`, `Deprecated`, `Removed` quando pertinenti;
- non registrare refactoring interni irrilevanti per operatività o assurance salvo impatto su maturità/gate;
- linkare PR/receipt quando utile.

Il changelog non sostituisce le receipt machine-readable.

## 11. Pilot storico del 25 agosto 2026

La promozione Production già certificata del 25 agosto resta valida come evidenza P7, ma non le viene attribuita retroattivamente una versione SemVer inventata.

Classificazione:

`LEGACY_UNVERSIONED_CERTIFIED_PILOT`

La prima release prodotta sotto M5-01 sarà la prima release formalmente versionata secondo questa policy.

## 12. Criteri M5-01

- **M5-01B Versioning**: chiuso quando questa policy e il validator sono integrati;
- **M5-01C Release Candidate**: chiuso quando il contratto RC è machine-verifiable;
- **M5-01D GitHub Release / changelog**: resta PARTIAL finché non viene prodotta una release reale con tag, GitHub Release, changelog e receipt; non si crea una release fittizia per chiudere il gate.

## 13. Anti-pattern vietati

- spostare un tag RC/stable su un nuovo SHA;
- chiamare release un branch mobile;
- promuovere Production perché `develop` è verde senza release decision;
- retro-etichettare una vecchia Production con una versione non realmente emessa;
- modificare codice dopo certificazione mantenendo la stessa versione/RC;
- trattare GitHub Release come prova sufficiente di Production;
- usare `1.0.0` prima della decisione M5.
