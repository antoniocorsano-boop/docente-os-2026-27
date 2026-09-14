# DOCENTE OS — M5 Readiness Matrix

Data di aggiornamento: **2026-09-14**  
Baseline corrente prima della PR UX-0 governance: `develop` @ `c553feae62e70b23aa932077ec43ed76ce3b075b`  
Stato: **M5 MATURATION / UX-0 REWORK ACTIVE**

## Regola

Questa matrice governa il passaggio da **M4 — Advanced Controlled Production Pilot** a **M5 — Generally Distributable Mature Product**.

Ogni gate deve avere:

`requisito → evidenza → stato → gap → criterio di chiusura`.

Uno stato `COMPLETE` richiede evidenza verificabile nel repository o nel runtime. Una dichiarazione narrativa o un singolo gate automatico verde non sono sufficienti.

## Scala

- `COMPLETE` — requisito dimostrato e chiuso;
- `PARTIAL` — fondazione presente, evidenza o copertura incompleta;
- `OPEN` — requisito reale ma non implementato/formalizzato;
- `REWORK_REQUIRED` — capacità presente ma journey/prodotto non ancora sufficientemente maturo;
- `CONDITIONAL` — richiesto soltanto se cambia il perimetro;
- `NOT_APPLICABLE` — fuori perimetro con motivazione.

## Scorecard M5

| ID | Area | Stato | Evidenza corrente | Gap | Criterio di chiusura |
| --- | --- | --- | --- | --- | --- |
| M5-00A | Stato canonico | **COMPLETE** | `PROJECT_STATUS_CURRENT.md`, README, `CANONICAL_DOC_INDEX.md` | — | una sola fonte CURRENT coerente |
| M5-00B | Maturity baseline | **COMPLETE** | `SYSTEM_MATURITY_AUDIT_2026-09-12.md` | — | classificazione M4 e programma M5 espliciti |
| M5-00C | Design convergence | **COMPLETE** | DPG-2 + residual register | — | DPG permanenti e baseline monotona |
| **M5-00D** | **Critical journey simplification / Task Cost** | **REWORK_REQUIRED** | #370, `PRODUCT-SIMPLIFICATION.md`, `UX-0A-BASELINE.md` | journey corretti localmente ma ancora troppo costosi cognitivamente; Product Model parzialmente esposto | cinque journey UX-0 verificati end-to-end con Task Cost before→after e nessuna regressione di autorità/sicurezza/accessibilità |
| M5-01A | Repository hygiene | **COMPLETE** | receipt M5-01A | — | coda classificata intenzionalmente |
| M5-01B | Versioning | **COMPLETE** | `RELEASE_ENGINEERING_CANONICAL.md` + policy | — | SemVer pre-M5 governato |
| M5-01C | Release candidate | **COMPLETE** | RC contract + validator | — | exact SHA/tag immutabile e promotion governata |
| M5-01D | GitHub Releases / changelog | **PARTIAL** | `CHANGELOG.md` | prima release reale non ancora emessa | release reale con tag, GitHub Release, changelog, SHA e rollback target |
| M5-02A | Pilot longitudinal evidence | **PARTIAL** | policy + ledger append-only | HUMAN_USE longitudinale insufficiente | evidence pack su più giornate, non selettivo, Tier-1-safe |
| M5-02B | Critical journey success | **PARTIAL** | journey congelate + HVA/gate tecnici | manca roll-up HUMAN_USE; UX-0A è REWORK_REQUIRED | journey ripetute con successo/friction misurati e UX-0 chiusa |
| M5-02C | User friction / failure log | **PARTIAL** | ledger con FRICTION/INCIDENT/WORKAROUND/RECOVERY | serie longitudinale insufficiente | trend + closure evidence senza riscrivere la storia |
| M5-03A | WCAG 2.2 AA matrix | **PARTIAL** | 55 criteri + validator + axe/Playwright | manual required residui | tutti i criteri A/AA applicabili chiusi con receipt |
| M5-03B | Keyboard/focus/reflow | **PARTIAL** | focus/target governance + regression automation | evidence manuale completa mancante | audit desktop/mobile con receipt |
| M5-03C | Assistive technology evidence | **OPEN** | baseline da definire | screen reader non sistematico | baseline ripetibile sulle journey critiche |
| M5-04A | ASVS 5.0 mapping | **PARTIAL** | target L2; finding prioritari chiusi | requirement-level mapping incompleta | L1/L2 applicabili mappati con receipt, zero gap aperti |
| M5-04B | Dependency/security cadence | **PARTIAL** | dependency, incident/recovery, ASVS gates | roll-up periodico unico mancante | receipt periodica consolidata |
| M5-05A | SLI | **OPEN** | smoke/performance + M5-02 | nessun set canonico | metriche dopo baseline osservata |
| M5-05B | SLO / error budget | **OPEN** | — | target non ancora basati su dati | SLO approvati dopo baseline M5-02 |
| M5-05C | Incident/support runbook | **PARTIAL** | recovery/incident minimum | operational loop sostenuto incompleto | runbook, owner, severità, rehearsal |
| M5-06A | Drive runtime continuity | **PARTIAL** | integrazioni e provenance parziali | journey end-to-end non matura | apertura/salvataggio/evidenza/failure governati |
| M5-06B | Canva runtime continuity | **OPEN** | ruolo definito | collegamento runtime non chiuso | Docente OS → Canva → ritorno lezione senza diventare registro |
| M5-06C | Arena runtime transport | **CONDITIONAL** | contratti maturi | transport automatico fuori baseline | solo se il pilot lo rende requisito |
| M5-07A | Tier 2 school personal data | **CONDITIONAL / NOT_ADMITTED** | policy Tier 1 | lifecycle istituzionale non autorizzato | gate privacy/legal/security separato |
| M5-07B | Multi-user / multi-tenant | **CONDITIONAL** | single-owner pilot | onboarding/ruoli istituzionali off | necessario solo per variante multiutente |
| M5-07C | Institutional administration | **CONDITIONAL** | non baseline | prodotto istituzionale non definito | decisione prodotto preventiva |

