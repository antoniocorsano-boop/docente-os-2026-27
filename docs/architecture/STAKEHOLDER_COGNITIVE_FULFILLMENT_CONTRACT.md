# DOCENTE OS — Stakeholder Cognitive Fulfillment Contract

Stato: CANONICAL CANDIDATE / REQUIRED BY HUMAN APPROVAL  
Data: 2026-08-23

## Scopo

Una proposta didattica o operativa non è matura soltanto perché è tecnicamente valida o approvata formalmente. Deve anche fornire a ogni stakeholder del contesto le informazioni necessarie per comprendere il proprio compito, prendere la decisione di propria competenza e riconoscere ciò che non gli compete.

Il principio è:

> Nessuno stakeholder deve ricostruire da codici, documenti lunghi o inferenze nascoste ciò che il sistema conosce già e che è necessario al suo compito.

Questo contratto estende il Human Task Model senza sostituirlo. Restano vincolanti progressive disclosure, linguaggio umano, provenienza, task continuity e human-in-the-loop.

## Stakeholder di contesto

Gli stakeholder sono definiti per funzione cognitiva, non per organigramma rigido.

### Docente operativo

Include chi prepara, conduce, osserva e registra l'attività.

Deve poter rispondere a:

- Dove sono e quale parte del percorso sto preparando o conducendo?
- Che cosa devo fare adesso e perché?
- Quale evidenza devo osservare o registrare?
- Da quali fonti deriva la proposta?
- Che cosa richiede ancora una decisione umana?

### Alunno / gruppo classe

È lo stakeholder che deve trasformare la consegna in azione e autoregolazione. DOCENTE OS resta un prodotto per il docente, ma il contenuto preparato non è cognitivamente completo se il docente non può renderlo comprensibile all'alunno senza decodificare la struttura interna del sistema.

Deve poter rispondere a:

- Qual è il problema o obiettivo da affrontare?
- Che cosa devo fare concretamente?
- Che cosa devo produrre o rendere osservabile?
- Con quali criteri posso controllare il mio lavoro?
- Come posso verificare, migliorare o autovalutare il risultato?

### Revisore professionale-istituzionale

Include, quando il contesto lo richiede, docente che riesamina, dipartimento, coordinamento, referente, dirigenza o altra figura titolata alla verifica. Non significa che tutti debbano intervenire in ogni ciclo: significa che la proposta deve restare verificabile da chi ne possiede la competenza.

Deve poter rispondere a:

- La proposta rispetta Piano, UDA e fonti canoniche pertinenti?
- Quali elementi sono documentati, proposti o approvati umanamente?
- La provenienza delle evidenze è verificabile?
- La decisione professionale resta attribuita alla persona competente?
- La promozione lascia una traccia auditabile?

### Automazione assistita

Non è autorità professionale. È trattata come attore di contesto perché un'automazione cognitivamente mal definita trasferisce implicitamente decisioni dalla persona al sistema.

Deve conoscere:

- quali dati e capability sono disponibili;
- quali elementi può derivare deterministicamente;
- quali elementi non può inventare o assumere;
- in quale punto deve fermarsi e chiedere una decisione umana;
- quale provenienza deve preservare dopo la promozione.

## Gate

Ogni stakeholder richiesto dal contesto deve avere:

1. stato `SATISFIED`;
2. risposta esplicita a tutte le domande richieste;
3. almeno una evidenza verificabile;
4. una nota auditabile che spieghi perché il requisito è soddisfatto.

`PENDING`, `BLOCKED`, stakeholder mancanti, risposte mancanti o assenza di evidenza bloccano la promozione.

## Relazione con la provenienza dell'evidenza

Il Piano annuale resta autorità su collocazione, sequenza e durata del blocco. Quando il Piano specifica l'evidenza del singolo blocco, tale evidenza resta canonica.

Quando il Piano non specifica l'evidenza a quella granularità, la UDA può sostenere l'evidenza operativa soltanto se:

- la sorgente è esplicita e versionata;
- il legame con fase/sezione UDA è recuperabile;
- la formulazione non introduce un prodotto o un criterio non sostenuto dalla fonte;
- docente e revisore possono distinguere fonte documentata, proposta e approvazione umana;
- il gate cognitivo risulta soddisfatto.

Un PACK può aggiungere risorse o passaggi operativi solo quando esplicitamente pertinenti; non eredita autorità sull'evidenza per il solo fatto di essere associato al blocco.

## Acceptance per B31–B33

La tranche finale della classe prima può essere promossa soltanto se:

- il docente vede il percorso problema → idee → progetto → modello/simulazione → verifica/miglioramento → comunicazione/autovalutazione senza codici tecnici come prerequisito;
- l'alunno può ricevere per ogni blocco obiettivo, azione, prodotto/evidenza e criteri di controllo comprensibili;
- il revisore può risalire a CAN-PLAN-1 e alla generazione corrente di CAN-UDA-1-07 e distinguere ciò che il Piano specifica da ciò che la UDA sostiene;
- l'automazione conserva le fasi 1+2 / 3+4 / 5+6 come derivazione deterministica e non inventa evidenze mancanti;
- ogni evidenza operativa aggiunta dalla UDA resta proposta fino alla conferma umana;
- il miglioramento di processo e il gate cognitivo risultano entrambi chiusi.

## Regola di fallimento

Se uno stakeholder non può rispondere alle proprie domande con le informazioni esposte o tracciate dal sistema, il problema non va compensato con più testo generico. La tranche resta non promuovibile finché il modello, la provenienza o la vista non vengono corretti.
