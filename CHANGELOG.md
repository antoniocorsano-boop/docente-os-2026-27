# Changelog

Tutte le modifiche rilevanti per release, maturità, sicurezza, operatività o comportamento del prodotto vengono registrate qui.

DOCENTE OS adotta Semantic Versioning per le release formalmente emesse dal programma M5-01 in avanti. Il pilot Production certificato del 25 agosto 2026 precede questa disciplina e resta classificato `LEGACY_UNVERSIONED_CERTIFIED_PILOT`: non gli viene assegnata retroattivamente una versione inventata.

## Unreleased

Le modifiche successive a `0.1.0-rc.2` sono materialmente significative e richiedono una nuova Release Candidate. Nessun tag esistente viene spostato.

### Changed

- Consolidato il modello V1 Teacher Operating System attorno a `Teacher Moment → contesto → prossimo passo → copilota → conferma umana → traccia`.
- Rafforzati Today/Next, Lesson Brief e la continuità Oggi → Lezione → Materiali → Registra.
- Integrato il Contextual Copilot nel task corrente con FAB contestuale, protected regions, posizionamento AUTO/drag e fallback `DOCKED_SAFE`.
- Rafforzata la governance HVA con baseline persistente, integrity preflight/postflight, MFA/AAL2 governato e journey mobile/desktop whole-product.
- Consolidata la linea DOS-IA/RESET per ridurre latenza e fallback cognitivi, mantenendo invariati i confini di autorità del dominio.
- Chiuso il filone Orario effective-date / recurring occurrence: la versione operativa è risolta sulla data governata e la cella ricorrente punta alla prossima occorrenza concreta preservando exact timetable-version + slot identity.
- `develop` corrente e Beta convergono su `489d8ee67b16db304ede71be94241739d0fa0a79`.

### Fixed

