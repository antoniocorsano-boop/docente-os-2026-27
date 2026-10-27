# Changelog

Tutte le modifiche rilevanti per release, maturità, sicurezza, operatività o comportamento del prodotto vengono registrate qui.

DOCENTE OS adotta Semantic Versioning per le release formalmente emesse dal programma M5-01 in avanti. Il pilot Production certificato del 25 agosto 2026 precede questa disciplina e resta classificato `LEGACY_UNVERSIONED_CERTIFIED_PILOT`: non gli viene assegnata retroattivamente una versione inventata.

## Unreleased

Le modifiche successive a `0.1.0-rc.2` sono materialmente significative e richiedono una nuova Release Candidate. Nessun tag esistente viene spostato.

### RC3 preparation — 2026-10-27

La preparazione di `0.1.0-rc.3` parte dalla baseline `develop@fe762e3c6f6c6f1e4d61f232729c29024ce96e0c`, che aggiunge alla precedente baseline prodotto/Beta `489d8ee67b16db304ede71be94241739d0fa0a79` esclusivamente la riconciliazione documentale/governance della PR #762.

La branch `release/0.1.0-rc.3-prep` prepara la nuova RC ma **non** costituisce ancora un freeze: `v0.1.0-rc.3` non è creato, la GitHub prerelease non è pubblicata, `candidateSha` non è ancora legato e non esiste alcuna autorizzazione di promozione Production.

Sono state inventariate 23 nuove migrazioni rispetto al candidate `0.1.0-rc.2`, dalla `0081_timetable_lesson_activity_kind.sql` alla `0103_material_reference_safety.sql`, in `ops/release/0.1.0-rc.3-migration-inventory.json`.

Il precedente SHA Production canonicamente certificato `db3d4ab014ad11dec4aeccdb5aa8740220e4ebde` resta il riferimento storico, ma la sua compatibilità come rollback target contro lo schema evoluto da `0081` a `0103` è **NOT_VALIDATED**. Il freeze immutabile resta bloccato finché questa compatibilità non è dimostrata o non viene stabilito un diverso rollback target precedentemente certificato e compatibile. Anche `product/package-lock.json` deve essere rigenerato/sincronizzato con la versione `0.1.0-rc.3` prima del freeze.

### Changed

- Consolidato il modello V1 Teacher Operating System attorno a `Teacher Moment → contesto → prossimo passo → copilota → conferma umana → traccia`.
- Rafforzati Today/Next, Lesson Brief e la continuità Oggi → Lezione → Materiali → Registra.
- Integrato il Contextual Copilot nel task corrente con FAB contestuale, protected regions, posizionamento AUTO/drag e fallback `DOCKED_SAFE`.
- Rafforzata la governance HVA con baseline persistente, integrity preflight/postflight, MFA/AAL2 governato e journey mobile/desktop whole-product.
- Consolidata la linea DOS-IA/RESET per ridurre latenza e fallback cognitivi, mantenendo invariati i confini di autorità del dominio.
- Chiuso il filone Orario effective-date / recurring occurrence: la versione operativa è risolta sulla data governata e la cella ricorrente punta alla prossima occorrenza concreta preservando exact timetable-version + slot identity.
- La baseline applicativa/Beta qualificata resta `489d8ee67b16db304ede71be94241739d0fa0a79`; `develop@fe762e3c6f6c6f1e4d61f232729c29024ce96e0c` aggiunge soltanto la riconciliazione documentale/governance della PR #762 ed è la source baseline della preparazione rc.3.

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
- Baseline applicativa/Beta `489d8ee67b16db304ede71be94241739d0fa0a79`: Product CI, X3, Human Interaction Model, TERM-01 e HVA post-merge PASS; Beta Render ha servito lo stesso exact SHA.
- `develop@fe762e3c6f6c6f1e4d61f232729c29024ce96e0c`: release engineering policy, pilot evidence policy e production-readiness review PASS dopo la merge documentale #762.
- Production provenance reconciliation 2026-10-27: l'ultimo SHA canonicamente certificato/promosso resta `db3d4ab014ad11dec4aeccdb5aa8740220e4ebde`; il runtime Production osservato `7fa8deae375bc15b4386d17c97b1809f49488b98` è classificato `LIVE_SHA_NOT_CANONICALLY_CERTIFIED`.

### Governance

