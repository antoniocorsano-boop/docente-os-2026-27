# DOCENTE OS — Stato generale consolidato

Data: 2026-08-22  
Baseline runtime: `develop` @ `aeb66cd8d1752de1ee4f8de33103c0617db330e6`  
Stato documento: CANONICAL CHECKPOINT

## 1. Sintesi

DOCENTE OS dispone di una base prodotto reale e verificata: autenticazione e persistenza Supabase, RLS, Planner, Conoscenza, Piano annuale, Classi, Impostazioni e Orario T1/T2. Il Language & Collaboration System v1 è applicato alle viste principali.

Il programma Product Experience è entrato anche nel runtime: **X0 e X1 sono completati**. Tailwind v4 e la prima component foundation open-code sono attivi senza riscrittura delle superfici esistenti.

La prossima priorità è **X2 — Professional AppShell**: shell unica, navigazione responsive, command palette e progressiva migrazione delle superfici di lavoro.

## 2. Runtime corrente

- Next.js 16.3.1 / App Router;
- React 19.2.8;
- TypeScript 5.9 strict;
- Node 22;
- npm;
- Supabase Auth + PostgreSQL + RLS;
- server-side session/auth helpers;
- repository/port pattern per separare dominio e provider;
- Tailwind CSS v4 via PostCSS, senza preflight globale;
- primitive open-code DOCENTE OS/shadcn-style: Button, Badge, Card, Alert, Separator, Skeleton;
- CI GitHub Actions con test, typecheck, lint e build;
- deploy preview Netlify su `develop` come riferimento operativo.

## 3. Autenticazione

Stato corrente:

- e-mail + password come accesso ordinario;
- magic link per prima attivazione/recupero;
- sessione Supabase persistente;
- flusso Netlify autorizzato negli URL di redirect;
- nessuna dipendenza quotidiana dall'invio e-mail per il login con password;
- Login migrato alla nuova component foundation X1.

Residui:

- recovery password da rendere più guidato nella UX;
- production URL definitivo da congelare prima del rilascio.

## 4. Conoscenza / KB

Disponibile:

- acquisizione da fonti/documenti;
- trasformazione e normalizzazione;
- generazioni/versioni;
- provenienza;
- classificazione professionale;
- collegamenti a Planner;
- linguaggio umano e dettagli tecnici progressivi;
- pannello “Ti aiuto da qui”.

Residuo strategico:

- il pannello di aiuto è ancora deterministico/UI, non collegato a un vero runtime AI contestuale;
- migrazione ai componenti V2 prevista progressivamente da X2.

## 5. Planner / Oggi

Disponibile:

- task persistenti;
- priorità;
- planning temporale;
- waiting/done/reopen;
- provenienza;
- collegamenti da Conoscenza;
- viste Oggi/settimana/in attesa/senza data;
- quick capture.

Residui:

- undo/feedback evoluto;
- assistant proposal -> Planner;
- workload/timeboxing più avanzato;
- integrazione calendario reale in slice dedicata.

## 6. Piano annuale

Disponibile:

- piano canonico per classi I/II/III;
- sezioni persistenti/provvisorie/confermate;
- avanzamento blocchi;
- 33 blocchi / 66 ore come modello corrente;
- stato per sezione;
- evidenze/note;
- persistenza Supabase e cache locale ausiliaria;
- provenienza della fonte canonica.

Residui:

- integrazione più profonda con UDA/materiali;
- assistente per copertura/lacune/prossimo passo;
- convergenza con calendario/orario T3-T4.

## 7. Orario

### T1 — completato

- settings -> classi/discipline -> cattedra -> versione -> slot;
- assignment con minuti settimanali;
- versioni DRAFT;
- slot LESSON/DISPOSITION/RECEPTION/OTHER;
- trigger DB anti-overlap;
- modifiche consentite solo su DRAFT.

### T2 — completato

- griglia Settimana/Giorno;
- cella vuota -> crea;
- cella occupata -> modifica/rimuovi;
- capacità minuti assegnati vs pianificati;
- stampa;
- responsive;
- nessun consumo B01-B33.

### T3 — pending

- calendario/materializzazione date;
- activation lifecycle;
- eccezioni.

### T4 — pending

- allocazione/materializzazione B01-B33 sul calendario didattico.

## 8. Impostazioni e Classi

Disponibile:

- identità docente;
- istituto;
- discipline;
- classi/sezioni condivise col Piano annuale;
- preset orario;
- riuso dello stesso registro canonico senza duplicazioni.

## 9. Linguaggio, design e collaborazione

Completato:

- Language & Collaboration System v1;
- rollout linguistico su Home, Oggi, Progetta, Classi, Orario, Impostazioni, Piano annuale, Conoscenza;
- Product Experience Masterplan;
- ADR-002 Experience Platform;
- AI Collaboration Canonical Spec;
- Design System V2 Canonical;
- X1 Component Foundation runtime.

Decisioni attive:

- shadcn/open-code come component strategy;
- assistant-ui come prima scelta per X3;
- BlockNote candidato X5;
- CopilotKit/AG-UI candidato X6;
- provider AI dietro porta sostituibile, con Ollama possibile per sviluppo locale.

## 10. Divergenze chiuse

### UI stack

La precedente divergenza “shadcn/Tailwind documentati ma non presenti” è **chiusa**: X1 ha introdotto Tailwind v4 e primitive canoniche.

### Hosting

Il progetto è hosting-neutral. Netlify è il runtime di sviluppo verificato; Vercel non è gate finché persistono limiti di build dell'account.

### Package manager

`npm` è il riferimento operativo e di CI.

## 11. Programma X

- **X0 — canonical freeze esperienza:** COMPLETE.
- **X1 — component foundation:** COMPLETE (`aeb66cd8…`).
- **X2 — AppShell, sidebar responsive, command palette:** NEXT.
- **X3 — assistant-ui shell, read/propose only:** PLANNED.
- **X4 — assistant actions con human-in-the-loop:** PLANNED.
- **X5 — authoring professionale con BlockNote:** PLANNED.
- **X6 — evaluation CopilotKit/AG-UI:** PLANNED.

## 12. Rischi aperti

1. duplicazione della shell/navigation tra le viste prima di X2;
2. CSS locale ancora ampio durante la migrazione progressiva;
3. introdurre AI prima di completare i boundary X3;
4. confondere dati proposti con dati canonici;
5. dipendere da un provider LLM/cloud specifico;
6. accelerare T3/T4 senza coordinamento con shell/calendario.

## 13. Regola di sequenza

Ordine raccomandato:

1. X2 shell e command palette;
2. T3 oppure X3 in parallelo solo se i confini restano indipendenti;
3. X4 dopo validazione dell'assistente read/propose;
4. T4 quando calendario e activation lifecycle sono stabili;
5. X5 authoring;
6. X6 agentic evaluation.

## 14. Next concrete action

**X2 — Professional AppShell**.

Obiettivo:

- eliminare gradualmente la duplicazione di navigazione;
- introdurre componenti overlay/navigation soltanto quando realmente usati;
- command palette `Ctrl/Cmd + K`;
- sidebar/drawer responsive;
- page header e contesto professionale canonici;
- prima migrazione di Conoscenza alla nuova shell.

Gate X2:

- test PASS;
- typecheck PASS;
- lint PASS;
- build PASS;
- Netlify preview READY;
- login/RLS invariati;
- navigazione tastiera funzionante;
- nessuna modifica dati;
- vecchie route ancora raggiungibili.
