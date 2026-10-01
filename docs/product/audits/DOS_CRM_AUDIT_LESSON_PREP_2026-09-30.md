# DOS-CRM Audit — Preparazione della lezione / Lesson Brief

Data: **2026-09-30**  
Capability ID: `DOS-LESSON-PREP`  
Baseline di consultazione: `develop@74290511ee58a6b61652160463461527e3e0f57a`  
Ultima qualification significativa: **PR #568 exact head `fd5913aa9ce8a60f16112b88e49f3274209fdc19`**  
Esito: **CRL 5 — QUALIFIED / RECENT**

## 1. Perimetro

La capability comprende:
- risoluzione della prossima lezione;
- Lesson Brief;
- Lesson Preparation Manifest;
- stato readiness;
- materiali pertinenti e suggestions;
- lesson design extensions;
- lifecycle di approvazione docente;
- renderer e materiali per LIM/stampa;
- accesso “Prima della lezione”;
- preparazione del giorno successivo;
- Copilot constrained action per la preparazione.

## 2. Evidence verificata

### Fondazione e runtime
- `docs/architecture/LESSON_PREPARATION_ORCHESTRATION_CANONICAL.md`;
- `next-lesson-preparation.ts` + test;
- `lesson-brief.ts` + test;
- `lesson-preparation-manifest.ts`;
- `lesson-material-renderer.ts` + test;
- `lesson-material-suggestions.ts` + test;
- `lesson-prepare-client.tsx`;
- `next-lesson-preparation-handler.ts`;
- `tomorrow-preparation-loader.ts`;
- route/materiali per prossima lezione e domani;
- approval lifecycle e repository dedicati;
- migrazioni 0061/0063/0066 per lifecycle e approvazioni governate.

### Prove operative
- E2E `lesson-materials.spec.mjs`;
- E2E `lesson-materials-standard-pack.spec.mjs`;
- E2E `tomorrow-materials.spec.mjs`;
- E2E `lesson-copilot.spec.mjs`;
- PR #568 — ECO-02/P8, merged e Human Review PASS su exact head;
- #568 consolida accesso stabile “Prima della lezione”, distinzione fra aggiunte didattiche e materiali allegati e pilot evidence.

### Failure/recovery
- incidente runtime del 21 settembre documentato e corretto con parity fra resolver pagina e Server Action;
- errore tecnico React non più esposto come UX;
- flusso resta fail-closed se la proiezione non è disponibile.

## 3. Valutazione per asse

| Asse | Livello | Evidenza / limite |
| --- | ---: | --- |
| **F** | **5** | journey reale dalla prossima lezione a brief/materiali/preparazione, non solo prototipo |
| **UX** | **5** | accesso stabile “Prima della lezione”, Lesson Brief compatto e Human Review pilot PASS; persistono opportunità di semplificazione ma non un blocker noto della capability |
| **D** | **5** | manifesto compositivo, extension lifecycle, approval persistence, deduplication e provenance governati |
| **S** | **5** | human authority, write boundary, scope/privacy, fail-closed e RLS preservati |
| **I** | **5** | integra Teacher Moment, Orario, Piano, CAN-PACK, Conoscenza, TeachingSession e Copilot senza nuovo dominio concorrente |
| **Q** | **5** | unit/contract/E2E dedicati + qualification PR #568 con gate specialistici e Human Review |
| **O** | **5** | pilot “Prima della lezione” effettivamente collaudato; incidente runtime documentato e corretto con regression contract |
| **K** | **5** | canonical orchestration, contratti materiali/extension, pilot evidence e incident receipt consolidati |

## 4. CRL complessivo

**CRL 5 — QUALIFIED**

La capability ha superato la soglia di semplice integrazione: esiste una evidence di qualification end-to-end e Human Review esplicita.

La freshness è **RECENT** e non CURRENT perché l'exact head qualificato è precedente alla baseline del 30 settembre. Non risultano evidenze che invalidino la capability, ma per dichiararla CURRENT serve una requalification mirata sullo SHA corrente.

## 5. Gap verso CRL 6

1. evidence di uso reale ripetuto su più giornate/classi;
2. stabilità operativa longitudinale, inclusi materiali e recovery;
3. chiusura del ciclo completo Diario → domani → preparazione → uso → registrazione;
4. eventuali provider esterni devono restare opzionali e non degradare la baseline interna.

## 6. Criterio di freshness CURRENT

Rieseguire una qualification mirata su `develop` corrente:
- critical E2E lesson preparation/materials;
- Browser Certification delle superfici coinvolte;
- smoke pilot di “Prima della lezione”;
- nessun finding HIGH/CRITICAL.

## 7. Decisione

`DOS-LESSON-PREP` passa da `NEEDS_REAUDIT / STALE` a:

`CRL 5 / QUALIFIED / RECENT`.
