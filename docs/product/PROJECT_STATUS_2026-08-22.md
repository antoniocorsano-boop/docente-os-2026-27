# DOCENTE OS — Stato generale consolidato

Data: 2026-08-22  
Baseline runtime: `develop` @ `2067c130c217730ae6f74a8cf664f85ba207c50c`  
Stato documento: CANONICAL CHECKPOINT

## 1. Sintesi

DOCENTE OS è una applicazione Next.js persistente con Supabase/RLS, autenticazione, Attività/Oggi, Conoscenza, Progetta, Classi, Piano annuale, Impostazioni e Orario T1/T2.

Il programma Product Experience ha raggiunto:

- **X0 COMPLETE** — architettura esperienza e documenti canonici;
- **X1 COMPLETE** — Tailwind v4 e component foundation open-code;
- **X2 COMPLETE** — AppShell professionale, responsive navigation e command palette;
- **X3 TECHNICALLY COMPLETE** — assistant-ui contestuale READ_ONLY/PROPOSE;
- **X3 UX REFINED** — navigazione raggruppata e assistente meno invasivo, in attesa di nuova accettazione interattiva.

Il principio temporale è ora congelato: **Orario e Calendario sono domini indipendenti**. Un futuro servizio `Temporal Projection` potrà leggerli insieme senza introdurre dipendenze reciproche.

## 2. Runtime corrente

- Next.js 16.3.1 / App Router;
- React 19.2.8;
- TypeScript 5.9 strict;
- Node 22;
- npm;
- Supabase Auth + PostgreSQL + RLS;
- server-side session/auth helpers;
- repository/port pattern;
- Tailwind CSS v4 via PostCSS senza preflight globale;
- componenti open-code DOCENTE OS/shadcn-style;
- assistant-ui LocalRuntime provider-neutral;
- GitHub Actions: test + typecheck + lint + build;
- Netlify deploy preview su `develop` come runtime operativo.

## 3. Autenticazione

- e-mail + password come accesso ordinario;
- magic link per prima attivazione/recupero;
- sessione Supabase persistente;
- redirect Netlify autorizzato;
- nessuna dipendenza quotidiana dalla quota e-mail per il login con password.

Residui:

- recovery password da rendere più guidato;
- production URL definitivo da congelare.

## 4. Conoscenza

Disponibile:

- acquisizione da fonti/documenti;
- trasformazione e normalizzazione;
- versioni/generazioni;
- provenienza;
- classificazione professionale;
- proposte azione/scadenza;
- collegamenti alle Attività;
- Language & Collaboration System;
- assistente contestuale X3 READ_ONLY/PROPOSE.

X3 non dispone di tool di scrittura e non persiste la conversazione.

## 5. Oggi / Attività

`PlannerTask` resta l'oggetto canonico delle cose da fare.

Disponibile:

- task persistenti;
- priorità;
- pianificazione e scadenza;
- waiting/done/reopen;
- provenienza;
- collegamenti da Conoscenza;
- viste Da fare ora / Oggi / settimana / attesa / senza data;
- quick capture.

Una attività con data non diventa automaticamente un evento di Calendario.

## 6. Piano annuale

Disponibile:

- CAN-PLAN per classi I/II/III;
- 33 blocchi / 66 ore come modello corrente;
- sezioni persistenti/provvisorie/confermate;
- avanzamento per sezione;
- evidenze/note;
- provenienza del piano di riferimento.

Il Piano annuale esiste indipendentemente da Orario e Calendario.

## 7. Orario

### T1 — COMPLETE

- settings -> classi/discipline -> cattedra -> versione -> slot;
- assignment con minuti settimanali;
- versioni DRAFT;
- slot LESSON/DISPOSITION/RECEPTION/OTHER;
- trigger DB anti-overlap;
- modifiche consentite solo su DRAFT.

### T2 — COMPLETE

- griglia Settimana/Giorno;
- cella vuota -> crea;
- cella occupata -> modifica/rimuovi;
- capacità minuti assegnati vs inseriti in griglia;
- stampa;
- responsive;
- nessun consumo B01–B33.

