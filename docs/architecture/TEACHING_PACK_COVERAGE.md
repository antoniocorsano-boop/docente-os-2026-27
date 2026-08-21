# Copertura dei materiali operativi — Tecnologia 2026/2027

## Stato consolidato

La KB contiene 12 pacchetti operativi canonici già presenti in Drive: quattro per ciascuna classe. Ogni pacchetto conserva l'identità della fonte originale e viene collegato alle UDA che supporta tramite `SUPPORTS_UDA`.

| Classe | Pacchetti | UDA coperte | UDA ancora scoperte |
|---|---:|---|---|
| Prima | 4 | `00`, `01`, `02`, `03`, `05`, `07` | `04`, `06` |
| Seconda | 4 | `01`, `02`, `03`, `06` | `04`, `05`, `07`, `08` |
| Terza | 4 | `01`, `02`, `03`, `06` | `04`, `05`, `07`, `08`, `09` |

## Registro dei pacchetti

| Codice | Classe | UDA supportate |
|---|---|---|
| `CAN-PACK-1A` | Prima | `CAN-UDA-1-00`, `CAN-UDA-1-01` |
| `CAN-PACK-1B` | Prima | `CAN-UDA-1-02`, `CAN-UDA-1-03` |
| `CAN-PACK-1C` | Prima | `CAN-UDA-1-05` |
| `CAN-PACK-1D` | Prima | `CAN-UDA-1-07` |
| `CAN-PACK-2A` | Seconda | `CAN-UDA-2-01` |
| `CAN-PACK-2B` | Seconda | `CAN-UDA-2-02` |
| `CAN-PACK-2C` | Seconda | `CAN-UDA-2-03` |
| `CAN-PACK-2D` | Seconda | `CAN-UDA-2-06` |
| `CAN-PACK-3A` | Terza | `CAN-UDA-3-01` |
| `CAN-PACK-3B` | Terza | `CAN-UDA-3-02` |
| `CAN-PACK-3C` | Terza | `CAN-UDA-3-03` |
| `CAN-PACK-3D` | Terza | `CAN-UDA-3-06` |

## Regole applicative

- Un pacchetto può supportare più UDA senza duplicare il documento o il monte ore.
- I pacchetti Open Day sono risorse operative trasversali e non costituiscono UDA autonome.
- La presenza di un collegamento indica pertinenza didattica, non copertura completa di tutte le attività previste dall'UDA.
- Nuovi pacchetti vengono creati solo per una scopertura verificata e restano distinti dalla programmazione e dalle UDA canoniche.
- Ogni acquisizione deve concludersi con una generazione corrente riuscita; in caso di errore resta valida la generazione precedente.

## Gate dati verificato

- 12 pacchetti operativi indicizzati;
- 14 collegamenti pacchetto → UDA;
- 40 fonti Drive distinte complessive;
- 0 asset senza generazione corrente;
- 0 puntatori correnti invalidi.
