# DPG-2 — Registro dei residui intenzionali

Data di classificazione: 12 settembre 2026.

Questo registro documenta i valori ancora rilevati dal Design Policy Gate dopo la convergenza DPG-2. **Non è un'allowlist**: i valori continuano a essere contati dal ratchet globale e non autorizzano nuove occorrenze. La baseline può soltanto diminuire.

## Baseline di chiusura

- raw colors: **27**
- local tokens: **13**
- legacy brand references: **0**
- decorative effects: **0**
- raw radii: **1**
- raw shadows: **5**

## Classificazione

| Superficie / file | Residuo | Quantità | Motivazione |
| --- | --- | ---: | --- |
| `progetta/documenti/[documentId]/export/uda-export.css` | colori raw | 17 | Artefatto A4 professionale con palette deterministica di anteprima/stampa, separata dal tema runtime. Il contratto di export resta invariato. |
| `progetta/documenti/[documentId]/export/uda-export.css` | raggio raw | 1 | Parte del contratto visivo storico dell'artefatto di export; non è riutilizzato come componente runtime generale. |
| `progetta/documenti/[documentId]/export/uda-export.css` | ombre raw | 3 | Ombra dell'anteprima cartacea e reset espliciti `none` per mobile/stampa. |
| `tailwind.css` | colore raw | 1 | Foreground fisso del bridge Tailwind già esistente. Non definisce la grammatica Docente OS; il bridge traduce utility verso i token canonici. |
| `tailwind.css` | token locali rilevati | 13 | Alias `@theme` di compatibilità, tutti confinati nel bridge Tailwind e collegati ai token canonici Docente OS. Non sono token visuali di superficie. |
| `knowledge/LocalSinglePagePdfPrivacyWorkbench.tsx` | colori raw | 4 | Inchiostri di bitmap: fondo bianco del canvas e nero di oscuramento. Entrano nel derivato locale, non nello stile dell'interfaccia. |
| `knowledge/LocalDocxSemanticMediaPrivacyWorkbench.tsx` | colori raw | 3 | Inchiostri deterministici del PNG semantico prodotto localmente: fondo, testo e didascalia media. |
| `knowledge/LocalImagePrivacyWorkbench.tsx` | colori raw | 2 | Fondo bianco del canvas e nero di redazione del derivato locale. |
| `assistant.css` | ombra raw | 1 | Anello di focus del composer (`var(--focus-ring)`), feedback di accessibilità e non decorazione. |
| `orario/timetable.css` | ombra raw | 1 | Reset `box-shadow:none!important` esclusivamente nel foglio di stampa. |

## Regola di governo

Un nuovo valore raw non può essere giustificato richiamando questo registro. Ogni incremento continua a fallire DPG-2. Se uno dei residui sopra viene eliminato o tokenizzato senza perdita funzionale, la baseline deve essere abbassata nello stesso cambiamento.

Le superfici applicative ordinarie — Home, Classi, Orario, Progetta, Conoscenza, Diario, Calendario, Feedback, libri/risorse, Planner, lezione, registrazione e impostazioni — non hanno eccezioni visuali autorizzate fuori dai token/componenti canonici.
