# DOCENTE OS — Settings Context Disclosure Note

Data: 2026-08-22  
Stato: CANONICAL UX REFINEMENT  
Compatibilità: COMPATIBLE con `SETTINGS_EXPERIENCE_CONTRACT.md`

## Decisione

Le Impostazioni devono conservare il contesto completo senza mostrarlo tutto contemporaneamente.

Principio:

> **Contesto completo, esposizione minima.**

La superficie primaria di ogni area mostra soltanto:

- titolo;
- domanda/orientamento breve;
- stato;
- campi e azioni necessari.

Le informazioni `Serve a / Usato in / Non modifica` restano obbligatorie come contenuto di prodotto, ma vengono esposte tramite **progressive disclosure** con controllo `Come viene usata`, chiuso per impostazione predefinita.

## Regole

1. Le spiegazioni contestuali non devono occupare più spazio dei campi che aiutano a comprendere.
2. Il dettaglio espandibile deve essere disponibile con tastiera e tecnologie assistive.
3. Gli avvisi che prevengono un errore operativo concreto restano vicino all'azione interessata.
4. Non duplicare lo stesso concetto in header, callout, pannello contestuale e footer.
5. Su mobile il contesto esteso è sempre chiuso di default.
6. Lo stato dell'area resta sempre visibile.
7. Il riepilogo iniziale resta sintetico e orientato al prossimo passo.

## Applicazione alla Cattedra

Visibile per default:

- `Cattedra`;
- `In quali classi insegni cosa e per quante ore?`;
- stato;
- campi classe/disciplina, monte ore e nota;
- microcopy operativo: `Non crea lezioni nell'Orario.`

Disponibile su richiesta in `Come viene usata`:

- Serve a collegare classi, discipline e monte ore settimanale;
- Usato in Orario e controlli della capacità settimanale;
- Non modifica Piano annuale, Attività o Calendario.

## Relazione con il Language & Collaboration System

La qualità comunicativa non coincide con la quantità di testo. DOCENTE OS deve essere chiaro soprattutto attraverso:

- gerarchia;
- terminologia coerente;
- feedback vicino all'azione;
- progressive disclosure;
- spiegazioni approfondite soltanto quando richieste.
