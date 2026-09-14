# DOCENTE OS — M5 Readiness Matrix

Data di aggiornamento: **2026-09-14**  
Baseline: `develop` @ `77455d5f50bcccf2fed2cf5607dba3067fd81f97`  
Stato: **M5 MATURATION / POST-ACCOUNT CLOSURE**

## Regola

Questa matrice governa il passaggio da **M4 — Advanced Controlled Production Pilot** a **M5 — Generally Distributable Mature Product**.

Ogni gate deve avere:

`requisito → evidenza → stato → gap → criterio di chiusura`.

Uno stato `COMPLETE` richiede evidenza verificabile nel repository o nel runtime. Una dichiarazione narrativa non è sufficiente.

## Scala

- `COMPLETE` — requisito dimostrato e chiuso;
- `PARTIAL` — fondazione presente, evidenza o copertura incompleta;
- `OPEN` — requisito reale ma non implementato/formalizzato;
- `CONDITIONAL` — richiesto soltanto se cambia il perimetro del prodotto;
- `NOT_APPLICABLE` — esplicitamente fuori perimetro con motivazione.

## Scorecard M5

| ID | Area | Stato | Evidenza corrente | Gap | Criterio di chiusura |
| --- | --- | --- | --- | --- | --- |
| M5-00A | Stato canonico | **COMPLETE** | `PROJECT_STATUS_CURRENT.md`, README, `CANONICAL_DOC_INDEX.md`, `PROJECT_HEALTH.md` | — | una sola fonte CURRENT; health storico non compete con lo stato canonico |
| M5-00B | Maturity baseline | **COMPLETE** | `SYSTEM_MATURITY_AUDIT_2026-09-12.md` | — | audit salvato, benchmark esplicito, classificazione M4 e gate M5 definiti |
| M5-00C | Design convergence | **COMPLETE** | DPG-2 baseline 27/13/0/0/1/5 + residual register | — | DPG-1/2 permanenti e baseline monotona |
| M5-01A | Repository hygiene | **COMPLETE** | issue #362 + `M5_01A_REPOSITORY_HYGIENE_RECEIPT_2026-09-14.md`; PR superate chiuse, C2P/TE/candidati/deferred classificati | — | ogni PR aperta è candidato reale, stacked deliberato, deferred motivato o checkpoint professionale; nessuna ricevuta storica ambigua |
| M5-01B | Versioning | **COMPLETE** | `RELEASE_ENGINEERING_CANONICAL.md` + policy machine-readable + gate | — | SemVer pre-M5, major 1 gated da M5 |
| M5-01C | Release candidate | **COMPLETE** | contratto RC machine-readable + validator | — | `RC → gates → certified → promoted` definito; exact SHA/tag immutabile |
| M5-01D | GitHub Releases / changelog | **PARTIAL** | `CHANGELOG.md` canonico presente | nessuna nuova release formale emessa sotto M5-01 | prima release reale con tag, GitHub Release, changelog, exact SHA e rollback target; vietata release fittizia |
| M5-02A | Pilot longitudinal evidence | **PARTIAL** | policy e ledger machine-readable avviati | finestra HUMAN_USE longitudinale ancora insufficiente | evidence pack di uso normale su più giornate, non selettivo e Tier-1-safe |
| M5-02B | Critical journey success | **PARTIAL** | journey critiche congelate + HVA/gate verticali come baseline tecnica | manca evidenza HUMAN_USE ripetuta e roll-up per journey | journey obbligatorie osservate ripetutamente con esiti/attriti aggregabili |
| M5-02C | User friction / failure log | **PARTIAL** | ledger append-only e tipi `FRICTION/INCIDENT/WORKAROUND/RECOVERY` | manca serie longitudinale sufficiente di finding reali | trend leggibile e closure evidence senza riscrivere la storia |
| M5-03A | WCAG 2.2 AA matrix | **PARTIAL** | matrice 55 criteri + validator + Playwright/axe; gate automatizzati verdi sulle baseline certificate | restano criteri `MANUAL_REQUIRED` e receipt contestuali | tutti i criteri A/AA applicabili chiusi con receipt; zero GAP |
| M5-03B | Keyboard/focus/reflow | **PARTIAL** | focus/target governance + skip-link + regression automation | manca evidence pack manuale completo per tab order, focus obscured, no trap, zoom/reflow e text spacing | audit desktop/mobile con receipt |
| M5-03C | Assistive technology evidence | **OPEN** | baseline da definire sulle journey critiche | screen reader non verificato sistematicamente | baseline ripetibile sulle journey critiche |
| M5-04A | ASVS 5.0 mapping | **PARTIAL** | target L2; V3.4.3, V5.2.2, V6.3.3 `CLOSED_VERIFIED`; validator anti-waiver | requirement-level mapping L1/L2 e receipt provider-managed ancora incomplete | tutti i requisiti L1/L2 applicabili mappati con receipt, N/A motivati, zero `OPEN_GAP` |
| M5-04B | Dependency/security cadence | **PARTIAL** | dependency-security, incident/recovery e ASVS gates attivi | manca roll-up security periodico unico | receipt periodica unica con dipendenze, finding, incident/recovery e runtime |
| M5-05A | SLI | **OPEN** | smoke/performance puntuali + raccolta M5-02 | nessun set SLI canonico | metriche definite dopo baseline osservata |
| M5-05B | SLO / error budget | **OPEN** | nessuna policy numerica congelata | manca target operativo basato su dati | SLO approvati dopo baseline M5-02 e criterio di escalation/release freeze |
| M5-05C | Incident/support runbook | **PARTIAL** | recovery e incident minimum presenti | manca operational loop sostenuto | runbook unico, owner, severità, rehearsal periodiche |
| M5-06A | Drive runtime continuity | **PARTIAL** | Drive è archivio/provenienza nel modello e sono presenti integrazioni parziali | continuità end-to-end non ancora matura | apertura/salvataggio/evidenza con provenance e fallimenti governati |
| M5-06B | Canva runtime continuity | **OPEN** | ruolo Canva definito nel prodotto | collegamento didattico runtime non chiuso | Docente OS → materiale Canva → ritorno alla lezione senza diventare registro |
| M5-06C | Arena runtime transport | **CONDITIONAL** | contratti bidirezionali maturi | transport automatico fuori baseline | richiesto solo se il pilot lo rende requisito di prodotto |
| M5-07A | Tier 2 school personal data | **CONDITIONAL / NOT_ADMITTED** | policy Tier 1 attiva | privacy lifecycle istituzionale non autorizzato | gate separato privacy/legal/security prima di qualunque ammissione |
| M5-07B | Multi-user / multi-tenant | **CONDITIONAL** | single-owner pilot | onboarding/ruoli istituzionali off | necessario solo per variante istituzionale multiutente |
| M5-07C | Institutional administration | **CONDITIONAL** | non baseline | amministrazione scuola non presente | definire prodotto istituzionale prima di implementare |

