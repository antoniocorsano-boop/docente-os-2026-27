# DOCENTE OS — DOS-CRM rebaseline audit — 2026-10-03

Stato: **AUDIT CURRENT / NO AUTOMATIC PROMOTION**  
Baseline repository: `develop@57743e9d395ae5d739ca89e9afbdbb3a7edf875d`  
Fonte primaria: `ops/capability-readiness.json`

## Scopo

Questo audit riallinea il registro DOS-CRM allo stato reale del prodotto dopo il consolidamento del filone Orario mobile/PWA e chiude il gap di copertura già dichiarato dal registro.

Regole applicate:
- nessuna percentuale di completamento;
- nessuna promozione CRL per quantità di codice o numero di PR;
- evidence tecnica non sostituisce HUMAN_USE;
- una qualification storica resta storica se il journey è cambiato materialmente;
- capability pilot-scoped o deliberate fuori release restano esplicitamente circoscritte.

## Evidence corrente ad alto valore

### Orario mobile

PR #664:
- exact head verificato: `6150cd260fd8574a5e16a6fcf58588bcba5b6b0d`;
- merge in `develop`: `57743e9d395ae5d739ca89e9afbdbb3a7edf875d`;
- Product CI PASS;
- Browser Certification PASS;
- HVA full: **69 passed**;
- WCAG automated assurance: **30 passed**;
- `timetable-import-real-fixture.spec.mjs` PASS mobile + desktop;
- `timetable-mobile-direct-edit.spec.mjs` PASS mobile;
- HVA, WCAG, P6, X4, Design Policy, Human Interaction, ASVS, TRAMA, MFA e CodeRabbit PASS.

Il percorso principale è ora modifica diretta/versionata; l'importazione PDF resta un percorso opzionale.

### Materiali

Evidence runtime corrente:
- `/materiali/prossima`;
- `/materiali/domani`;
- manifest/material slots riusati nella preparazione;
- integrazione con Conoscenza/risorse e contesto lezione;
- `lesson-materials.spec.mjs` PASS mobile + desktop nel full HVA di #664;
- `tomorrow-materials.spec.mjs` PASS mobile + desktop nel full HVA di #664.

Conclusione: capability reale e integrata; manca una qualification capability-specific con HUMAN_USE/recovery.

### Observation / Evidence

Evidence runtime corrente:
- `LessonObserveClient` presente nel workspace Lezione;
- draft locale fail-closed quando l'osservazione è authored;
- rifiuto di nominativi di studenti nel draft class-level;
- passaggio dell'observation draft alla chiusura lezione;
- `recordTeachingSessionWithEvidence` con writer atomico, idempotenza/replay hardening e ricevuta coerente;
- test di dominio e applicazione presenti.

Conclusione: la UI non è più “non autorizzata”; la capability è implementata e collegata al dominio, ma manca ancora una qualification browser whole-journey dedicata. Non viene promossa oltre CRL 3 in questo audit.

### Curriculum Intake Arena

Evidence runtime corrente:
- route `/classi/[sectionId]/curricolo-arena`;
- pilot limitato e fail-closed a ECO-02 / Tecnologia 2C;
- verifica workspace/anno/classe/disciplina/grado;
- fingerprint strutturale e blocco sostituzione implicita;
- file locale non può promuovere authority istituzionale;
- decisione esplicita del docente prima della persistenza;
- baseline persistita nel repository curricolare e riusata dalla preparazione.

Conclusione: capability integrata **solo nel perimetro pilot autorizzato**. Stato trasversale `CONDITIONAL`; nessuna generalizzazione ad altre classi/discipline.

### PWA / ingresso dal dispositivo

Evidence runtime corrente:
- manifest installabile;
- icone PWA e `display: standalone`;
- service worker;
- install prompt governato;
- Web Share Target / superficie `/share-target`;
- staging/intake locale e routing governato;
- share-to-Orario già dotato di evidence storica qualificata.

