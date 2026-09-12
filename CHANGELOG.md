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

### Governance

- La promozione Production continua a richiedere exact SHA certificato, decisione umana, rollback target e smoke post-deploy.
- Le release candidate non autorizzano automaticamente la promozione Production.
- Le PR DPG-2 #328, #329, #330, #331, #332 e #334 sono state chiuse come `SUPERSEDED` dalla #336 integrata.
- Un machine gate non può essere conteggiato come `HUMAN_USE`; SLI/SLO numerici non possono essere congelati prima di una baseline osservata M5-02 sufficiente.
- Un PASS automatizzato axe/HVA non costituisce dichiarazione di conformità WCAG 2.2 AA: M5-03 resta `PARTIAL` finché criteri manuali, keyboard/focus/reflow e assistive technology non hanno receipt sufficienti.

## Legacy certified pilot — 2026-08-25

### Production

- Production single-owner pilot promossa tramite SHA immutabile certificato.
- Receipt canonica: `ops/production-release-receipt.json`.
- Nessuna versione SemVer assegnata retroattivamente.
