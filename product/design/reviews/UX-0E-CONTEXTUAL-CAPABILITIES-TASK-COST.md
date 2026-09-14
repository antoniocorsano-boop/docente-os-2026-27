# UX-0E — Contextual capabilities / Task Cost

**Issue:** #381  
**Baseline:** `develop@df2720103849043e9a888184b7357e1f55715e2d`  
**Slice:** UX-0E  
**Stato:** IMPLEMENTATION IN PROGRESS

## Intento umano

Il docente non deve scegliere una superficie tecnica prima di poter preparare o condurre una lezione. Materiali, Conoscenza e Progetta devono comparire come capacità del compito corrente.

## Prima

Percorso tipico:

`Classe → Supporti → Materiali/Conoscenza → archivio → risorsa → ricostruisci mentalmente la classe`

Costo osservabile:

- 4 voci primarie di lavoro più `Altro`;
- `Materiali` presentato come destinazione autonoma;
- scelta anticipata fra Classe, Progetta e Conoscenza;
- possibile perdita di `returnTo`, sezione e blocco entrando nella lista Conoscenza;
- cambio di superficie percepito come cambio di compito.

## Dopo — target UX-0E

Percorso:

`Classe/Lezione → prepara o trova ciò che serve → usa → torna al compito`

Target di costo:

- 3 percorsi primari: `Oggi`, `Classi`, `Orario`;
- `Conoscenza` disponibile in `Altro` e nella ricerca globale, ma non concorrente con il task corrente;
- URL task-aware esplicito e sanitizzato per lista e dettaglio Conoscenza;
- sezione, blocco e percorso di ritorno conservati senza stato nascosto;
- Progetta richiamato dalla fase didattica pertinente.

## Primo incremento

Questo commit stabilisce due invarianti:

1. la shell non considera più `knowledge` una destinazione primaria di lavoro;
2. esiste un builder canonico per aprire anche la **lista** Conoscenza con `mode`, `returnTo`, `section`, `block` e filtri pertinenti.

La continuità completa nella UI `/knowledge` viene implementata nel commit successivo dello stesso slice e #381 resta aperta fino alla certificazione runtime.

## Invarianti non modificate

- nessun cambiamento a `KnowledgeAsset`, UDA, Piano annuale o TeachingSession;
- nessun cambiamento a persistenza, provenance, RLS o AAL2;
- nessuna auto-mutazione del Piano;
- nessun nuovo stato di sessione client per conservare il contesto;
- `sanitizeInternalReturnTo` continua a impedire ritorni esterni.

## Gate

Prima del merge finale di UX-0E:

- Product CI;
- Design Policy Gate;
- Human Interaction Model;
- WCAG 2.2 AA;
- HVA desktop/mobile;
- P6;
- ogni gate applicabile sullo stesso exact head;
- certificazione Beta sul merge commit prima della chiusura di #381.