- La linea prodotto resta **M4 — Advanced Controlled Production Pilot**; `1.0.0` resta riservata alla decisione M5 esplicita.
- `0.1.0-rc.3` è in **PREPARATION** e non è ancora congelata, taggata, certificata o promossa.
- Il finding `PRODUCTION_PROVENANCE_DRIFT` è stato riconciliato senza mutare Production: `ops/production-provenance-reconciliation-2026-10-27.json` distingue lo SHA live non certificato dall'ultimo SHA certificato.
- Non è autorizzato alcun rollback/redeploy. La compatibilità di `db3d4ab…` come rollback target della futura RC è `NOT_VALIDATED` e blocca il freeze immutabile finché non viene dimostrata rispetto alla migration inventory `0081–0103`.
- Il prossimo passo, dopo la chiusura dei blocker di preparazione e la qualificazione final-head della PR, è il freeze exact-SHA della nuova RC; subito dopo viene QL-1 HUMAN_USE, seguito da QL-3, QL-4, Observe→Registra, Android Reality, assurance M5 e sustained pilot.
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
- Product CI, Dependency Security, Release Engineering, Human Interaction e P6 PASS sul candidate SHA; P6 ha verificato che la Beta serve lo SHA candidato esatto.
- Resta necessaria la prova Android fisica sul PDF rappresentativo: `Corsano → 14 lezioni → revisione → conferma → persistenza`.

## [0.1.0-rc.1] - 2026-10-03

Release Candidate `0.1.0-rc.1` congelata sul candidate SHA `efc31ed084da9cc6fe495ac6403151c3361f428a`.
Il tag immutabile `v0.1.0-rc.1` e la GitHub prerelease sono pubblicati e verificati sullo SHA candidato esatto. La candidata non è `CERTIFIED` né `PROMOTED`; la promozione Production resta una decisione umana separata.

### Changed

- Aperto il programma **M5 — Maintenance & Maturation** e congelata la baseline di maturità del 12 settembre 2026.
- Chiuso DPG-2 e resa permanente la governance del design system tramite ratchet.
- Formalizzata la release engineering: versioni SemVer pre-1.0 durante M4, release candidate immutabili e `1.0.0` riservata alla promozione M5.
- Chiuso il **canonical status drift**: `PROJECT_STATUS_CURRENT.md` resta l'unica fonte sintetica CURRENT, `CANONICAL_DOC_INDEX.md` include audit/readiness/release engineering e `PROJECT_HEALTH.md` è ora un historical pointer.
- Avviato **M5-02 — Sustained Pilot Evidence** con journey J1–J9, ledger append-only, privacy Tier-1 e gate machine-readable; la raccolta parte intenzionalmente con `HUMAN_USE=0` e non autorizza ancora la chiusura del gate.
- Avviato **M5-03 — WCAG 2.2 AA Assurance** con matrice completa dei 55 criteri A/AA, validator machine-readable, Playwright/axe su viewport desktop+mobile e bypass `Salta al contenuto` verificato da tastiera.
- Corretto sistemicamente il baseline di contrasto emerso dal primo run axe mediante token canonici di brand/testo/successo e bottom navigation; il run WCAG `34672053257` è PASS sull'exact head `20eb47b7e35faf3114dcbfe32ee320c1cfcc9557`.
- Avviato **M5-04 — OWASP ASVS 5.0 Assurance** sulla baseline stabile `v5.0.0`, con target L2, matrice machine-readable dei 17 capitoli, validator anti-waiver/anti-false-PASS e gate dedicato sull'exact head; M5-04A resta `PARTIAL`.
- Congelati inizialmente come finding prioritari ASVS i gap **V3.4.3 CSP**, **V5.2.2 file content/type validation** e **V6.3.3 MFA**, senza attribuire una verifica L2 non ancora dimostrata.
- Chiuso con evidenza strutturata **ASVS-002 / V5.2.2**: validazione fail-closed di estensione/MIME/contenuto sui tre ingressi di upload, parser reali per PDF/DOCX, firme per immagini, UTF-8 strict per testo, test negativi e rilettura server-side dei blob resumable prima dell'ammissione nella KB. La closure è legata all'implementation SHA `f0c5ee3b4b4995dec78836571584bc9f72e78890` e alle receipt Product CI `34674333510`, K1 `34674333522`, P6 `34674333530`, P7 `34674333531`, ASVS `34674333504`, Design Policy `34674333521` e Human Interaction Model `34674333487`.
- Chiuso con evidenza strutturata **ASVS-001 / V3.4.3** sull'implementation SHA corretto `1498b675d7d8d9d897867317df3bf07193240833`: CSP globale request-scoped con nonce crittografico nel Proxy Next.js, `object-src 'none'`, `base-uri 'none'`, script policy senza `unsafe-inline`/`unsafe-eval` in produzione, allowlist Supabase senza wildcard e prova browser permanente di header, nonce framework e rotazione del nonce. L'allowlist `connect-src` include anche l'origin TUS esatto `https://<project>.storage.supabase.co`, derivato dal medesimo project ref, dopo che K1 ha dimostrato che l'origin precedente bloccava il PDF resumable >6 MiB. Receipt: Product CI `34678320805`, HVA `34678320813`, P6 `34678320851`, Design Policy `34678320842`, WCAG `34678320806`, Human Interaction Model `34678320833`, K1 `34678320870` e ASVS pre-closure `34678320823`.
- Chiuso con evidenza strutturata **ASVS-003 / V6.3.3** sull'implementation SHA `1f04f2799f9993c53d0578f8caafbe9e9842e60f`: MFA TOTP provider-native, passaggio AAL1 → AAL2, blocco AAL1 su superfici operative e data plane, enforcement `RESTRICTIVE` via `0051_mfa_aal2_enforcement.sql`, Browser Gate e Data Plane Gate reali. La prova umana ha completato `recovery email → AAL1 → MFA → AAL2 → nuova password → logout → login con nuova password → MFA → Oggi`. Receipt machine: Product CI `34708557467`, MFA Data Plane `34708557509`, MFA Browser `34708557565`; runtime e prova umana in `ops/mfa-v6-3-3-closure-receipt.json`. **V6 resta PARTIAL, M5-04A resta PARTIAL e `verificationClaim=false`** perché la mappatura ASVS L1/L2 complessiva non è ancora completa.
- Corretto il safe-area mobile dell'assistente contestuale da 20 a 24 px per preservare gli 8 px richiesti sopra la bottom navigation; HVA è PASS sul medesimo implementation SHA CSP.
- Stabilizzati i gate browser senza ridurne la severità: P6 misura solo superfici operative reali e attende il landing canonico `/planner`; WCAG normalizza la precondizione di focus prima del controllo del primo `Tab`; K1 attende anch'esso `/planner` invece dell'intermedio `/workspace`.
- Il gap professionale **Account e sicurezza** registrato nell'issue #347 è stato implementato nella **PR #348**, separando definitivamente identità digitale e credenziali dalle Impostazioni professionali. La slice introduce `/account`, `/account/mfa`, identità email, stato MFA, enrollment/rimozione controllata dei fattori TOTP, cambio password AAL2, revoca delle altre sessioni e logout corrente. Durante l'hardening è stato esteso il requisito AAL2 a **ogni** mutazione password, compreso il primo accesso `source=email`, ed è stata limitata la continuazione MFA alle sole destinazioni password esatte e same-origin. La capability resta **NOT INTEGRATED** finché #346 e #348 non superano la chiusura final-head.
- Consolidata la documentazione canonica di Account e sicurezza con `docs/architecture/ACCOUNT_SECURITY_CANONICAL_SPEC.md`, `docs/product/ACCOUNT_SECURITY_EXPERIENCE_CONTRACT.md`, aggiornamento del Product Experience Masterplan, del Canonical Documentation Index e dello stato corrente.

