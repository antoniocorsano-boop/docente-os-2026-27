# DOS-CRM Audit — TeachingSession / registrazione della lezione

Data: **2026-09-30**  
Capability ID: `DOS-TEACHING-SESSION`  
Baseline auditata: `develop@74290511ee58a6b61652160463461527e3e0f57a`  
Esito: **CRL 4 — INTEGRATED / CURRENT**

## 1. Perimetro

La capability comprende:
- TeachingSession come ricevuta canonica della lezione svolta;
- flusso In classe → Registra la lezione → Diario;
- registrazione atomica con evidence/observation;
- idempotenza e fail-closed;
- registrazione di una lezione precedente;
- lesson-close feedback/retry;
- collegamento al ciclo successivo senza modifica automatica del Piano.

## 2. Evidence verificata

- `PROJECT_STATUS_CURRENT.md`: TeachingSession è esplicitamente invariabile autorevole;
- PR #312 — chiusura In classe → Registra → Diario, merged;
- PR #366 — TE-1B collega Osserva alla registrazione atomica, merged;
- PR #504 — registrazione di una lezione precedente dalla Classe, merged;
- E2E `lesson-register.spec.mjs`;
- modelli/test `lesson-registration-model*`;
- domain tests `teaching-session*`;
- PR #572 — runtime projection parity fix, merged;
- incident receipt `docs/incidents/2026-09-21-lesson-record-runtime-projection.md`.

## 3. Finding corrente di qualificazione

La PR #572 ha avuto Product CI, Browser Certification, HVA, WCAG, performance, HIM, Design, ASVS e Human Exact-Head Review PASS.

Successivamente Codex ha rilevato che due contract test introdotti per impedire la regressione non erano inclusi nello script `npm test`:
- `lesson-registration-runtime-contract.test.ts`;
- `lesson-close-error-contract.test.ts`.

Sulla baseline corrente del 30 settembre, `product/package.json` continua a elencare test espliciti e **non include questi due file**.

Inoltre il post-merge Beta del 21 settembre ha richiesto riconciliazione manuale della catena migrations TE-1A prima che l'RPC di registrazione fosse disponibile nel database attivo.

Questi elementi non negano la capability, ma impediscono di dichiarare l'intero percorso CRL 5 senza remediation e nuova qualification.

## 4. Valutazione per asse

| Asse | Livello | Evidenza / limite |
| --- | ---: | --- |
| **F** | **5** | registrazione reale, storico, lesson close ed evidence atomica sono implementati |
| **UX** | **4** | journey umano esiste e l'errore tecnico è stato corretto; manca un nuovo HUMAN_USE conclusivo dopo il runtime incident |
| **D** | **5** | TeachingSession/evidence atomiche, idempotenza, persistenza e authorization boundary sono solide |
| **S** | **5** | RLS/AAL2/boundary e RPC governate; anon denial e private implementation boundaries verificati |
| **I** | **5** | integra lezione, Observation/Evidence, Piano/next cycle e Home senza duplicare authority |
| **Q** | **4** | qualification forte su #572, ma due regression contract non fanno parte del normale `npm test` corrente |
| **O** | **4** | runtime bug corretto ma Beta richiese migration reconciliation e la receipt finale di uso stabile post-reconciliation non è consolidata come qualification corrente |
| **K** | **5** | incident receipt, contratti, evidence e invarianti canonici sono documentati |

## 5. CRL complessivo

**CRL 4 — INTEGRATED**

Q e O limitano la promozione.

## 6. Gap verso CRL 5

1. aggiungere i due regression contract al percorso CI normale o adottare discovery equivalente verificabile;
2. qualificare la catena migrations/RPC su ambiente pilot senza riconciliazione manuale fuori dal processo;
3. rieseguire lesson-register E2E + Browser Certification;
4. HUMAN_USE mirata post-fix, inclusi errore/retry e conservazione dei dati inseriti.

## 7. Criterio di promozione

Creare/passare `DOS-TEACHING-SESSION-QUALIFICATION` su exact SHA con:
- regression contracts effettivamente eseguiti da Product CI;
- migration/RPC parity verificata;
- E2E + Browser Certification;
- runtime receipt e Human Review.

## 8. Decisione

`DOS-TEACHING-SESSION` passa da `NEEDS_REAUDIT / STALE` a:

`CRL 4 / INTEGRATED / CURRENT`.
