# DOCENTE OS — Audit di completamento e maturità con benchmark

Data: **2026-09-12**  
Baseline auditata: `develop` @ `3767d4d5cf20b54808526a73bcbc800a1c5e6503`  
Stato: **CANONICAL MATURITY AUDIT / M5-00 BASELINE**

## 1. Decisione sintetica

DOCENTE OS resta classificato **M4 — CONTROLLED PRODUCTION PILOT**, ma il livello di maturità è significativamente superiore alla fotografia del 28 agosto 2026.

Il prodotto non è più da considerare incompleto nel senso tradizionale: il **single-owner professional core** è sostanzialmente completo e utilizzabile nel normale lavoro docente. La fase successiva non deve essere una nuova espansione indiscriminata di feature, ma un programma esplicito di **maintenance & maturation** verso M5.

Valutazione corrente:

| Indicatore | Valore |
| --- | ---: |
| Completamento nel perimetro single-owner docente | **≈ 91%** |
| Maturità ingegneristica complessiva | **4,10 / 5 — ≈82%** |
| Prontezza al pilot reale quotidiano | **ALTA** |
| Prontezza M5 / distribuzione generale | **≈68–72%** |
| Prontezza istituzionale multiutente con dati scolastici personali | **≈55–60%** |
| Classificazione | **M4 confermato** |

Le percentuali sono **indicatori interni di audit**, non certificazioni ISO o dichiarazioni di conformità normativa.

## 2. Benchmark adottato

L'audit usa tre famiglie di riferimenti:

### 2.1 Qualità del prodotto

**ISO/IEC 25010:2023 — Product quality model**. Il modello ISO definisce nove caratteristiche di qualità per prodotti ICT/software e viene assunto come riferimento strutturale per la scorecard.

Riferimento: <https://www.iso.org/standard/78176.html>

### 2.2 Accessibilità

**WCAG 2.2**, W3C Recommendation. L'obiettivo di maturazione è una matrice verificabile almeno di livello **AA**, comprendendo focus, target size, keyboard use, reflow/zoom, alternative alle interazioni di trascinamento e autenticazione accessibile.

Riferimenti:
- <https://www.w3.org/TR/WCAG22/>
- <https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/>

### 2.3 Sicurezza applicativa

**OWASP Application Security Verification Standard 5.0** come riferimento per trasformare i controlli già presenti in una verification matrix esplicita e tracciabile.

Riferimento: <https://owasp.org/www-project-application-security-verification-standard/>

### 2.4 Benchmark di prodotto

Il confronto funzionale e operativo considera, senza assumere equivalenza di missione:

- Google Classroom;
- Canvas LMS;
- Moodle LMS;
- Microsoft Teams for Education.

Questi prodotti sono usati come benchmark per maturità di ecosistema, integrazioni, accessibilità, mobile, amministrazione, release e supportabilità. DOCENTE OS mantiene un perimetro differente: **sistema operativo professionale del docente**, non LMS generalista.

Riferimenti:
- <https://edu.google.com/workspace-for-education/products/classroom/>
- <https://www.instructure.com/canvas>
- <https://moodle.com/solutions/lms/features/>
- <https://www.microsoft.com/education/products/teams>

## 3. Stato verificato del prodotto

La linea canonica è l'applicazione Next.js in `product/` con:

- Next.js 16, React 19 e TypeScript strict;
- Supabase Auth + PostgreSQL + Storage;
- Row Level Security deny-by-default;
- persistenza server;
- Planner/Oggi;
- Conoscenza con ingestione, trasformazione, provenienza e generations;
- Piano annuale;
- Progetta e authoring UDA versionato;
- Classi e workspace di classe;
- Orario e Calendario indipendenti con Temporal Projection;
- TeachingSession e registrazione della lezione;
- export professionale;
- Human Interaction Model e Human + Visual Acceptance;
- assistente contestuale con confine human-in-the-loop;
- write assistita `PLANNER_CREATE_TASK` già certificata;
- DPG-1/DPG-2 come governance permanente del design system.

