# DOCENTE OS — Stato corrente canonico

Data: **2026-09-14**  
Stato documento: **CURRENT / CANONICAL STATUS**

Questo documento è la sintesi autorevole dello stato operativo corrente. Checkpoint, audit datati e PR storiche preservano la provenienza ma non devono essere usati per dedurre lo stato corrente quando divergono da questo file.

Baseline integrata corrente prima della PR UX-0 governance:

`develop` @ `c553feae62e70b23aa932077ec43ed76ce3b075b`

## 1. Classificazione

DOCENTE OS resta classificato:

**M4 — ADVANCED CONTROLLED PRODUCTION PILOT**

Il single-owner professional core è avanzato e governato; il programma attivo resta **maintenance & maturation** verso M5. Nessuna closure locale, incluso Account, TE-1 o un gate automatico verde, costituisce da sola promozione a M5 o Production.

Ambito dati ammesso:

`TIER_1_OWNER_PROFESSIONAL_NON_PERSONAL`.

Restano non autorizzati senza gate separato: Tier 2 scolastico/personale, signup pubblico, multi-tenant, uso istituzionale multiutente e migrazione automatica Beta → Production.

## 2. Invarianti correnti

- `TeachingSession` è la ricevuta autorevole di ciò che è realmente accaduto nella lezione.
- `AnnualPlanBlockProgress` resta una decisione professionale distinta; nessun automatismo marca un blocco `SVOLTO`.
- Observation/Evidence TE-1 restano additive, Tier-1-safe e governate.
- Orario e Calendario restano domini distinti, composti solo tramite Temporal Projection.
- Arena mantiene l'autorità curricolare/istituzionale; Docente OS mantiene il lavoro operativo del docente.
- Nessuna semplificazione UX può indebolire sicurezza, AAL2, privacy, provenance, idempotenza o controllo umano.

## 3. Capability consolidate

### Account e sicurezza — COMPLETE / INTEGRATED

- MFA/AAL2 foundation: #346 → `b07596f7c2142becd32eb66ed195ecbf5ac6b24a`.
- Account UI/security: #348, exact head `41bb3c55c866c31c6b906382165f3c18821ec81e`, merge `77455d5f50bcccf2fed2cf5607dba3067fd81f97`.
- Account, password, MFA e sessioni restano separati dalle Impostazioni professionali.

Questa closure non equivale a dichiarazione complessiva WCAG 2.2 AA, ASVS L2 o promozione Production.

### Teaching Core / TE-1 — COMPLETE / INTEGRATED

Convergenza `Registra la lezione`:

- #361 → merge `e87b8bb0a367fa78b6de4bdbca871e094dc65dd1`.

TE-1A — persistenza atomica Observation/Evidence:

- #365 exact head `2bae1043607c385870a93a85acd8f5484a36dce1`;
- merge `0716482c337eb8c11395ba49f7491e12a6205555`.

TE-1B — binding `Osserva → Registra`:

- #366 exact head `0371ce253dd7be63b80b518aa2e3834e0cc16174`;
- merge prodotto `8180aee707eeeb15e9863127f2df739746663e7d`;
- P6 post-merge PASS;
- HVA post-merge PASS con journey browser, receipt, evidence ed enforcement.

Follow-up infrastrutturale X3:

- #367 exact head `2bb1a478716e8182a3cf6e1c09a453f6447f6f34`;
- merge `c553feae62e70b23aa932077ec43ed76ce3b075b`;
- X3 application acceptance PASS;
- X3 Render acceptance PASS;
- correzione limitata al workflow AAL2/MFA, nessuna modifica `product/**`.

L'issue TE-1 #351 è `completed`.

## 4. Design, Human e assurance

Sono permanenti:

- Product CI;
- Human Interaction Model;
- Human + Visual Acceptance;
- Design Policy / DPG-2 ratchet;
- P6 Performance Baseline;
- P7 Anonymization Input Guard;
- dependency/operational security;
- Release Engineering Policy;
- Pilot Evidence Policy;
- WCAG 2.2 AA Assurance;
- OWASP ASVS 5.0 Assurance.

### WCAG

M5-03 resta **PARTIAL**: automazione e regressioni sono presenti, ma conformità complessiva non è dichiarata finché non sono completati i criteri manuali, keyboard/focus/reflow e assistive technology.

### ASVS

M5-04 resta **PARTIAL**, target ASVS 5.0.0 L2 con `verificationClaim=false`. Closure di finding prioritari non equivale a verifica complessiva L2.

## 5. Finding corrente prioritario — UX-0 Product Simplification

La Beta reale evidenzia un finding trasversale di maturità:

**UX-0 / TASK COMPLEXITY — REWORK_REQUIRED**.

