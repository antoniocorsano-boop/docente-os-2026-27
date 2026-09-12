# Changelog

Tutte le modifiche rilevanti per release, maturità, sicurezza, operatività o comportamento del prodotto vengono registrate qui.

DOCENTE OS adotta Semantic Versioning per le release formalmente emesse dal programma M5-01 in avanti. Il pilot Production certificato del 25 agosto 2026 precede questa disciplina e resta classificato `LEGACY_UNVERSIONED_CERTIFIED_PILOT`: non gli viene assegnata retroattivamente una versione inventata.

## Unreleased

### Changed

- Aperto il programma **M5 — Maintenance & Maturation** e congelata la baseline di maturità del 12 settembre 2026.
- Chiuso DPG-2 e resa permanente la governance del design system tramite ratchet.
- Formalizzata la release engineering: versioni SemVer pre-1.0 durante M4, release candidate immutabili e `1.0.0` riservata alla promozione M5.

### Governance

- La promozione Production continua a richiedere exact SHA certificato, decisione umana, rollback target e smoke post-deploy.
- Le release candidate non autorizzano automaticamente la promozione Production.

## Legacy certified pilot — 2026-08-25

### Production

- Production single-owner pilot promossa tramite SHA immutabile certificato.
- Receipt canonica: `ops/production-release-receipt.json`.
- Nessuna versione SemVer assegnata retroattivamente.
