# DOCENTE OS — Human Task DIRECT PACK Compiler

Stato: PROPOSED / COMPILER V3  
Data: 2026-08-23

## Scopo

Estendere la compilazione Human Task oltre la classe prima senza assumere che tutte le UDA abbiano la stessa grammatica documentale.

Il caso `DIRECT` è il raccordo più forte tra Piano e PACK: un blocco canonico corrisponde a una sola lezione operativa esplicitamente documentata dal PACK.

## Regola di discovery

La frontiera non viene scelta a mano.

Il sistema:

1. legge la copertura reale del runtime per Prima, Seconda e Terza;
2. considera completo un grado soltanto quando tutti i suoi blocchi canonici sono realmente risolti dal runtime;
3. seleziona il primo grado incompleto nell’ordine curricolare;
4. individua il primo segmento non coperto usando il Piano canonico;
5. applica i classificatori di raccordo alle fonti correnti.

Una modifica futura del meccanismo di storage delle proiezioni non deve cambiare questa frontiera: la copertura è definita dal resolver runtime, non dal registro che la contiene.

## Contratto DIRECT

`DIRECT` è proponibile soltanto quando tutte le condizioni seguenti sono vere:

- l’intera tranche appartiene a un solo segmento, una sola UDA e un solo PACK principale;
- il PACK espone esattamente tante sezioni `LEZIONE n` quanti sono i blocchi della tranche;
- le lezioni sono numerate in sequenza e vengono associate ai blocchi esclusivamente nell’ordine documentato;
- ogni lezione dichiara esplicitamente una durata uguale alla durata del blocco canonico;
- ogni lezione contiene `Attività`, `Prodotto` ed `Evidenza` non vuoti;
- le identità e le generazioni delle fonti restano congelate nella review;
- nessuna informazione mancante viene sintetizzata dall’automazione.

Se una sola condizione manca, `DIRECT` non è disponibile.

## UDA non temporizzata

Una UDA può essere semanticamente valida senza possedere una articolazione estraibile in `Fase 1`, `Fase 2` o ore numerate.

Nel solo caso DIRECT completamente provato, l’assenza di fasi UDA temporizzate non è un motivo sufficiente per scartare il raccordo, perché:

- il Piano mantiene l’autorità sulla collocazione e sulla durata del segmento;
- il PACK documenta la singola lezione con durata, attività, prodotto ed evidenza;
- la UDA resta la fonte semantica, formativa e valutativa del percorso;
- la proiezione non viene comunque promossa senza revisione umana e gate cognitivo.

Questa eccezione non può coprire sorgenti mancanti, codici errati, PACK non estraibili, generazioni ambigue o altri errori bloccanti.

## Durata nelle intestazioni

I PACK possono dichiarare la durata nella forma:

`LEZIONE 1 — Titolo — 2 ore`

Il compiler v3 riconosce questa forma come durata esplicita. Non usa il numero della lezione, la posizione nel documento o la durata media del segmento per dedurre il tempo.

## Adempimento cognitivo

La classificazione DIRECT produce soltanto una proposta `READY_FOR_HUMAN_REVIEW`.

Prima della promozione devono restare soddisfatti i contratti già canonici:

- provenienza e source drift fail-closed;
- revisione di miglioramento continuo;
- approvazione professionale umana;
- Stakeholder Cognitive Fulfillment per docente, alunno/gruppo, coordinamento/revisione, governance e automazione.

## Primo test di portafoglio

Le fonti correnti della classe seconda espongono un caso candidato:

- `CAN-PLAN-2` — segmento iniziale UDA 2-01, 8 ore;
- `CAN-UDA-2-01` — agricoltura, suolo e produzioni sostenibili;
- `CAN-PACK-2A` — quattro lezioni operative da 2 ore.

Il test non prescrive `B01–B04`: deve essere la discovery multi-grado a individuare autonomamente il grado e il segmento successivi.
