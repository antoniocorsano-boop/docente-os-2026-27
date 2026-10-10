# DOC-MAT-INT-01 — STEP 1A Materiali / Human Review

Data: 2026-10-07  
Stato: **REWORK — BOUNDED**

## Scopo

Human Review finale della fondazione Materiali, PR #692, senza nuove feature e senza merge.

Candidato osservato:

`c6d877cb6d92d32e663f86ecdc88822dd377cc4d`

PR: `#692 — Progetta — UDA → Studio Atlas material handoff`  
Branch: `feat/uda-atlas-material-binding`

## Evidenze automatiche verificate

Sullo stesso exact head risultano verdi:

- Product CI;
- Browser Certification Orchestrator;
- Human Interaction Model;
- WCAG 2.2 AA;
- P6 Performance;
- ASVS 5.0;
- Governed MFA Queue Hygiene;
- TRAMA Perceptible Write;
- Design Policy Gate;
- Certification Impact Classifier;
- X5 UDA Versioned Authoring;
- X5B Professional UDA Export.

Il run browser `37607069538` ha eseguito HVA FULL. I test HVA risultano 85 PASS e 1 SKIP; WCAG risulta 30/30 PASS; P6 risulta 1/1 PASS. Non risultano finding automatici.

Queste evidenze confermano stabilità tecnica generale, ma non chiudono il gate visuale umano.

## HR-01 — Evidenza visuale non disponibile nel pacchetto di certificazione

**Classificazione:** BLOCKER DI REVIEW / EVIDENCE GAP  
**Esito:** REWORK

La ricevuta HVA generata dal workflow mantiene correttamente:

- `visual = REVIEW_REQUIRED`;
- `designGovernance = REVIEW_REQUIRED`.

Il contratto canonico `product/design/VISUAL-ACCEPTANCE.md` impone che una modifica visuale venga giudicata osservando screenshot e percorso reale e vieta di inferire PASS da browser/build/DPG statici verdi.

L'artifact GitHub `browser-certification-37607069538` associato all'exact head contiene soltanto:

- `product/test-results/p6-performance-receipt.json`;
- `product/playwright-report/index.html`;
- `/tmp/docente-os-browser-certification.log`.

Non contiene gli screenshot per superficie/viewport né `acceptance.json` / `acceptance.md` come file direttamente ispezionabili, nonostante il contratto HVA li indichi come evidenze del gate.

Di conseguenza non è possibile esprimere in modo conforme il giudizio Human Visual Acceptance su:

- schermata UDA con CTA `Prepara materiali con Atlas`;
- schermata `Associa i materiali alla lezione`;
- gerarchia primaria/secondaria;
- fruibilità mobile reale;
- stati di errore/recupero del ritorno Atlas.

**Correzione richiesta, senza feature prodotto:** rendere disponibile nel prossimo run il pacchetto HVA completo con screenshot e receipt ispezionabili per le superfici interessate, quindi rieseguire il giudizio DPG-05/06/07/08/09/10/11/12/15/17/18.

## HR-02 — Associazione multi-materiale può terminare con persistenza parziale

**Classificazione:** P2 — affidabilità / coerenza del gesto umano  
**Esito:** REWORK

La server action `bindAtlasMaterialsToLesson` itera gli elementi del `MaterialBundle` e per ciascuno esegue separatamente:

1. `addToolProposalOnce(...)`;
2. `accept(...)` se necessario.

Il repository sottostante esegue insert/RPC separati. Non esiste una transazione che comprenda l'intero bundle.

Se, per esempio, il primo materiale viene accettato e il secondo fallisce, il `catch` restituisce:

`Non è stato possibile associare i materiali. Riprova senza perdere la selezione.`

ma il primo materiale può essere già persistito/accettato. Il retry è in larga parte idempotente grazie al `dedupeKey`, ma il gesto umano `Associa i materiali alla lezione` può quindi produrre uno stato parziale non dichiarato se l'utente non riprova o abbandona il flusso.

Questo non è compatibile con una chiusura Human Review affidabile del gesto complessivo.

**Correzione richiesta:** scegliere e testare una sola semantica esplicita:

- preferibile: associazione atomica del bundle nel trusted boundary; oppure
- se l'atomicità non è praticabile senza ampliare troppo il perimetro, stato/progresso di associazione esplicito e recuperabile che non comunichi un fallimento totale dopo scritture parziali.

La correzione deve preservare l'idempotenza e non introdurre un archivio parallelo.

### Chiarimento retrospettivo HR-02 — 2026-10-09

Sul candidato `c6d877cb…` la persistenza parziale descritta sopra era **recuperabile e retry-idempotent per le proposte non dismesse** grazie al `dedupeKey` e al riuso/skip degli elementi già accettati. HR-02 non classificava quindi il comportamento come corruzione dei dati e non imponeva l'atomicità come unica soluzione: il difetto di review era la discrepanza tra il gesto/copy percepito come unitario e la possibilità di scritture parziali durevoli. La chiusura resta valida sia con bundle atomico nel trusted boundary sia con semantica di progresso/recupero esplicita e verificata. Gli stati successivi di #692 vanno giudicati sul loro exact head e non riscrivono retroattivamente questo checkpoint.

## Copertura E2E specifica mancante

Il run HVA FULL copre `Progetta → UDA` e la superficie `uda-authoring-entry`, ma non espone un journey browser dedicato e nominato che provi end-to-end:

`UDA → Atlas return → scelta lezione → Associa alla lezione → materiale visibile nella lezione`.

Per chiudere STEP 1 serve una prova browser focalizzata su questo percorso, comprendendo almeno:

- bundle valido;
- scelta esplicita della lezione;
- scrittura solo dopo conferma;
- redirect alla lezione;
- materiale visibile;
- retry/failure semantics coerenti con HR-02;
- mobile 412px e desktop.

Questa è copertura di qualificazione, non una nuova feature.

## Parti che restano approvate/preservate

Non vanno riscritte:

- contratto versionato `TeachingContextSnapshot` / `AtlasMaterialBundle`;
- fragment URL senza dati studente;
- validazione fail-closed del bundle;
- selezione esplicita della lezione;
- autorità di Docente OS su classe/UDA/lezione/persistenza;
- nessuna scrittura automatica a Piano annuale, Calendario o Planner;
- utilizzo del repository canonico `LessonDesignExtension`;
- deduplicazione tramite `dedupeKey`;
- copy privo di identificatori tecnici nella UI docente.

## Decisione STEP 1A

La PR #692 **non viene qualificata né mergiata** in questo step.

Il verdetto Human Review è:

**REWORK circoscritto**

Non è richiesto un redesign e non è autorizzata alcuna nuova feature. Il lavoro residuo è limitato a evidenza HVA + coerenza della scrittura multi-materiale + prova E2E del journey specifico.

## Prossimo passo unico

**STEP 1B — remediation Materiali #692**

1. test RED per la semantica di associazione multi-materiale e per il journey focalizzato;
2. correzione minima HR-02;
3. riesecuzione suite rilevante;
4. browser certification focalizzata con pacchetto visuale ispezionabile;
5. nuova Human Review sull'exact head risultante.

Nessun intervento su #695. Nessun merge.
