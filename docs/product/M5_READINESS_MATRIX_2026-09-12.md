# DOCENTE OS — M5 Readiness Matrix

Data: **2026-09-12**  
Baseline: `develop` @ `3767d4d5cf20b54808526a73bcbc800a1c5e6503`  
Stato: **M5-00 / ACTIVE MATURATION BASELINE**

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
| M5-00A | Stato canonico | **PARTIAL** | `PROJECT_STATUS_CURRENT.md`, audit 2026-09-12 | status drift dopo X4/X5/DPG-2 | `PROJECT_STATUS_CURRENT`, README e indice canonico riallineati allo stesso exact state |
| M5-00B | Maturity baseline | **COMPLETE** | `SYSTEM_MATURITY_AUDIT_2026-09-12.md` | — | audit salvato, benchmark esplicito, classificazione M4 e gate M5 definiti |
| M5-00C | Design convergence | **COMPLETE** | DPG-2 baseline 27/13/0/0/1/5 + residual register | — | DPG-1/2 permanenti e baseline monotona |
| M5-01A | Repository hygiene | **OPEN** | audit storico segnala PR superseded | PR storiche ancora aperte | tutte le PR obsolete chiuse `SUPERSEDED`; `open` = lavoro candidato reale |
| M5-01B | Versioning | **OPEN** | nessuna disciplina canonica trovata | manca versione prodotto/release train | schema versioning approvato e applicato |
| M5-01C | Release candidate | **OPEN** | immutable SHA promotion già presente | manca contratto RC formalizzato | `RC → gates → promoted release` riproducibile |
| M5-01D | GitHub Releases / changelog | **OPEN** | nessuna release pubblicata | manca ricevuta leggibile di versione | prima release pilot con changelog, exact SHA, rollback target |
| M5-02A | Pilot longitudinal evidence | **OPEN** | gate puntuali e uso reale, ma non dataset temporale formalizzato | manca finestra sostenuta | periodo minimo definito con evidence pack di uso normale |
| M5-02B | Critical journey success | **PARTIAL** | HVA + gate verticali | manca KPI aggregato nel tempo | misurati login → Oggi → classe → lezione → registra → Diario/Planner |
| M5-02C | User friction / failure log | **OPEN** | feedback episodico | manca registro longitudinalmente confrontabile | finding reali classificati, trend e closure evidence |
| M5-03A | WCAG 2.2 AA matrix | **OPEN** | DPG/HVA/accessibility rules | nessuna matrice requisito-evidenza | tutti i criteri AA applicabili classificati PASS/PARTIAL/N/A/GAP |
| M5-03B | Keyboard/focus/reflow | **PARTIAL** | focus e target governance esistenti | copertura manuale incompleta | audit desktop/mobile a tastiera, zoom/reflow e focus order |
| M5-03C | Assistive technology evidence | **OPEN** | non rilevata evidenza sistematica | screen reader non certificato | almeno una baseline screen-reader ripetibile sulle journey critiche |
| M5-04A | ASVS 5.0 mapping | **OPEN** | RLS/security/recovery gate forti | nessun mapping formale | matrice ASVS con PASS/PARTIAL/N/A/GAP e link alle evidenze |
| M5-04B | Dependency/security cadence | **PARTIAL** | workflow security esistenti | manca assurance roll-up M5 | receipt periodica unica con esito e finding aperti |
| M5-05A | SLI | **OPEN** | smoke/performance puntuali | nessun set SLI canonico | definite metriche di disponibilità, errori, latenza e recovery |
| M5-05B | SLO / error budget | **OPEN** | nessuna policy rilevata | manca target operativo | SLO approvati e criterio di escalation/release freeze |
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

## KPI minimi da definire in M5-02/M5-05

La baseline non fissa ancora soglie arbitrarie. Deve però misurare almeno:

- successo/fallimento per journey critica;
- latenza percepita e tecnica delle azioni principali;
- errori recuperabili/non recuperabili;
- sessioni concluse senza workaround esterno;
- casi in cui il docente abbandona una procedura;
- recovery time su fault simulati;
- regressioni HVA/DPG;
- finding di accessibilità aperti/chiusi;
- incidenti privacy/security.

Le soglie saranno congelate solo dopo una finestra di pilot reale sufficiente a non inventare numeri privi di evidenza.

## Ordine operativo

### Fase A — immediata

1. chiudere **M5-00A Stato canonico**;
2. chiudere **M5-01A Repository hygiene**;
3. definire **M5-01B/C/D Release Engineering**.

### Fase B — mentre il docente usa normalmente il prodotto

4. raccogliere **M5-02 Pilot Evidence**;
5. definire e misurare **M5-05 SLI/SLO**.

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
