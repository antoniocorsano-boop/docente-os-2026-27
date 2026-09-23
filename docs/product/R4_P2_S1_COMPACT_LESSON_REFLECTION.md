# R4-P2/S1 — Compact Lesson Reflection Integration

**Data:** 2026-09-23  
**Stato:** IMPLEMENTATION CANDIDATE  
**Base:** current develop  
**Perimetro:** Docente OS lesson workspace

## Problema osservato

Le prove mobili hanno mostrato che una vista lunga può essere informativamente corretta ma cognitivamente dispersiva. Il docente deve capire subito quale sia la prossima azione.

## Decisione

La fase **Registra** adotta un flusso focus-first:

1. **Dati essenziali**
2. **Riflessione facoltativa**
3. **Conferma**

Un solo passaggio principale è visibile per volta.

## Compatibilità

La slice:
- preserva la registrazione canonica esistente;
- preserva osservazione professionale, Copilota, prossima attività e riflessione sul percorso;
- non modifica Arena;
- non introduce una seconda autorità curricolare;
- non introduce nuovi profili studente;
- non attiva DOS-A1;
- mantiene la conferma esplicita prima della scrittura.

## Progressive disclosure

Nel passaggio Riflessione:
- il Copilota è facoltativo e richiudibile;
- le decisioni per il seguito sono richiudibili;
- il promemoria didattico è richiudibile.

## Invariante

Questa slice applica `docs/product/FOCUS_FIRST_UX_INVARIANT.md`.

## Gate

Prima del merge:
- Product CI PASS;
- browser/mobile review;
- nessun thread aperto;
- Render preview sulla stessa base `develop`;
- verifica TRAMA-PW-01 per la scrittura percepibile.

## Design classification

**COMPATIBLE** — la slice riorganizza la superficie esistente con focus singolo e progressive disclosure, senza introdurre una nuova grammatica visuale o modificare il design system.
