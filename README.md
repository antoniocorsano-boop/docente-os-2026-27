# DOCENTE OS 2026/27

Ambiente operativo professionale per il docente: **Home/Oggi, Planner, Conoscenza, Piano annuale, Progettazione/UDA, Classi, Orario, Calendario, Diario, registrazione lezione e Impostazioni**, con persistenza server, provenienza delle fonti, assistenza contestuale e validazione umana.

## Runtime canonico

Il prodotto corrente è nella cartella `product/`:

- Next.js 16 + React 19 + TypeScript strict;
- Supabase Auth + PostgreSQL + Storage;
- Row Level Security deny-by-default;
- repository/port architecture;
- GitHub Actions: test + typecheck + lint + build + gate E2E specialistici;
- Render come runtime del pilot controllato secondo le regole di promozione vigenti;
- HVA, HIM, DPG, K1, X4, X5/X5B, performance e privacy guard come gate permanenti secondo l'ambito della slice.

Vercel non è un gate canonico; Netlify e la vecchia applicazione statica alla root (`index.html`, `app.js`, ecc.) sono **legacy/reference** e non descrivono l'architettura corrente.

## Stato corrente

La fonte sintetica autorevole è:

- `docs/product/PROJECT_STATUS_CURRENT.md`

Audit di maturità corrente:

- `docs/product/SYSTEM_MATURITY_AUDIT_2026-09-12.md`
- `docs/product/M5_READINESS_MATRIX_2026-09-12.md`

Classificazione:

**M4 — ADVANCED CONTROLLED PRODUCTION PILOT**

Stato macro:

- **X0–X2 COMPLETE** — fondazioni canoniche, component foundation, AppShell;
- **X3 COMPLETE** nel confine `READ_ONLY / PROPOSE`;
- **X4-A COMPLETE / BETA-PROVEN** — `PLANNER_CREATE_TASK` assistito con conferma umana e undo;
- **X5-A COMPLETE / BETA-PROVEN** — authoring UDA versionato;
- **X5-B COMPLETE / BETA-PROVEN** — export professionale UDA;
- **T1–T4 COMPLETE** — Orario, Calendario indipendente, Temporal Projection e TeachingSession;
- **DPG-2 CLOSED / INTEGRATED** — convergenza visuale e di interazione governata da ratchet permanente;
- **M5 PROGRAM ACTIVE** — maintenance & maturation, non feature expansion indiscriminata;
- **X6 FUTURE / NOT BASELINE**.

Il single-owner professional core è sostanzialmente completo. Tier 2 con dati personali scolastici e distribuzione istituzionale multiutente restano separati e non autorizzati implicitamente.

## Programma M5

Priorità:

1. stato canonico e repository hygiene;
2. release engineering;
3. sustained pilot evidence;
4. WCAG 2.2 AA assurance;
5. OWASP ASVS 5.0 mapping;
6. SLI/SLO e operational observability;
7. maturità runtime Drive/Canva;
8. Tier 2 / multi-user solo tramite gate separato.

Durante M5 una nuova feature deve essere `MATURITY_REQUIRED`, `PILOT_REQUIRED` o `PROFESSIONAL_GAP_CONFIRMED`; altrimenti è `DEFERRED`.

## Documenti canonici

Iniziare da:

- `docs/product/CANONICAL_DOC_INDEX.md`
- `docs/product/PROJECT_STATUS_CURRENT.md`
- `docs/product/SYSTEM_MATURITY_AUDIT_2026-09-12.md`
- `docs/product/M5_READINESS_MATRIX_2026-09-12.md`
- `docs/product/DOCENTE_OS_PRODUCT_EXPERIENCE_MASTERPLAN.md`
- `docs/architecture/ADR-001-product-stack.md`
- `docs/architecture/ADR-002-experience-platform.md`
- `docs/architecture/AI_COLLABORATION_CANONICAL_SPEC.md`
- `docs/product/DOCENTE_OS_LANGUAGE_COLLABORATION_SYSTEM.md`
- `docs/design/DESIGN_SYSTEM_V2_CANONICAL.md`

## Avvio prodotto

```bash
cd product
npm install
npm run dev
```

Gate di base:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

I gate specialistici si applicano secondo l'ambito della slice.

## Regola di sviluppo

Nessuna riscrittura big-bang. Ogni slice deve preservare dominio, RLS e dati canonici, passare i gate pertinenti e mantenere il prodotto utilizzabile anche senza provider AI.

Durante il programma M5 il default è **maturare ciò che esiste** prima di ampliare il perimetro funzionale.