Gap reali:
- installazione/aggiornamento PWA e share sheet Android non hanno ancora una qualification autonoma e sostenuta;
- l'esperienza reale ha mostrato attrito del prompt di installazione, ora escluso dal flusso `/orario`;
- la capability generale device-intake non va confusa con il sotto-journey Share→Orario.

Conclusione: capability **IMPLEMENTED / CRL 3**, non ancora CRL 4/5.

## Decisioni DOS-CRM

### Invariati nel livello
- DOS-TIMETABLE resta CRL 4;
- DOS-TODAY-NEXT resta CRL 4;
- DOS-LESSON-PREP resta CRL 5 / STALE;
- DOS-TEACHING-SESSION resta CRL 4;
- DOS-PLAN-UDA resta CRL 4;
- DOS-KNOWLEDGE resta CRL 4;
- DOS-CALENDAR resta CRL 4;
- DOS-SETTINGS resta CRL 4;
- DOS-ACCOUNT-SECURITY resta CRL 5 / STALE;
- DOS-COPILOT resta CRL 4;
- DOS-VOICE viene riallineato da CRL 3 a **CRL 2 / DEFERRED** perché l’asse Operability resta 2 e il modello aggrega sul più basso asse critico;
- DOS-INSTITUTIONAL-CONFIG resta CRL 1 / CONDITIONAL.

### Aggiornati
- DOS-TIMETABLE: evidence e baseline riallineate a #664/merge corrente;
- DOS-TT-SHARE-IMPORT: CRL 5 storico conservato, freshness → **STALE** perché il journey di import è cambiato materialmente dopo la qualification #640.

### Nuovi record
- `DOS-PWA-DEVICE-INTAKE` — CRL 3 / IMPLEMENTED;
- `DOS-MATERIALS` — CRL 4 / INTEGRATED;
- `DOS-OBSERVATION-EVIDENCE` — CRL 3 / IMPLEMENTED;
- `DOS-CURRICULUM-INTAKE` — CRL 4 / CONDITIONAL, pilot-scoped.

## Non capability release

`CAP-DOS-ARGO-SYNC` resta spike/non-production-authorized: non entra nel registro core finché non esiste un perimetro prodotto autorizzato.

## Runtime post-merge #664

Beta Render:
- commit live: `57743e9d395ae5d739ca89e9afbdbb3a7edf875d`;
- deploy `dep-db0b7tjm8hqs73ctv150` LIVE;
- runtime schema contract timetable: PASS;
- Next runtime: Ready;
- startup diagnostic timetable extractor: **UNAVAILABLE**;
- il diagnostico startup controlla solo `OPENAI_TIMETABLE_API_KEY`, mentre l'extractor runtime accetta anche `OPENAI_API_KEY`; l'effettiva disponibilità del fallback remoto resta quindi da verificare;
- Supabase runtime warning: user object sourced from `getSession()` / auth-state storage may be unauthenticated unless verified with `getUser()`.

Interpretazione:
- il nuovo direct-edit Orario non dipende dal visual extractor remoto;
- il finding extractor è prima di tutto un mismatch di readiness/observability: finché diagnostico e risoluzione runtime non coincidono, il fallback remoto non può essere attestato; questo sostiene la freshness STALE di `DOS-TT-SHARE-IMPORT`;
- il warning Supabase non viene classificato come vulnerabilità senza root-cause analysis, ma diventa finding esplicito di `DOS-ACCOUNT-SECURITY` prima della revalidation CURRENT.

## Gap di completion ancora reali

1. HUMAN_USE task-based QL-1.
2. QL-2 Professional Context & Setup.
3. QL-3 Knowledge to Lesson.
4. QL-4 Governed Copilot.
5. Qualification autonoma PWA/device intake su Android reale.
6. Qualification whole-journey Observation/Evidence.
7. Revalidation whole-capability di Lesson Prep e Account/Security.
8. Sustained runtime/pilot evidence prima di CRL 6/7.

## Regola operativa

Il lavoro successivo deve essere **qualification/consolidation-first**. Questo audit non autorizza un nuovo feature train.
