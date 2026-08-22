# DOCENTE OS — Design System V2 Canonical

Data: 2026-08-22  
Stato: CANONICAL / SUPERSEDES V1 FOR NEW WORK

## 1. Tesi

Il design system V2 traduce la “calma operativa” del V1 in una piattaforma componentizzata e collaborativa. Non cambia la logica di dominio: cambia il modo in cui il docente percepisce, comprende e governa il sistema.

## 2. Principi

1. **Significato prima del dato tecnico**.
2. **Una sola azione primaria per contesto**.
3. **Provenienza sempre recuperabile**.
4. **Progressive disclosure** per complessità e metadati.
5. **AI contestuale, non invasiva**.
6. **Accessibilità by default**.
7. **Responsive behavior progettato, non adattato dopo**.
8. **Stati umani, codici tecnici nei dettagli**.
9. **Feedback immediato per ogni write**.
10. **Nessuna dipendenza dal colore come unico segnale**.

## 3. Component foundation

### Tier A — Primitive

- Button
- Input
- Textarea
- Select / Combobox
- Checkbox / Radio
- Switch
- Label
- Separator
- ScrollArea
- Tooltip

### Tier B — Feedback

- Alert
- Badge
- Toast/Sonner
- Progress
- Skeleton
- EmptyState
- StatusSummary

### Tier C — Overlay

- Dialog
- AlertDialog
- Sheet
- Popover
- DropdownMenu
- ContextMenu

### Tier D — Navigation

- Sidebar
- Breadcrumb
- Tabs
- Command palette
- Pagination quando necessaria

### Tier E — DOCENTE OS composites

- `PageHeader`
- `ProfessionalContextBar`
- `SourceProvenance`
- `HumanStatusBadge`
- `NextBestAction`
- `ContextualHelpPanel`
- `AssistantSurface`
- `ApprovalCard`
- `EvidenceList`
- `ClassContextChip`
- `AcademicYearContext`
- `TechnicalDetailsDisclosure`

I Tier E appartengono al prodotto e non devono essere importati da template esterni.

## 4. Layout canonico

### Desktop

- sidebar stabile 240–272 px;
- contenuto centrale fluido, readable max width definita per superficie;
- inspector/assistant opzionale 320–400 px;
- nessun doppio scroll principale.

### Tablet

- sidebar collapsible;
- inspector in Sheet;
- azioni principali preservate.

### Mobile

- header compatto;
- bottom navigation soltanto per destinazioni ad alta frequenza;
- Sheet full-height per inspector/assistant;
- target interattivi >= 44 px;
- nessun flusso primario dipende da hover.

## 5. Page anatomy

Ogni pagina primaria usa, quando applicabile:

1. `PageHeader`
2. `ProfessionalContextBar`
3. `StatusSummary`
4. `NextBestAction`
5. contenuto principale
6. `ContextualHelpPanel` / `AssistantSurface`
7. `TechnicalDetailsDisclosure`

Non tutti i componenti devono essere sempre visibili; l'anatomia è un contratto di responsabilità.

## 6. Stati umani

Mappa baseline:

| Raw/internal | UI |
|---|---|
| INDEXED | Pronto |
| DRAFT | Bozza |
| VERIFIED | Verificato |
| TO_VERIFY | Da controllare |
| CONFIRMED | Confermato |
| PROVISIONAL | Provvisorio |
| FAILED | Da riprovare |
| PROCESSING | In aggiornamento |
| GENERATED | Creato da DOCENTE OS |

Le specifiche verticali possono estendere la mappa ma non introdurre gergo non necessario.

## 7. Tipografia

Baseline iniziale: system UI stack; eventuale font custom richiede decisione separata.

- Display: clamp responsive, 30–44 px.
- Page title: 28–36 px.
- Section title: 18–24 px.
- Body: 15–17 px.
- Metadata: 12–14 px.
- Label: 12–14 px semibold.

Mai usare uppercase massivo per contenuti semantici lunghi.

## 8. Token semantici

I token devono esprimere ruolo, non colore concreto:

- `--background`
- `--surface`
- `--surface-muted`
- `--foreground`
- `--foreground-muted`
- `--border`
- `--primary`
- `--primary-foreground`
- `--success`
- `--warning`
- `--danger`
- `--info`
- `--focus-ring`

La palette concreta può cambiare senza cambiare il markup di dominio.

## 9. Motion

- transizioni 120–220 ms per feedback locale;
- evitare animazioni decorative continue;
- rispettare `prefers-reduced-motion`;
- skeleton solo quando migliora comprensione del caricamento;
- nessun layout shift evitabile.

## 10. Command palette

La palette è parte del sistema, non un accessorio.

Fase 1:

- navigazione;
- ricerca locale;
- accesso rapido a classi/documenti.

Fase 2:

- comandi read-only;
- creazione attività.

Fase 3:

- “Chiedi a DOCENTE OS”; azioni proposte con conferma.

## 11. Assistant surface

Può comparire come:

- pannello inline “Ti aiuto da qui”;
- inspector laterale desktop;
- Sheet mobile;
- thread espandibile quando serve conversazione.

Non deve occupare automaticamente la maggior parte della pagina.

Ogni assistenza contestuale deve poter essere chiusa e il flusso manuale deve restare completo.

## 12. Error design

Un errore professionale risponde a tre domande:

1. cosa non è riuscito;
2. cosa è rimasto invariato/al sicuro;
3. cosa può fare l'utente adesso.

Esempio corretto:

> Non sono riuscito ad aggiornare l'analisi. Il documento originale non è stato modificato. Puoi riprovare oppure continuare con la versione già disponibile.

## 13. Empty states

Mai: “Nessun dato”.

Sempre:

- cosa manca;
- perché può essere normale;
- azione disponibile.

## 14. Accessibility gate

- WCAG AA target;
- focus visible;
- labels associate;
- heading order;
- tastiera completa per desktop;
- touch targets >= 44 px;
- no color-only meaning;
- zoom 200%;
- reduced motion;
- screen reader names per icon-only control;
- table complesse con alternative/scroll semantics appropriate.

## 15. Migrazione dal V1

V1 resta riferimento storico per intenti e benchmark. V2 governa ogni nuovo lavoro.

Ordine:

1. token e primitive;
2. shell;
3. feedback/overlay;
4. command palette;
5. migrazione Conoscenza;
6. migrazione Oggi;
7. Piano annuale;
8. Orario;
9. Progetta/Classi/Impostazioni.

Non migrare una superficie se non può essere testata in isolamento.

## 16. Definition of done componente

Un componente canonico è done se:

- ha API coerente;
- ha stato hover/focus/disabled/loading dove applicabile;
- è responsive;
- non incorpora logica provider;
- non usa stringhe tecniche raw come default;
- non duplica componenti già presenti;
- passa lint/typecheck/build;
- ha almeno test logico per mapping/comportamenti non banali.
