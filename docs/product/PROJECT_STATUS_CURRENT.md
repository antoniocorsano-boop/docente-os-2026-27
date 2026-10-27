# DOCENTE OS — Stato corrente canonico

Data: **2026-10-27**  
Stato documento: **CURRENT / CANONICAL — V1 MATURATION**

## 1. Baseline corrente

Current repository/runtime line:

`develop@489d8ee67b16db304ede71be94241739d0fa0a79`

Il Beta Render serve lo stesso exact commit dopo auto-deploy conseguente al merge #763.

Il prodotto resta classificato **M4 — Advanced Controlled Production Pilot**. La decisione `M5 / V1 generally distributable` non è stata presa.

### 1.1 Chiusura Orario/runtime del 27 ottobre

Il filone #760 → #761 → #763 è chiuso per il blocker pre-RC:

- #760 ha corretto la selezione della versione Orario effettiva sulla data operativa;
- #761 ha corretto la risoluzione della cella ricorrente verso la prossima occorrenza concreta, preservando exact timetable-version + slot identity e Temporal Projection canonica;
- merge #761: `5112ac255c936f4becf0de80dd14a4bebdde6df3`;
- `p6-performance/render-beta` è PASS sul merge #761;
- il successivo HVA RED è stato classificato causalmente come race del test harness mobile week/day, non come nuovo difetto prodotto;
- #763 ha corretto solo il test harness;
- merge #763/current develop: `489d8ee67b16db304ede71be94241739d0fa0a79`;
- Product CI, X3, Human Interaction Model, TERM-01 e HVA post-merge sono PASS;
- Beta Render serve l'exact commit corrente.

Non è autorizzata una nuova patch `/knowledge` senza nuova evidence causale; i budget restano invariati.

### 1.2 Production provenance reconciled

Production resta separata dal Beta e con auto-deploy disabilitato.

L'ultimo SHA Production canonicamente certificato e promosso resta:

`db3d4ab014ad11dec4aeccdb5aa8740220e4ebde`

con decisione umana esplicita del 25/08/2026 e Production Runtime Smoke `32903982577` PASS.

Il runtime Production osservato il 27/10/2026 serve invece:

`7fa8deae375bc15b4386d17c97b1809f49488b98`

Lo SHA è live a seguito di deploy manuale del 17/09/2026, ma la ricostruzione non ha trovato una decisione di promozione Production né un Production Runtime Smoke specifici. La PR sorgente #502 era scoped al Beta e lo SHA conserva uno storico `hva/runtime = failure`.

Classificazione:

`LIVE_SHA_NOT_CANONICALLY_CERTIFIED`

Receipt:

`ops/production-provenance-reconciliation-2026-10-27.json`

Non viene dedotto un difetto funzionale della Production corrente e non è autorizzato alcun rollback/redeploy. `db3d4ab…` resta il precedente SHA certificato noto; la sua compatibilità come rollback target della nuova RC deve essere verificata al freeze insieme alla migration inventory.

### 1.3 Baseline storica preservata

Il checkpoint V1 del 18 settembre era `develop@7f714e6ac6f4264af86f15f8a6f5b99121a52a41`.

La baseline prodotto/runtime auditata dal DOS-CRM al riallineamento del 3 ottobre era `develop@57743e9d395ae5d739ca89e9afbdbb3a7edf875d`. La PR #665 aveva aggiornato soltanto registro e documentazione di governance; quel riferimento resta evidence storica, non current repository head.

