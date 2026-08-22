# DOCENTE OS — Product

Questa cartella contiene il runtime Next.js canonico di sviluppo di DOCENTE OS. Il prototipo statico alla root resta disponibile solo come riferimento storico/funzionale durante la migrazione.

## Stack runtime corrente

- Next.js 16.3.x
- React 19.2.x
- TypeScript strict
- Supabase Auth + PostgreSQL + RLS
- ESLint flat config
- GitHub Actions CI
- Node 22
- npm come package manager operativo
- Netlify deploy preview su `develop` come runtime di sviluppo verificato

## Stack experience target

Approvato ma da introdurre progressivamente:

- Tailwind CSS
- shadcn/ui
- assistant-ui per assistenza contestuale
- BlockNote per authoring in slice successiva
- CopilotKit/AG-UI solo come evaluation futura

Vedi `docs/product/CANONICAL_DOC_INDEX.md`.

## Regole architetturali

1. Il dominio DOCENTE OS non dipende da Supabase, Google Workspace, component library, AI provider o hosting.
2. Le integrazioni esterne entrano attraverso porte/adattatori.
3. Ogni modulo applicativo mantiene separati dominio, application layer, infrastructure e UI/presentation.
4. Nessun dato personale o segreto viene committato nel repository.
5. RLS è un vincolo di sicurezza, non un dettaglio dell'interfaccia.
6. L'AI propone e assiste; non diventa fonte canonica né bypassa le policy.
7. Le migrazioni UX sono progressive: nessuna riscrittura big-bang.

## Gate di sviluppo

Da una checkout pulita di `product/`:

```bash
npm install
npm test
npm run typecheck
npm run lint
npm run build
```

Una slice runtime non è completa finché non passa gli stessi gate in CI e, quando modifica il runtime pubblicato, non raggiunge una deploy preview Netlify `READY`.

## Capability disponibili

- Auth/persistenza/RLS
- Planner/Oggi
- Conoscenza/KB
- Progetta
- Classi
- Piano annuale
- Impostazioni
- Orario T1/T2
- Language & Collaboration System v1

## Slice successive

1. **X1 — Component Foundation**: Tailwind + shadcn + token/componenti base.
2. **X2 — Professional AppShell**: shell responsive + command palette.
3. **T3 — Timetable Calendar/Activation/Exceptions** oppure **X3 — Contextual Assistant**, in base all'indipendenza del lavoro.
4. **X4 — Assistant Actions** con preview/conferma.
5. **T4 — B01-B33 materialization** dopo T3.
6. **X5 — Authoring**.
7. **X6 — Agentic evaluation**.

## Documenti da leggere prima di implementare

- `../docs/architecture/ADR-001-product-stack.md`
- `../docs/architecture/ADR-002-experience-platform.md`
- `../docs/product/DOCENTE_OS_PRODUCT_EXPERIENCE_MASTERPLAN.md`
- `../docs/product/DOCENTE_OS_LANGUAGE_COLLABORATION_SYSTEM.md`
- `../docs/design/DESIGN_SYSTEM_V2_CANONICAL.md`
- la specifica verticale del modulo interessato.