- Corretto il boundary temporale in cui una versione Orario amministrativamente `ACTIVE` ma futura veniva trattata come già operativa (#760).
- Corretto il resolver Orario → Lezione quando il weekday più vicino non rappresenta una lezione concreta o cade oltre il periodo valido della versione (#761).
- Corretto il race del solo test harness HVA mobile tra inizializzazione week view e switch day view (#763), senza modifiche al runtime prodotto.
- Corretti i finding del Contextual Copilot FAB relativi a sovrapposizione con CTA/regioni contestuali, touch drag e geometria dopo mount tardivi.
- Stabilizzato l'isolamento tra clock deterministico HVA e validazione server-side Auth/MFA.

### Validation

- #761: Product CI, full HVA, Human Visual/Design, Candidate Qualification e Final Independent Review PASS sul candidato finale `df7cbfd3f2b662590cabc30d40efb1d9ffd5c434`.
- Merge #761 `5112ac255c936f4becf0de80dd14a4bebdde6df3`: `p6-performance/render-beta` PASS.
- #763: candidate test-harness-only `ee1191f0a419e79a30ccad75fb9da6fbe77a8e47` qualificato e integrato.
- Merge corrente `489d8ee67b16db304ede71be94241739d0fa0a79`: Product CI, X3, Human Interaction Model, TERM-01 e HVA post-merge PASS; Beta Render serve lo stesso exact SHA.

### Governance

- La linea prodotto resta **M4 — Advanced Controlled Production Pilot**; `1.0.0` resta riservata alla decisione M5 esplicita.
- Il prossimo freeze, se il perimetro resta `0.1.0`, richiede una nuova RC; `0.1.0-rc.3` è il candidato naturale ma non è ancora creato.
- È aperto il finding `PRODUCTION_PROVENANCE_DRIFT`: la receipt storica del 25 agosto e il deploy Production live del 17 settembre non descrivono lo stesso SHA.
- Per la sequenza di programma adottata il 27 ottobre, la riconciliazione del finding precede il nuovo freeze RC; la policy generale richiede comunque la provenienza Production non ambigua prima di qualsiasi futura promozione.
- Il finding non autorizza rollback, redeploy o promozione; Production resta immutata durante la riconciliazione.
- Dopo il freeze della nuova RC il gate di prodotto prioritario è QL-1 HUMAN_USE, seguito da QL-3, QL-4, Observe→Registra, Android Reality, assurance M5 e sustained pilot.
- Voice/STT, Tier 2, multi-user e institutional expansion restano fuori dal release core corrente.

## [0.1.0-rc.2] - 2026-10-03

Release Candidate `0.1.0-rc.2` congelata sul candidate SHA `617b4f8901259ce2318ce721236241d7681b1c9c` e pubblicata come GitHub prerelease `v0.1.0-rc.2`. La candidata non è `CERTIFIED` né `PROMOTED`.

### Fixed

- Ridotto e reso prevedibile il costo dell’estrazione locale dell’orario raster su Android: raster OCR max 1200 px e budget globale di 30 secondi inclusi preparazione e bootstrap.
- Reso retry-safe il lifecycle del worker locale dopo timeout.
- Reso il feedback teacher-first e progressivo: nessun gergo OCR nel percorso primario, percentuale solo durante il riconoscimento effettivo.
- Bloccata la selezione manuale finché l’estrazione automatica non richiede davvero il fallback.
- Corretto il progresso multipagina per PDF misti usando la posizione tra le pagine raster.

### Validation

- Quarta review indipendente GitHub Copilot sulla remediation finale: **Findings: None**.
- Product CI, Dependency Security, Release Engineering, Human Interaction e P6 PASS sul candidate SHA; P6 ha verificato che la Beta serviva lo SHA candidato esatto.
- La prova Android fisica sul PDF rappresentativo restava un requisito separato e la prerelease non autorizzava Production.

## [0.1.0-rc.1] - 2026-10-03

Release Candidate `0.1.0-rc.1` congelata sul candidate SHA `efc31ed084da9cc6fe495ac6403151c3361f428a`.
Il tag immutabile `v0.1.0-rc.1` e la GitHub prerelease sono pubblicati e verificati sullo SHA candidato esatto. La candidata non è `CERTIFIED` né `PROMOTED`; la promozione Production resta una decisione umana separata.

### Changed

- Aperto il programma **M5 — Maintenance & Maturation** e congelata la baseline di maturità del 12 settembre 2026.
- Chiuso DPG-2 e resa permanente la governance del design system tramite ratchet.
- Formalizzata la release engineering: versioni SemVer pre-1.0 durante M4, release candidate immutabili e `1.0.0` riservata alla promozione M5.
- Chiuso il **canonical status drift**: `PROJECT_STATUS_CURRENT.md` resta l'unica fonte sintetica CURRENT e `PROJECT_HEALTH.md` è un historical pointer.
- Avviato **M5-02 — Sustained Pilot Evidence** con journey J1–J9, ledger append-only, privacy Tier-1 e gate machine-readable.
- Avviato **M5-03 — WCAG 2.2 AA Assurance** con matrice A/AA, validator machine-readable e Playwright/axe desktop+mobile.
- Avviato **M5-04 — OWASP ASVS 5.0 Assurance** con target L2, matrice machine-readable e gate dedicato; la verifica complessiva resta PARTIAL finché non è dimostrata requisito per requisito.
- Chiuso con evidence strutturata il finding CSP V3.4.3.
- Chiuso con evidence strutturata il finding file content/type validation V5.2.2.
- Chiuso con evidence strutturata il finding MFA V6.3.3 con TOTP provider-native, passaggio AAL1→AAL2 e enforcement restrittivo.
- Consolidata la documentazione canonica di Account e sicurezza.

### Governance

- La promozione Production continua a richiedere exact SHA certificato, decisione umana, rollback target e smoke post-deploy.
- Le release candidate non autorizzano automaticamente la promozione Production.
- Un machine gate non può essere conteggiato come `HUMAN_USE`.
- Un PASS automatizzato axe/HVA non costituisce dichiarazione di conformità WCAG 2.2 AA.
- Un PASS del gate ASVS valida la coerenza del contratto e della matrice, ma non costituisce dichiarazione di verifica ASVS L2 finché il mapping requisito-per-requisito non è completo.

## Legacy certified pilot — 2026-08-25

### Production

- Production single-owner pilot promossa tramite SHA immutabile certificato.
- Receipt canonica: `ops/production-release-receipt.json`.
- Nessuna versione SemVer assegnata retroattivamente.
