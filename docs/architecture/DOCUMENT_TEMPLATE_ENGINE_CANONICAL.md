# Document Template Engine — canonical contract

## Purpose

Documentazione usa un unico motore per progettare e governare modelli documentali istituzionali. I file già utilizzati dalla scuola sono sorgenti di riferimento: aiutano a comprendere funzione, prassi e informazioni necessarie, ma non obbligano DOCENTE OS a riprodurne impaginazione, duplicazioni o limiti storici.

## Ownership

`DOC-TPL-01` possiede esclusivamente:

- identità e famiglia del modello;
- versioni canoniche del modello;
- struttura semantica di sezioni e campi;
- regole di resa documentale;
- collegamento alle sorgenti di riferimento;
- controllo di qualità del modello;
- decisione umana di attivazione.

Non possiede dati di classe, Piano annuale, lezioni registrate, evidenze, UDA, fonti didattiche o contenuti professionali di un documento compilato.

## Source and canonical template are different things

La sorgente viene conservata come evidenza storica. Il modello canonico può:

- riordinare sezioni;
- eliminare duplicazioni;
- accorpare informazioni equivalenti;
- sostituire griglie inutili con testo professionale;
- usare tabelle solo quando migliorano confronto o sintesi;
- aggiornare lessico e struttura;
- progettare da zero un documento che non possiede ancora una sorgente.

Una nuova sorgente non modifica retroattivamente un modello attivo o un documento già finalizzato.

## Quality before activation

Una versione può diventare attiva solo dopo:

1. validazione deterministica della struttura;
2. controllo di qualità documentale;
3. esito `PASS` o `PASS_WITH_NOTES` sulla review più recente della versione;
4. conferma umana esplicita.

Il controllo considera almeno funzione, chiarezza semantica, necessità dei dati, privacy, adeguatezza di tabelle/checklist/testo, coerenza con gli altri documenti e purezza dell'output.

## Institutional output is clean

Il documento professionale non espone il funzionamento interno di DOCENTE OS. Non devono comparire codici di dominio o di piano, identificatori tecnici, nomi di tabelle o entità software, stati interni, percorsi di archiviazione, impronte tecniche, provenienza di sistema, nomi di provider o formule che dichiarino una generazione automatica.

La provenienza rimane disponibile alle funzioni interne di controllo e audit, non alla resa professionale.

## Representation rules

- **Dati essenziali** per intestazioni e metadati professionali realmente utili.
- **Tabella** per confronti, corrispondenze e sintesi strutturate.
- **Testo professionale** per giudizi, motivazioni, andamento ed esiti.
- **Selezione guidata** per vere scelte multiple, con integrazione testuale quando serve.
- **Chiusura e firma** per gli elementi formali finali.

La geometria del vecchio file non è un contratto di dominio.

## First certified family

La prima famiglia pilota è **Relazione finale del docente**. La struttura canonica comprende:

1. Intestazione;
2. Profilo e andamento della classe;
3. Percorso didattico effettivamente svolto;
4. Esiti del percorso;
5. Metodologie, strumenti e inclusione;
6. Verifica e valutazione;
7. Educazione civica e raccordi trasversali, quando pertinenti;
8. Considerazioni conclusive;
9. Luogo, data e firma.

Programmazione annuale e Programma svolto restano documenti distinti, con funzioni proprie.

## Runtime boundaries

- Registry e versioni sono workspace-scoped e protetti da RLS.
- Le versioni semantiche e le review restano storiche e immutabili.
- Le scritture avvengono tramite boundary governati, non tramite write dirette del client autenticato.
- Una sola variante canonica per famiglia può essere attiva nello stesso workspace.
- Il motore non dipende da un provider generativo.
- `Documentazione` resta una destinazione secondaria: la bottom navigation mobile non cambia.

## Downstream contract

`DOC-01/X5` userà una versione precisa del template per creare documenti versionati. `DOC-04` fornirà contenuti e giudizi professionali alla Relazione finale, mantenendo separati dati documentati, derivazioni, conferme del docente e provenienza interna.

Dipendenza canonica:

`DOC-TPL-01 → DOC-01/X5 → DOC-04`
