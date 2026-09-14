# DOCENTE OS — M5 Readiness Matrix

Data di aggiornamento: **2026-09-14**  
Baseline: `develop` @ `c553feae62e70b23aa932077ec43ed76ce3b075b`  
Stato: **M5 MATURATION / UX-0 ACTIVE**

## Regola

Questa matrice governa il passaggio da **M4 — Advanced Controlled Production Pilot** a **M5 — Generally Distributable Mature Product**.

Ogni gate deve avere:

`requisito → evidenza → stato → gap → criterio di chiusura`.

Uno stato `COMPLETE` richiede evidenza verificabile nel repository o nel runtime. Una dichiarazione narrativa non è sufficiente.

Un machine gate verde non equivale a HUMAN_USE e non dimostra da solo semplicità, conformità accessibilità complessiva o maturità distributiva.

## Scala

- `COMPLETE` — requisito dimostrato e chiuso;
- `PARTIAL` — fondazione presente, evidenza o copertura incompleta;
- `OPEN` — requisito reale ma non implementato/formalizzato;
- `ACTIVE FINDING` — gap osservato nell'uso reale che blocca la chiusura dell'area;
- `CONDITIONAL` — richiesto soltanto se cambia il perimetro del prodotto;
- `NOT_APPLICABLE` — esplicitamente fuori perimetro con motivazione.

## Scorecard M5

| ID | Area | Stato | Evidenza corrente | Gap | Criterio di chiusura |
| --- | --- | --- | --- | --- | --- |
| M5-00A | Stato canonico | **COMPLETE** | `PROJECT_STATUS_CURRENT.md`, README, `CANONICAL_DOC_INDEX.md`, `PROJECT_HEALTH.md` | — | una sola fonte CURRENT; health storico non compete con lo stato canonico |
| M5-00B | Maturity baseline | **COMPLETE** | `SYSTEM_MATURITY_AUDIT_2026-09-12.md` | — | audit salvato, benchmark esplicito, classificazione M4 e gate M5 definiti |
| M5-00C | Design convergence | **COMPLETE** | DPG-2 baseline + residual register | — | DPG-1/2 permanenti e baseline monotona; non equivale a semplicità del task |
| M5-01A | Repository hygiene | **COMPLETE** | issue #362 + receipt 2026-09-14 | — | nessun debito storico ambiguo |
| M5-01B | Versioning | **COMPLETE** | `RELEASE_ENGINEERING_CANONICAL.md` + policy machine-readable + gate | — | SemVer pre-M5, major 1 gated da M5 |
| M5-01C | Release candidate | **COMPLETE** | contratto RC machine-readable + validator | — | `RC → gates → certified → promoted` definito; exact SHA/tag immutabile |
| M5-01D | GitHub Releases / changelog | **PARTIAL** | `CHANGELOG.md` canonico presente | nessuna nuova release formale emessa sotto M5-01 | prima release reale con tag, GitHub Release, changelog, exact SHA e rollback target |
| M5-02A | Pilot longitudinal evidence | **PARTIAL** | policy e ledger machine-readable | finestra HUMAN_USE longitudinale insufficiente | evidence pack di uso normale su più giornate, non selettivo e Tier-1-safe |
| M5-02B | Critical journey success | **PARTIAL** | journey critiche + HVA/gate verticali | manca roll-up HUMAN_USE ripetuto per journey | journey obbligatorie osservate con esiti e attriti aggregabili |
| M5-02C | User friction / failure log | **PARTIAL** | ledger append-only e tipi `FRICTION/INCIDENT/WORKAROUND/RECOVERY` | serie longitudinale insufficiente | trend leggibile e closure evidence senza riscrivere la storia |
| M5-02D | Task simplicity / cognitive burden | **ACTIVE FINDING** | issue #368 + `UX0_PRODUCT_SIMPLIFICATION_CANONICAL.md` | Beta localmente corretta ma globalmente troppo complessa; troppe scelte/superfici/concetti | baseline task-cost prima/dopo sulle 5 journey UX-0 + HUMAN_USE con riduzione di friction/workaround |
| M5-03A | WCAG 2.2 AA matrix | **PARTIAL** | matrice 55 criteri + validator + Playwright/axe; gate automatizzati verdi sulle baseline certificate | restano criteri `MANUAL_REQUIRED` e receipt contestuali | tutti i criteri A/AA applicabili chiusi con receipt; zero GAP |
| M5-03B | Keyboard/focus/reflow | **PARTIAL** | focus/target governance + skip-link + regression automation | manca evidence pack manuale completo | audit desktop/mobile con receipt |
| M5-03C | Assistive technology evidence | **OPEN** | baseline da definire sulle journey critiche | screen reader non verificato sistematicamente | baseline ripetibile sulle journey critiche |
| M5-04A | ASVS 5.0 mapping | **PARTIAL** | target L2; finding prioritari verificati; validator anti-waiver | requirement-level mapping L1/L2 e receipt provider-managed incomplete | tutti i requisiti L1/L2 applicabili mappati con receipt, N/A motivati, zero `OPEN_GAP` |
| M5-04B | Dependency/security cadence | **PARTIAL** | dependency-security, incident/recovery e ASVS gates attivi | manca roll-up security periodico unico | receipt periodica unica con dipendenze, finding, incident/recovery e runtime |
| M5-05A | SLI | **OPEN** | smoke/performance puntuali + raccolta M5-02 | nessun set SLI canonico | metriche definite dopo baseline osservata |
| M5-05B | SLO / error budget | **OPEN** | nessuna policy numerica congelata | manca target operativo basato su dati | SLO approvati dopo baseline M5-02 e criterio di escalation/release freeze |
| M5-05C | Incident/support runbook | **PARTIAL** | recovery e incident minimum presenti | manca operational loop sostenuto | runbook unico, owner, severità, rehearsal periodiche |
| M5-06A | Drive runtime continuity | **PARTIAL** | Drive archivio/provenienza + integrazioni parziali | continuità end-to-end non ancora matura | apertura/salvataggio/evidenza con provenance e fallimenti governati |
| M5-06B | Canva runtime continuity | **OPEN** | ruolo Canva definito | collegamento didattico runtime non chiuso | Docente OS → materiale Canva → ritorno alla lezione senza diventare registro |
| M5-06C | Arena runtime transport | **CONDITIONAL** | contratti bidirezionali maturi | transport automatico fuori baseline | richiesto solo se il pilot lo rende requisito |
| M5-07A | Tier 2 school personal data | **CONDITIONAL / NOT_ADMITTED** | policy Tier 1 attiva | privacy lifecycle istituzionale non autorizzato | gate separato privacy/legal/security prima di qualunque ammissione |
| M5-07B | Multi-user / multi-tenant | **CONDITIONAL** | single-owner pilot | onboarding/ruoli istituzionali off | necessario solo per variante istituzionale multiutente |
| M5-07C | Institutional administration | **CONDITIONAL** | non baseline | amministrazione scuola non presente | definire prodotto istituzionale prima di implementare |

