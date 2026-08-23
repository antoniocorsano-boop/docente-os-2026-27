# Copertura canonica UDA — Tecnologia 2026/2027

## Stato consolidato

La progettazione annuale è articolata in tre programmazioni canoniche e 25 UDA:

| Classe | Programmazione | UDA | Monte ore |
|---|---|---:|---:|
| Prima | `CAN-PRG-1` | `CAN-UDA-1-00/07` | 66 |
| Seconda | `CAN-PRG-2` | `CAN-UDA-2-01/08` | 66 |
| Terza | `CAN-PRG-3` | `CAN-UDA-3-01/09` | 66 |

Il monte ore è una previsione annuale. Le ore effettive, i recuperi e le rimodulazioni sono registrati durante l’attuazione e non sovrascrivono la previsione.

## Classe seconda

| Codice | Titolo | Periodo | Ore |
|---|---|---|---:|
| `CAN-UDA-2-01` | Agricoltura, suolo e produzioni sostenibili | settembre/ottobre | 8 |
| `CAN-UDA-2-02` | Alimenti, trasformazione e conservazione | ottobre/novembre | 8 |
| `CAN-UDA-2-03` | Territorio, città e pianificazione | novembre/dicembre | 8 |
| `CAN-UDA-2-04` | Edificio, strutture e materiali da costruzione | gennaio/febbraio | 10 |
| `CAN-UDA-2-05` | Abitazione, impianti, sicurezza ed efficienza | febbraio/marzo | 8 |
| `CAN-UDA-2-06` | Rilievo, scale e proiezioni ortogonali | novembre/aprile, trasversale | 14 |
| `CAN-UDA-2-07` | Progettare uno spazio o un semplice oggetto | aprile/maggio | 6 |
| `CAN-UDA-2-08` | Dati, rappresentazione digitale e modellazione introduttiva | maggio/giugno | 4 |

## Classe terza

| Codice | Titolo | Periodo | Ore |
|---|---|---|---:|
| `CAN-UDA-3-01` | Energia: forme, trasformazioni e fabbisogni | settembre/ottobre | 8 |
| `CAN-UDA-3-02` | Fonti rinnovabili e non rinnovabili | ottobre/novembre | 8 |
| `CAN-UDA-3-03` | Produzione, distribuzione e uso dell’energia elettrica | novembre/dicembre | 8 |
| `CAN-UDA-3-04` | Elettricità, circuiti e sicurezza | gennaio/febbraio | 8 |
| `CAN-UDA-3-05` | Macchine, meccanismi e sistemi tecnologici | febbraio/marzo | 8 |
| `CAN-UDA-3-06` | Assonometria, sezioni e rappresentazione tridimensionale | novembre/aprile, trasversale | 12 |
| `CAN-UDA-3-07` | Informatica, algoritmi, reti e automazione | marzo/aprile | 6 |
| `CAN-UDA-3-08` | Tecnologia, sostenibilità e scelte responsabili | aprile/maggio | 4 |
| `CAN-UDA-3-09` | Progetto conclusivo e orientamento | maggio/giugno | 4 |

## Invarianti applicative

- Ogni UDA mantiene l’identità del documento Drive tramite `source_locator` univoco nel workspace.
- Identificativo, revisione e collegamento all’originale sono conservati in `source_metadata`.
- Ogni UDA ha una generazione corrente riuscita prima di comparire in Progetta e nella ricerca.
- Il collegamento alla programmazione è registrato in `knowledge_links` con relazione `BELONGS_TO_PROGRAMMING`.
- Il nucleo canonico è comune; gli adattamenti per sezione sono derivati successivi e non modificano l’originale.
- Attività trasversali e Open Day non generano doppio conteggio delle ore.
- Ogni documento richiede validazione umana prima dell’adattamento operativo alle classi reali.

## Gate dati verificato

- 3 programmazioni annuali indicizzate;
- 25 UDA indicizzate;
- 25 collegamenti UDA → programmazione;
- 0 UDA senza generazione corrente;
- 0 duplicazioni della medesima fonte Drive nel workspace.
