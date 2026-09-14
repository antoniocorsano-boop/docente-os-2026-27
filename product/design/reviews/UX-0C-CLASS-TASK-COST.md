# UX-0C — Classe task-first · Task Cost

Parent: #368  
Slice: #376  
Baseline: `develop@333526c02ac3209f743a13db8b0746baa22457f1`

## Obiettivo umano

Quando il docente entra in una Classe deve poter rispondere senza conoscere il modello interno:

1. dove sono;
2. cosa devo fare adesso;
3. cosa succede dopo;
4. dove trovo supporti o dettagli soltanto se mi servono.

North star: `Oggi → Classe → Lezione → Fatto`.

## Prima di UX-0C

UX-0A aveva già garantito una sola CTA primaria derivata dallo stato reale, ma la pagina manteneva ancora più superfici concorrenti attorno a quel focus:

- eventuali receipt prima del focus operativo;
- `Materiale già predisposto` come disclosure separata;
- `Materiali utili adesso` sempre visibile;
- registrazione/decisioni avanzate come ulteriore blocco;
- contesto Classe e dettagli tecnici successivi;
- copy del focus che descriveva lo stato corrente, ma non rendeva sempre esplicito il passo immediatamente successivo.

Il problema residuo non era l'assenza di funzioni, ma il costo di scansione: il docente doveva distinguere ciò che era **task**, ciò che era **feedback** e ciò che era **supporto**.

## Dopo UX-0C

La gerarchia diventa:

`Classe → ADESSO → DOPO → supporti su richiesta`

Il focus operativo è la prima superficie di lavoro dopo l'intestazione. Il resolver di stato resta quello di UX-0A; un presenter separato traduce lo stato in linguaggio docente.

Le receipt restano visibili perché spiegano cosa è cambiato, ma sono poste dopo il focus. I due ingressi materiali confluiscono in una sola disclosure `Supporti per questa lezione`, chiusa per default. Contesto, percorsi alternativi e dettagli tecnici restano secondari.

## Task Cost prima / dopo

| Dimensione | Prima | Dopo UX-0C |
| --- | --- | --- |
| Decisione primaria | una CTA già governata, ma preceduta/affiancata da superfici da interpretare | una CTA nel focus, senza link materiali concorrenti nella superficie primaria |
| Interpretazione prima dell'azione | possibili receipt prima del focus + stato + materiali visibili | intestazione Classe → `ADESSO` → CTA |
| Passo successivo | implicito nel copy e nella destinazione | esplicito come `Dopo …` nel focus |
| Superfici materiali | due: predisposti + materiali utili | una disclosure `Supporti per questa lezione` |
| Concetti interni nel focus | stato del blocco poteva comparire accanto al task | solo linguaggio operativo del docente; riferimenti canonici restano nei dettagli |
| Cambi di superficie per lavorare | invariati: il Lesson Workspace resta la destinazione autorevole | invariati; UX-0C non introduce nuove route |
| Input obbligatori | invariati | invariati |
| Recovery/provenance | invariati | invariati; TeachingSession, Piano e receipt mantengono autorità separata |

## Invarianti preservate

- `TeachingSession` resta l'autorità su ciò che è realmente avvenuto;
- `AnnualPlanBlockProgress` resta una decisione professionale distinta;
- nessun completamento automatico di Piano/UDA;
- il recorder inline resta soltanto fallback quando manca un Lesson Workspace modellato;
- provenance, RLS, AAL2 e human authority non cambiano;
- nessuna capability viene eliminata;
- Materiali/Conoscenza/Progetta non vengono ancora ridisegnati: la loro convergenza appartiene a UX-0E.

## Acceptance automatizzata

La HVA `classroom-cockpit.spec.mjs` verifica su desktop e mobile:

- presenza della grammatica `ADESSO`/`Dopo`;
- una sola CTA primaria;
- assenza di azioni secondarie nel contenitore della CTA;
- disclosure `Supporti per questa lezione` chiusa per default;
- materiale predisposto ancora raggiungibile;
- continuità del cockpit di lezione e assenza di overflow orizzontale.

## Decisione

UX-0C è una riduzione del costo cognitivo, non una riduzione del Product Model. La superficie Classe espone il task umano; dominio e capability restano ricchi ma subordinati al momento in cui servono.
