# DOS-CRM Audit — Copilota docente
Data: **2026-09-30**  
Capability ID: `DOS-COPILOT`  
Baseline: `develop@74290511ee58a6b61652160463461527e3e0f57a`  
Esito: **CRL 4 — INTEGRATED / CURRENT**

## Perimetro
Il Copilota qui esclude `Contextual Voice Capture`, che resta una capability separata e DEFERRED.

## Evidence
- `AI_COLLABORATION_CANONICAL_SPEC.md`;
- `TEACHER_AI_COPILOT_PRODUCT_DIRECTION.md`;
- assistant context, teacher-copilot context e today-copilot context con test;
- constrained kernel e write boundary;
- PR #420: K2 prepara la prossima lezione dal contesto canonico;
- PR #422: retrieval governato della Conoscenza;
- integrazione con Lesson Preparation, Today e knowledge retrieval;
- app continua a funzionare senza provider AI come invariante.

## Assi
| F | UX | D | S | I | Q | O | K |
|---:|---:|---:|---:|---:|---:|---:|---:|
| **4** | **4** | **5** | **5** | **5** | **4** | **4** | **5** |

## Limite
Il Copilota è integrato nel sistema e non più un mock isolato, ma la direzione prodotto continua a descrivere un gap professionale ancora da chiudere. Le review storiche K2 hanno inoltre evidenziato problemi di discipline binding e graceful degradation che richiedono una qualification complessiva corrente prima di CRL 5.

## Promozione
CRL 5 richiede test/review correnti su context binding multi-disciplina, partial failure, retrieval, proposal/write governance, latenza percepita e HUMAN_USE del copilota nel Teacher Moment.


## Addendum 2026-10-01 — K2 remediation

I finding storici K2 su discipline binding e graceful degradation sono **CLOSED** dalla PR #642:
- binding fail-closed sul piano canonico attualmente supportato;
- preservazione del contesto base quando la dipendenza opzionale di next-lesson preparation fallisce.

Il Copilota resta **CRL 4**: la QL-4 end-to-end e la HUMAN_USE operativa non sono ancora completate.
