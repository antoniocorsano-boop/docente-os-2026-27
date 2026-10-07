# DOC-MAT-INT-01 — STEP 0 Baseline checkpoint

Data rilevazione: 2026-10-07, sessione pomeridiana  
Stato: **STEP 0 COMPLETE — DOCUMENTATION ONLY**

Scopo del checkpoint: rendere il lavoro riprendibile dopo qualunque interruzione di connessione, senza ricostruire lo stato dalle conversazioni.

## Regola operativa

L'integrazione Documenti ↔ Materiali viene eseguita per step brevi. Ogni step deve terminare con:

- exact head verificato;
- esito dei gate rilevanti;
- residui espliciti;
- prossimo passo unico;
- nessun ampliamento di perimetro.

Non si avvia lo step successivo nella stessa sessione salvo esplicita richiesta.

## Baseline di repository

`develop` rilevato a:

`a9006cb632fc5c3c9b1b0e4a9f2587c55c9c5ba2`

Questo commit incorpora #694 (copertura mobile di “Apri classe”) e non modifica il comportamento prodotto della linea Documenti/Materiali.

## PR #692 — Linea Materiali / Studio Atlas

**Ruolo nel piano:** fondazione canonica della linea Materiali.

- PR: `#692 — Progetta — UDA → Studio Atlas material handoff`
- branch: `feat/uda-atlas-material-binding`
- exact head rilevato: `c6d877cb6d92d32e663f86ecdc88822dd377cc4d`
- stato: `OPEN / DRAFT / MERGEABLE / NOT MERGED`
- base originaria: `develop@4c3c7f7d0bd4ad56d9d1427f141a8a4ec9283b84`

### Gate exact-head rilevati

PASS:

- Product CI;
- Browser Certification Orchestrator;
- Human Interaction Model;
- ASVS 5.0 Assurance;
- Governed MFA Queue Hygiene;
- TRAMA Perceptible Write;
- Design Policy Gate;
- Certification Impact Classifier;
- X5B Professional UDA Export Gate;
- X5 UDA Versioned Authoring Gate.

Il workflow giornaliero DOS-CRM risulta `skipped`, non è un finding della slice.

### Residuo

**Human Review finale** del flusso:

`UDA → Studio Atlas → MaterialBundle → scelta esplicita della lezione → persistenza canonica`

Non risultano review submission GitHub registrate al momento del checkpoint.

### Regola di preservazione

Non reimplementare il flusso di #692 nel piano DOC-MAT-INT-01. Correggere solo eventuali finding reali emersi dalla Human Review.

---

## PR #693 — Contratto Documentazione / Documenti ↔ Materiali

**Ruolo nel piano:** contratto architetturale e sede del piano DOC-MAT-INT-01.

- PR: `#693 — DOC-04 — Specifica Documentazione e verticale Relazione finale`
- branch: `docs/doc-04-relazione-finale-design`
- exact head osservato prima del presente checkpoint: `25eedd2a957d73f4021b8290af99154820e2b88d`
- stato: `OPEN / DRAFT / MERGEABLE / NOT MERGED`
- base originaria: `develop@4c3c7f7d0bd4ad56d9d1427f141a8a4ec9283b84`

### Contenuto canonico già presente

- specifica Documentazione / Relazione finale;
- contratto `INSTITUTIONAL_DOCUMENTATION_CANONICAL.md`;
- specifica `DOC-MAT-BOUNDARY-01`;
- piano `DOC-MAT-INT-01 — verticale Tecnologia`.

### Gate rilevati sull'exact head osservato

PASS:

- Human Interaction Model;
- TRAMA Perceptible Write;
- Certification Impact Classifier;
- Governed MFA Queue Hygiene.

Trattandosi di branch documentale, non si interpreta l'assenza di Product CI come difetto prodotto.

### Residuo

**Human Review architetturale** prima che il consolidamento Documenti ↔ Materiali generi modifiche runtime.

L'approvazione del piano da parte dell'utente autorizza la prosecuzione per step; non autorizza merge automatici o operazioni irreversibili.

---

## PR #695 — Linea Documenti / DOC-TPL-01

**Ruolo nel piano:** fondazione canonica dei modelli istituzionali e della resa documentale.

- PR: `#695 — DOC-TPL-01 — Institutional Template Engine foundation`
- branch: `feat/doc-tpl-01-template-engine`
- exact head rilevato: `db8c3754674c1a54627c66ec1b01164ddc455389`
- stato: `OPEN / DRAFT / MERGEABLE / NOT MERGED`
- base: `develop@a9006cb632fc5c3c9b1b0e4a9f2587c55c9c5ba2`

### Gate exact-head rilevati

PASS, fra gli altri:

- test prodotto;
- replay completo delle migration su Supabase effimero;
- Design Policy Gate;
- Human Interaction Model;
- ASVS 5.0 Assurance;
- Production Infrastructure Spec;
- Production Readiness Review;
- Dependency Security Gate;
- Operational Security Gate;
- TRAMA Perceptible Write;
- Certification Impact Classifier.

FAIL:

1. **Product CI** — fallisce nello step `npm run typecheck`; test prodotto PASS prima del typecheck. Lint e build non vengono eseguiti dopo il fallimento.
2. **Browser Certification Orchestrator** — preflight PASS, ma `Build tested application once` FAIL; HVA, WCAG 2.2 AA e P6 non vengono quindi eseguiti sul candidato.
3. **K1 Knowledge Upload Gate** — FAIL sull'exact head; da classificare nello STEP 2 come pertinente alla slice oppure infrastrutturale/indipendente.

### Review indipendente ancora aperta

La review Codex registrata sul commit precedente `eab640932a…` contiene 5 thread ancora non risolti e non marcati outdated:

- P1 — quality gate da imporre nel trusted boundary;
- P1 — mantenere attiva la versione canonica mentre si salva una nuova bozza;
- P2 — mostrare/revisionare la bozza corrente invece della sola versione attiva;
- P2 — bloccare nell'output i reali valori enum interni;
- P2 — preservare provenienze distinte anche per byte sorgente identici.

Questi thread non vengono considerati risolti soltanto perché il branch è avanzato: nello STEP 2 vanno riesaminati sull'exact head corrente e chiusi solo con prova.

### Residuo

#695 **non è ancora qualificata**. Lo STEP 2 dovrà essere un ciclo circoscritto di diagnosi/correzione/verifica, senza introdurre nuove feature.

---

## Decisione STEP 0

Le tre basi sono preservate e non vanno riscritte:

| Linea | Fondazione | Stato al checkpoint | Azione successiva |
| --- | --- | --- | --- |
| Materiali | PR #692 | tecnicamente qualificata; Human Review residua | STEP 1 |
| Contratto | PR #693 | specifica/piano consolidati; Human Review architetturale | STEP 3 dopo chiusura fondazioni |
| Documenti | PR #695 | implementata ma non qualificata | STEP 2 |

Ordine canonico confermato:

`STEP 1 #692 → STEP 2 #695 → STEP 3 #693 → STEP 4+ integrazione`

## Prossimo passo unico

**STEP 1 — chiusura linea Materiali #692.**

Obiettivo esclusivo: Human Review finale del candidato `c6d877cb6d92d32e663f86ecdc88822dd377cc4d` sul percorso UDA → Atlas → ritorno materiali → scelta esplicita della lezione → persistenza.

Nessuna nuova feature. Nessun merge. Nessun intervento su #695 nello stesso step.
