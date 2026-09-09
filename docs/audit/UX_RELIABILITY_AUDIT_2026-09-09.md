# DOCENTE OS — Audit affidabilità dell’esperienza utente

Data: 2026-09-09  
Baseline verificata: `develop` @ `d7d7464c655d937234081c7a7fc8dd2373cd2d8a`  
Stato: AUDIT / INPUT PER DECISIONE DI PRODOTTO

## 1. Obiettivo

Valutare quali strumenti già presenti nel repository sostengano una procedura lato utente snella, chiara, progressiva, professionalmente formulata e stabile, con riferimento a pratiche consolidate di progettazione e collaudo di prodotti maturi.

L’audit distingue tra:

- principi e specifiche dichiarate;
- strumenti realmente presenti nel codice;
- gate automatici già attivi;
- lacune che impediscono di parlare di garanzia strutturale completa.

## 2. Esito sintetico

DOCENTE OS dispone già di una base UX avanzata: Design System V2 canonico, Human Task Model, Human Interaction Model, sistema canonico di linguaggio, shell applicativa, collaudi Human + Visual Acceptance, percorsi critici browser, raccolta feedback contestuale, gate prestazionali e controlli di sicurezza delle dipendenze.

La qualità dell’esperienza non è tuttavia ancora una proprietà completamente inderogabile del processo di sviluppo, perché alcuni contratti molto buoni non sono ancora tutti trasformati in gate obbligatori e uniformemente applicati a ogni superficie.

## 3. Strumenti presenti e valutazione

| Strumento / livello | Funzione | Valutazione |
| --- | --- | --- |
| Design System V2 canonico | Gerarchia, una sola azione primaria, progressive disclosure, stati umani, accessibilità, responsive | Molto forte |
| Human Task Model | Adatta quantità e priorità delle informazioni al compito corrente | Molto forte |
| Human Interaction Model (HIM) | Formalizza attore, intento, successo, azione primaria, recovery, evidenze | Molto forte |
| Language & Collaboration System | Governa tono, microcopy e traduzione del gergo tecnico | Forte |
| App Shell + command palette | Navigazione coerente desktop/mobile e ricerca per intenzione | Forte |
| Human + Visual Acceptance | Browser reale, mobile/desktop, journey, errori, rete, layout | Molto forte |
| Critical Journeys | Verifica di percorsi professionali concreti | Forte |
| Experience feedback | Feedback contestuale associato al punto reale del percorso | Forte |
| Performance Gate | Budget di risposta applicativo e runtime Beta | Forte |
| Dependency Security Gate | Lockfile e audit dipendenze | Forte |
| Protezione branch / required checks | Rendere obbligatori i gate | Debole allo stato corrente |
| Accessibilità automatizzata completa | WCAG, tastiera, focus, zoom, screen reader | Parziale |
| Regressione visuale automatizzata | Confronto automatico delle baseline visive | Parziale |

## 4. Punti di forza verificati

### 4.1 Design System V2

Il contratto canonico stabilisce:

1. significato prima del dato tecnico;
2. una sola azione primaria per contesto;
3. provenienza recuperabile;
4. progressive disclosure;
5. assistenza contestuale non invasiva;
6. accessibilità by default;
7. responsive progettato in origine;
8. stati umani al posto dei codici tecnici;
9. feedback immediato per ogni write;
10. nessuna dipendenza esclusiva dal colore.

Sono inoltre definiti target WCAG AA, focus visibile, navigazione da tastiera, target touch >= 44 px, zoom 200% e riduzione del movimento.

### 4.2 Human Task Model

Il codice distingue le modalità `EXPLORE`, `GUIDED` e `FOCUSED` e assegna un interaction budget. In modalità focalizzata:

- una sola azione primaria;
- massimo due azioni di supporto;
- contenuti avanzati non esposti per impostazione predefinita;
- contenuti secondari compressi.

È un meccanismo strutturale di progressive disclosure e non una semplice convenzione grafica.

### 4.3 Human Interaction Model

Il repository contiene un contratto formale per i compiti umani con campi obbligatori per:

- attore;
- intento;
- risultato atteso;
- azione primaria;
- stati di errore;
- strategie di recupero;
- pattern;
- accessibilità;
- evidenze di accettazione.

Il relativo workflow `HIM Contract Gate` valida l’installazione del modello.

### 4.4 Linguaggio e tono

