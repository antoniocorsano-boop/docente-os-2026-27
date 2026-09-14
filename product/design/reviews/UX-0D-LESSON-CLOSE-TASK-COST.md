# UX-0D — Lesson Close Task Cost

## Design classification

**COMPATIBLE** — la modifica riduce il costo cognitivo della superficie esistente `Registra` senza introdurre nuovi token, pattern, route o capability. Riusa i componenti e gli stili già presenti nel Lesson Workspace.

## Journey

`Lezione → conferma cosa hai svolto → Registra → Fatto`

## Prima

La schermata era funzionalmente corretta ma chiedeva al docente di interpretare concetti del Product Model durante un task operativo semplice.

- decisioni esplicite prima dell'obiettivo: 1;
- CTA/azioni visibili nel blocco finale: 3;
- concetti interni visibili: almeno 4 (`Piano annuale: <status>`, ID blocco, `TeachingSession`, `EvidenceReference`);
- campi obbligatori: data + minuti effettivi;
- campi facoltativi: nota + osservazione di classe;
- cambi di superficie necessari: 0 per registrare, ma 2 ritorni competevano visivamente con la CTA;
- recovery: messaggio d'errore con dati locali preservati.

## Dopo

Il Product Model resta invariato, ma il presenter usa solo linguaggio docente.

- decisioni esplicite prima dell'obiettivo: 1;
- CTA primaria visibile: 1 (`Registra e torna alla classe`);
- azioni secondarie visibili per default: 0; i due ritorni sono dentro `Prima di registrare`;
- concetti interni necessari alla comprensione: 0;
- campi obbligatori: invariati, data + minuti effettivi;
- campi facoltativi: invariati, nota + osservazione di classe;
- cambi di superficie necessari: 0;
- recovery: invariato; i dati locali restano disponibili in caso di errore.

## Confine professionale conservato

La UI continua a spiegare che la registrazione della lezione non segna automaticamente come completato il percorso annuale. La distinzione resta quindi esplicita senza esporre `AnnualPlanBlockProgress`, stato tecnico o ID del blocco.

## Invarianti

- `recordLessonExecution` non cambia;
- hidden inputs, registration key, idempotency e provenance non cambiano;
- RLS e AAL2 non cambiano;
- nessuna auto-mutazione del Piano/UDA;
- l'osservazione resta class-level e facoltativa;
- nessuna `EvidenceReference` viene inventata o creata automaticamente.

## Acceptance HVA

La journey `lesson-close-task-first` viene eseguita nei progetti HVA desktop/mobile e verifica:

1. data e minuti effettivi comprensibili;
2. confine professionale espresso in linguaggio docente;
3. assenza dei termini del Product Model;
4. una sola CTA primaria;
5. ritorni secondari chiusi per default;
6. assenza di overflow orizzontale.
