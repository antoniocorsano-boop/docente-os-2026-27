# DOCENTE OS — UX-0 Product Simplification Canonical

Data di consolidamento: **2026-09-14**  
Stato: **CANONICAL / UX-0F HUMAN_USE VALIDATION ACTIVE**  
Autorità: **#368 — UX-0 Product Simplification**  
Baseline di avvio UX-0: `develop@c553feae62e70b23aa932077ec43ed76ce3b075b`  
Baseline runtime per UX-0F: `develop@3605912f764468b547aeb344c29f548734eca123`

## 1. Decisione

DOCENTE OS può mantenere un Product Model ricco e rigoroso, ma il docente non deve comprenderlo per completare il lavoro ordinario.

**Product Model ≠ User Model.**

Il modello percepito del ciclo quotidiano deve convergere verso:

**Oggi → Classe → Lezione → Fatto**

La complessità necessaria appartiene al sistema; la semplicità appartiene al docente.

UX-0 misura una proprietà distinta da DPG, WCAG, HVA, HIM, ASVS e dai contratti di dominio: il **costo cognitivo e operativo del task umano**.

## 2. Invarianti

UX-0 non autorizza:

- fusione tra `TeachingSession`, `AnnualPlanBlockProgress`, `KnowledgeAsset`, UDA o altre entità dominio;
- perdita di provenance, RLS, AAL2, idempotenza o human authority;
- auto-mutazione del Piano/UDA;
- uso di dati personali di studenti per la validazione;
- nuove feature surface come scorciatoia per risolvere la complessità esistente.

Le separazioni interne governano gli effetti e la sicurezza delle azioni, non diventano categorie obbligatorie per l’utente.

## 3. North star e regola WHY NOW?

Per ogni stato operativo il docente deve poter capire:

1. dove si trova;
2. cosa richiede attenzione adesso;
3. qual è l’unica azione primaria utile;
4. cosa succederà eseguendola;
5. quale sarà il passo successivo.

Ogni informazione, controllo, CTA o destinazione primaria deve rispondere alla domanda:

> **Perché il docente deve vedere o decidere questa cosa adesso per completare il compito corrente?**

Se la risposta non è concreta, la capacità può restare disponibile ma deve diventare contestuale, secondaria o progressive.

## 4. Regola anti-feature-creep

Durante UX-0 il default per nuova espansione funzionale è **DEFERRED**, salvo:

- sicurezza, privacy o data integrity;
- critical defect/regressione;
- accessibilità;
- requisito normativo urgente;
- prerequisito indispensabile alla semplificazione;
- `PROFESSIONAL_GAP_CONFIRMED` con evidenza esplicita.

Una capability nuova non giustifica una nuova scelta primaria quando può essere assorbita da un task esistente.

## 5. Journey canonici UX-0

1. **Iniziare la giornata** — capire cosa viene prima senza esplorare l’app.
2. **Entrare in classe** — raggiungere sezione e lezione pertinente con orientamento immediato.
3. **Condurre una lezione** — avere supporti e materiali nel momento d’uso, senza attraversare superfici di amministrazione del sistema.
4. **Chiudere/registrare una lezione** — registrare l’accaduto senza dover comprendere il modello interno.
5. **Preparare la successiva** — trovare/preparare ciò che serve mantenendo il contesto e tornando al task.

## 6. Task Cost Model

Per ciascun journey si registrano almeno:

- **TC-1 Decision count** — scelte necessarie prima dell’obiettivo;
- **TC-2 Competing actions** — azioni percepite come equivalenti/primarie nello stesso stato;
- **TC-3 Surface transitions** — cambi di superficie necessari;
- **TC-4 Internal concepts exposed** — concetti interni necessari per decidere correttamente;
- **TC-5 Mandatory input burden** — informazioni reinserite nonostante siano già note al sistema;
- **TC-6 Recovery burden** — lavoro richiesto per riprendere il task dopo un errore.

Il confronto valido è **before → after sullo stesso compito**. Dove la baseline originaria è qualitativa, non si inventano numeri retrospettivi.