## Capability security/account

Account e sicurezza sono consolidati nella baseline M4 controllata:

- #346 MFA/AAL2 foundation → `b07596f7c2142becd32eb66ed195ecbf5ac6b24a`;
- #348 Account exact head `41bb3c55c866c31c6b906382165f3c18821ec81e` → merge `77455d5f50bcccf2fed2cf5607dba3067fd81f97`.

Questa evidence tecnica non equivale a HUMAN_USE M5-02, conformità WCAG complessiva, verifica ASVS L2 o Production promotion.

## Teaching Core / TE-1

Il prerequisito semantico #361 e Teaching Evidence TE-1A/TE-1B sono ora integrati:

- #361 → `e87b8bb0a367fa78b6de4bdbca871e094dc65dd1`;
- TE-1A #365 → `0716482c337eb8c11395ba49f7491e12a6205555`;
- TE-1B #366 → `8180aee707eeeb15e9863127f2df739746663e7d`;
- X3 AAL2 workflow fix #367 → `c553feae62e70b23aa932077ec43ed76ce3b075b`.

TE-1 è `COMPLETE / INTEGRATED`; #351 è completed. Questo chiude la semantica/persistenza del percorso, **non** il finding UX-0 sul costo del task.

## UX-0 — Product Simplification

### Finding

La Beta reale mostra che le slice possono essere singolarmente corrette e passare HVA/WCAG/DPG/HIM pur lasciando il journey complessivo troppo complesso.

La superficie Classe è la baseline più evidente: preparazione, attuazione reale, revisione Piano, completamento professionale, materiali e fallback temporali possono competere nello stesso contesto.

### Stato

`M5-00D = REWORK_REQUIRED / MATURITY_REQUIRED`.

Questo finding blocca una futura dichiarazione M5 di maturità generale delle journey interessate finché non viene chiuso con evidence `before → after`.

