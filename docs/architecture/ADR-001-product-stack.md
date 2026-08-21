# ADR-001 — Stack prodotto DOCENTE OS

Data: 2026-08-21
Stato: ACCEPTED

## Decisione

DOCENTE OS evolve dal prototipo statico/PWA a un prodotto web modulare con il seguente stack:

- Frontend/full-stack framework: Next.js 16 (App Router) + React + TypeScript strict.
- UI: Tailwind CSS + shadcn/ui; componenti accessibili e responsive.
- Validazione: Zod.
- Form: React Hook Form.
- Database: PostgreSQL gestito da Supabase.
- Auth applicativa: Supabase Auth.
- Autorizzazione dati: PostgreSQL Row Level Security (RLS), deny-by-default.
- Integrazioni Google: OAuth Google separato dall'autenticazione applicativa; Gmail, Drive e Calendar dietro porte/adattatori dedicati.
- File/documenti: Google Drive resta fonte primaria dei documenti; PostgreSQL conserva metadati, stato pratica e riferimenti provider, non copie indiscriminate dei file.
- Email: conservare message/thread ID e dati derivati necessari al workflow; evitare duplicazione integrale salvo requisito esplicito.
- Hosting applicazione: Vercel come target preferito per Next.js; GitHub come source of truth.
- Hosting statico legacy: GitHub Pages conserva il prototipo finché la nuova applicazione non supera il gate di migrazione.
- Test: Vitest + Testing Library + Playwright.
- Package manager: pnpm.
- CI: GitHub Actions con lint, typecheck, unit test, build, e2e smoke.

## Principio architetturale

Il dominio DOCENTE OS non dipende da Google, Supabase, Vercel o da un provider AI. Provider esterni sono adattatori sostituibili.

Dipendenze consentite:

UI -> Application -> Domain
Infrastructure -> Application/Domain ports

Dipendenze vietate:

Domain -> Supabase SDK
Domain -> Google SDK/API
Domain -> Vercel
Domain -> provider AI specifico

## Perché questa scelta

1. Next.js consente di mantenere una sola codebase TypeScript per UI, rendering server, route handlers e BFF.
2. PostgreSQL fornisce un modello dati relazionale adatto a pratiche, scadenze, documenti, classi, UDA, relazioni e audit.
3. Supabase aggiunge Auth, Postgres gestito e RLS senza imporre un dominio proprietario.
4. RLS permette di progettare da subito dati personali e, in futuro, workspace multipli senza affidare l'isolamento soltanto al codice applicativo.
5. Google rimane provider documentale/comunicazioni/calendario ma non diventa il database del prodotto.
6. La separazione Auth applicativa / autorizzazione Google evita di usare il token Google come identità interna permanente.

## Regole privacy e sicurezza

- Nessun token OAuth Google in localStorage.
- Token/refresh token provider solo lato server, cifrati e con scope minimi.
- Nessuna service-role key Supabase nel client.
- RLS obbligatoria per tutte le tabelle esposte.
- Audit log per azioni che producono effetti esterni: Calendar, Drive, Gmail, archiviazione, chiusura pratica.
- Nessun dato alunno obbligatorio nel modello core iniziale.
- Dati scolastici personali separati dai contenuti pubblici/versionati in GitHub.
- Export e cancellazione dati previsti nel modello, non aggiunti a posteriori.

## Strategia workspace

Anche se la prima release è single-user, il modello dati include un concetto leggero di workspace:

- PERSONAL: spazio personale del docente.
- SCHOOL: futuro spazio istituzionale/Workspace.

Ogni oggetto operativo appartiene a un workspace_id. Non implementiamo ora ruoli scolastici complessi, ma evitiamo una migrazione strutturale futura.

## Integrazioni AI

L'AI è una capability, non il database né il workflow engine.

Porta prevista:

AiOrchestratorPort
- analyzeCommunication
- proposeActions
- draftDocument
- summarizePractice
- classifyEvidence

Ogni output AI è una proposta con provenienza e stato di validazione; le azioni esterne irreversibili richiedono policy/validazione applicativa.

## Criterio di migrazione dal prototipo

Il prototipo resta disponibile finché il prodotto non soddisfa:

- login funzionante;
- persistenza server;
- Planner CRUD;
- Circolari/pratiche CRUD;
- almeno una integrazione Google reale;
- import dati JSON del prototipo;
- test e2e smoke;
- deploy production verificato.

Solo allora la nuova app diventa canonical runtime.