## Account e sicurezza — intermezzo 0.1 → 0.4 COMPLETATO

Il punto di ripresa transitorio security/account è chiuso e non costituisce più lavoro pendente:

0.1. **#346 stabilizzata sul final head — COMPLETE**;
0.2. **#346 integrata** come `b07596f7c2142becd32eb66ed195ecbf5ac6b24a`;
0.3. **#348 ricertificata** sull'exact head `41bb3c55c866c31c6b906382165f3c18821ec81e` e integrata come `77455d5f50bcccf2fed2cf5607dba3067fd81f97`;
0.4. **Account promosso a capability consolidata in `develop` e #347 chiusa con evidence**.

La certificazione #348 comprende PASS di Product CI, MFA Browser AAL2, WCAG assurance automatizzata, P6, ASVS assurance, Design Policy, Human Interaction Model, Production Readiness, Release Engineering, Pilot Evidence e HVA. La receipt HVA registra 24/24 osservazioni e 10 journey con verifica mobile/desktop di `/account` e `/account/mfa`.

Questo evidence pack non è `HUMAN_USE` M5-02 e non costituisce promozione Production.

## M5-01A — Repository Hygiene COMPLETE

Receipt canonica:

`docs/product/M5_01A_REPOSITORY_HYGIENE_RECEIPT_2026-09-14.md`

### Superate e chiuse senza merge

- #360 → superseded by #361;
- #254 → superseded by M5 canonical state;
- #286 → superseded by current daily journey;
- #255 → superseded by C2P-03;
- #251 → superseded by DPG-2/WCAG baseline;
- restano valide le precedenti chiusure DPG-2 #328/#329/#330/#331/#332/#334.

### Candidati attivi / maturazione

- #361 — TeachingSession register convergence;
- #262 — MIM plesso fail-closed;
- #259 — Calendar server-side boundaries;
- #234 — P7 DOCX-media governance reconciliation;
- #170 — bounded Knowledge search / P6;
- #261 — academic-year temporal alignment, con rebase/verifica corrente richiesti.