### Governance

- La promozione Production continua a richiedere exact SHA certificato, decisione umana, rollback target e smoke post-deploy.
- Le release candidate non autorizzano automaticamente la promozione Production.
- Le PR DPG-2 #328, #329, #330, #331, #332 e #334 sono state chiuse come `SUPERSEDED` dalla #336 integrata.
- Un machine gate non può essere conteggiato come `HUMAN_USE`; SLI/SLO numerici non possono essere congelati prima di una baseline osservata M5-02 sufficiente.
- Un PASS automatizzato axe/HVA non costituisce dichiarazione di conformità WCAG 2.2 AA: M5-03 resta `PARTIAL` finché criteri manuali, keyboard/focus/reflow e assistive technology non hanno receipt sufficienti.
- Un PASS del gate `ASVS 5.0 Assurance` valida la coerenza del contratto e della matrice, ma non costituisce una dichiarazione di verifica ASVS L2; `verificationClaim=false` resta vincolante finché la mappatura requisito-per-requisito non è completa e i gap L1/L2 applicabili non sono chiusi con receipt.
- La chiusura dei tre finding prioritari iniziali V3.4.3, V5.2.2 e V6.3.3 non autorizza da sola il passaggio di M5-04A a `COMPLETE`.
- La documentazione Account distingue esplicitamente `IMPLEMENTED`, `INTEGRATED`, `CERTIFIED` e `PROMOTED`: la presenza del codice su una PR non autorizza a descrivere la capability come disponibile nel prodotto corrente.

## Legacy certified pilot — 2026-08-25

### Production

- Production single-owner pilot promossa tramite SHA immutabile certificato.
- Receipt canonica: `ops/production-release-receipt.json`.
- Nessuna versione SemVer assegnata retroattivamente.
