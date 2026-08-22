# X2 — Professional AppShell

Data: 2026-08-22  
Stato: COMPLETE  
Dipende da: X0, X1, ADR-002, Design System V2, Language & Collaboration System

## 1. Obiettivo

Rendere DOCENTE OS un ambiente unico e coerente, eliminando la duplicazione della shell tra le pagine e introducendo una navigazione professionale desktop/mobile con command palette.

## 2. Principi

- una sola shell condivisa per le superfici migrate;
- il contesto workspace/anno resta visibile ma non dominante;
- navigazione sempre comprensibile e raggiungibile;
- tastiera come acceleratore, mai come unico percorso;
- mobile con navigazione esplicita e target >= 44 px;
- nessun cambiamento a dominio, database, RLS o dati;
- nessun collegamento AI in X2.

## 3. Componenti implementati

- `AppShell` condivisa;
- registro canonico `PRIMARY_NAVIGATION`;
- sidebar responsive;
- bottom navigation mobile;
- menu mobile completo;
- command palette;
- trigger `Ctrl+K` / `Cmd+K` e pulsanti visibili.

## 4. Destinazioni canoniche

- Home
- Oggi
- Progetta
- Conoscenza
- Classi
- Orario
- Piano annuale
- Impostazioni

Il registro è testato per unicità di chiavi e rotte.

## 5. Command palette

Supporta navigazione e scoperta delle funzioni. Non modifica dati e non chiama AI.

Apertura:

- `Ctrl+K` / `Cmd+K`;
- pulsante nella sidebar;
- pulsante mobile.

Le write rimangono nelle rispettive superfici applicative.

## 6. Rollout completato

`Conoscenza` è il primo modulo interamente migrato:

- lista contenuti;
- dettaglio documento;
- desktop;
- tablet;
- mobile.

Le altre superfici verranno migrate progressivamente senza big-bang.

## 7. Gate verificati

- `npm install` PASS;
- `npm test` PASS;
- `npm run typecheck` PASS;
- `npm run lint` PASS;
- `npm run build` PASS;
- Product CI #208 PASS;
- Netlify preview READY;
- merge runtime `1813a17ff6414439f8a5195a8de1d48b72925111`;
- nessuna modifica DB/RLS/dati;
- nessuna modifica alle server actions di Conoscenza;
- nessuna dipendenza AI.

## 8. Dipendenze introdotte

- `@radix-ui/react-dialog` per dialoghi accessibili;
- `cmdk` per command palette;
- `lucide-react` per iconografia coerente.

## 9. Definition of done

X2 è chiusa: shell condivisa, registro unico, command palette e navigazione mobile sono operativi su Conoscenza con gate completi verdi e deploy Netlify verificato.

## 10. Next

**X3 — Contextual Assistant, READ_ONLY / PROPOSE only.**

L'assistente deve usare il contesto autentico della superficie, restare opzionale e non eseguire write.
