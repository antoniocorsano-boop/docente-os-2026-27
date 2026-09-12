# DOCENTE OS — M5 Readiness Matrix

Data: **2026-09-12**  
Baseline: `develop` @ `b1953126fd4e7214304db309addaa59d1f38f9ee`  
Stato: **M5-02 / ACTIVE MATURATION BASELINE**

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
| M5-00A | Stato canonico | **COMPLETE** | `PROJECT_STATUS_CURRENT.md`, README, `CANONICAL_DOC_INDEX.md` e `PROJECT_HEALTH.md` riallineati | — | una sola fonte CURRENT; health storico non compete con lo stato canonico |
| M5-00B | Maturity baseline | **COMPLETE** | `SYSTEM_MATURITY_AUDIT_2026-09-12.md` | — | audit salvato, benchmark esplicito, classificazione M4 e gate M5 definiti |
| M5-00C | Design convergence | **COMPLETE** | DPG-2 baseline 27/13/0/0/1/5 + residual register | — | DPG-1/2 permanenti e baseline monotona |
| M5-01A | Repository hygiene | **PARTIAL** | tranche DPG-2 #328/#329/#330/#331/#332/#334 chiuse `SUPERSEDED`; inventario residuo effettuato | restano PR da classificare individualmente; C2P è lavoro stacked vivo e #262 contiene lavoro non assorbito | ogni PR aperta deve essere lavoro candidato reale, deliberatamente deferred o stacked, non ricevuta storica superata |
| M5-01B | Versioning | **COMPLETE** | `RELEASE_ENGINEERING_CANONICAL.md` + `ops/release-engineering-policy.json` + gate `release-engineering/policy` PASS | — | SemVer pre-M5, major 1 gated da M5, policy machine-verifiable |
| M5-01C | Release candidate | **COMPLETE** | contratto RC machine-readable + validator PASS | — | `RC → gates → certified → promoted` definito; exact SHA/tag immutabile e nuova RC dopo code change |
| M5-01D | GitHub Releases / changelog | **PARTIAL** | `CHANGELOG.md` canonico presente | nessuna nuova release formale emessa sotto M5-01 | prima release reale con tag, GitHub Release, changelog, exact SHA e rollback target; vietata release fittizia |
| M5-02A | Pilot longitudinal evidence | **PARTIAL** | `SUSTAINED_PILOT_EVIDENCE_CANONICAL.md`, policy e ledger machine-readable avviati | ledger contiene solo baseline tecnica; `HUMAN_USE=0` e finestra longitudinale non ancora sufficiente | evidence pack di uso normale su più giornate, non selettivo e Tier-1-safe |
| M5-02B | Critical journey success | **PARTIAL** | journey J1–J9 congelate; HVA + gate verticali come baseline tecnica | manca evidenza HUMAN_USE ripetuta e roll-up per journey | journey obbligatorie osservate ripetutamente con esiti/attriti aggregabili |
| M5-02C | User friction / failure log | **PARTIAL** | ledger append-only e tipi `FRICTION/INCIDENT/WORKAROUND/RECOVERY` definiti | nessuna serie longitudinale di finding reali ancora raccolta | finding reali registrati, trend leggibile e closure evidence senza riscrivere la storia |
| M5-03A | WCAG 2.2 AA matrix | **OPEN** | DPG/HVA/accessibility rules | nessuna matrice requisito-evidenza | tutti i criteri AA applicabili classificati PASS/PARTIAL/N/A/GAP |
| M5-03B | Keyboard/focus/reflow | **PARTIAL** | focus e target governance esistenti | copertura manuale incompleta | audit desktop/mobile a tastiera, zoom/reflow e focus order |
| M5-03C | Assistive technology evidence | **OPEN** | non rilevata evidenza sistematica | screen reader non certificato | almeno una baseline screen-reader ripetibile sulle journey critiche |
| M5-04A | ASVS 5.0 mapping | **OPEN** | RLS/security/recovery gate forti | nessun mapping formale | matrice ASVS con PASS/PARTIAL/N/A/GAP e link alle evidenze |
| M5-04B | Dependency/security cadence | **PARTIAL** | workflow security esistenti | manca assurance roll-up M5 | receipt periodica unica con esito e finding aperti |
| M5-05A | SLI | **OPEN** | smoke/performance puntuali + M5-02 collection avviata | nessun set SLI canonico | metriche definite dopo una prima baseline osservata, non per ipotesi |
| M5-05B | SLO / error budget | **OPEN** | nessuna policy numerica congelata | manca target operativo basato su dati | SLO approvati dopo baseline M5-02 e criterio di escalation/release freeze |
| M5-05C | Incident/support runbook | **PARTIAL** | recovery e incident minimum presenti | manca operational loop sostenuto | runbook unico, owner, severità, evidenze rehearsal periodiche |
| M5-06A | Drive runtime continuity | **PARTIAL** | Drive è archivio/provenienza nel modello | collegamento end-to-end non maturo | apertura/salvataggio/evidenza con provenance e fallimenti governati |
| M5-06B | Canva runtime continuity | **OPEN** | ruolo Canva definito nel prodotto | collegamento didattico runtime non chiuso | Docente OS → materiale Canva → ritorno alla lezione senza diventare registro |
| M5-06C | Arena runtime transport | **CONDITIONAL** | contratti bidirezionali maturi | transport automatico fuori baseline | richiesto solo se il pilot lo rende requisito di prodotto |
| M5-07A | Tier 2 school personal data | **CONDITIONAL / NOT_ADMITTED** | policy Tier 1 attiva | privacy lifecycle istituzionale non autorizzato | gate separato privacy/legal/security prima di qualunque ammissione |
| M5-07B | Multi-user / multi-tenant | **CONDITIONAL** | single-owner pilot | onboarding/ruoli istituzionali off | necessario solo per variante istituzionale multiutente |
| M5-07C | Institutional administration | **CONDITIONAL** | non baseline | amministrazione scuola non presente | definire prodotto istituzionale prima di implementare |

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
9. `Impostazioni → contesto docente → utilizzo coerente nelle altre superfici`.