La HUMAN_USE reale storica (#383) ha prodotto **FRICTION / REWORK_REQUIRED**. Questa evidence non viene cancellata dai successivi PASS tecnici.

## 2. Decisione corrente

DOCENTE OS prosegue nel programma **V1 — Teacher Operating System** (#387).

Formula:

`Teacher Moment → contesto → prossimo passo → copilota → conferma → traccia`

Documento autorevole di programma:

`docs/product/TEACHER_OS_V1_PRODUCT_CONVERGENCE_CANONICAL.md`

Checkpoint integrato di completamento:

`docs/architecture/DUAL_SYSTEM_CANONICAL_RESET_2026-09-18.md`

Il valore prioritario non è aggiungere nuovi moduli, ma comporre correttamente capability già costruite attorno al momento professionale del docente. Dal 18 settembre 2026 il prodotto è esplicitamente in **completion and maturation mode**: release candidate, pilot sostenuto e chiusura dei finding hanno precedenza su un nuovo feature train.

La sequenza operativa corrente è:

`Orario/runtime CLOSED → Production provenance CLOSED → nuova RC exact-SHA → QL-1 HUMAN_USE → QL-3 → QL-4 → Observe/Registra → Android Reality → M5 assurance → sustained pilot → V1 decision`

## 3. Invarianti permanenti

- `TeachingSession` resta la ricevuta autorevole di ciò che è realmente accaduto;
- `AnnualPlanBlockProgress` resta una decisione professionale distinta;
- Orario e Calendario restano domini distinti, composti tramite Temporal Projection;
- Arena mantiene l'autorità curricolare/istituzionale; DOCENTE OS il lavoro operativo del docente;
- AI non scrive direttamente nel dominio;
- sicurezza, RLS, AAL2, privacy, provenance, idempotenza e human authority restano non negoziabili;
- nessuna semplificazione UI può degradare gli invarianti di dominio;
- Production non viene promossa automaticamente perché `develop` o Beta sono verdi.

## 4. Capability già disponibili da riusare

Sono già presenti fondazioni significative per:

- account e MFA/AAL2;
- classi/cattedra;
- Orario;
- Piano annuale/UDA;
- TeachingSession e registrazione lezione;
- Observation/Evidence;
- Planner/Oggi;
- Conoscenza/KB;
- materiali contestuali;
- assistant runtime e prime write assistite;
- provenance, RLS e governance;
- design system e mobile shell;
- release/security/accessibility assurance.

Il V1 deve **orchestrare** queste capability, non riscriverle da zero.

## 5. HUMAN_USE corrente

Issue storica: **#383**.

Evidence principale:

- Home/Oggi troppo legata al concetto di attività e non al prossimo momento professionale;
- sera: manca `domani / cosa devo preparare`;
- preparazione lezione troppo lunga e densa;
- troppe informazioni simultaneamente visibili;
- eccesso di navigazione/scorrimento manuale;
- coprogettazione ancora percepita come gestione di moduli;
- copilota non ancora abbastanza operativo;
- latenza percepita non accettabile in alcuni passaggi;
- defect runtime React #441 osservato nella registrazione;
- incoerenza di navigation state/bundle da verificare.

Esito storico: **FRICTION / REWORK_REQUIRED**.

Questa evidence non viene cancellata né forzata a PASS: alimenta direttamente il V1. Il prossimo gate umano sulla nuova RC è QL-1 task-based:

`Oggi → Lezione → Materiali → Registra → prossimo passo/domani`

## 6. Teacher Moment

Il sistema deve comporre il lavoro in base al momento professionale:

- prima della scuola;
- prima della lezione;
- durante;
- subito dopo;
- tra due lezioni;
- fine giornata;
- preparazione del giorno successivo.

Home/Oggi diventa **Today + Next**.

Se il giorno corrente non richiede attenzione, il sistema deve mostrare il prossimo momento pertinente invece di fermarsi a una lista vuota.

## 7. Lesson Brief

La progettazione completa resta nel Product Model, ma l'entry point operativo deve diventare un brief compatto:

- classe/quando;
- obiettivo;
- cosa serve;
- cosa è già pronto;
- cosa manca;
- nota utile precedente;
- proposta del copilota;
- una CTA primaria;
- dettaglio completo solo su richiesta.

## 8. Copilota reale

Il copilota diventa componente operativo del Teacher Moment.

Deve poter:

- recuperare il contesto;
- cercare e sintetizzare;
- produrre, adattare e migliorare contenuti;
- recuperare memoria professionale;
- proporre prossimo passo;
- preparare write governate.

Direzione prodotto:

`docs/product/TEACHER_AI_COPILOT_PRODUCT_DIRECTION.md`

L'input vocale resta una direzione progettuale distinta ma **DEFERRED** dal release core corrente.

## 9. Contextual Voice Capture

La voce è input del copilota, non una nuova applicazione.

Flusso progettato:

`voce → trascrizione effimera → binding contestuale → proposta strutturata → conferma → write governata`

Specifica:

`docs/architecture/CONTEXTUAL_VOICE_CAPTURE_SPEC.md`

Issue: **#385**.

Stato corrente: **DEFERRED** dal release core e soggetto a esplicita re-autorizzazione.

## 10. Institutional Configurator

DOCENTE OS deve adattarsi alla policy dell'istituto, non imporre un ecosistema.

Profili iniziali:

- `PERSONAL_LOCAL_FIRST`;
- `GOOGLE_WORKSPACE_EDU`;
- `MICROSOFT_365_EDU`;
- `HYBRID` solo con confini espliciti.

La scuola governa provider, identity, scopes, data tier, AI policy, voice policy, retention e capability disponibili.

Google Workspace e Microsoft 365 sono provider di capability, non il modello mentale del docente.

Specifica:

`docs/architecture/INSTITUTIONAL_INTEGRATION_CONFIGURATOR_CANONICAL.md`

Lo sviluppo istituzionale/multi-user resta conditional e fuori dal release core single-owner finché non viene autorizzato separatamente.

## 11. Infrastruttura

Render resta il runtime corrente fino a evidence contraria.

Programma V1-E:

- benchmark Render;
- confronto con Firebase App Hosting / Cloud Run;
- Supabase mantenuto inizialmente per isolare la variabile runtime;
- misure cold/warm, TTFB, tap→interactive, P50/P95;
- scelta hosting su evidence.

Il blocker P6 pre-RC del 27 ottobre è chiuso; sustained runtime evidence resta necessaria per decisioni di hosting e maturità successive.

## 12. Test strategy

I gate profondi non vengono eliminati.

Modello:

- **FAST** — unit/type/lint/contract mirati;
- **MERGE** — build + critical path + invarianti pertinenti;
- **NIGHTLY** — HVA completa, WCAG regression, DPG full-runtime, performance/security/cross-surface;
- **RELEASE** — exact SHA, full assurance applicabile, HUMAN_USE, visual acceptance e runtime receipt.

Documento:

`docs/engineering/FAST_FEEDBACK_TEST_STRATEGY_V1.md`

## 13. Programma V1 corrente

1. **V1-A — Teacher Moment + Today/Next** — integrato;
2. **V1-B — Lesson Brief** — integrato;
3. **V1-C — Copilot reale + Contextual Voice Capture** — Copilot/context governance avanzati; Voice/STT è **DEFERRED** dal release core e richiede esplicita re-autorizzazione;
4. **V1-D — Institutional Configurator** — da completare secondo necessità di pilot;
5. **V1-E — Runtime benchmark e hosting decision** — da chiudere su sustained evidence.

Completamenti già acquisiti:
- **H8 — lifecycle governato riflessione → proposta → decisione docente** — COMPLETE;
- **H9-A — consumo governato di TEACHING_ADJUSTMENT(ACCEPTED) nella preparazione** — COMPLETE e post-merge certificato.

Questi assi hanno precedenza su nuove superfici autonome.

## 13-bis. Capability Readiness — DOS-CRM v1

Dal 30 settembre 2026 Docente OS adotta **DOS-CRM v1** come strumento permanente per rappresentare il livello di completamento delle singole capability.

Fonti:
- `docs/product/DOCENTE_OS_CAPABILITY_READINESS_MODEL.md` — metodo e scala CRL 0–7;
- `docs/product/CAPABILITY_READINESS_CURRENT.md` — vista umana corrente;
- `ops/capability-readiness.json` — registro machine-readable.

Il DOS-CRM non usa percentuali di completamento e non eredita automaticamente punteggi da audit storici. Una capability non riesaminata sulla baseline corrente viene mostrata come `NEEDS_REAUDIT`/stale anziché ricevere un livello non dimostrato.

Prima capability qualificata nel nuovo registro:
- `DOS-TT-SHARE-IMPORT` — Share Target → importazione Orario con minimizzazione locale: **CRL 5 / QUALIFIED**, baseline `develop@74290511ee58a6b61652160463461527e3e0f57a`.

Il registro va aggiornato quando nuove evidence cambiano materialmente funzionalità, UX, dati, sicurezza, integrazione, qualificazione, operatività o governance di una capability.

Aggiornamento storico 2026-10-03:
- Wave A remediation PR #642 e QL-1 PR #643 restano evidence valide; QL-1 ha technical PASS + Human Review PASS, ma `human_use=NOT_RUN`;
- il filone Orario mobile era consolidato con PR #663 e #664; #664 aveva Product CI PASS, Browser Certification PASS, HVA full 69/69 e WCAG automated assurance 30/30 sull'exact head qualificato;
- il DOS-CRM era rebaselined sul merge `57743e9d395ae5d739ca89e9afbdbb3a7edf875d`;
- il registro include PWA/device intake, Materials, Observation/Evidence e intake curricolare pilot-scoped;
- Share→Orario conserva CRL 5 storico ma freshness STALE dopo i cambi materiali del journey;
- nessuna capability viene promossa automaticamente: HUMAN_USE e qualification capability-level restano necessarie dove previste.

Il freeze della nuova RC dovrà aggiornare freshness soltanto dove la nuova evidence lo giustifica.

## 14. Maturity e assurance

M5 continua come assurance di prodotto ma non detta più il ritmo quotidiano di implementazione.

Stato dove non esiste nuova evidence:

- release engineering: foundation avanzata;
- sustained pilot evidence: collecting;
- WCAG: partial;
- ASVS: partial;
- observability/SLI/SLO: open/partial;
- external runtime continuity: da convergere nel configuratore;
- institutional/multi-user: conditional e da autorizzare separatamente.

La riconciliazione Production del 27 ottobre non costituisce una nuova promozione né aumenta automaticamente il livello M5.

## 15. Priorità operative immediate

1. congelare una **nuova RC Docente OS exact-SHA** dalla linea `develop` verificata; se il perimetro resta `0.1.0`, il nome naturale è `0.1.0-rc.3`;
2. al freeze, inventariare scope, migrazioni, known residuals e verificare la compatibilità di `db3d4ab…` come rollback target certificato;
3. eseguire sulla RC esatta la HUMAN_USE task-based della QL-1;
4. revalidare sulla stessa RC Professional Context & Setup, Lesson Prep e Account/Security senza riaprire un feature train;
5. eseguire QL-3 Knowledge → Lesson → Materials e QL-4 Governed Copilot;
6. qualificare Observe → Registra come journey dedicato e PWA/device intake su Android reale;
7. completare assurance M5 applicabile e raccogliere sustained runtime/pilot evidence;
8. prendere la decisione formale V1 READY / V1 REWORK sulla base delle evidence;
9. Voice/STT resta **DEFERRED** e Institutional Configurator/curricolo generalizzato restano subordinati ad autorizzazione/pilot.

La Production attualmente live resta immutata durante il freeze RC; nessuna promozione Production è implicita.

## 16. KPI principale

**Teacher Attention Returned (TAR)**

Misura quanto lavoro di ricostruzione, ricerca, ricopiatura, navigazione e attesa viene rimosso prima che il docente possa concentrarsi sull'azione professionale.

## 17. Stato sintetico

**M4 ADVANCED CONTROLLED PRODUCTION PILOT / develop@489d8ee6… / BETA LIVE + QUALIFIED / ORARIO-RUNTIME CLOSED / PRODUCTION PROVENANCE RECONCILED / NEW RC FREEZE NEXT / HUMAN_USE AFTER RC.**

## 18. Regola finale

> **Il docente non deve andare a cercare DOCENTE OS. DOCENTE OS deve presentarsi con la cosa giusta nel momento giusto e poi togliersi di mezzo.**
