# DOCENTE OS 2026/27

Ambiente operativo professionale per il docente: **Oggi/Planner, Conoscenza, Piano annuale, Progettazione, Classi, Orario e Impostazioni**, con persistenza server, provenienza delle fonti e validazione umana.

## Runtime canonico di sviluppo

Il prodotto corrente è nella cartella `product/`:

- Next.js 16 + React 19 + TypeScript strict;
- Supabase Auth + PostgreSQL;
- Row Level Security deny-by-default;
- repository/port architecture;
- GitHub Actions: test + typecheck + lint + build;
- Netlify deploy preview su `develop` come runtime operativo di sviluppo.

La vecchia applicazione statica alla root (`index.html`, `app.js`, ecc.) è **legacy/reference**, non descrive più l'architettura corrente.

## Stato 2026-08-22

Disponibili nel nuovo runtime:

- autenticazione e-mail/password;
- Planner/Oggi persistente;
- Conoscenza con ingestione, trasformazione, provenienza e generazioni;
- Piano annuale per classi/sezioni;
- Progetta;
- Classi;
- Impostazioni canoniche;
- Orario T1 + griglia visuale T2;
- Language & Collaboration System v1 sulle viste principali.

Prossime macro-slice:

- **X1** — Tailwind + shadcn component foundation;
- **X2** — AppShell/command palette professionale;
- **X3** — assistant-ui contestuale read/propose;
- **T3** — calendario, attivazione ed eccezioni orario;
- **X4** — azioni assistite con human-in-the-loop;
- **T4** — materializzazione B01–B33;
- **X5** — authoring professionale a blocchi;
- **X6** — evaluation agentic CopilotKit/AG-UI.

## Documenti canonici

Iniziare da:

- `docs/product/CANONICAL_DOC_INDEX.md`
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

Gate:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

## Regola di sviluppo

Nessuna riscrittura big-bang. Ogni slice deve preservare dominio, RLS e dati canonici, passare i gate e mantenere il prodotto utilizzabile anche senza provider AI.
