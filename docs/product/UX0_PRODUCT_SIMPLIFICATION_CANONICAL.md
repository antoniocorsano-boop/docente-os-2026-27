# DOCENTE OS — UX-0 Product Simplification Canonical

Data: **2026-09-14**  
Stato: **CANONICAL / ACTIVE PROGRAM**  
Issue: **#368**  
Baseline di avvio: `develop@c553feae62e70b23aa932077ec43ed76ce3b075b`

## 1. Perché esiste UX-0

DOCENTE OS ha raggiunto una maturità elevata nel dominio, nella persistenza, nella sicurezza, nella provenance, nella governance delle scritture, nell'accessibilità automatizzata e nella coerenza visuale. Questo non implica automaticamente che l'esperienza sia semplice.

Il finding reale emerso dalla Beta è:

> molte superfici sono localmente corrette, ma il prodotto complessivo chiede ancora al docente troppe decisioni, troppe distinzioni concettuali e troppi passaggi per compiti che dovrebbero risultare immediati.

UX-0 tratta questo finding come requisito di prodotto e di maturità, non come rifinitura estetica.

DPG, WCAG, HVA, ASVS e i contratti di dominio restano validi. UX-0 copre una proprietà diversa: **il costo cognitivo del compito umano**.

## 2. Invariante fondamentale — Product Model ≠ User Model

Il Product Model può e deve restare ricco e rigoroso. Può contenere, fra gli altri:

- `TeachingSession`;
- `TeachingObservation`;
- `TeachingEvidenceReference`;
- `AnnualPlanBlockProgress`;
- `TemporalProjection`;
- `KnowledgeAsset`;
- UDA, versioni, provenance e receipt.

Il docente non deve conoscere né navigare questo modello per svolgere un compito ordinario.

Il User Model canonico per il ciclo didattico quotidiano è:

**Oggi → Classe → Lezione → Fatto**

Le entità interne devono governare l'effetto e la sicurezza dell'azione, non diventare categorie che l'utente deve apprendere per usare il prodotto.

## 3. North star

DOCENTE OS deve essere **semplice nonostante la propria sofisticazione**.

Per ogni stato operativo il docente deve poter capire, senza ricostruire il sistema:

1. dove si trova;
2. cosa richiede attenzione adesso;
3. qual è l'unica azione primaria utile;
4. cosa succederà se la esegue;
5. cosa resterà invariato o al sicuro;
6. quale sarà il passo successivo.

La complessità necessaria resta disponibile mediante progressive disclosure, non compete con il task corrente.

## 4. Regola anti-esposizione del dominio

Una separazione corretta nel dominio non obbliga a una separazione visibile nell'interfaccia.

Esempio: `TeachingSession` e `AnnualPlanBlockProgress` restano entità e decisioni distinte. L'interfaccia può però presentare al docente una sequenza umana semplice:

**Registra la lezione → ricevuta dell'accaduto → eventuale proposta separata “Considerala conclusa?”**

Il docente non deve scegliere tra nomi, storage boundary o route che esistono per ragioni architetturali.

## 5. Regola anti-feature-creep UX

Durante UX-0 una capability nuova non è un miglioramento se introduce una nuova scelta primaria visibile al docente.

Una nuova capacità deve, in ordine di preferenza:

1. essere assorbita da un task umano già esistente;
2. comparire contestualmente solo quando pertinente;
3. essere collocata in progressive disclosure;
4. diventare nuova destinazione primaria soltanto se esiste evidenza che rappresenta un compito professionale distinto e ricorrente.

Il default per nuova espansione funzionale durante UX-0 è **DEFERRED**, salvo:

- security/privacy/data-integrity fix;
- critical defect;
- requisito normativo urgente;
- `PROFESSIONAL_GAP_CONFIRMED` con evidenza esplicita.

## 6. Journey canoniche UX-0

La semplificazione viene valutata prima sulle cinque journey che rappresentano il lavoro ordinario del docente:

1. **Iniziare la giornata** — capire cosa viene prima senza esplorare l'app.
2. **Entrare in classe** — raggiungere il contesto della sezione e della lezione pertinente.
3. **Condurre una lezione** — avere a disposizione ciò che serve senza attraversare superfici di amministrazione del sistema.
4. **Chiudere una lezione** — registrare l'accaduto, aggiungere un'osservazione se utile e ricevere un feedback chiaro.
5. **Preparare la successiva** — ripartire dal contesto appena concluso, dai materiali e dal prossimo passo del percorso.

Journey ulteriori restano importanti, ma non possono impedire la semplificazione del core quotidiano.

## 7. Task Cost Model

Per ogni journey UX-0 deve esistere una baseline osservabile dei seguenti indicatori:

### TC-1 — Decisioni esplicite prima dell'obiettivo

Numero di scelte che l'utente deve compiere prima di eseguire il task principale.

Le conferme professionali obbligatorie non vengono eliminate; vengono conteggiate separatamente dalle scelte di navigazione o comprensione del sistema.

### TC-2 — Azioni concorrenti visibili

Numero di call-to-action percepibili come equivalenti o potenzialmente primarie nello stesso stato.

Target ordinario: **una azione primaria**; le altre devono risultare chiaramente secondarie o progressive.

### TC-3 — Surface transitions

Numero di cambi di superficie necessari per completare il task.

Un passaggio esiste solo se il cambio di contesto è necessario al lavoro umano, non perché il dominio software è separato.

### TC-4 — Internal concepts exposed

Numero di concetti interni che l'utente deve capire per prendere la decisione corretta.

Target per journey ordinaria: **zero concetti interni obbligatori**.

### TC-5 — Mandatory input burden