La vista Orario è ora migrata alla AppShell comune.

### Invariante temporale

**Orario non dipende dal Calendario.**

Gestisce autonomamente struttura settimanale, cattedra, slot e versioni.

## 8. Calendario e composizione temporale

Il Calendario sarà un dominio separato per:

- giorni scolastici;
- sospensioni/festività;
- eventi e vincoli reali;
- date effettive.

`Temporal Projection` sarà un application service che potrà leggere:

```text
Timetable read model + Calendar read model -> ProjectedOccurrence[]
```

Né Orario né Calendario importeranno repository o tipi dell'altro dominio.

Documenti canonici:

- `docs/architecture/WORK_TIME_MENTAL_MODEL.md`;
- `docs/architecture/TEMPORAL_COMPOSITION_CANONICAL_SPEC.md`;
- `docs/architecture/TIMETABLE_CANONICAL_SPEC.md` per le entità verticali Orario.

## 9. AppShell e modello mentale

Le superfici principali usano progressivamente la shell condivisa.

Baseline consolidata:

- Conoscenza lista/dettaglio;
- Oggi;
- Piano annuale;
- Orario.

Navigazione desktop raggruppata in:

- **Il mio lavoro** — Home, Oggi;
- **Didattica** — Progetta, Piano annuale, Classi;
- **Tempo** — Orario;
- **Risorse** — Conoscenza;
- **Sistema** — Impostazioni.

Questo raggruppamento è presentazionale: non fonde i relativi domini.

## 10. Assistente contestuale

X3 baseline:

- assistant-ui;
- contesto autenticato e minimizzato;
- provider-neutral local adapter;
- READ_ONLY / PROPOSE;
- nessuna scrittura;
- nessuna nuova persistenza.

Raffinamento `2067c130…`:

- trigger flottante più piccolo;
- pannello aperto meno invasivo;
- copy di sicurezza più breve;
- documento sempre utilizzabile senza assistente.

X4 resta **HOLD** fino all'accettazione visiva della versione raffinata.

## 11. Programma temporale corretto

### T3A — Timetable lifecycle

- attivazione/archiviazione versioni Orario;
- `effective_from/effective_to`;
- nessuna dipendenza Calendar.

### T3B — Calendar core

- date, giorni scolastici, sospensioni, eventi;
- nessuna dipendenza Timetable.

### T3C — Temporal Projection

- composizione read-only dei due domini;
- occorrenze reali proiettate;
- prima integrazione nella vista Oggi.

### T4 — Didactic allocation

- sessioni/occorrenze -> CAN-PLAN B01–B33;
- avanzamento da minuti/evidenze effettive;
- nessuna riscrittura del canone.

## 12. Gate correnti

Ultima slice runtime, PR #36:

- npm install PASS;
- test PASS;
- TypeScript PASS;
- lint PASS;
- build PASS;
- Product CI #220 PASS;
- Netlify `READY` sul merge `2067c130…`;
- nessuna migrazione DB;
- RLS invariata;
- X4 non autorizzata.

## 13. Rischi aperti

1. alcune superfici secondarie conservano ancora shell/CSS legacy;
2. X3 raffinato deve essere verificato nuovamente su desktop e mobile;
3. nessun provider LLM reale è ancora necessario/autorizzato per X3;
4. T3A/B/C devono mantenere rigorosamente le dipendenze definite nel Temporal Composition Canonical Spec;
5. produzione definitiva e recovery UX restano da congelare.

## 14. Prossima azione

**Accettazione interattiva della baseline `2067c130…`.**

Controllare:

1. sidebar raggruppata;
2. chiarezza della distinzione Oggi / Piano annuale / Orario / Conoscenza;
3. Orario esplicitamente autonomo dal Calendario;
4. assistente chiuso poco invasivo;
5. assistente aperto utilizzabile senza coprire eccessivamente il documento;
6. comportamento mobile.

Dopo accettazione, il prossimo sviluppo temporale autorizzabile è **T3A — Timetable lifecycle**. X4 resta separato e in HOLD.
