# X2 — Professional AppShell

Data: 2026-08-22  
Stato: IMPLEMENTATION_IN_PROGRESS  
Dipende da: X0, X1, ADR-002, Design System V2, Language & Collaboration System

## 1. Obiettivo

Rendere DOCENTE OS un ambiente unico e coerente, eliminando la duplicazione della shell tra le pagine e introducendo una navigazione professionale desktop/mobile con command palette.

## 2. Principi

- una sola shell condivisa per le superfici autenticate;
- il contesto workspace/anno resta visibile ma non dominante;
- navigazione sempre comprensibile e raggiungibile;
- tastiera come acceleratore, mai come unico percorso;
- mobile con navigazione esplicita e target >= 44 px;
- nessun cambiamento a dominio, database, RLS o dati;
- nessun collegamento AI in X2.

## 3. Componenti canonici

- `AppShell`
- `PrimaryNavigation`
- `MobileNavigation`
- `CommandPalette`
- `ShellCommandTrigger`

La configurazione delle destinazioni deve esistere in un unico registro.

## 4. Destinazioni

- Home
- Oggi
- Progetta
- Conoscenza
- Classi
- Orario
- Piano annuale
- Impostazioni

## 5. Command palette

Apertura:

- `Ctrl+K` / `Cmd+K`;
- pulsante visibile nella shell;
- comando visibile su mobile.

X2 supporta navigazione e scoperta delle funzioni. Ricerca su dati dinamici, azioni AI e scritture entrano in slice successive.

## 6. Rollout

1. creare shell condivisa;
2. migrare `Conoscenza` lista e dettaglio;
3. validare desktop/tablet/mobile;
4. migrare progressivamente le altre superfici in slice successive senza big-bang.

## 7. Gate

- `npm install` PASS;
- `npm test` PASS;
- `npm run typecheck` PASS;
- `npm run lint` PASS;
- `npm run build` PASS;
- Netlify preview READY;
- Conoscenza renderizza dati reali;
- keyboard command palette funzionante;
- navigazione mobile esplicita;
- nessuna modifica DB/RLS/dati;
- nessuna regressione Auth.

## 8. Definition of done

X2 è chiusa quando la shell condivisa è attiva almeno su Conoscenza, il registro di navigazione è unico, command palette e navigazione mobile sono usabili e tutti i gate risultano verdi.
