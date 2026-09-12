# DOCENTE OS — Sustained Pilot Evidence Canonical

Data: **2026-09-12**  
Programma: **M5-02 — Sustained Pilot Evidence**  
Stato: **COLLECTING / CANONICAL ON MERGE**

## 1. Scopo

M5-02 trasforma il normale uso del prodotto e i gate tecnici già esistenti in **evidenza longitudinale di maturità**, senza introdurre telemetria invasiva e senza confondere un singolo PASS con affidabilità sostenuta.

Principio:

> **la maturità non si deduce da una demo riuscita né da un singolo workflow verde: si dimostra osservando nel tempo le journey critiche, gli attriti reali, i fallimenti, i workaround e i recovery.**

## 2. Confine privacy

Il programma M5-02 opera esclusivamente nel perimetro già ammesso:

`TIER_1_OWNER_PROFESSIONAL_NON_PERSONAL`

Sono vietati nel ledger:

- nomi, identificativi o altri dati personali di alunni, famiglie, colleghi o terzi;
- contenuto grezzo di registri, note o documenti scolastici personali;
- credenziali, token, segreti o URL contenenti segreti;
- registrazione di battiture o sorveglianza continua della sessione;
- screen recording automatico;
- acquisizione automatica di contenuto della lezione;
- inferenze sul comportamento di alunni o terzi.

Sono ammessi soltanto metadati professionali e operativi minimi, per esempio:

- journey tentata;
- esito;
- data/ora;
- ambiente e release/SHA quando noti;
- classe di errore, non contenuto personale;
- presenza di workaround;
- receipt o run id di un gate;
- nota professionale sintetica del docente, senza dati di terzi.

## 3. Tipi di evidenza

Il ledger usa esclusivamente le categorie:

- `MACHINE_GATE` — CI/gate automatico su exact SHA;
- `RUNTIME_SMOKE` — prova del runtime distribuito;
- `HUMAN_USE` — uso professionale realmente avvenuto e registrato esplicitamente;
- `FRICTION` — attrito o passaggio inutilmente difficile;
- `INCIDENT` — errore o indisponibilità con impatto reale;
- `WORKAROUND` — uscita dal percorso normale per completare il lavoro;
- `RECOVERY` — ripristino dopo fault o regressione;
- `ACCESSIBILITY_FINDING` — finding di accessibilità osservato sul prodotto.

Un'evidenza `MACHINE_GATE` non può essere reinterpretata come `HUMAN_USE`.

## 4. Journey critiche

Le journey M5 canoniche sono:

### J1 — Avvio giornata

`login → Home/Oggi`

### J2 — Entrata in classe

`Home/Oggi → classe → attività/lezione corrente`

### J3 — Svolgimento e registrazione

`lezione → materiale → svolgimento → Registra la lezione`

### J4 — Evidenza professionale

`registrazione → Diario / TeachingSession / avanzamento Piano`

### J5 — Progettazione

`Progetta → UDA → versione → export professionale`

### J6 — Conoscenza

`Conoscenza → fonte → trasformazione → provenienza → riuso`

### J7 — Tempo scolastico

`Orario + Calendario → proiezione giornaliera`

### J8 — Planner assistito

`Planner → proposta assistita → conferma umana → undo/recupero quando necessario`

### J9 — Contesto docente

`Impostazioni → contesto docente → riuso coerente nelle altre superfici`

## 5. Esiti di una osservazione

Per ogni evento umano o runtime pertinente:

- `SUCCESS` — journey completata senza deviazione sostanziale;
- `SUCCESS_WITH_FRICTION` — completata ma con attrito significativo;
- `WORKAROUND_REQUIRED` — completata uscendo dal percorso normale;
- `FAILED_RECOVERABLE` — non completata al primo tentativo ma recuperata;
- `FAILED_BLOCKING` — lavoro non completabile nel contesto osservato;
- `NOT_APPLICABLE` — evento registrato ma non pertinente a una journey.

La classificazione deve descrivere ciò che è realmente avvenuto. Non è un voto al prodotto.

## 6. Metriche da derivare

Quando esisterà un campione sufficiente, M5-02 potrà derivare almeno:

- numero di tentativi per journey;
- tasso di completamento;
- quota `SUCCESS_WITH_FRICTION`;
- quota `WORKAROUND_REQUIRED`;
- errori recuperabili e bloccanti;
- tempo di recupero quando misurabile senza telemetria invasiva;
- ricorrenza dei medesimi finding;
- finding aperti/chiusi;
- relazione fra regressioni automatiche e problemi osservati nel pilot.

## 7. Divieto di soglie premature

M5-02 **non congela ancora SLO numerici**.

Prima si raccoglie la distribuzione reale. Soltanto dopo una finestra sufficiente il programma M5-05 potrà proporre SLI/SLO ed error budget basati su dati osservati.

Sono vietate soglie inventate soltanto per dichiarare M5 più vicino.

## 8. Finestra minima di osservazione

La chiusura M5-02A richiede una finestra che attraversi **normale attività scolastica**, non una sessione di collaudo concentrata.

La finestra viene considerata sufficiente soltanto quando:

1. comprende più giornate operative reali;
2. include almeno le journey J1–J6 in uso reale oppure una motivazione esplicita per quelle non applicabili;
3. include sia successi sia eventuali attriti/fallimenti reali, senza selezione opportunistica;
4. consente di distinguere problemi isolati da pattern ricorrenti;
5. non viola il perimetro Tier 1.

Il numero definitivo di giornate o tentativi non viene fissato a priori finché non esiste una prima baseline osservata.

## 9. Struttura della ledger

La fonte machine-readable è:

`ops/pilot-evidence-ledger.json`

Ogni entry deve contenere almeno:

- `id` univoco;
- `observedAt`;
- `evidenceType`;
- `journeyId` oppure `null` se non applicabile;
- `outcome`;
- `environment`;
- `sourceRef` verificabile quando disponibile;
- `summary` non personale;
- `containsSchoolPersonalData = false`;
- `requiresFollowUp`;
- eventuale `relatedFindingId`.

Le evidence append-only non devono essere riscritte per migliorare retroattivamente il risultato. Un finding chiuso genera una nuova evidence entry di closure.

## 10. Evidence iniziale ammessa

La ledger può iniziare con ricevute macchina già verificate, per esempio:

- chiusura DPG-2 sull'exact head certificato;
- Product CI / HIM / HVA / P6 / X4 / X5 / X5B / K1 / P7 della stessa candidata;
- gate `release-engineering/policy` sulle tranche M5-01;
- smoke Production storici già dotati di receipt.

Queste prove stabiliscono la baseline tecnica, ma **non chiudono M5-02** perché manca ancora l'evidenza umana longitudinale.

## 11. User friction log

Un attrito osservato deve essere registrato anche quando il docente riesce comunque a completare il lavoro.

Esempi ammessi:

- azione difficile da trovare;
- passaggio duplicato;
- vista non fruibile su mobile;
- terminologia ambigua;
- tabella non scorrevole;
- contesto insufficiente;
- materiale non raggiungibile nel momento della lezione.

La soluzione non cancella l'evidenza originaria: aggiunge una closure evidence collegata.

## 12. Relazione con HVA e gate tecnici

HVA, DPG, Product CI e i gate verticali restano **assurance automatica**.

M5-02 aggiunge una domanda diversa:

> **il prodotto continua a funzionare bene nel normale lavoro professionale, nel tempo?**

La risposta richiede sia ricevute automatiche sia esperienza d'uso reale.

## 13. Criteri di chiusura

### M5-02A — Pilot longitudinal evidence

`COMPLETE` soltanto con evidence pack longitudinale sufficiente e non selettivo.

### M5-02B — Critical journey success

`COMPLETE` quando tutte le journey obbligatorie hanno evidenza reale ripetuta e un roll-up leggibile di esiti/attriti.

### M5-02C — User friction / failure log

`COMPLETE` quando esiste un registro append-only, i finding hanno stato e closure evidence, e nessun problema ricorrente significativo resta invisibile al processo di maturazione.

## 14. Rapporto con M5-05

M5-02 produce la baseline empirica.

M5-05 userà quella baseline per definire:

- SLI;
- SLO;
- error budget;
- soglie di escalation;
- eventuale release freeze.

L'ordine è obbligatorio: **misurare prima, fissare target dopo**.