## Stato Teaching Core / Teaching Evidence

Il percorso `Registra` e Teaching Evidence non sono più candidati pendenti:

- #361 — Unified Registra semantics — **COMPLETE / INTEGRATED** come `e87b8bb0a367fa78b6de4bdbca871e094dc65dd1`;
- #365 — TE-1A atomic Observation/Evidence — **COMPLETE / INTEGRATED** come `0716482c337eb8c11395ba49f7491e12a6205555`;
- #366 — TE-1B `Osserva → Registra` — **COMPLETE / INTEGRATED**, exact head `0371ce253dd7be63b80b518aa2e3834e0cc16174`, merge prodotto `8180aee707eeeb15e9863127f2df739746663e7d`;
- #367 — fix infrastrutturale X3 AAL2 — **COMPLETE / INTEGRATED** come `c553feae62e70b23aa932077ec43ed76ce3b075b`;
- #351 — **CLOSED / COMPLETED** con tracciabilità TE-1A/TE-1B e ricertificazione post-merge.

Invarianti preservate:

- `TeachingSession` è l'autorità dell'accaduto;
- `AnnualPlanBlockProgress` resta decisione professionale separata;
- nessuna auto-mutazione del Piano;
- Tier 1 professional non-personal;
- Observation facoltativa, privacy-guarded e atomica con la registrazione quando presente.

## Finding M5-02D — semplicità del task

Il pilot Beta ha evidenziato un gap distinto da design convergence, accessibilità e correttezza funzionale:

> il prodotto è spesso localmente intuitivo ma globalmente costoso; un'azione semplice può portare il docente verso ulteriori categorie, superfici e decisioni invece di ridurre il lavoro.

