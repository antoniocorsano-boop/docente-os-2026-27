# Changelog

Tutte le modifiche rilevanti per release, maturità, sicurezza, operatività o comportamento del prodotto vengono registrate qui.

DOCENTE OS adotta Semantic Versioning per le release formalmente emesse dal programma M5-01 in avanti. Il pilot Production certificato del 25 agosto 2026 precede questa disciplina e resta classificato `LEGACY_UNVERSIONED_CERTIFIED_PILOT`: non gli viene assegnata retroattivamente una versione inventata.

## Unreleased

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