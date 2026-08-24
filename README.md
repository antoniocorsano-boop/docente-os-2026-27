# DOCENTE OS 2026/27

Ambiente operativo professionale per il docente: **Oggi/Planner, Conoscenza, Piano annuale, Progettazione, Classi, Orario, Calendario e Impostazioni**, con persistenza server, provenienza delle fonti, assistenza contestuale e validazione umana.

## Runtime canonico

Il prodotto corrente è nella cartella `product/`:

- Next.js 16 + React 19 + TypeScript strict;
- Supabase Auth + PostgreSQL + Storage;
- Row Level Security deny-by-default;
- repository/port architecture;
- GitHub Actions: test + typecheck + lint + build + gate E2E specialistici;
- **Render Beta** su `develop` come runtime canonico di collaudo (`docente-os-2026-27-beta`);
- HVA, K1 e X3 verificano il runtime reale quando la slice lo richiede.

Vercel non è un gate canonico del Beta; Netlify è legacy rispetto all'attuale runtime Render.

La vecchia applicazione statica alla root (`index.html`, `app.js`, ecc.) è **legacy/reference**, non descrive più l'architettura corrente.

## Stato corrente

La fonte sintetica autorevole è:

- `docs/product/PROJECT_STATUS_CURRENT.md`

Stato macro:

- **X0–X2 COMPLETE** — fondazioni canoniche, component foundation, AppShell;
- **X3 COMPLETE nel confine READ_ONLY / PROPOSE** — assistente contestuale su Conoscenza e Planner senza scrittura automatica;
- **T1–T4 COMPLETE** — Orario, Calendario indipendente, Temporal Projection e TeachingSession con allocazione B01–B33;
- **X4 PREPARED / NOT ENABLED** — guardrail di scrittura predisposti, nessuna capacità AI persistente autorizzata;
- **X5 OPEN** — authoring professionale/versionato ed export;
- **X6 FUTURE** — valutazione agentica avanzata, non baseline.

La Beta corrente include autenticazione, Planner/Oggi persistente, Conoscenza con ingestione/trasformazione/provenienza/generazioni, Piano annuale, Progetta, Classi, Impostazioni, Orario, Calendario, proiezione temporale e registrazione didattica controllata.

## Documenti canonici

Iniziare da:

- `docs/product/CANONICAL_DOC_INDEX.md`
- `docs/product/PROJECT_STATUS_CURRENT.md`
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

I gate specialistici K1/X3/HVA si applicano secondo l'ambito della slice.

## Regola di sviluppo

Nessuna riscrittura big-bang. Ogni slice deve preservare dominio, RLS e dati canonici, passare i gate pertinenti e mantenere il prodotto utilizzabile anche senza provider AI. Le scritture AI persistenti restano vietate finché una capability X4 non viene esplicitamente aperta e certificata.
