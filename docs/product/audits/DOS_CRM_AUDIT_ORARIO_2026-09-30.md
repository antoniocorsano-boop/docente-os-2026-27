# DOS-CRM Audit — Orario

Data: **2026-09-30**  
Capability ID: `DOS-TIMETABLE`  
Baseline auditata: `develop@74290511ee58a6b61652160463461527e3e0f57a`  
Esito: **CRL 4 — INTEGRATED / CURRENT**

## 1. Perimetro

La capability Orario comprende:
- Cattedra come sorgente condivisa, non duplicata;
- versioni dell'orario;
- slot ricorrenti e loro editing;
- viste Settimana/Giorno;
- copertura ore;
- class presence / disposizione / ricevimento;
- apertura del contesto classe;
- composizione temporale con Calendario/Today;
- importazione governata dell'orario;
- persistenza Supabase + invarianti/RLS.

La sub-capability `DOS-TT-SHARE-IMPORT` resta separatamente **CRL 5 — QUALIFIED**.

## 2. Evidence verificata

### Dominio e dati
- `docs/architecture/TIMETABLE_CANONICAL_SPEC.md`;
- `docs/architecture/TIMETABLE_T1_IMPLEMENTATION.md`;
- `docs/product/ORARIO_DAILY_COCKPIT_CONTRACT.md`;
- `docs/architecture/TIMETABLE_GUIDANCE_MAP_CONTRACT.md`;
- migrazioni `0017_timetable_t1_assignment_version_slots.sql` e `0018_timetable_class_presence.sql`;
- repository Supabase per timetable e slot editor;
- tipi DB correnti per `teaching_assignments`, `timetable_versions`, `timetable_slots`.

### Runtime/UI
- `product/src/app/orario/page.tsx`;
- `TimetableGrid.tsx`;
- modelli e test `timetable-grid-model*`, `timetable-operational-model*`;
- editing slot e feedback import;
- layout/guidance dedicati.

### Integrazione
- PR #38: Cattedra condivisa tra Impostazioni e Orario;
- PR #46: guidance map + manual class presence;
- PR #48: apertura contesto classe;
- PR #94: composizione Timetable + Calendar in Oggi;
- PR #490: fallback all'Orario in vigore quando Calendario non classifica il giorno;
- PR #612: conferma/riapertura Cattedra senza effetti collaterali sull'Orario;
- PR #625: completamento end-to-end import orario;
- PR #640: Share Target → import Orario con minimizzazione locale, qualificato.

## 3. Valutazione per asse

| Asse | Livello | Evidenza / limite |
| --- | ---: | --- |
| **F** | **5** | griglia, slot, cattedra, import/review/apply e composizione temporale esistono come journey reali; non è solo prototipo |
| **UX** | **4** | contratto UX, mobile/day view, guidance e design governance presenti; manca però una HUMAN_USE recente e specifica dell'intero journey Orario sulla baseline corrente |
| **D** | **5** | persistenza Supabase, versioni, slot, invarianti DB, identity, concorrenza/import revision-aware e storico governato |
| **S** | **5** | RLS/domain boundaries, minimizzazione Share Target, fail-closed import e assurance security applicabile |
| **I** | **5** | Cattedra condivisa, separazione Calendario, Temporal Projection/Today, contesto classe e import integrati senza duplicare autorità |
| **Q** | **4** | numerosi test/gate e sub-capability import CRL5; manca una singola qualification run che certifichi l'intera capability Orario end-to-end sullo stesso exact head |
| **O** | **4** | runtime reale e PWA esistono, ma manca una receipt recente specifica di operatività completa dell'Orario (manual edit → import → review → apply → uso giorno/settimana → recovery) |
| **K** | **5** | specifica canonica, cockpit contract, mental model, guidance contract e governance import ampiamente consolidati |

## 4. CRL complessivo

**CRL 4 — INTEGRATED**

La media non viene usata. UX, Q e O restano a livello 4 e limitano la capability complessiva.

Questo non significa che Orario sia “solo parzialmente fatto”: significa che il prodotto possiede una capability integrata e sostanziale, ma non esiste ancora evidence sufficiente per dichiarare **l'intero Orario** qualificato CRL 5 sul medesimo perimetro e baseline.

## 5. Gap che bloccano CRL 5

1. **Human-use/UX evidence corrente** sull'intero journey, non soltanto su singole slice.
2. **Qualification roll-up unica** su exact head corrente comprendente vista Settimana/Giorno, editing, copertura Cattedra, import/review/apply e composizione pertinente.
3. **Operational receipt** della capability completa nel runtime previsto, inclusi error/recovery e mobile/PWA.

## 6. Criterio di promozione

Per CRL 5:
- definire una suite/receipt `DOS-TIMETABLE-QUALIFICATION`;
- eseguire critical journey su exact SHA;
- Browser Certification della superficie completa;
- HUMAN_USE mirata almeno sul journey principale;
- nessun finding HIGH/CRITICAL aperto nel perimetro.

Per CRL 6:
- uso reale ripetuto per un periodo sufficiente;
- recovery dimostrato;
- evidence runtime/pilot sostenuta.

## 7. Decisione

Orario viene promosso nel registro DOS-CRM da `NEEDS_REAUDIT / STALE` a:

`CRL 4 / INTEGRATED / CURRENT`.

La sub-capability Share Target → importazione Orario resta `CRL 5 / QUALIFIED / CURRENT`.
