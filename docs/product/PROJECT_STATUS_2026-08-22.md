# DOCENTE OS — Stato generale consolidato

Data: 2026-08-22  
Baseline runtime: `develop` @ `eba03168bcb20892a61508fc8ef37bf7e6a60367`  
Stato documento: CANONICAL CHECKPOINT

## 1. Sintesi

DOCENTE OS dispone ormai di una base prodotto reale: autenticazione e persistenza Supabase, RLS, Planner, Conoscenza con ingestione/trasformazione, Piano annuale, Classi, Impostazioni e Orario T1/T2. Il Language & Collaboration System v1 è stato applicato alle viste principali.

La priorità successiva non è aggiungere funzioni isolate, ma consolidare l'esperienza in una **platform UI + assistant experience** professionale, coerente e progressivamente agentica.

## 2. Runtime corrente

- Next.js 16.3.1 / App Router;
- React 19.2.8;
- TypeScript 5.9 strict;
- Node 22;
- Supabase Auth + PostgreSQL + RLS;
- server-side session/auth helpers;
- repository/port pattern per separare dominio e provider;
- CI GitHub Actions con test, typecheck, lint e build;
- deploy preview Netlify su `develop` come riferimento operativo.

## 3. Autenticazione

Stato corrente:

- e-mail + password come accesso ordinario;
- magic link per prima attivazione/recupero;
- sessione Supabase persistente;
- flusso Netlify autorizzato negli URL di redirect;
- nessuna dipendenza quotidiana dall'invio e-mail per il login con password.

Residui:

- recupero password completo da rendere più esplicito nella UX;
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

- il pannello di aiuto è ancora deterministico/UI, non collegato a un vero runtime AI contestuale.

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

## 9. Linguaggio e collaborazione

Completato:

- Language & Collaboration System v1;
- rollout Home, Oggi, Progetta, Classi, Orario, Impostazioni, Piano annuale, Conoscenza;
- stati umani;
- microcopy orientata all'azione;
- progressiva esposizione dei dettagli tecnici.

Nuovo livello approvato:

- Product Experience Masterplan;
- ADR-002 Experience Platform;
- AI Collaboration Canonical Spec;
- Design System V2 Canonical.

## 10. Divergenze documentali/runtimes da chiudere

### UI stack

ADR-001 dichiarava Tailwind + shadcn/ui come stack target, ma il runtime corrente non li ha ancora installati. La decisione resta valida come target e viene attuata con X1.

### Hosting

ADR-001 indicava Vercel come target preferito. Nello sviluppo corrente Netlify è il runtime effettivamente verificato; Vercel presenta limiti di build dell'account. Il progetto viene quindi dichiarato hosting-neutral, con Netlify come riferimento di sviluppo fino a nuova decisione production.

### Package manager

La CI corrente usa `npm`. `npm` diventa il riferimento operativo fino a eventuale migrazione esplicita.

## 11. Nuovo programma X

- **X0** — canonical freeze esperienza: IN CORSO/CHIUSURA con questo pacchetto.
- **X1** — Tailwind + shadcn component foundation: NEXT.
- **X2** — AppShell, sidebar responsive, command palette.
- **X3** — assistant-ui shell, read/propose only.
- **X4** — assistant actions con human-in-the-loop.
- **X5** — authoring professionale con BlockNote.
- **X6** — evaluation CopilotKit/AG-UI.

## 12. Rischi aperti

1. crescita di CSS locale prima della component foundation;
2. duplicazione di pattern tra viste;
3. introdurre AI prima di congelare capability/policy;
4. fare una migrazione UI big-bang e perdere stabilità;
5. confondere dati proposti con dati canonici;
6. dipendere da un provider LLM/cloud specifico;
7. accelerare T3/T4 mentre la shell prodotto è ancora in transizione.

## 13. Regola di sequenza

Ordine raccomandato:

1. chiudere X0;
2. X1 foundation;
3. X2 shell;
4. riprendere T3 oppure X3 in parallelo solo se i confini sono indipendenti;
5. X4 dopo validazione dell'assistente read/propose;
6. T4 quando calendario e activation lifecycle sono stabili;
7. X5 authoring;
8. X6 agentic evaluation.

## 14. Next concrete action

**X1 — Component Foundation**.

Obiettivo: introdurre Tailwind/shadcn senza cambiare dominio e migrare una prima superficie campione, preferibilmente Conoscenza, con componenti canonici e test di regressione.

Gate X1:

- dependencies installabili;
- test PASS;
- typecheck PASS;
- lint PASS;
- build PASS;
- Netlify preview READY;
- nessuna regressione login/RLS;
- nessuna modifica dati;
- vecchie superfici continuano a funzionare.