La presenza in questo elenco non autorizza il merge: ogni candidato richiede rebase/reconciliation e final-head certification secondo il proprio rischio.

### Stack deliberatamente vivo

- #350 — Teaching Evidence TE-0, `STACKED_LIVE / BLOCKED` da #361;
- C2P #298, #299, #300, #301, #302, #303, #304, #305, #306, #307 — `STACKED_LIVE`, nessun merge/deploy isolato.

### Deferred / decisione futura

- #311 — supporto generativo in classe: `DEFERRED / PILOT_REQUIRED`;
- #260 — orizzonte operativo Home: `DEFERRED / PILOT_REQUIRED`;
- #252 — AILit: `DEFERRED / EXTERNAL_REFERENCE`;
- #86 — raccordo UDA 2-03/2-06: `DEFERRED / HUMAN_DECISION_REQUIRED`.

Il criterio M5-01A è quindi soddisfatto: nessuna PR aperta è debito storico ambiguo.

## Journey critiche M5

Le prove longitudinali devono almeno coprire:

1. `login → Home/Oggi`;
2. `Home → classe → attività/lezione`;
3. `lezione → materiale → svolgimento → Registra la lezione`;
4. `registrazione → Diario / TeachingSession / avanzamento`;
5. `Progetta → UDA → versione → export`;
6. `Conoscenza → fonte → trasformazione → provenienza → riuso`;
7. `Orario + Calendario → proiezione giornaliera`;
8. `Planner → proposta assistita → conferma umana → undo`;
9. `Impostazioni → contesto docente → utilizzo coerente nelle altre superfici`;
10. `login AAL2 → Account → stato MFA → gestione fattore/password/sessioni → ritorno al lavoro`.

La journey security di closure resta distinta dalla longitudinal evidence:

`recovery email → AAL1 → MFA → AAL2 → nuova password → logout → login nuova password → MFA → Oggi`.

## KPI minimi da derivare in M5-02/M5-05

La baseline non fissa ancora soglie arbitrarie. Deve misurare almeno:

- successo/fallimento per journey critica;
- latenza percepita e tecnica quando disponibile senza sorveglianza invasiva;
- errori recuperabili/non recuperabili;
- sessioni concluse senza workaround esterno;
- casi di abbandono della procedura;
- recovery time su fault simulati o reali quando misurabile;
- regressioni HVA/DPG;
- finding accessibilità aperti/chiusi;
- incidenti privacy/security.

Le soglie saranno congelate solo dopo una finestra di pilot reale sufficiente.

## Ordine operativo corrente

### Fase A — governance residua

1. **M5-01A è COMPLETE**; mantenere la classificazione delle PR come disciplina permanente;
2. M5-01D resta PARTIAL: emettere la prima release formale soltanto quando esisterà una candidata reale da congelare.

### Fase B — pilot evidence

3. raccogliere **M5-02 Pilot Evidence** durante il normale lavoro docente;
4. registrare attriti, workaround e fallimenti oltre ai successi;
5. usare la baseline M5-02 per proporre **M5-05 SLI/SLO**, senza soglie premature.

### Fase C — assurance

6. completare **M5-03 WCAG 2.2 AA** con evidence manuale e assistive technology, mantenendo verdi i gate automatizzati;
7. preservare le closure V3.4.3, V5.2.2 e V6.3.3 e completare **M5-04 ASVS 5.0** con requirement-level mapping e receipt residue, senza false claim.

### Fase D — integrazioni

8. maturare **Drive/Canva** solo sulle journey didattiche reali;
9. decidere Arena runtime da evidenza del pilot;
10. mantenere Tier 2/multi-user separati finché non esiste una decisione istituzionale esplicita.

### Candidati tecnici da trattare uno alla volta

Prima di ampliare il prodotto, i candidati `MATURITY_REQUIRED` vanno rivalutati sulla baseline corrente. L'ordine immediato è:

- #361 come prerequisito semantico del filone Teaching Evidence;
- poi #262 / #259 / #234 / #170 / #261 secondo rischio, dipendenze e valore corrente.

Non procedere in parallelo a merge multipli che rendano opaca la provenienza dei gate.

## Regola anti-feature-creep

Durante M5 una nuova feature non apre automaticamente un nuovo filone. Deve essere classificata come:

- `MATURITY_REQUIRED`;
- `PILOT_REQUIRED`;
- `PROFESSIONAL_GAP_CONFIRMED`;
- `DEFERRED`.

Il default per una feature non supportata da evidenza è **DEFERRED**.