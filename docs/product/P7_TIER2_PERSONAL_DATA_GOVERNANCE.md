# P7 — Tier 2 Personal Data Governance

Stato: **FOUNDATION READY / TIER 2 BLOCKED**

Questa tranche non autorizza dati personali scolastici. Definisce il percorso minimo e verificabile che deve essere completato prima che una futura decisione umana possa valutare l'ammissione del `TIER_2_SCHOOL_PERSONAL_DATA`.

## Baseline corrente

- Production: `ACTIVE_SINGLE_OWNER_PILOT`;
- Tier 1 autorizzato: `TIER_1_OWNER_PROFESSIONAL_NON_PERSONAL`;
- Tier 2: `NOT_ADMITTED`;
- signup pubblico: OFF;
- multi-tenant onboarding: OFF;
- migrazione automatica Beta → Production: OFF;
- credenziali e segreti: mai ammessi come contenuto;
- dati appartenenti a categorie particolari: non coperti dal Tier 2 ordinario e soggetti a gate ulteriore dedicato.

## Quattro workstream obbligatori

### T2A — Data minimization policy

Deve definire categorie ammesse e vietate, scopo del trattamento e regole di minimizzazione a livello di campo. L'obiettivo non è raccogliere tutto ciò che il prodotto potrebbe tecnicamente conservare, ma soltanto ciò che è necessario per una funzione didattico-professionale dichiarata.

### T2B — Application retention and deletion

Deve distinguere il ciclo di vita applicativo dalla retention dei backup. Occorrono una policy applicativa, semantica di cancellazione documentata, confine con backup/restore e almeno una prova di cancellazione riproducibile.

### T2C — Personal-data export and deletion procedure

Deve esistere una procedura deterministica per individuare, esportare e cancellare i dati riferibili a un interessato nel perimetro dell'applicazione, con autenticazione della richiesta e ricevuta dell'operazione.

### T2D — Dedicated privacy review

Deve riesaminare scopi, flussi dati, accessi e rischi residui sul sistema reale. Questo gate è una verifica di governance/prodotto; non deve essere rappresentato come certificazione legale automatica.

## Regola di blocco

Il Tier 2 resta `NOT_ADMITTED` finché tutti e quattro i workstream non sono `SATISFIED` con evidenza verificabile. Anche dopo la chiusura tecnica, l'ammissione non è automatica: occorre una nuova decisione umana esplicita.

## Sequenza autorizzata

Il primo incremento è `T2A_DATA_MINIMIZATION_POLICY`. I workstream successivi non devono essere marcati soddisfatti per mera documentazione: ciascuno richiede evidenza coerente con il relativo contratto.