La convergenza DPG-2 è stata chiusa con baseline macchina:

- raw colors: **27**;
- local tokens: **13**;
- legacy brand references: **0**;
- decorative effects: **0**;
- raw radii: **1**;
- raw shadows: **5**.

I residui sono classificati e continuano a essere conteggiati dal ratchet; non costituiscono una allowlist.

## 4. Scorecard di maturità

| Dimensione | Score / 5 | Giudizio |
| --- | ---: | --- |
| Functional suitability | **4.4** | ciclo professionale docente ampio e coerente |
| Performance efficiency | **4.4** | gate prestazionali presenti; manca evidenza longitudinale su uso reale |
| Compatibility / interoperability | **3.6** | contratti maturi, integrazioni runtime ancora parziali |
| Interaction capability | **4.4** | DPG, HVA, HIM, mobile e touch maturi |
| Reliability / recovery | **4.5** | restore/recovery e promozione controllata sopra la media di un pilot |
| Security | **4.4** | base tecnica forte; manca mapping ASVS formale |
| Maintainability / testability | **4.5** | TypeScript strict, CI e gate specialistici; repository hygiene da chiudere |
| Flexibility / scalability | **3.2** | single-owner solido; multi-user/multi-tenant non baseline |
| Safety / privacy | **4.1** | fail-closed forte; Tier 2 correttamente non ammesso |
| Operability / supportability | **3.6** | CI forte; mancano release formali, SLO/SLI e osservabilità sostenuta |
| Institutional readiness | **2.8** | uso istituzionale multiutente non ancora autorizzato |

Media indicativa ponderata: **≈4,10/5**.

## 5. Benchmark di completamento

### 5.1 Dove DOCENTE OS è già maturo

Nel perimetro single-owner docente, le capacità fondamentali sono ormai comparabili a un prodotto professionale maturo:

- contesto giornaliero e priorità operative;
- pianificazione e progettazione;
- conoscenza e provenienza;
- gestione classe;
- orario e calendario;
- attività didattica reale e registrazione;
- documentazione ed export;
- controllo umano sulle azioni assistite;
- design system governato;
- CI e gate E2E verticali.

Il vantaggio specifico rispetto ai benchmark LMS è la continuità professionale:

`progettazione → conoscenza → pianificazione → lezione → evidenza reale → diario → revisione professionale`.

### 5.2 Dove i benchmark sono ancora avanti

I prodotti maturi di riferimento mostrano maggiore maturità in:

- distribuzione multiutente e amministrazione istituzionale;
- ecosistema di integrazioni;
- mobile native/offline;
- release/versioning pubblico e supportabilità;
- analytics longitudinali;
- accessibilità formalmente verificabile;
- governance operativa su scala e disponibilità continuativa.

Questi elementi non devono essere copiati meccanicamente: servono a definire il divario verso M5.

## 6. Finding principali

### F1 — Canonical status drift

**Severità: SIGNIFICANT / GOVERNANCE**

`PROJECT_STATUS_CURRENT.md`, `README.md` e `PROJECT_HEALTH.md` non riflettono completamente lo stato successivo alle tranche X4/X5, Home, Diario e DPG-2.

Decisione: **M5-00 deve riallineare lo stato canonico prima di ulteriori decisioni di maturità.**

### F2 — Repository hygiene

**Severità: SIGNIFICANT / NON-RUNTIME-BLOCKING**

Restano PR storiche/draft superseded da tranche già consolidate. `open` deve tornare a significare lavoro realmente candidato.

Decisione: chiusura esplicita come `SUPERSEDED` dopo verifica.

### F3 — Release engineering assente come disciplina formale

**Severità: SIGNIFICANT PER M5**

Al 12 settembre 2026 non risultano GitHub Releases formali né una disciplina canonica completa di versioning, release candidate, changelog e rollback receipt.

Decisione: introdurre un programma di release engineering prima di M5.

### F4 — Accessibilità non ancora certificabile come matrice WCAG 2.2 AA

