# DOCENTE OS — UDA 1-01 Human Task Source Alignment

Status: IMPLEMENTATION EVIDENCE / MUST INFORM CONTENT PROJECTION
Date: 2026-08-22

## Scopo

Questa nota documenta come il motore Human Task Content tratta **Tecnologia, bisogni, risorse e sistemi** senza forzare una corrispondenza inesistente tra Piano annuale, UDA e CAN-PACK.

Fonti verificate:

- CAN-PLAN-1 — Piano annuale operativo Tecnologia, classe prima;
- CAN-UDA-1-01 — Tecnologia, bisogni, risorse e sistemi;
- CAN-PACK-1A — Pacchetto operativo di avvio classe prima UDA 0 + UDA 1.

## 1. Disallineamento reale delle fonti

Il Piano annuale assegna quattro blocchi da 2 ore:

- B03 — Dai bisogni alle soluzioni;
- B04 — Risorse e vincoli;
- B05 — Pensare per sistemi;
- B06 — Compito significativo e verifica.

L’UDA descrive invece otto ore interne con una granularità più fine:

1. Dai bisogni alle soluzioni;
2. Risorse e vincoli;
3. Tecnica, tecnologia, bene e servizio;
4. Leggere un sistema tecnologico;
5. Dal processo al diagramma;
6. Risorse, ambiente e sostenibilità;
7. Compito applicativo;
8. Restituzione, verifica e autovalutazione.

Il CAN-PACK, a sua volta:

- concentra bisogni, prodotti/servizi e risorse in una sola **Scheda docente 3** da 2 ore;
- contiene una **Scheda docente 4 — Pensare per sistemi** da 2 ore;
- descrive un compito significativo autonomo e una rubrica;
- non contiene i quesiti specifici della verifica individuale citata dall’UDA.

Quindi non esiste una relazione 1:1 perfetta tra i tre documenti.

## 2. Regola adottata

Il motore distingue due livelli di allineamento:

### DIRECT

Una guida operativa della fonte coincide sostanzialmente con il blocco del Piano annuale.

Esempio: B05 / Pensare per sistemi.

### COMPOSED

La vista operativa deve raccordare più sezioni delle fonti perché nessun singolo frammento coincide con il blocco del Piano annuale.

La composizione è ammessa solo se:

1. il blocco del Piano annuale resta l’autorità sulla collocazione;
2. UDA e CAN-PACK sostengono semanticamente le attività mostrate;
3. nessun tempo viene attribuito se non documentato;
4. nessun materiale, quesito, criterio o prodotto viene inventato;
5. la proiezione conserva una `sourceAlignment.note` che spiega il raccordo;
6. il supporto contestuale può mostrare questa nota, ma il primo livello dell’esperienza resta leggero.

## 3. Decisioni per B03–B06

### B03 — Dai bisogni alle soluzioni

Stato: `COMPOSED`.

La proiezione usa:

- dal Piano: bisogni, prodotti, servizi e sistemi; evidenza classificazione + mappa;
- dall’UDA: conversazione, classificazione bisogni/soluzioni e prima mappa; distinzione prodotto/servizio;
- dal CAN-PACK: esempi, classificazione, collegamenti con frecce e restituzione.

Non assegna tempi alle singole attività.

### B04 — Risorse e vincoli

Stato: `COMPOSED`.

La proiezione usa:

- dal Piano: materia, energia, informazione, lavoro/organizzazione; evidenza Scheda “Dal bisogno alla soluzione”;
- dall’UDA: risorse, disponibilità, limiti e primi effetti;
- dal CAN-PACK: Scheda alunno C con bisogno, soluzione, risorse, processo ed effetti.

Non assegna tempi alle singole attività.

### B05 — Pensare per sistemi

Stato: `DIRECT`.

La Scheda docente 4 del CAN-PACK è coerente con il blocco del Piano e con le ore UDA dedicate a lettura del sistema e diagramma.

La Scheda alunno D viene resa disponibile nel punto di bisogno.

### B06 — Compito significativo e verifica

Stato: `COMPOSED`.

La proiezione combina:

- dal Piano: compito significativo + breve verifica individuale;
- dal CAN-PACK: consegna A4/A3 e rubrica;
- dall’UDA: restituzione, struttura della verifica e autovalutazione.

L’UDA definisce per la verifica: risposte brevi, classificazioni, completamento di uno schema e breve situazione-problema. **Non definisce i quesiti specifici.** DOCENTE OS mostra quindi soltanto la struttura e non genera automaticamente domande fingendo che siano canoniche.

## 4. Conseguenza di prodotto

Il docente non deve vedere il conflitto tra documenti come un problema da risolvere manualmente.

Il sistema deve:

- mostrare una sequenza operativa leggibile;
- conservare la provenienza;
- spiegare l’eventuale composizione solo dietro supporto contestuale;
- evitare false precisioni;
- mantenere sempre accessibili i documenti completi.

Questa regola si applica alle future proiezioni in cui Piano, UDA e pacchetto usano granularità differenti.
