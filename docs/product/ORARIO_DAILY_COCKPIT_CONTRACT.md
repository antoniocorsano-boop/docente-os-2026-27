# DOCENTE OS — Orario Daily Cockpit Contract v1

Status: CANONICAL
Scope: UX e confini applicativi della vista `/orario`

## 1. Ruolo dell'Orario

L'Orario è il cruscotto temporale quotidiano del docente, ma il suo dominio resta la **struttura settimanale ricorrente**.

Domanda primaria: **quando insegno normalmente durante la settimana?**

L'Orario non è:

- il Calendario;
- il Planner/Oggi;
- il Piano annuale;
- il luogo canonico di configurazione della Cattedra.

## 2. Autonomia dal Calendario

L'Orario deve funzionare completamente senza Calendario.

Il focus “Oggi nella settimana tipo” usa soltanto:

- giorno della settimana locale del browser;
- versione dell'Orario;
- slot ricorrenti.

Non crea date persistenti, eventi o eccezioni.

Un futuro livello di Temporal Projection potrà leggere Orario e Calendario come input indipendenti. Nessuno dei due domini controlla o riscrive l'altro.

## 3. Cattedra

La Cattedra è configurata in **Impostazioni → Cattedra**.

Orario:

- legge `teaching_assignments`;
- mostra stato e copertura del monte ore;
- usa le associazioni per creare slot `LESSON`;
- non duplica form di creazione/conferma della Cattedra.

Regola UX: **Cattedra si configura; Orario la distribuisce.**

## 4. Gerarchia del cruscotto

Ordine canonico della vista:

1. **Riepilogo operativo** — cattedra confermata, monte ore, ore in griglia, copertura;
2. **Settimana tipo** — griglia principale;
3. **Oggi nella settimana tipo** — focus automatico sul giorno corrente, interno alla griglia;
4. **Copertura della Cattedra** — sola lettura, con eventuali minuti mancanti/eccessivi;
5. **Versione dell'Orario** — gestione secondaria e progressivamente esposta.

La griglia deve restare l'oggetto visivamente dominante.

## 5. Interazione

- cella vuota → aggiunge un impegno ricorrente;
- cella occupata → modifica/rimuove quello slot;
- Settimana/Giorno resta disponibile;
- mobile → preferenza iniziale Giorno;
- desktop → preferenza iniziale Settimana;
- nessuna scrittura implicita;
- nessuna AI con capacità di scrittura in questa slice.

## 6. Stati umani

Per la Cattedra usare:

- **Confermata**;
- **Da confermare**.

Per la copertura usare:

- **Allineata**;
- **Mancano X**;
- **Eccesso X**.

Evitare nella superficie primaria termini tecnici come `PROVISIONAL`, `CONFIRMED`, `DRAFT`, salvo dettagli tecnici.

## 7. Non regressione

Questo contratto non modifica:

- schema Supabase;
- RLS;
- invarianti degli slot;
- controllo overlap;
- versione DRAFT corrente;
- separazione Orario/Calendario;
- Piano annuale B01–B33.

Ogni evoluzione del cruscotto deve preservare questi confini.
