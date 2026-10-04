# DOCENTE OS — PWA installabile e Share Target documentale

**Data:** 3 ottobre 2026  
**Stato:** IMPLEMENTED / QUALIFICATION PENDING  
**Classificazione DOS-CRM:** `DOS-PWA-DEVICE-INTAKE` — CRL 3 / IMPLEMENTED / CURRENT

## 1. Intento

Docente OS deve entrare nel flusso operativo del dispositivo senza creare un secondo archivio o una Inbox parallela:

`documento in app sorgente → Condividi → Docente OS → intake temporaneo → proposta contestuale → conferma docente → capability canonica`

Il docente mantiene sempre l'autorità sulla destinazione e sugli effetti operativi.

## 2. Stato runtime corrente

Il runtime `product` espone oggi:

- Web App Manifest in `product/src/app/manifest.ts`;
- `start_url`, identità applicativa, icone 192/512/maskable e `display: standalone`;
- service worker in `product/public/sw.js`;
- registrazione del service worker;
- gestione del prompt di installazione;
- Web Share Target e superficie `/share-target`;
- staging/intake locale del file ricevuto;
- routing governato verso capability esistenti;
- percorso Share→Orario con minimizzazione/local-first document understanding e review prima dell'effetto.

Quindi il documento del 29 settembre che descriveva Docente OS come sola web app mobile è superato.

## 3. Confine del livello corrente

L'implementazione esiste, ma la capability generale non è ancora qualificata come journey di dispositivo.

Manca una prova unica e sostenuta di:

1. installazione su Android reale;
2. aggiornamento della PWA;
3. comparsa stabile nel menu Condividi;
4. apertura del file condiviso;
5. staging/routing;
6. annullamento e recovery;
7. ritorno all'app dopo errore/refresh;
8. comportamento coerente su più destinazioni canoniche.

Per questo il DOS-CRM mantiene **CRL 3**, anche se singoli sotto-journey possono avere evidence superiore.

## 4. Ingresso unico, nessun nuovo modulo

Destinazioni supportate o previste devono riusare i boundary esistenti:

- Conoscenza;
- Circolare → Calendario;
- Nuovo orario → pipeline Orario;
- Lezione/preparazione;
- annullamento.

La ricezione del file non equivale a persistenza canonica.

## 5. Intake effimero e minimizzazione

Il pattern vincolante resta:

1. ricezione;
2. staging locale/effimero;
3. anteprima/provenienza;
4. privacy/content preflight;
5. proposta di routing;
6. conferma;
7. persistenza o workflow governato.

Per l'Orario il file completo non deve diventare automaticamente una fonte persistente; il sistema privilegia estrazione/minimizzazione locale e mantiene review umana prima di applicare modifiche alla bozza.

## 6. Invarianti

- nessuna persistenza canonica automatica alla ricezione;
- nessun effetto operativo senza conferma;
- privacy/preflight prima della persistenza;
- provenance preservata;
- workspace e AAL2 invariati;
- nessun secondo archivio;
- nessun secondo motore di import;
- nessuna nuova authority;
- Arena/Atlas/Docente OS mantengono i rispettivi confini;
- DOS-A1 resta `RUNTIME_DEFERRED`.

## 7. Finding UX corrente

Nel test reale mobile il prompt di installazione interferiva con il task Orario. PR #664 lo esclude esplicitamente da `/orario`.

Questa correzione migliora il flusso, ma non equivale ancora a qualification della capability PWA nel suo complesso.

## 8. Chiusura UX installazione — 4 ottobre 2026

La tranche di chiusura Android mantiene invariato il modello di intake e rende l'installazione più prevedibile:

- il prompt automatico è opportunistico e compare soltanto in Home;
- le superfici operative, inclusi Orario e Share Target, non vengono coperte dal prompt;
- Impostazioni espone sempre uno stato di installazione comprensibile;
- quando Chromium rende disponibile `beforeinstallprompt`, Impostazioni espone il comando **Installa Docente OS**;
- quando il prompt nativo non è disponibile, resta visibile il percorso manuale Chrome **⋮ → Installa app / Aggiungi a schermata Home**;
- la registrazione del service worker verifica esplicitamente la disponibilità di un aggiornamento;
- manifest, service worker e Share Target sono coperti da un test browser dedicato.

Questa tranche non promuove da sola la capability: resta necessaria la qualification su Android reale di installazione/aggiornamento e presenza nel menu Condividi.

## 9. Criterio di promozione

Per passare almeno a CRL 4 serve una qualification real-device Android che dimostri:

`install/update → share sheet → intake → routing → conferma → recovery`

su più destinazioni supportate, senza blocchi, perdita di file o duplicazioni.

CRL 5 richiede inoltre Browser/HUMAN_USE e failure/recovery evidence adeguate al rischio.
