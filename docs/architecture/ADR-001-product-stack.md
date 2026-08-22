# ADR-001 — Stack prodotto DOCENTE OS

Data: 2026-08-21  
Aggiornata: 2026-08-22  
Stato: ACCEPTED

## Decisione

DOCENTE OS evolve dal prototipo statico/PWA a un prodotto web modulare con il seguente stack:

- Frontend/full-stack framework: Next.js 16 (App Router) + React + TypeScript strict.
- UI target: Tailwind CSS + shadcn/ui; componenti accessibili e responsive. **Nota runtime 2026-08-22:** Tailwind/shadcn non sono ancora installati; l'adozione progressiva parte con X1 secondo ADR-002.
- Validazione: Zod come target applicativo quando richiesta dai nuovi form/contract; non è ancora una dipendenza runtime obbligatoria per le slice esistenti.
- Form: React Hook Form come candidato standard per form complessi; i form server/action esistenti restano validi finché non vengono migrati deliberatamente.
- Database: PostgreSQL gestito da Supabase.
- Auth applicativa: Supabase Auth.
- Autorizzazione dati: PostgreSQL Row Level Security (RLS), deny-by-default.
- Integrazioni Google: OAuth Google separato dall'autenticazione applicativa; Gmail, Drive e Calendar dietro porte/adattatori dedicati.
- File/documenti: Google Drive resta fonte primaria dei documenti quando collegata; PostgreSQL conserva metadati, stato pratica e riferimenti provider, non copie indiscriminate dei file.
- Email: conservare message/thread ID e dati derivati necessari al workflow; evitare duplicazione integrale salvo requisito esplicito.
- Hosting: il prodotto resta hosting-neutral. **Netlify deploy preview su `develop` è il riferimento operativo corrente**; Vercel resta provider compatibile ma non è gate del progetto durante i limiti di build dell'account. La produzione definitiva richiede decisione separata.
- Hosting statico legacy: GitHub Pages può conservare prototipi storici finché necessari, ma non è runtime canonico del prodotto Next.js.
- Test: test TypeScript/node correnti + evoluzione verso Testing Library/Playwright per UI/e2e dove necessario.
- Package manager operativo: **npm**, coerente con CI/runtime corrente. Un passaggio a pnpm richiede migrazione esplicita e lockfile.
- CI: GitHub Actions con test, typecheck, lint e build; e2e smoke viene aggiunto sulle superfici che lo richiedono.

## Principio architetturale

Il dominio DOCENTE OS non dipende da Google, Supabase, Netlify/Vercel, component library o provider AI. Provider esterni sono adattatori sostituibili.

Dipendenze consentite:

```text
UI -> Application -> Domain
Infrastructure -> Application/Domain ports
```

Dipendenze vietate:

```text
Domain -> Supabase SDK
Domain -> Google SDK/API
Domain -> hosting provider
Domain -> component library
Domain -> provider AI specifico
```

## Perché questa scelta

1. Next.js consente di mantenere una sola codebase TypeScript per UI, rendering server, route handlers e BFF.
2. PostgreSQL fornisce un modello dati relazionale adatto a pratiche, scadenze, documenti, classi, UDA, relazioni e audit.
3. Supabase aggiunge Auth, Postgres gestito e RLS senza imporre un dominio proprietario.
4. RLS permette di progettare da subito dati personali e, in futuro, workspace multipli senza affidare l'isolamento soltanto al codice applicativo.
5. Google rimane provider documentale/comunicazioni/calendario ma non diventa il database del prodotto.
6. La separazione Auth applicativa / autorizzazione Google evita di usare il token Google come identità interna permanente.
7. L'hosting-neutrality evita che limiti commerciali del provider blocchino lo sviluppo del prodotto.
8. L'adozione progressiva della component platform evita una riscrittura UI big-bang.

## Regole privacy e sicurezza

- Nessun token OAuth Google in localStorage.
- Token/refresh token provider solo lato server, cifrati e con scope minimi quando introdotti.
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

Ogni oggetto operativo appartiene a un `workspace_id`. Non implementiamo ora ruoli scolastici complessi, ma evitiamo una migrazione strutturale futura.

## Integrazioni AI

L'AI è una capability, non il database né il workflow engine.

Porta prevista/canonica:

`AiOrchestratorPort`

- analyzeCommunication
- proposeActions
- draftDocument
- summarizePractice
- classifyEvidence

Ogni output AI è una proposta con provenienza e stato di validazione; le azioni esterne irreversibili richiedono policy/validazione applicativa.

La UX e i tool boundary sono specificati in:

- `ADR-002-experience-platform.md`
- `AI_COLLABORATION_CANONICAL_SPEC.md`

## Stato di migrazione dal prototipo

Al 2026-08-22 il nuovo prodotto ha già superato diversi gate originariamente previsti:

- login funzionante;
- persistenza server;
- Planner CRUD essenziale;
- Conoscenza persistente/derivata;
- Piano annuale persistente;
- Impostazioni/classi;
- Orario T1/T2;
- deploy Next.js verificato su Netlify preview.

Restano da chiudere prima del rilascio production canonico:

- integrazioni Google reali sufficientemente validate;
- T3 calendario/eccezioni/attivazione;
- e2e smoke production-grade;
- URL production e recovery auth definitivi;
- component foundation X1/X2;
- policy AI X3/X4 prima di qualsiasi write assistita;
- piano di migrazione/import dei dati legacy ancora necessari.

La promozione a production canonical runtime richiederà un gate esplicito; non è implicita nel semplice merge su `develop`.
