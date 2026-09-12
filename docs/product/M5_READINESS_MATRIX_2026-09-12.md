# DOCENTE OS — M5 Readiness Matrix

Data: **2026-09-12**  
Baseline: `develop` @ `0e815f0aaf596b2430924424eeb63714de1efa3f`  
Stato: **M5-04 / ACTIVE SECURITY ASSURANCE**

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
| M5-03A | WCAG 2.2 AA matrix | **PARTIAL** | matrice completa 55 criteri + validator + Playwright/axe; run `34672053257` PASS su exact head `20eb47b7…`; 2.4.1 `VERIFIED_PASS` | restano criteri `MANUAL_REQUIRED` senza receipt e verifiche contestuali/assistive-tech | tutti i criteri A/AA applicabili chiusi con receipt; N/A ancora validi; zero GAP; nessuna variante responsive rilevante esclusa |
| M5-03B | Keyboard/focus/reflow | **PARTIAL** | focus/target governance + skip-link `Salta al contenuto` con test tastiera e receipt PASS | manca evidence pack manuale completo per tab order, focus obscured, no trap, zoom/reflow e text spacing | audit desktop/mobile a tastiera, zoom/reflow e focus order con receipt |
| M5-03C | Assistive technology evidence | **OPEN** | baseline da definire sulle journey critiche | screen reader non ancora verificato sistematicamente | baseline screen-reader ripetibile su login, Home/Oggi, classe/lezione, registrazione, Progetta/UDA, Conoscenza e Planner |
| M5-04A | ASVS 5.0 mapping | **PARTIAL** | `ASVS_5_0_ASSURANCE_CANONICAL.md` + `ops/asvs50-assurance.json` + validator/gate; 17 capitoli censiti, target L2, `verificationClaim=false`; **V5.2.2 / ASVS-002 `CLOSED_VERIFIED`** su implementation SHA `f0c5ee3b…` con receipt CI/K1/P6/P7/ASVS/DPG/HIM | requirement-level L1/L2 non completa; restano aperti `V3.4.3` CSP e `V6.3.3` MFA, oltre alle receipt requirement-level/provider-managed ancora mancanti | tutti i requisiti L1/L2 applicabili mappati con receipt, N/A motivati, zero `OPEN_GAP`, controlli provider-managed verificati |
| M5-04B | Dependency/security cadence | **PARTIAL** | dependency-security giornaliera/manuale con blocco HIGH/CRITICAL; incident/recovery gate esistenti; ASVS assurance gate attivo; prima closure ASVS strutturata registrata per V5.2.2 | manca roll-up security periodico unico e closure evidence dei finding ASVS residui | receipt periodica unica con dipendenze, ASVS finding, incident/recovery evidence e finding runtime |
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

6. completare **M5-03 WCAG 2.2 AA** con evidence manuale e assistive technology, mantenendo il gate automatizzato verde;
7. preservare la closure verificata **V5.2.2** e completare **M5-04 ASVS 5.0** chiudendo i gap residui L1/L2 e la mappatura requirement-level senza false claim.

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