La correttezza locale delle slice, i gate HVA/WCAG/DPG/HIM e la separazione rigorosa del dominio non producono ancora sufficiente semplicità globale. In particolare il docente può incontrare troppe scelte concorrenti e parte del Product Model viene ancora esposta come tassonomia dell'interfaccia.

Evidence e governance:

- issue #370 — `UX-0 — Product Simplification`;
- `product/design/PRODUCT-SIMPLIFICATION.md`;
- `product/design/reviews/UX-0A-BASELINE.md`;
- `product/design/HUMAN-EXPERIENCE-CONTRACT.md` aggiornato con Task Cost.

Principio corrente:

**Product Model ≠ User Model**.

Target percepito:

`Oggi → Classe → Lezione → Fatto`.

### Impatto M5

UX-0 è un finding su journey critiche M5 e deve essere chiuso prima di poter sostenere una maturità distributiva generale delle superfici interessate. Un HVA verde non chiude automaticamente questo finding: HVA e Task Cost misurano proprietà differenti.

Durante UX-0 nuove feature surface sono `DEFERRED`, salvo regressioni, sicurezza/privacy, accessibilità, obblighi normativi o prerequisiti indispensabili alla semplificazione.

## 6. UX-0A — prossimo slice autorizzato

Journey:

`Home/Oggi → Classe → Lezione → Osserva → Registra → prossimo passo`.

Obiettivi:

- una sola CTA primaria per stato;
- Classe come launcher del task, non dashboard del Product Model;
- non imporre al docente la distinzione TeachingSession vs AnnualPlanBlockProgress prima che serva una decisione professionale;
- completamento Piano solo come decisione successiva pertinente;
- fallback Calendario/Orario contestuali, non concorrenti nel percorso normale;
- materiali nel momento d'uso;
- nessuna nuova feature;
- invarianti TE-1, Tier 1, AAL2, provenance e idempotenza invariati.

La navigazione ridotta `Oggi · Classi · Orario · Materiali · Altro` resta un'ipotesi da validare e **non è ancora baseline autorizzata**.

## 7. Roadmap integrata

La memoria condivisa `CML-DOS-INTEGRATED-GOVERNANCE-V1` è stata emendata per autorizzare UX-0 come **Docente-only maturation slice** indipendente da Arena S3/S4.

Questo non anticipa Arena S4 e non autorizza DOS-S2 cross-boundary. Arena continua la propria stabilizzazione in parallelo; UX-0 può modificare solo presentazione/orchestrazione di workflow già appartenenti a Docente OS.

## 8. Maturity program M5

Stato sintetico:

- M5-00 Canonical State & Maturity Baseline — **COMPLETE**, con UX-0 registrato come finding corrente;
- M5-01A Repository Hygiene — **COMPLETE**;
- M5-01B Versioning — **COMPLETE**;
- M5-01C Release Candidate Contract — **COMPLETE**;
- M5-01D GitHub Release / changelog — **PARTIAL**;
- M5-02 Sustained Pilot Evidence — **COLLECTING / PARTIAL**;
- M5-03 WCAG 2.2 AA — **PARTIAL**;
- M5-04 ASVS 5.0 — **PARTIAL**;
- M5-05 SLI/SLO & Operational Observability — **OPEN/PARTIAL**;
- M5-06 Drive/Canva runtime maturity; Arena conditional — **PARTIAL**;
- M5-07 Tier 2 / institutional / multi-user — **CONDITIONAL / NOT AUTHORIZED**;
- UX-0 critical journey simplification — **REWORK_REQUIRED / MATURITY_REQUIRED**.

## 9. Priorità operative correnti

1. chiudere la governance UX-0 con exact-head certification e memoria condivisa coerente nei due repository;
2. eseguire UX-0A sul journey lezione, misurando Task Cost `before → after`;
3. non ampliare le superfici interessate finché UX-0A non dimostra una riduzione reale della complessità;
4. continuare M5-02 Pilot Evidence durante il normale lavoro docente, includendo friction e workaround;
5. completare M5-03 manual/assistive evidence e M5-04 requirement-level mapping senza false claim;
6. definire SLI/SLO soltanto da baseline osservata;
7. maturare Drive/Canva solo sulle journey reali;
8. mantenere Tier 2, multiutente e trasporto Arena automatico separati finché non esiste una decisione esplicita supportata da evidenza.

## 10. Regola anti-feature-creep

Durante M5 ogni nuova feature deve essere classificata come:

- `MATURITY_REQUIRED`;
- `PILOT_REQUIRED`;
- `PROFESSIONAL_GAP_CONFIRMED`;
- `DEFERRED`.

Il default in assenza di evidenza è **DEFERRED**.

Durante UX-0 vale inoltre la regola più restrittiva:

> Una nuova funzione non è un miglioramento se introduce una nuova scelta visibile al docente. Deve essere assorbita da un task esistente, salvo prova che costituisca un nuovo compito umano reale.
