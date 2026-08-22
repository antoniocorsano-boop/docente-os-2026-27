# DOCENTE OS — Stato generale consolidato

Data: 2026-08-22  
Baseline runtime: `develop` @ `f8a52de795f3a60813c096d3c0958ea2cfa08a58`  
Stato documento: CANONICAL CHECKPOINT

## 1. Sintesi

DOCENTE OS è una applicazione Next.js persistente con Supabase/RLS, autenticazione, Attività/Oggi, Conoscenza, Progetta, Classi, Piano annuale, Impostazioni e Orario T1/T2.

Il programma Product Experience ha raggiunto:

- **X0 COMPLETE** — architettura esperienza e documenti canonici;
- **X1 COMPLETE** — Tailwind v4 e component foundation open-code;
- **X2 COMPLETE** — AppShell professionale, responsive navigation e command palette;
- **X3 TECHNICALLY COMPLETE / UX REFINED** — assistant-ui contestuale READ_ONLY/PROPOSE, in attesa di accettazione interattiva;
- **Settings Guided Contract COMPLETE** — configurazione guidata e gestione del contesto sulla stessa sorgente canonica.

Il principio temporale rimane congelato: **Orario e Calendario sono domini indipendenti**. Un futuro servizio `Temporal Projection` potrà leggerli insieme senza introdurre dipendenze reciproche.

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

## 4. Impostazioni / contesto professionale

Stato: **GUIDED RUNTIME COMPLETE / INTERACTIVE ACCEPTANCE PENDING**.

Contratto canonico:

- `docs/architecture/SETTINGS_CANONICAL_SPEC.md` — persistenza e invarianti;
- `docs/product/SETTINGS_EXPERIENCE_CONTRACT.md` — esperienza guidata;
- `docs/product/DOCENTE_OS_LANGUAGE_COLLABORATION_SYSTEM.md` — tono e microcopy.

Le cinque aree sono:

1. **Tu e la scuola** — chi sei e dove insegni;
2. **Discipline** — che cosa insegni;
3. **Classi** — con quali classi lavori;
4. **Cattedra** — in quali classi insegni quale disciplina e per quante ore/minuti;
5. **Organizzazione scolastica** — preset abituali usati per costruire più velocemente la griglia Orario.

La pagina `/impostazioni` ora:

- usa AppShell;
- mostra `N/5 aree pronte`;
- calcola `Completo / Da completare / Da controllare` da un read model deterministico;
- spiega per ogni area `Serve a / Usato in / Non modifica`;
- indica sempre il prossimo passo utile;
- gestisce la Cattedra sugli stessi `teaching_assignments` dell'Orario;
- non crea slot o versioni Orario quando viene aggiunta una Cattedra;
- legge la Cattedra tramite reader read-only senza creare una bozza Orario;
- non modifica Calendario, Attività o Piano annuale salvo il legame canonico già esistente delle classi con `annual_plan_sections`.

Formula utente congelata:

```text
Classe = esiste nel mio contesto
Cattedra = la insegno
Orario = quando la insegno ricorrentemente
```

## 5. Conoscenza

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

## 6. Oggi / Attività

`PlannerTask` resta l'oggetto canonico delle cose da fare.

Disponibile:

- task persistenti;
- priorità;
- pianificazione e scadenza;
- waiting/done/reopen;
- provenienza;
- collegamenti da Conoscenza;
- viste operative;
- quick capture.

Una attività con data non diventa automaticamente un evento di Calendario.

## 7. Piano annuale

Disponibile:

- CAN-PLAN per classi I/II/III;
- 33 blocchi / 66 ore come modello corrente;
- sezioni persistenti/provvisorie/confermate;
- avanzamento per sezione;
- evidenze/note;
- provenienza del piano di riferimento.

Il Piano annuale esiste indipendentemente da Orario e Calendario.

## 8. Orario

### T1 — COMPLETE

- classi/discipline -> Cattedra -> versione -> slot;
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

La vista Orario usa la AppShell comune e legge la stessa Cattedra configurabile da Impostazioni.

### Invariante temporale

**Orario non dipende dal Calendario.**

Gestisce autonomamente struttura settimanale, Cattedra, slot e versioni.

## 9. Calendario e composizione temporale

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

## 10. AppShell e modello mentale

Baseline AppShell:

- Conoscenza lista/dettaglio;
- Oggi;
- Piano annuale;
- Orario;
- Impostazioni.

Navigazione desktop raggruppata in:

- **Il mio lavoro** — Home, Oggi;
- **Didattica** — Progetta, Piano annuale, Classi;
- **Tempo** — Orario;
- **Risorse** — Conoscenza;
- **Sistema** — Impostazioni.

Il raggruppamento è presentazionale: non fonde i domini.

## 11. Assistente contestuale

X3 baseline:

- assistant-ui;
- contesto autenticato e minimizzato;
- provider-neutral local adapter;
- READ_ONLY / PROPOSE;
- nessuna scrittura;
- nessuna nuova persistenza;
- trigger e pannello raffinati per ridurre la competizione con il contenuto.

X4 resta **HOLD** fino all'accettazione visiva della versione raffinata.

## 12. Programma temporale corretto

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

## 13. Gate correnti

Ultima slice runtime, PR #38:

- test PASS, inclusi i nuovi test del read model Impostazioni;
- TypeScript PASS;
- lint PASS;
- build PASS;
- Product CI #224 PASS;
- Netlify `READY` sul merge `f8a52de…`;
- nessuna migrazione DB;
- RLS invariata;
- nessuna bozza Orario creata dalla sola lettura della Cattedra in Impostazioni;
- X4 non autorizzata.

## 14. Rischi aperti

1. alcune superfici secondarie conservano ancora shell/CSS legacy;
2. X3 raffinato deve essere verificato nuovamente su desktop e mobile;
3. Impostazioni guidate devono essere validate con il workspace reale, soprattutto stati delle classi e Cattedra;
4. T3A/B/C devono mantenere rigorosamente le dipendenze definite nel Temporal Composition Canonical Spec;
5. produzione definitiva e recovery UX restano da congelare.

## 15. Prossima azione

**Accettazione interattiva di Impostazioni + X3.**

Per Impostazioni verificare:

1. correttezza del riepilogo 5 aree;
2. leggibilità di `Serve a / Usato in / Non modifica`;
3. classi provvisorie come `Da controllare`;
4. Cattedra mancante come prossimo passo;
5. aggiunta/modifica della Cattedra e immediata disponibilità in Orario senza creare lezioni;
6. comportamento mobile.

Dopo questa accettazione, il prossimo sviluppo temporale autorizzabile resta **T3A — Timetable lifecycle**. X4 rimane separato e in HOLD.
