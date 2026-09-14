# UX-0E — Contextual capabilities / Task Cost

**Issue:** #381  
**Baseline:** `develop@df2720103849043e9a888184b7357e1f55715e2d`  
**Slice:** UX-0E  
**Stato:** IMPLEMENTED — CERTIFICATION PENDING

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

## Dopo — UX-0E implementato

Percorso:

`Classe/Lezione → trova ciò che serve → usa la risorsa → torna al compito`

Costo risultante:

- 3 percorsi primari: `Oggi`, `Classi`, `Orario`;
- `Conoscenza` e `Progetta` restano raggiungibili da `Altro` e dalla ricerca globale, ma non competono con il task corrente;
- dalla Classe, Conoscenza viene aperta con URL task-aware esplicito e sanitizzato;
- `mode`, `returnTo`, `section` e `block` sopravvivono alla lista, ai form di ricerca/filtri e all’apertura della risorsa;
- il dettaglio della risorsa mantiene il ritorno diretto alla Classe o alla preparazione;
- nessuno stato client nascosto è necessario per ricostruire il contesto;
- la shell spiega coerentemente che materiali e progettazione si aprono dal compito quando servono.

## Evidenza automatizzata

- test unitari sul builder della lista task-aware e sulla sanitizzazione di `returnTo`;
- test della navigazione canonica: tre task primari e Conoscenza secondaria;
- IA desktop/mobile aggiornata;
- journey HVA dedicato `Classe → Conoscenza contestuale → risorsa → Classe`, con fixture temporanea governata e cleanup in `finally`.

## Invarianti non modificate

- nessun cambiamento a `KnowledgeAsset`, UDA, Piano annuale o TeachingSession;
- nessun cambiamento a persistenza, provenance, RLS o AAL2;
- nessuna auto-mutazione del Piano;
- nessun nuovo stato di sessione client per conservare il contesto;
- `sanitizeInternalReturnTo` continua a impedire ritorni esterni;
- nessuna capability rimossa: cambia soltanto il punto in cui viene richiamata.

## Classificazione design

**COMPATIBLE** — semplificazione della gerarchia e continuità del compito senza rimozione di capability, modifica dei contratti dominio o introduzione di un nuovo interaction model.

## Gate di chiusura

Prima del merge finale di UX-0E:

- Product CI;
- Design Policy Gate;
- Human Interaction Model;
- WCAG 2.2 AA;
- HVA desktop/mobile;
- P6;
- K1/P7 e ogni altro gate applicabile sullo stesso exact head;
- certificazione Beta sul merge commit prima della chiusura di #381.