### Contratto

`Product Model ≠ User Model`.

Target percepito:

`Oggi → Classe → Lezione → Fatto`.

Regola:

> Una nuova funzione non è un miglioramento se introduce una nuova scelta visibile al docente. Deve essere assorbita da un task esistente, salvo prova che costituisca un nuovo compito umano reale.

### UX-0A

Primo slice:

`Home/Oggi → Classe → Lezione → Osserva → Registra → prossimo passo`.

Acceptance minima:

- una sola CTA primaria per stato;
- nessuna scelta prematura tra TeachingSession e Piano annuale;
- completamento Piano solo come decisione successiva pertinente;
- fallback Calendario/Orario contestuali;
- materiali nel momento d'uso;
- draft Observation, Tier 1, AAL2, provenance e idempotenza invariati;
- Task Cost misurato `before → after`;
- HVA/WCAG/DPG/HIM ancora obbligatori.

La possibile navigazione `Oggi · Classi · Orario · Materiali · Altro` resta **ipotesi**, non baseline.

## Journey critiche M5

Le prove longitudinali devono almeno coprire:

1. `login → Home/Oggi`;
2. `Home → classe → attività/lezione`;
3. `lezione → materiale → svolgimento → Registra la lezione`;
4. `registrazione → TeachingSession / prossimo passo professionale`;
5. `Progetta → UDA → versione → export`;
6. `Conoscenza → fonte → trasformazione → provenienza → riuso`;
7. `Orario + Calendario → proiezione giornaliera`;
8. `Planner → proposta assistita → conferma umana → undo`;
9. `Impostazioni → contesto docente → utilizzo coerente`;
10. `login AAL2 → Account → MFA/password/sessioni → ritorno al lavoro`.

Per le journey 1–4, UX-0 introduce anche Task Cost come evidence di maturità; non sostituisce la evidence HUMAN_USE M5-02.

## KPI da derivare in M5-02/M5-05

La baseline deve misurare almeno:

- successo/fallimento per journey;
- friction, workaround e abbandoni;
- latenza percepita/tecnica quando disponibile senza sorveglianza invasiva;
- errori recuperabili/non recuperabili;
- recovery time quando misurabile;
- regressioni HVA/DPG;
- finding accessibilità;
- incidenti privacy/security;
- per UX-0: decision count, internal concepts, competing actions, surface transitions e net work.

Le soglie numeriche SLI/SLO vengono congelate solo dopo una finestra di pilot sufficiente.

## Ordine operativo corrente

1. **UX-0 governance**: allineare memoria condivisa, indice canonico, stato corrente e readiness matrix; exact-head certification prima del merge.
2. **UX-0A**: semplificare il journey lezione senza nuove feature e misurare Task Cost before→after.
3. **M5-02**: continuare Pilot Evidence durante uso normale, includendo friction/workaround/failure.
4. **M5-03/M5-04**: completare evidence manuale/assistive e requirement-level security mapping senza false claim.
5. **M5-05**: derivare SLI/SLO solo dalla baseline osservata.
6. **M5-06**: maturare Drive/Canva sulle journey didattiche reali; Arena transport resta conditional.
7. **M5-07**: Tier 2/multiuser restano separati e non autorizzati.

L'emendamento integrato `CML-DOS-INTEGRATED-GOVERNANCE-V1` autorizza UX-0 come slice **Docente-only** indipendente da Arena S3/S4. Non anticipa Arena S4 né autorizza DOS-S2 cross-boundary.

## Regola anti-feature-creep

Durante M5 una nuova feature deve essere classificata come:

- `MATURITY_REQUIRED`;
- `PILOT_REQUIRED`;
- `PROFESSIONAL_GAP_CONFIRMED`;
- `DEFERRED`.

Il default è **DEFERRED**. Durante UX-0 nuove feature surface restano congelate salvo regressioni, sicurezza/privacy, accessibilità, obblighi normativi o prerequisiti indispensabili alla semplificazione.