Target di progettazione da validare con HUMAN_USE:

- prossimo passo identificabile rapidamente;
- normalmente 1–2 decisioni esplicite prima dell’azione, escluse conferme professionali necessarie;
- una sola CTA primaria per stato;
- zero comprensione obbligatoria di entità tecniche/interne;
- nessuna reimmissione evitabile del contesto;
- ritorno al contesto di origine dopo capability contestuali;
- recovery senza ricostruire manualmente il task.

## 7. Slice UX-0

### UX-0A — Baseline e governance

Congela Product Model ≠ User Model, Task Cost, WHY NOW? e freeze di espansione. La baseline storica è `product/design/reviews/UX-0A-BASELINE.md`.

### UX-0B — Information architecture

Riduce le destinazioni concorrenti e separa task primari da capability secondarie.

### UX-0C — Classe task-first

Rende la Classe launcher del task corrente con una sola priorità e una CTA primaria per stato.

### UX-0D — Chiusura lezione

Porta il gesto a `Lezione → conferma cosa è accaduto → Registra → Fatto`, nascondendo il modello interno senza cambiare semantica o autorità.

### UX-0E — Capability contestuali

Materiali/Conoscenza/Progetta sostengono il task corrente e preservano il ritorno a Classe/Preparazione; non competono come destinazioni primarie.

UX-0E è integrata in `develop@3605912f764468b547aeb344c29f548734eca123` e certificata sul runtime Beta con P6, K1, X3 e HVA.

### UX-0F — HUMAN_USE validation

UX-0F è validation-only:

- osserva i cinque journey sulla Beta durante uso umano reale;
- registra `PASS | FRICTION | WORKAROUND | FAIL`;
- confronta Task Cost before→after;
- conserva friction e workaround come evidence, senza riscrivere la storia;
- usa HVA/DPG/WCAG/HIM/P6 come evidenze complementari, non sostitutive;
- non introduce nuove feature salvo finding separato e dimostrato.

Issue operativa: **#383**.

## 8. Gate di chiusura UX-0 / M5-00D

UX-0 e `M5-00D — Critical journey simplification / Task Cost` possono essere chiusi soltanto se:

- tutti e cinque i journey sono stati eseguiti in HUMAN_USE sul runtime canonico;
- esiste evidence task-cost before→after;
- nessun journey ordinario richiede comprensione del Product Model;
- le azioni primarie risultano inequivoche nei passaggi critici;
- capability secondarie restano raggiungibili senza competere con il task;
- mobile non introduce una tassonomia aggiuntiva;
- eventuali friction/workaround bloccanti sono aperti come finding separati;
- DPG/HVA/WCAG/HIM e gate tecnici applicabili restano verdi;
- provenance, privacy, AAL2, RLS, human authority e invarianti didattiche restano intatti.

Un machine gate verde **non è HUMAN_USE** e non può da solo promuovere `M5-00D` a COMPLETE.

## 9. Rapporto con M5-02

UX-0F produce una receipt HUMAN_USE puntuale necessaria per chiudere il finding Product Simplification. Non equivale automaticamente alla sufficiente evidenza longitudinale richiesta da `M5-02A/B/C`.

La maturità generale M5 richiede ancora, separatamente, continuità d’uso su più giornate, trend di friction/workaround/failure, accessibilità manuale/assistive, security mapping e gli altri gate della matrice M5.

## 10. Autorità documentale

- Parent e autorità corrente: **#368**.
- UX-0F: **#383**.
- `product/design/PRODUCT-SIMPLIFICATION.md` resta il contratto operativo breve.
- `product/design/reviews/UX-0A-BASELINE.md` resta la baseline storica e non deve essere riscritta per migliorare retroattivamente l’esito.
- `product/design/reviews/UX-0F-HUMAN-USE-VALIDATION.md` è la receipt conclusiva da completare con uso reale.

I riferimenti storici a #370 possono essere riallineati dove indicano erroneamente l’autorità corrente, preservando comunque la storia di convergenza delle issue.
