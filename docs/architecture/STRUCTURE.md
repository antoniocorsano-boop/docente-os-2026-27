# DOCENTE OS — Struttura applicativa target

## Repository

```text
/
├─ src/
│  ├─ app/                         # Next.js App Router
│  │  ├─ (public)/
│  │  ├─ (auth)/
│  │  ├─ (workspace)/
│  │  │  ├─ home/
│  │  │  ├─ planner/
│  │  │  ├─ timetable/
│  │  │  ├─ communications/
│  │  │  ├─ documents/
│  │  │  ├─ training/
│  │  │  ├─ teaching/
│  │  │  ├─ archive/
│  │  │  └─ settings/
│  │  └─ api/                      # Route handlers/BFF, non dominio
│  ├─ modules/
│  │  ├─ planner/
│  │  │  ├─ domain/
│  │  │  ├─ application/
│  │  │  ├─ infrastructure/
│  │  │  └─ ui/
│  │  ├─ communications/
│  │  ├─ documents/
│  │  ├─ calendar/
│  │  ├─ training/
│  │  ├─ teaching/
│  │  └─ archive/
│  ├─ core/
│  │  ├─ domain/                   # Workspace, Actor, SourceRef, AuditEvent
│  │  ├─ application/              # shared ports, use-case primitives
│  │  ├─ infrastructure/           # Supabase, Google, AI adapters
│  │  └─ ui/
│  ├─ components/                  # componenti condivisi puramente UI
│  ├─ lib/                         # bootstrap tecnico, no business rules
│  └─ test/
├─ supabase/
│  ├─ migrations/
│  ├─ seed.sql
│  └─ tests/                       # policy/RLS tests
├─ e2e/
├─ public/
├─ docs/
│  ├─ architecture/
│  ├─ adr/
│  ├─ product/
│  └─ operations/
├─ scripts/
├─ .github/workflows/
├─ package.json
├─ pnpm-lock.yaml
├─ tsconfig.json
└─ next.config.ts
```

## Moduli di dominio iniziali

### planner
Task, priorità, scadenza, stato, next action, collegamenti a pratiche/eventi/documenti.

### communications
Comunicazione/circolare, fonte, allegati, analisi, scadenze candidate, azioni candidate, stato pratica.

### documents
Documento richiesto/prodotto, modello, versione, stato, Drive file ID, provenienza, validazione.

### calendar
Evento applicativo e riferimento all'evento Google Calendar. Non usare Calendar come database dei task.

### training
Corso, ente, iscrizione, completamento, ore, attestato e riferimento Drive.

### teaching
Anno scolastico, classe/sezione, programmazione, UDA, sessione/lezione, ore pianificate/reali, evidenze.

### archive
Chiusura pratica, snapshot minimo, riferimenti e audit. Non duplicare file Drive.

## Entità core

```text
Workspace
UserProfile
WorkspaceMembership
AcademicYear
SourceReference
ExternalConnection
ExternalResourceRef
AuditEvent
```

## Tabelle iniziali proposte

```text
workspaces
workspace_memberships
academic_years
tasks
communications
communication_attachments
communication_dates
communication_actions
documents
training_items
classes
teaching_plans
udas
lesson_logs
external_connections
external_resource_refs
audit_events
```

Tutte le tabelle operative includono almeno:

```text
id uuid
workspace_id uuid
created_at timestamptz
updated_at timestamptz
created_by uuid
```

Dove applicabile:

```text
academic_year_id uuid
status text/enum
source_ref jsonb o relazione normalizzata
```

## Workflow canonico comunicazioni

```text
INGESTED
  -> ANALYZED
  -> VALIDATED
  -> ACTION_PLANNED
  -> EXECUTING
  -> WAITING
  -> COMPLETED
  -> ARCHIVED
```

Lo stato della comunicazione non viene dedotto dall'esistenza di un evento Calendar o di un file Drive: è uno stato applicativo esplicito.

## Pattern integrazioni

Porte applicative:

```text
MailPort
CalendarPort
DocumentStoragePort
IdentityConnectionPort
AiOrchestratorPort
```

Adattatori iniziali:

```text
GoogleGmailAdapter
GoogleCalendarAdapter
GoogleDriveAdapter
SupabaseRepositoryAdapter
OpenAIAiAdapter (o altro provider)
```

Il dominio vede soltanto le porte.

## Strategia dati

### PostgreSQL
Stato operativo, relazioni, metadati, workflow, audit, configurazione.

### Google Drive
File reali, modelli, attestati, documenti istituzionali.

### Gmail
Fonte messaggi. Salvare ID/thread/provider metadata e informazioni necessarie, non creare un secondo archivio email completo senza necessità.

### Calendar
Eventi temporali. Non usarlo per task senza data/ora.

### IndexedDB client
Cache/offline futura e coda operazioni; non source of truth dopo la migrazione.

## Regole di dipendenza

- `domain/` contiene TypeScript puro.
- `application/` contiene use case e porte.
- `infrastructure/` implementa le porte.
- `ui/` dipende dai use case, non dagli SDK provider.
- Nessun componente React contiene chiamate dirette Gmail/Drive/Calendar.
- Nessun oggetto dominio contiene tipi Supabase o Google.

## Test pyramid

1. Domain unit tests: veloci e senza I/O.
2. Application tests: porte fake/in-memory.
3. Infrastructure contract tests: Supabase/Google adapter boundaries.
4. RLS tests: accesso workspace e deny-by-default.
5. Playwright: flussi critici end-to-end.

Flussi e2e prioritari:

- login -> home;
- nuova attività -> planner -> chiusura;
- circolare -> analisi -> azione;
- azione con data -> Calendar;
- documento richiesto -> Drive ref -> chiusura pratica;
- import backup v2.1 -> dati persistiti.

## Strategia di migrazione

### P0 — Foundation
Next.js/TypeScript, lint/typecheck/test/build, layout, design tokens, CI.

### P1 — Persistence/Auth
Supabase, schema minimo, Auth, workspace PERSONAL, RLS.

### P2 — Planner vertical slice
Task end-to-end, sostituzione localStorage per il Planner.

### P3 — Communications vertical slice
Pratica circolare + analisi + collegamento Planner.

### P4 — Google Calendar
Connessione Google separata, token server-side, create/read event.

### P5 — Drive Documents
Riferimenti file/modelli, creazione/archiviazione controllata.

### P6 — Gmail Intake
Lettura selettiva, pratica da messaggio, deduplicazione per provider ID.

### P7 — Teaching
Classi, UDA, lesson log, planned vs actual hours.

### P8 — Offline/PWA
IndexedDB cache, installabilità, strategie retry/conflict.

## Cose da NON fare ora

- microservizi;
- Kubernetes;
- monorepo multi-app senza una seconda app reale;
- event sourcing completo;
- duplicazione Gmail/Drive nel database;
- AI agent autonomi con permessi irreversibili;
- ruoli scolastici complessi prima di un vero workspace SCHOOL;
- ORM pesante se non necessario: partire con migrazioni SQL + tipi generati Supabase.
