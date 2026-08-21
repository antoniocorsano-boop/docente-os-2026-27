# DOCENTE OS — Product

Questa cartella contiene la nuova linea prodotto di DOCENTE OS. Il prototipo statico v2.1 alla root resta disponibile come riferimento funzionale durante la migrazione.

## Stack P0

- Next.js 16.3.x
- React 19.2.x
- TypeScript strict
- ESLint flat config
- GitHub Actions CI

## Regole architetturali

1. Il dominio DOCENTE OS non dipende da Supabase, Google Workspace, AI provider o hosting.
2. Le integrazioni esterne entrano attraverso porte/adattatori.
3. Ogni modulo applicativo mantiene separati dominio, application layer, infrastructure e UI.
4. Nessun dato personale o segreto viene committato nel repository.
5. La release statica v2.1 non viene rimossa finché la nuova linea prodotto non supera il migration gate.

## P0 acceptance gate

P0 è `COMPLETE` solo quando, da una checkout pulita della cartella `product/`, risultano verdi:

```bash
npm install
npm run typecheck
npm run lint
npm run build
```

Inoltre:

- App Router deve renderizzare la landing foundation.
- TypeScript deve restare `strict`.
- La CI deve eseguire gli stessi gate su push/PR.
- Nessuna integrazione Supabase/Google viene introdotta prima della chiusura di P0.

## Prossimo slice

P1 — Persistence & Identity:

- Supabase project/configuration
- schema `workspace` / `workspace_membership` / `academic_year`
- Auth
- Row Level Security
- repository ports nel dominio
- primo adapter Supabase
