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
- Chiuso con evidenza strutturata **ASVS-001 / V3.4.3**: CSP globale request-scoped con nonce crittografico nel Proxy Next.js, `object-src 'none'`, `base-uri 'none'`, script policy senza `unsafe-inline`/`unsafe-eval` in produzione, allowlist Supabase circoscritta e prova browser permanente di header, nonce framework e rotazione del nonce. La closure è legata all'implementation SHA `14f60b09944e59531ca3ce2504839fdf11629784` e alle receipt Product CI `34676660373`, HVA `34676660375`, P6 `34676660345`, Design Policy `34676660380`, WCAG `34676660382`, Human Interaction Model `34676660414` e ASVS pre-closure `34676660394`. **MFA V6.3.3 resta `OPEN_GAP`; M5-04A resta `PARTIAL` e `verificationClaim=false`.**
- Corretto il safe-area mobile dell'assistente contestuale da 20 a 24 px per preservare gli 8 px richiesti sopra la bottom navigation; HVA è PASS sul medesimo implementation SHA CSP.

### Governance

- La promozione Production continua a richiedere exact SHA certificato, decisione umana, rollback target e smoke post-deploy.
- Le release candidate non autorizzano automaticamente la promozione Production.
- Le PR DPG-2 #328, #329, #330, #331, #332 e #334 sono state chiuse come `SUPERSEDED` dalla #336 integrata.
- Un machine gate non può essere conteggiato come `HUMAN_USE`; SLI/SLO numerici non possono essere congelati prima di una baseline osservata M5-02 sufficiente.
- Un PASS automatizzato axe/HVA non costituisce dichiarazione di conformità WCAG 2.2 AA: M5-03 resta `PARTIAL` finché criteri manuali, keyboard/focus/reflow e assistive technology non hanno receipt sufficienti.
- Un PASS del gate `ASVS 5.0 Assurance` valida la coerenza del contratto e della matrice, ma non costituisce una dichiarazione di verifica ASVS L2; `verificationClaim=false` resta vincolante finché la mappatura requisito-per-requisito non è completa e i gap L1/L2 non sono chiusi con receipt.

## Legacy certified pilot — 2026-08-25

### Production

- Production single-owner pilot promossa tramite SHA immutabile certificato.
- Receipt canonica: `ops/production-release-receipt.json`.
- Nessuna versione SemVer assegnata retroattivamente.