## KPI minimi da derivare in M5-02/M5-05

La baseline non fissa ancora soglie arbitrarie. Deve misurare almeno:

- successo/fallimento per journey critica;
- latenza percepita e tecnica quando disponibile senza sorveglianza invasiva;
- errori recuperabili/non recuperabili;
- sessioni concluse senza workaround esterno;
- casi in cui il docente abbandona una procedura;
- recovery time su fault simulati o reali quando misurabile;
- regressioni HVA/DPG;
- finding di accessibilità aperti/chiusi;
- incidenti privacy/security.

Le soglie saranno congelate solo dopo una finestra di pilot reale sufficiente a non inventare numeri privi di evidenza.

## Ordine operativo

### Fase A — governance residua

1. completare **M5-01A Repository hygiene** mediante classificazione individuale delle PR aperte;
2. emettere la prima release formale solo quando esisterà una reale candidata da congelare — **M5-01D resta PARTIAL**.

### Fase B — attiva da ora

3. raccogliere **M5-02 Pilot Evidence** durante il normale lavoro docente;
4. registrare anche attriti, workaround e fallimenti, non soltanto successi;
5. usare la baseline M5-02 per proporre **M5-05 SLI/SLO**, senza soglie premature.

### Fase C — assurance

6. chiudere **M5-03 WCAG 2.2 AA**;
7. chiudere **M5-04 ASVS 5.0**.

### Fase D — integrazioni

8. maturare **Drive/Canva** solo sulle journey didattiche reali;
9. decidere Arena runtime da evidenza del pilot;
10. mantenere Tier 2/multi-user separati finché non esiste un'esplicita decisione istituzionale di prodotto.

## Regola anti-feature-creep

Durante il programma M5 una nuova feature non apre automaticamente un nuovo filone. Deve essere classificata come:

- `MATURITY_REQUIRED`;
- `PILOT_REQUIRED`;
- `PROFESSIONAL_GAP_CONFIRMED`;
- oppure `DEFERRED`.

Il default per una feature non supportata da evidenza è **DEFERRED**.
