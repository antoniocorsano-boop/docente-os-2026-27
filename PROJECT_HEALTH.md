# DOCENTE OS — Project Health

Stato documento: **HISTORICAL POINTER / NON-CANONICAL FOR CURRENT STATUS**  
Ultimo riallineamento: **2026-09-12**

Questo file non mantiene più una seconda fotografia operativa del prodotto.

La fonte sintetica autorevole dello stato corrente è:

- `docs/product/PROJECT_STATUS_CURRENT.md`

La baseline di maturità e il programma M5 sono definiti in:

- `docs/product/SYSTEM_MATURITY_AUDIT_2026-09-12.md`;
- `docs/product/M5_READINESS_MATRIX_2026-09-12.md`.

La disciplina di release corrente è definita in:

- `docs/product/RELEASE_ENGINEERING_CANONICAL.md`;
- `ops/release-engineering-policy.json`;
- `CHANGELOG.md`.

## Perché questo file è stato ridotto

La versione precedente, aggiornata al 23 agosto 2026, duplicava informazioni su X3/X4, Production, T4 e rischi correnti. Con l'evoluzione del prodotto era diventata una fonte di **canonical status drift**: alcune sue dichiarazioni erano corrette storicamente ma superate dalle capability e dai gate integrati successivamente.

Da M5-00 in avanti vale una sola regola:

> **lo stato corrente vive in `PROJECT_STATUS_CURRENT.md`; gli audit datati preservano la storia; questo file non deve reintrodurre una terza baseline concorrente.**

## Invarianti ancora validi

Restano invariati i principi strutturali già presenti nella vecchia fotografia:

- la linea prodotto canonica è l'applicazione `product/`;
- la vecchia applicazione statica root è legacy/reference;
- `develop` è il branch canonico di sviluppo;
- persistenza, RLS e confini di dominio non possono essere aggirati da una slice;
- inferenza del sistema e prova professionale devono restare distinguibili;
- nessuna promozione Production è implicita perché `develop` cambia;
- ogni cambiamento significativo deve superare i gate pertinenti e aggiornare le fonti canoniche quando cambia una decisione di prodotto o maturità.

Per qualsiasi dettaglio operativo corrente, **non usare questo file come fonte di stato**: seguire `PROJECT_STATUS_CURRENT.md` e il `CANONICAL_DOC_INDEX.md`.
