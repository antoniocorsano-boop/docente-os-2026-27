# X1 — Component Foundation

Data: 2026-08-22  
Stato: APPROVED_FOR_IMPLEMENTATION  
Dipende da: ADR-001, ADR-002, Product Experience Masterplan, Design System V2

## 1. Obiettivo

Introdurre la fondazione tecnica per una UI professionale senza riscrivere le superfici esistenti e senza modificare dominio, database, RLS o dati.

## 2. Dipendenze runtime previste

Baseline preferita:

- `tailwindcss`
- integrazione PostCSS richiesta dalla versione Tailwind adottata
- `class-variance-authority`
- `clsx`
- `tailwind-merge`
- `lucide-react`
- primitive Radix necessarie esclusivamente ai componenti effettivamente introdotti
- `cmdk` se necessario per Command palette nella slice X2

Regola: non installare un catalogo intero di dipendenze se non usato.

## 3. Componenti X1

Creare sotto `product/src/components/ui/`:

- `button`
- `badge`
- `card`
- `alert`
- `separator`
- `skeleton`
- `tooltip`
- `dialog`
- `sheet`
- `dropdown-menu`

`command` può essere preparato in X1 oppure entrare in X2 se richiede dipendenze non ancora necessarie.

## 4. Utility

Creare utility canonica:

`product/src/lib/utils.ts`

con `cn()` basato su `clsx` + `tailwind-merge`.

## 5. Token

Integrare token semantici del Design System V2 in `globals.css`/Tailwind layer mantenendo compatibilità con le classi CSS correnti.

Non eliminare i CSS legacy in X1.

## 6. Superficie pilota

**Conoscenza dettaglio** è la superficie pilota preferita perché contiene:

- title/header;
- status;
- metadata;
- azioni;
- card;
- dettagli tecnici;
- pannello “Ti aiuto da qui”.

Migrare soltanto elementi a basso rischio:

- badge stato;
- pulsanti principali/secondari;
- card metadati;
- disclosure/pannelli ove utile.

Non cambiare query, server actions o modello dati.

## 7. Compatibilità CSS

Durante X1 è consentito:

```text
legacy CSS + new component classes
```

È vietato:

- rinominare massivamente classi esistenti;
- cambiare il layout di tutte le pagine;
- rimuovere CSS non dimostrato inutilizzato;
- introdurre una seconda theme system indipendente.

## 8. Test

Minimo:

- test `cn()` se contiene comportamento proprio;
- test dei mapping prodotto già esistenti devono restare verdi;
- componenti puramente shadcn non richiedono test duplicativi se non modificati sostanzialmente;
- build server/client deve restare verde.

## 9. Gate

```bash
npm install
npm test
npm run typecheck
npm run lint
npm run build
```

Poi:

- deploy preview Netlify READY;
- login ancora funzionante;
- pagina Conoscenza renderizza dati reali;
- nessuna migrazione DB;
- nessun seed;
- nessuna dipendenza AI richiesta.

## 10. Definition of done

X1 è chiusa quando:

1. Tailwind funziona insieme al CSS esistente;
2. i componenti base sono disponibili nel repository;
3. almeno una superficie reale usa componenti canonici;
4. Design System V2 è traducibile in token runtime;
5. CI e deploy sono verdi;
6. X2 può introdurre shell/command palette senza rifare la fondazione.
