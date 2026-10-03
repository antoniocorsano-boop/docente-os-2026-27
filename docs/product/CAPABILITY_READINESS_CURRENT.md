# DOCENTE OS — Capability Readiness Current

Data: **2026-10-03**  
Modello: **DOS-CRM v1**  
Baseline registro: `develop@57743e9d395ae5d739ca89e9afbdbb3a7edf875d`  
Stato: **CURRENT / CAPABILITY AUDIT REGISTER**

Fonte machine-readable: `ops/capability-readiness.json`  
Metodo: `docs/product/DOCENTE_OS_CAPABILITY_READINESS_MODEL.md`  
Audit di rebaseline: `docs/product/audits/DOS_CRM_REBASELINE_2026-10-03.md`

## Regola di lettura

Il CRL è il livello sostenuto dall'asse critico più debole applicabile. Non è una percentuale.

`STALE` conserva il livello storico ma vieta di presentarlo come qualification corrente finché il journey non viene riqualificato.  
`CONDITIONAL` indica un perimetro deliberatamente circoscritto.  
`DEFERRED` indica una capability reale ma esclusa dal release core corrente.

## Snapshot corrente

| Capability | CRL | Stato | Freshness | Lettura operativa |
| --- | ---: | --- | --- | --- |
| Share Target → importazione Orario | **5** | QUALIFIED | **STALE** | qualification #640 storica; journey cambiato materialmente |
| Orario | **4** | INTEGRATED | CURRENT | direct edit/versioning + import opzionale; qualification/HUMAN_USE ancora mancanti |
| PWA installabile + ingresso dal dispositivo | **3** | IMPLEMENTED | CURRENT | runtime presente; real-device qualification incompleta |
| Oggi / Today + Next | **4** | INTEGRATED | CURRENT | QL-1 technical PASS; HUMAN_USE pending |
| Preparazione lezione / Lesson Brief | **5** | QUALIFIED | **STALE** | qualification storica da revalidare whole-capability |
| Materiali pronti / lesson materials | **4** | INTEGRATED | CURRENT | next/tomorrow + lesson integration reali; qualification dedicata mancante |
| TeachingSession / registrazione | **4** | INTEGRATED | CURRENT | dominio e writer maturi; HUMAN_USE/recovery pending |
| Observation / Teaching Evidence | **3** | IMPLEMENTED | CURRENT | UI + atomic persistence presenti; whole-journey browser/HUMAN_USE mancanti |
| Piano annuale / UDA | **4** | INTEGRATED | CURRENT | qualification unificata del ciclo ancora mancante |
| Arena → curriculum intake/revalidation | **4** | CONDITIONAL | CURRENT | integrata solo nel pilot ECO-02 Tecnologia 2C |
| Conoscenza / KB | **4** | INTEGRATED | CURRENT | provenance/security forti; QL-3 ancora da chiudere |
| Calendario / composizione temporale | **4** | INTEGRATED | CURRENT | dominio reale; qualification completa ancora mancante |
| Impostazioni / contesto professionale | **4** | INTEGRATED | CURRENT | QL-2 ancora da eseguire |
| Account / MFA / sessioni | **5** | QUALIFIED | **STALE** | qualification storica da revalidare sull'RC corrente |
| Copilota docente | **4** | INTEGRATED | CURRENT | QL-4 + HUMAN_USE mancanti |
| Contextual Voice Capture | **3** | DEFERRED | CURRENT | fuori dal release core fino a nuova autorizzazione |
| Institutional Configurator | **1** | CONDITIONAL | CURRENT | subordinato a pilot istituzionale autorizzato |

## Evidence nuova — Orario 2026-10-03

PR #664:
- exact head verificato `6150cd260fd8574a5e16a6fcf58588bcba5b6b0d`;
- merge `57743e9d395ae5d739ca89e9afbdbb3a7edf875d`;
- Product CI PASS;
- Browser Certification PASS;
- full HVA: **69 passed**;
- WCAG automated assurance: **30 passed**;
- import PDF reale PASS mobile + desktop;
- modifica diretta end-to-end PASS mobile;
- HVA/WCAG/P6/X4/Design/HIM/ASVS/TRAMA/MFA/CodeRabbit PASS.

Questa evidence sostiene **DOS-TIMETABLE CRL 4 / CURRENT**, ma non sostituisce HUMAN_USE né una qualification capability-level per CRL 5.

## Coverage audit chiuso

Le tre capability precedentemente fuori registro sono ora auditate e rappresentate:

- `DOS-MATERIALS` → CRL 4 / INTEGRATED;
- `DOS-OBSERVATION-EVIDENCE` → CRL 3 / IMPLEMENTED;
- `DOS-CURRICULUM-INTAKE` → CRL 4 / CONDITIONAL.

È stato inoltre aggiunto:

- `DOS-PWA-DEVICE-INTAKE` → CRL 3 / IMPLEMENTED.

`CAP-DOS-ARGO-SYNC` resta uno spike non production-authorized e non viene promosso artificialmente a capability release.

## Perché Share→Orario è STALE

La qualification CRL 5 di #640 resta evidence valida, ma successivamente sono cambiati:
- intake/document understanding local-first;
- fallback OCR/remoto;
- gerarchia mobile;
- percorso principale, ora direct edit;
- import, ora opzionale e collassato.

Il livello storico non viene retrocesso; la freshness viene però correttamente resa **STALE** finché il journey corrente non viene riqualificato, inclusa l'entrata reale dal menu Condividi Android.

## Gap di completamento che restano

1. HUMAN_USE task-based di QL-1.
2. QL-2 Professional Context & Setup.
3. QL-3 Knowledge to Lesson, ora comprendendo Materiali.
4. QL-4 Governed Copilot.
5. Qualification autonoma PWA/device intake su Android reale.
6. Qualification Observe → Registra con evidence browser/mobile e recovery.
7. Revalidation whole-capability di Lesson Prep e Account/Security.
8. Runtime/pilot sustained evidence prima di qualunque CRL 6/7.

## Ordine operativo

Il sistema resta in **completion and maturation mode**:

`qualification → HUMAN_USE → recovery/runtime receipts → RC → sustained pilot`

Non si apre un nuovo feature train per aumentare artificialmente il numero di capability.
