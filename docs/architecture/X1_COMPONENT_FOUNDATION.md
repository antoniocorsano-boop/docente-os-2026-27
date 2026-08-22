# X1 — Component Foundation

Data: 2026-08-22  
Stato: COMPLETE  
Merge runtime: `aeb66cd8d1752de1ee4f8de33103c0617db330e6`  
Dipende da: ADR-001, ADR-002, Product Experience Masterplan, Design System V2

## 1. Obiettivo

Introdurre la fondazione tecnica per una UI professionale senza riscrivere le superfici esistenti e senza modificare dominio, database, RLS o dati.

## 2. Implementazione effettiva

Introdotti nel runtime:

- Tailwind CSS v4 via `@tailwindcss/postcss`;
- Tailwind caricato in un layer dedicato **senza preflight**, così il CSS DOCENTE OS corrente resta autorevole durante la migrazione;
- token semantici mappati sui CSS custom properties esistenti;
- `class-variance-authority`;
- `clsx`;
- `tailwind-merge`;
- configurazione `components.json` per il flusso shadcn;
- utility canonica `cn()` in `src/lib/utils.ts`.

## 3. Primitive canoniche disponibili

Sotto `product/src/components/ui/`:

- `button`
- `badge`
- `card`
- `alert`
- `separator`
- `skeleton`

Decisione compatibile con il piano: Tooltip, Dialog, Sheet, Dropdown e Command **non sono stati installati anticipatamente** perché X1 vieta dipendenze inutilizzate. Entrano in X2 insieme ai primi casi d'uso reali.

## 4. Strategia CSS

La convivenza è intenzionale:

```text
Tailwind theme/utilities layer
+ CSS legacy DOCENTE OS non layered
```

Il CSS esistente continua quindi ad avere precedenza dove una superficie non è ancora migrata. Questo evita una regressione globale da reset/preflight e rende possibile una sostituzione per strati.

## 5. Superficie pilota

La specifica iniziale indicava Conoscenza come superficie preferita. In implementazione è stato scelto **Login** come pilot a rischio inferiore perché:

- è una superficie reale e critica;
- è indipendente dal modello didattico e dai dati KB;
- consente di verificare componenti, token, responsive e server actions senza toccare query o dati;
- un eventuale difetto visuale resta isolato dal lavoro docente già operativo.

Il Login ora usa Card, Alert, Button e Separator canonici e mantiene invariato il flusso Auth.

Conoscenza viene migrata in X2 insieme alla shell, quando Dialog/Sheet/Tooltip/Command saranno disponibili.

## 6. Gate eseguiti

Product CI #200:

- `npm install` — PASS
- `npm test` — PASS
- `npm run typecheck` — PASS
- `npm run lint` — PASS
- `npm run build` — PASS

Netlify:

- deploy preview `develop` — READY
- commit pubblicato: `aeb66cd8d1752de1ee4f8de33103c0617db330e6`
- Next.js server handler — presente

## 7. Invarianti preservate

- nessuna migrazione DB;
- nessun seed;
- nessuna modifica RLS;
- nessuna modifica dati;
- nessuna dipendenza AI;
- nessuna riscrittura delle superfici esistenti;
- Auth server-side invariata.

## 8. Definition of done

X1 è `COMPLETE` perché:

1. Tailwind funziona insieme al CSS esistente;
2. i componenti base sono versionati nel repository;
3. una superficie reale usa componenti canonici;
4. Design System V2 è tradotto in token runtime iniziali;
5. CI e deploy sono verdi;
6. X2 può introdurre overlay, shell e command palette senza rifare la fondazione.

## 9. Next

**X2 — Professional AppShell**:

- componenti overlay/navigation solo quando usati;
- shell unica e responsive;
- command palette `Ctrl/Cmd + K`;
- progressiva migrazione di Conoscenza e delle viste principali;
- nessuna modifica al dominio.