Informazioni che il docente deve reinserire anche se il sistema le possiede già nel contesto.

Target: nessuna reimmissione evitabile di classe, data, blocco, UDA, disciplina, orario o provenance.

### TC-6 — Recovery burden

Passaggi necessari dopo un errore per riprendere il task senza perdere lavoro o contesto.

La recovery deve riportare al punto di lavoro, non a una superficie generica.

## 8. Soglie iniziali

Le soglie sono target di progettazione e devono essere validate con HUMAN_USE, non trattate come certificazioni automatiche:

- prossimo passo identificabile entro **5 secondi**;
- task comune eseguibile con **1–2 decisioni esplicite** prima dell'azione, escluse conferme professionali obbligatorie;
- **una sola azione primaria** per stato operativo;
- **zero** comprensione obbligatoria di entità tecniche/interne;
- nessuna nuova destinazione primaria senza un task umano distinto;
- ritorno al contesto di origine dopo materiali, conoscenza o configurazioni contestuali;
- errore recuperabile senza ricostruire manualmente il task.

## 9. Information architecture — direzione, non scorciatoia

L'ipotesi da validare è che l'esperienza ordinaria richieda un set primario molto più piccolo dell'attuale tassonomia completa.

Candidati del livello primario:

**Oggi · Classi · Orario · Materiali**

Capability come Progetta, Piano annuale, Calendario, Impostazioni e Account restano disponibili ma possono essere secondarie, contestuali o raccolte in `Altro` quando non rappresentano il task corrente.

Questa ipotesi non autorizza da sola una modifica della navigazione. UX-0B deve confrontarla con le journey e con il costo del compito prima dell'integrazione.

## 10. Workspace Classe — finding iniziale

La Classe è il punto in cui la complessità del Product Model è più visibile.

Oggi la stessa superficie può esporre, correttamente ma in competizione:

- preparazione della prossima lezione;
- registrazione dell'accaduto;
- revisione del Piano annuale;
- conferma professionale di completamento;
- materiali predisposti;
- materiali rilevanti;
- ricerca in Conoscenza;
- Orario/Calendario in caso di contesto temporale incompleto;
- dettagli di cattedra e altri percorsi.

UX-0 deve trasformare questa ricchezza in una gerarchia task-first. Le capability non vengono eliminate: vengono mostrate quando sono utili alla decisione corrente.

## 11. Slice autorizzate

### UX-0A — Baseline e governance

- congelare Product Model ≠ User Model;
- introdurre Task Cost Model;
- aggiornare Masterplan, Human Contract, M5 readiness, CURRENT e indice canonico;
- nessuna modifica di runtime necessaria per chiudere la sola baseline.

### UX-0B — Information architecture

- misurare l'attuale navigazione sui cinque task;
- ridurre le destinazioni concorrenti nel percorso ordinario;
- preservare accesso completo tramite progressive disclosure/command palette;
- nessuna capability rimossa dal dominio.

### UX-0C — Classe task-first

- una sola priorità visibile per stato;
- `Classe → Lezione` come percorso dominante;
- materiali e stato del percorso contestuali;
- Piano, cattedra e diagnostica non competono con la lezione corrente.

### UX-0D — Chiusura lezione

- `Registra la lezione` come gesto umano unico;
- Observation disponibile senza diventare obbligo;
- receipt chiara;
- eventuale completamento del Piano proposto dopo, come decisione professionale distinta;
- nessuna esposizione necessaria di `TeachingSession` o `AnnualPlanBlockProgress`.

### UX-0E — Materiali e progettazione contestuali

- Conoscenza/Progetta/Canva/Drive entrano dal task corrente quando servono;
- ritorno garantito a classe/lezione;
- eliminare la necessità di “andare a cercare il modulo giusto” per completare il compito.

### UX-0F — Validazione HUMAN_USE

- osservazione dei cinque journey su Beta durante uso normale;
- registrazione friction/workaround/abbandoni in M5-02;
- confronto task-cost prima/dopo;
- nessuna chiusura UX-0 basata soltanto su machine gate.

## 12. Gate di chiusura UX-0

UX-0 non è `COMPLETE` finché non sono vere tutte le condizioni:

- le cinque journey dispongono di baseline task-cost prima/dopo;
- nessuna journey ordinaria richiede la comprensione del Product Model;
- le azioni primarie sono inequivoche nei principali stati;
- le capability secondarie restano raggiungibili senza competere con il task;
- mobile non introduce una tassonomia aggiuntiva o più profonda;
- DPG/HVA/WCAG/HIM restano verdi sulle slice applicabili;
- la HUMAN_USE evidence M5-02 mostra riduzione di friction e workaround;
- non sono state indebolite provenance, privacy, AAL2, RLS, human authority o invarianti didattiche.

## 13. Rapporto con i contratti esistenti

UX-0 non sostituisce i contratti esistenti.

- Security/RLS/domain invariants governano ciò che deve essere vero.
- Human Experience Contract governa come il compito deve essere percepito.
- UX-0 governa **quanto del Product Model è lecito esporre e quanto costa completare il task**.
- Design System governa la grammatica visuale.
- HVA/WCAG/DPG verificano proprietà complementari.
- M5-02 fornisce l'evidenza di uso umano necessaria per chiudere il finding.

## 14. Regola finale

> **La complessità appartiene al sistema; la semplicità deve appartenere al docente.**

Una soluzione tecnicamente più esplicita non è automaticamente un'esperienza migliore. Se il sistema conosce già il contesto, deve usarlo. Se una distinzione serve all'integrità del dominio, deve governare l'effetto senza obbligare il docente a impararla.