Il Language & Collaboration System adotta la sequenza:

`Orienta → Spiega → Dichiara lo stato → Propone l’azione → Lascia la decisione al docente`.

Il codice `product-language.ts` traduce gli stati tecnici in etichette professionali e comprensibili e dispone di test dedicati.

### 4.5 Shell e navigazione

L’App Shell comprende:

- navigazione principale;
- navigazione mobile;
- `aria-current`;
- controlli con etichette accessibili;
- palette comandi;
- ricerca formulata come intenzione: “Cosa vuoi fare?”.

Questo sposta il modello mentale dalla struttura del software al compito professionale.

### 4.6 Human + Visual Acceptance

Il workflow HVA avvia realmente l’applicazione, usa Chromium tramite Playwright, collauda locale e runtime e conserva ricevute ed evidenze.

I controlli includono:

- superfici principali;
- viewport desktop e mobile;
- errori console e pagina;
- richieste fallite e 5xx;
- overflow orizzontale;
- comportamento dell’assistente mobile;
- progressive disclosure in Conoscenza e Impostazioni;
- screenshot per revisione umana.

### 4.7 Journey reali

I percorsi già coperti comprendono:

- Classe → prossimo compito;
- Progetta → UDA;
- Conoscenza → documento;
- Calendario → controlli intenzionali.

Questa è una base corretta per misurare il prodotto rispetto ai compiti reali e non alle singole pagine.

### 4.8 Feedback contestuale

Il feedback può essere raccolto dopo un flusso reale e associato a workspace, anno scolastico, superficie, journey, intento e specifico contesto operativo. Questo consente miglioramento empirico senza chiedere all’utente di ricostruire manualmente il punto del percorso.

## 5. Lacune principali

### 5.1 Branch non protetto

Alla baseline dell’audit `develop` risulta non protetto. I gate esistono, ma non sono quindi automaticamente una condizione inderogabile per ogni integrazione.

Priorità: trasformare i gate essenziali in required checks del processo di promozione.

### 5.2 Accessibilità non completamente automatizzata

Il Design System prescrive target touch >= 44 px, ma il rilevatore HVA classifica attualmente come piccoli i controlli inferiori a 36 px e li tratta come `WATCH`.

Mancano inoltre controlli sistematici end-to-end per:

- ordine e visibilità del focus;
- tastiera completa;
- label/name/role/value;
- zoom 200%;
- contrasto;
- reduced motion;
- screen reader semantics;
- focus non occultato.

### 5.3 Component foundation incompleta

La specifica V2 prevede una libreria più ampia di primitive, feedback, overlay e compositi rispetto ai componenti UI effettivamente presenti. Le superfici possono quindi ancora ricostruire localmente pattern analoghi con rischio di divergenza.

### 5.4 Regressione visuale ancora manuale

HVA produce screenshot e ricevute, ma il giudizio visuale è `REVIEW_REQUIRED`. La revisione umana è corretta e deve restare, ma manca una baseline automatica che evidenzi regressioni visive macroscopiche prima della revisione.

## 6. Valutazione orientativa

| Dimensione | Valutazione |
| --- | --- |
| Architettura esperienza | 8.5/10 |
| Progressività del compito | 9/10 |
| Linguaggio e tono | 8.5/10 |
| Collaudo browser reale | 8/10 |
| Accessibilità verificata automaticamente | 6/10 |
| Consistenza dei componenti | 6.5/10 |
| Garanzia strutturale contro regressioni | 6.5/10 |

Le valutazioni sono indicatori interni di audit, non metriche normative.

## 7. Decisione proposta

Non introdurre un nuovo sistema UX parallelo. Consolidare quello esistente mediante un unico **Experience Reliability Gate** che coordini:

1. CI riproducibile con lockfile;
2. Human Interaction Model;
3. Human + Visual Acceptance;
4. performance;
5. sicurezza dipendenze;
6. accessibilità automatizzata coerente con il target 44 px e WCAG AA;
7. controllo terminologico;
8. regressione visuale assistita;
9. protezione del branch / required checks.

## 8. Implicazione per il prossimo lavoro

Il prossimo incremento di prodotto non dovrebbe aggiungere nuove pagine. Deve prima chiarire e rendere verificabile il percorso quotidiano reale dell’insegnante, stabilendo quali superfici sono prioritarie nei diversi momenti della giornata e quali informazioni/azioni devono essere mostrate in ciascun momento.