**Severità: SIGNIFICANT PER M5**

DPG/HVA/HIM incorporano numerose regole di accessibilità, ma non esiste una matrice WCAG 2.2 AA requisito → evidenza → esito.

Decisione: creare un Accessibility Assurance Gate separato, senza confonderlo con HVA.

### F5 — Security controls non mappati su ASVS 5.0

**Severità: MODERATE / ASSURANCE GAP**

RLS, fail-closed boundaries, recovery e security gate sono forti, ma manca una matrice ASVS 5.0 che renda dimostrabile la copertura.

Decisione: produrre mapping ASVS con `PASS / PARTIAL / NOT_APPLICABLE / GAP`.

### F6 — SLO/SLI e osservabilità sostenuta non formalizzati

**Severità: SIGNIFICANT PER M5**

Esistono smoke test, performance gate, health e recovery, ma non una policy di SLO/SLI/error budget del prodotto.

Decisione: definire disponibilità, error rate, latenza delle azioni critiche e recovery objectives coerenti con il pilot.

### F7 — Interoperabilità runtime ancora inferiore ai benchmark

**Severità: PRODUCT MATURATION**

I contratti Arena e i confini Drive/Canva sono maturi concettualmente, ma la continuità runtime end-to-end non è ancora allo stesso livello dei benchmark generalisti.

Decisione: priorità a **Docente OS ↔ Drive ↔ Canva**; Arena runtime resta requirement condizionale, non obbligo implicito di M5.

### F8 — Tier 2 e multi-user correttamente non ammessi

**Severità: BLOCKER SOLO PER ISTITUZIONALIZZAZIONE**

`TIER_2_SCHOOL_PERSONAL_DATA` e distribuzione multiutente non sono autorizzati.

Decisione: non abbassare questo confine per accelerare M5; aprire un gate privacy/istituzionale separato solo quando richiesto.

## 7. Decisione di maturità

**M4 confermato — ADVANCED CONTROLLED PRODUCTION PILOT.**

M5 non viene negato per mancanza del core funzionale. Viene rinviato perché un prodotto generalmente distribuibile richiede evidenza sostenuta e discipline operative ulteriori.

Il programma di sviluppo cambia quindi priorità:

> **FEATURE DEVELOPMENT → MAINTENANCE & MATURATION PROGRAM**

Nuove feature sono ammesse solo quando:

1. chiudono un finding M5;
2. sono necessarie al pilot reale;
3. risolvono una lacuna professionale dimostrata da evidenza d'uso.

## 8. Gate M5 proposti

- **M5-00 — Canonical State & Maturity Baseline**
- **M5-01 — Repository Hygiene & Release Engineering**
- **M5-02 — Sustained Pilot Evidence**
- **M5-03 — WCAG 2.2 AA Assurance**
- **M5-04 — ASVS 5.0 Security Mapping**
- **M5-05 — SLO/SLI & Operational Observability**
- **M5-06 — Runtime Integration Maturity (Drive/Canva; Arena conditional)**
- **M5-07 — Institutional / Tier 2 Readiness — separate authorization gate**

La matrice operativa è in `docs/product/M5_READINESS_MATRIX_2026-09-12.md`.

## 9. Criterio di promozione M5

DOCENTE OS potrà essere riclassificato **M5 — GENERALLY DISTRIBUTABLE MATURE PRODUCT** soltanto quando:

- i gate M5 obbligatori saranno chiusi con evidenza;
- non esisteranno finding HIGH/CRITICAL irrisolti;
- il pilot avrà prodotto evidenza longitudinale sufficiente;
- release e rollback saranno riproducibili;
- accessibilità e security assurance saranno tracciabili;
- l'ambito dati ammesso sarà esplicito e coerente con il pubblico effettivo del prodotto.

Multi-user e Tier 2 non sono automaticamente necessari per un eventuale M5 **single-owner**; diventano obbligatori solo se il prodotto viene promosso come soluzione istituzionale multiutente.
