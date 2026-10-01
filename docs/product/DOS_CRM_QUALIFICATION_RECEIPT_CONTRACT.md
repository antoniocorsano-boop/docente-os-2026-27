# DOS-CRM Qualification Receipt Contract v1

Data: **2026-09-30**  
Schema: `ops/dos-crm-qualification-receipt.schema.json`

## Scopo

Ogni qualification lane DOS-CRM produce una receipt immutabile e legata a un **exact SHA**.

La receipt consente di separare:
- risultato dei critical journey;
- gate automatici;
- Browser Certification;
- HUMAN_USE;
- Human Review;
- recovery;
- finding aperti/chiusi;
- evidence refs.

## Regole

1. una receipt vale solo per `exact_sha`;
2. una Human Review PASS deve riferirsi allo stesso SHA;
3. un finding HIGH/CRITICAL OPEN impedisce la promozione a CRL 5;
4. un risultato tecnico PASS non sostituisce HUMAN_USE quando richiesta;
5. `ACCEPTED_EXTERNAL` deve indicare un problema esterno qualificato, non un modo per ignorare una regressione;
6. capability_ids elenca solo capability realmente attraversate dagli scenari;
7. una lane può avere PASS senza promuovere tutte le capability elencate: la promozione resta una decisione DOS-CRM basata sugli assi.

## Uso previsto

- QL-1 Daily Teaching Loop;
- QL-2 Professional Context & Setup;
- QL-3 Knowledge to Lesson;
- QL-4 Governed Copilot;
- future qualification con lo stesso contratto.

La receipt viene salvata in `ops/qualification-receipts/` e richiamata dal registro `ops/capability-readiness.json`.
