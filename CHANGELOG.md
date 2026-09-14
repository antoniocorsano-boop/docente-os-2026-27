# Changelog

Tutte le modifiche rilevanti per release, maturità, sicurezza, operatività o comportamento del prodotto vengono registrate qui.

DOCENTE OS adotta Semantic Versioning per le release formalmente emesse dal programma M5-01 in avanti. Il pilot Production certificato del 25 agosto 2026 precede questa disciplina e resta classificato `LEGACY_UNVERSIONED_CERTIFIED_PILOT`: non gli viene assegnata retroattivamente una versione inventata.

## Unreleased

### Changed

- Aperto **UX-0 — Product Simplification** dopo il finding HUMAN_USE sulla Beta: il prodotto è localmente corretto ma globalmente troppo costoso cognitivamente. Introdotti Product Model ≠ User Model, north star `Oggi → Classe → Lezione → Fatto`, Task Cost Model e gate M5-02D; issue canonica #368.
- Allineati `PROJECT_STATUS_CURRENT.md`, `M5_READINESS_MATRIX_2026-09-12.md`, `DOCENTE_OS_PRODUCT_EXPERIENCE_MASTERPLAN.md`, `CANONICAL_DOC_INDEX.md` e `HUMAN-EXPERIENCE-CONTRACT.md` alla priorità UX-0. DPG/WCAG/HVA restano validi ma non certificano da soli la semplicità percepita.
- Chiuso TE-1: Unified Registra (#361), TE-1A atomic Observation/Evidence (#365), TE-1B `Osserva → Registra` (#366) e fix infrastrutturale X3 AAL2 (#367) sono integrati; #351 è CLOSED/COMPLETED. La baseline `develop` corrente è `c553feae62e70b23aa932077ec43ed76ce3b075b`.
- Aperto il programma **M5 — Maintenance & Maturation** e congelata la baseline di maturità del 12 settembre 2026.
- Chiuso DPG-2 e resa permanente la governance del design system tramite ratchet.
- Formalizzata la release engineering: versioni SemVer pre-1.0 durante M4, release candidate immutabili e `1.0.0` riservata alla promozione M5.
- Chiuso il **canonical status drift**: `PROJECT_STATUS_CURRENT.md` resta l'unica fonte sintetica CURRENT, `CANONICAL_DOC_INDEX.md` include audit/readiness/release engineering e `PROJECT_HEALTH.md` è ora un historical pointer.
- Avviato **M5-02 — Sustained Pilot Evidence** con journey critiche, ledger append-only, privacy Tier-1 e gate machine-readable; un machine gate non viene contato come `HUMAN_USE`.
- Avviato **M5-03 — WCAG 2.2 AA Assurance** con matrice completa dei 55 criteri A/AA, validator machine-readable, Playwright/axe su viewport desktop+mobile e bypass `Salta al contenuto` verificato da tastiera.
- Corretto sistemicamente il baseline di contrasto emerso dal primo run axe mediante token canonici di brand/testo/successo e bottom navigation.
- Avviato **M5-04 — OWASP ASVS 5.0 Assurance** sulla baseline stabile `v5.0.0`, con target L2, matrice machine-readable, validator anti-waiver/anti-false-PASS e gate dedicato; M5-04A resta `PARTIAL`.
- Congelati e successivamente chiusi con evidenza strutturata i finding prioritari ASVS V3.4.3 CSP, V5.2.2 file content/type validation e V6.3.3 MFA, senza attribuire una verifica L2 complessiva non dimostrata.
- Chiuso con evidenza strutturata **ASVS-002 / V5.2.2**: validazione fail-closed di estensione/MIME/contenuto sui tre ingressi di upload, parser reali per PDF/DOCX, firme per immagini, UTF-8 strict per testo, test negativi e rilettura server-side dei blob resumable prima dell'ammissione nella KB.
- Chiuso con evidenza strutturata **ASVS-001 / V3.4.3**: CSP globale request-scoped con nonce crittografico nel Proxy Next.js, `object-src 'none'`, `base-uri 'none'`, script policy senza `unsafe-inline`/`unsafe-eval` in produzione, allowlist Supabase senza wildcard e prova browser permanente.
- Chiuso con evidenza strutturata **ASVS-003 / V6.3.3**: MFA TOTP provider-native, passaggio AAL1 → AAL2, blocco AAL1 su superfici operative e data plane, enforcement `RESTRICTIVE`, Browser Gate e Data Plane Gate reali. **V6 resta PARTIAL, M5-04A resta PARTIAL e `verificationClaim=false`** perché la mappatura ASVS L1/L2 complessiva non è ancora completa.
- Corretto il safe-area mobile dell'assistente contestuale per preservare il margine richiesto sopra la bottom navigation.
- Stabilizzati i gate browser senza ridurne la severità: P6, WCAG e K1 attendono il landing canonico e normalizzano le sole precondizioni di test necessarie.
- Implementata e consolidata **Account e sicurezza** (#346/#348), separando identità digitale e credenziali dalle Impostazioni professionali: `/account`, `/account/mfa`, fattori TOTP, cambio password AAL2, revoca sessioni e logout corrente.
- Consolidata la documentazione canonica di Account e sicurezza con specifica architetturale, contratto esperienza, Product Experience Masterplan, Canonical Documentation Index e stato corrente.

### Governance

- Durante UX-0 il default per nuova espansione funzionale è `DEFERRED`, salvo security/privacy/data-integrity fix, critical defect, requisito normativo urgente o `PROFESSIONAL_GAP_CONFIRMED`.
- Una nuova capability non è considerata miglioramento se introduce una nuova scelta primaria quando può essere assorbita da un task umano esistente.
- La promozione Production continua a richiedere exact SHA certificato, decisione umana, rollback target e smoke post-deploy.
- Le release candidate non autorizzano automaticamente la promozione Production.
- Un machine gate non può essere conteggiato come `HUMAN_USE`; SLI/SLO numerici non possono essere congelati prima di una baseline osservata M5-02 sufficiente.
- Un PASS automatizzato axe/HVA non costituisce dichiarazione di conformità WCAG 2.2 AA; M5-03 resta `PARTIAL` finché criteri manuali, keyboard/focus/reflow e assistive technology non hanno receipt sufficienti.
- Un PASS HVA/DPG/WCAG non costituisce da solo evidenza di semplicità del task: M5-02D richiede task-cost e HUMAN_USE prima/dopo.
- Un PASS del gate `ASVS 5.0 Assurance` valida la coerenza del contratto e della matrice, ma non costituisce una dichiarazione di verifica ASVS L2; `verificationClaim=false` resta vincolante finché la mappatura requisito-per-requisito non è completa e i gap L1/L2 applicabili non sono chiusi con receipt.
- La chiusura dei finding prioritari ASVS non autorizza da sola il passaggio di M5-04A a `COMPLETE`.
- La documentazione Account distingue esplicitamente `IMPLEMENTED`, `INTEGRATED`, `CERTIFIED` e `PROMOTED`: la presenza del codice su una PR non autorizza a descrivere la capability come disponibile nel prodotto corrente.

## Legacy certified pilot — 2026-08-25

### Production

- Production single-owner pilot promossa tramite SHA immutabile certificato.
- Receipt canonica: `ops/production-release-receipt.json`.
- Nessuna versione SemVer assegnata retroattivamente.