Questo finding non riapre M5-00C. DPG misura coerenza e debito visuale; HVA misura journey e osservabilità; WCAG misura requisiti di accessibilità. Nessuno dei tre, da solo, certifica il costo cognitivo complessivo.

Fonte canonica:

`docs/product/UX0_PRODUCT_SIMPLIFICATION_CANONICAL.md`

North star:

**Oggi → Classe → Lezione → Fatto**

Journey UX-0 obbligatorie:

1. iniziare la giornata;
2. entrare in classe;
3. condurre una lezione;
4. chiudere/registrare una lezione;
5. preparare la successiva.

Task-cost minimo da osservare:

- decisioni esplicite;
- azioni concorrenti visibili;
- surface transitions;
- concetti interni esposti;
- input obbligatori evitabili;
- recovery burden.

M5-02D può passare da `ACTIVE FINDING` a `COMPLETE` solo con baseline prima/dopo e HUMAN_USE evidence, non con una receipt macchina isolata.

## Journey critiche M5

Le prove longitudinali devono almeno coprire:

1. `login → Home/Oggi`;
2. `Home/Oggi → classe → lezione pertinente`;
3. `lezione → materiale → svolgimento → Registra la lezione`;
4. `registrazione → feedback/TeachingSession → eventuale decisione professionale di completamento`;
5. `lezione conclusa → preparazione della successiva`;
6. `Progetta → UDA → versione → export`;
7. `Conoscenza → fonte → trasformazione → provenance → riuso`;
8. `Orario + Calendario → proiezione giornaliera`;
9. `Planner → proposta assistita → conferma umana → undo`;
10. `Impostazioni → contesto docente → utilizzo coerente`;
11. `login AAL2 → Account → stato MFA → gestione fattore/password/sessioni → ritorno al lavoro`.

La journey security di closure resta distinta dalla longitudinal evidence.

## KPI da derivare in M5-02/M5-05

La baseline deve misurare almeno:

- successo/fallimento per journey critica;
- task-cost UX-0 per le cinque journey quotidiane;
- latenza percepita e tecnica quando disponibile senza sorveglianza invasiva;
- errori recuperabili/non recuperabili;
- sessioni concluse senza workaround esterno;
- casi di abbandono della procedura;
- recovery time quando misurabile;
- regressioni HVA/DPG;
- finding accessibilità aperti/chiusi;
- incidenti privacy/security.

Le soglie SLO vengono congelate solo dopo una finestra di pilot reale sufficiente.

## Ordine operativo corrente

### Fase A — UX-0 Product Simplification

1. **UX-0A**: consolidare baseline task-cost, Product Model ≠ User Model e governance — issue #368;
2. **UX-0B**: information architecture / navigazione;
3. **UX-0C**: workspace Classe task-first;
4. **UX-0D**: chiusura lezione / Registra semplificata;
5. **UX-0E**: materiali, Conoscenza e Progetta contestuali;
6. **UX-0F**: HUMAN_USE validation e confronto prima/dopo.

Durante UX-0 il default per nuova espansione funzionale è `DEFERRED`, salvo security/privacy/data-integrity fix, critical defect, requisito normativo urgente o `PROFESSIONAL_GAP_CONFIRMED`.

### Fase B — pilot evidence

7. raccogliere M5-02 durante il normale lavoro docente, registrando successi, friction, workaround, abbandoni e recovery;
8. usare la baseline osservata anche per proporre M5-05 SLI/SLO, senza soglie premature.

### Fase C — assurance

9. completare M5-03 WCAG 2.2 AA con evidence manuale e assistive technology;
10. completare M5-04 ASVS 5.0 requirement-level mapping senza false claim.

### Fase D — integrazioni

11. maturare Drive/Canva solo sulle journey didattiche reali e solo quando riducono il task-cost;
12. decidere Arena runtime da evidenza del pilot;
13. mantenere Tier 2/multi-user separati finché non esiste una decisione istituzionale esplicita.

## Regola anti-feature-creep

Durante M5 una nuova feature deve essere classificata come:

- `MATURITY_REQUIRED`;
- `PILOT_REQUIRED`;
- `PROFESSIONAL_GAP_CONFIRMED`;
- `DEFERRED`.

Durante UX-0 si aggiunge una condizione: anche una feature giustificata non deve introdurre una nuova scelta primaria se può essere assorbita da un task esistente.

Il default senza evidenza resta **DEFERRED**.