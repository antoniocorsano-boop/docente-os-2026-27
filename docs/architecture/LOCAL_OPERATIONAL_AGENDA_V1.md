# LOCAL OPERATIONAL AGENDA V1

**Stato:** IMPLEMENTED — first governed vertical slice  
**Ambito:** DOCENTE OS · Calendario → preparazione operativa locale  
**Persistenza:** browser IndexedDB, senza scrittura automatica nei domini canonici

## 1. Scopo

La Local Operational Agenda trasforma un impegno già registrato nel Calendario in uno spazio personale di preparazione. Il docente può:

- ricevere proposte deterministiche su cosa preparare;
- trasformare una proposta in attività locale;
- registrare decisioni distinguendo `da acquisire`, `proposta`, `da verificare`, `confermata`;
- salvare appunti della riunione;
- mantenere raggiungibile lo storico locale anche dopo la conclusione o la rimozione dell'evento canonico;
- esportare e reimportare un backup locale JSON.

La funzione è integrata nella superficie `/calendario`: non crea una seconda applicazione e non introduce un calendario parallelo.

## 2. Confine di autorità

Il Calendario esistente resta proprietario di date e impegni. La Local Operational Agenda riceve gli eventi in sola lettura e non li modifica.

La preparazione locale non possiede autorità per:

- creare o modificare automaticamente eventi canonici;
- creare attività nel Planner senza un gesto umano esplicito;
- modificare programmazioni, UDA o documenti di Conoscenza;
- promuovere una proposta a decisione collegiale;
- inferire date, obblighi o fonti non presenti nell'evento.

Una decisione locale nasce sempre come `TO_ACQUIRE`. La promozione a `CONFIRMED` è un atto umano e, in V1, resta comunque una registrazione locale: non produce scritture in altri domini.

## 3. Persistenza locale

L'archivio usa IndexedDB:

- database: `docente-os-local`;
- versione database: `1`;
- object store: `operational-agenda`;
- chiave di contesto: `userId:workspaceId:academicYearId`;
- schema applicativo: `OPERATIONAL_AGENDA_SCHEMA_VERSION = 1`.

L'archivio locale contiene esclusivamente preparazioni, checklist, decisioni locali e appunti. Le entità calendario continuano a provenire dal repository Calendario.

Ogni workspace evento locale conserva obbligatoriamente uno snapshot minimo dell'impegno (`id`, titolo, tipo, date, orari, nota e riferimento fonte). Lo snapshot non acquisisce autorità sul Calendario: serve soltanto a rendere nuovamente leggibili appunti e decisioni locali quando l'evento è concluso o non è più presente nel Calendario canonico. Uno stato o backup con workspace privo di snapshot viene rifiutato fail-closed.

Le modifiche ordinarie non sostituiscono più ciecamente l'intero record a partire dallo stato React. Ogni mutazione usa una transazione IndexedDB `readwrite`, rilegge lo stato più recente nello stesso object store, applica la modifica e scrive il risultato nella stessa transazione. Le transazioni sullo store serializzano anche modifiche provenienti da schede browser differenti e riducono il rischio di lost update.

L'interfaccia mantiene inoltre un conteggio sincrono delle mutazioni locali ancora in-flight. Questo contatore non sostituisce la serializzazione IndexedDB: serve a impedire che importazione o esportazione inizino mentre una mutazione avviata dalla UI deve ancora completarsi.

## 4. Backup e ripristino

Il backup usa il formato:

`DOCENTE_OS_OPERATIONAL_AGENDA`

con versione di schema esplicita. I controlli **Esporta backup** e **Importa backup** restano disponibili nella superficie anche quando non esistono eventi futuri. L'importazione può quindi essere usata come recovery path anche in un browser nuovo o dopo una pulizia del Calendario.

L'importazione fallisce prima di sostituire IndexedDB se:

- il formato non è riconosciuto;
- la versione non è supportata;
- utente, workspace o anno scolastico non corrispondono al contesto corrente;
- timestamp o identificatori non sono validi;
- un workspace evento annidato è incompleto o privo del proprio snapshot;
- checklist, decisioni, stati o snapshot evento hanno forme non valide;
- una checklist o una collezione di decisioni contiene identificatori duplicati.

La validazione è fail-closed e riguarda l'intero albero importato, non soltanto i campi esterni. Questo evita che un backup sintatticamente valido ma strutturalmente corrotto renda inaccessibile l'agenda locale dopo il ripristino.

Importazione ed esportazione possono iniziare soltanto quando il contatore delle mutazioni locali è a zero. Durante il `replace` del backup l'applicazione entra in stato di importazione: un guard sincrono impedisce nuove mutazioni locali e i controlli di modifica, salvataggio, export e secondo import vengono disabilitati. In questo modo un valore catturato dalla UI precedente non può essere accodato dopo il ripristino e sovrascrivere lo stato appena importato.

L'esportazione entra a sua volta in uno stato esclusivo che impedisce nuove mutazioni dalla stessa superficie durante la lettura. Il JSON non viene costruito dallo snapshot React: viene prima riletto il record persistito corrente tramite il repository IndexedDB e il backup viene serializzato da quello stato. Questo evita che un salvataggio appena concluso o una modifica proveniente da un'altra scheda già persistita restino fuori dal file di recovery soltanto perché la UI locale non è ancora aggiornata.

Dopo l'importazione, l'editor degli appunti viene rimontato sulla revisione importata prima di consentire un nuovo salvataggio.

## 5. Motore delle proposte

V1 è intenzionalmente deterministica. Legge soltanto:

- titolo dell'evento;
- nota dell'evento;
- tipo dell'evento;
- riferimento alla fonte, se presente.

Sono riconosciuti, tra gli altri, segnali relativi a:

- curricolo e Indicazioni nazionali;
- modulistica e UDA;
- prove d'ingresso e criteri comuni;
- accoglienza;
- avvio progettuale;
- riunioni/collegi e acquisizione degli esiti.

Quando nessuna regola specifica è applicabile, viene proposta soltanto una preparazione generica. Il motore non usa conoscenza esterna per colmare campi mancanti.

## 6. Relazione con Conoscenza e Progetta

In V1 i riferimenti `Conoscenza · …` e `Progetta · …` sono indicazioni di percorso, non binding automatici a un documento. Questo evita di introdurre una seconda autorità documentale.

Il binding macchina a `KnowledgeAsset`/`SourceVersion` è rinviato alla tranche successiva e dovrà usare gli identificatori canonici già esistenti.

## 7. Non obiettivi di V1

Non fanno parte di questa tranche:

- parsing automatico di PDF o circolari;
- estrazione automatica di eventi da una fonte;
- scrittura automatica nel Planner;
- sincronizzazione cloud tra dispositivi dell'archivio IndexedDB;
- sostituzione dei repository Supabase già proprietari dei domini canonici.

Questi punti richiedono un successivo contratto `Source → Proposal → Human confirmation → Canonical write`, senza aggirare la validazione umana.

## 8. Gate di accettazione

V1 è accettabile quando:

1. il progetto compila e supera typecheck/lint/test;
2. le regole di proposta sono coperte da test deterministici;
3. nessuna proposta produce scritture canoniche automatiche;
4. il backup è versionato e vincolato allo stesso utente/workspace/anno;
5. l'intero contenuto annidato del backup viene validato prima del ripristino;
6. ogni workspace locale possiede uno snapshot evento valido e resta quindi ricostruibile nello storico;
7. gli identificatori di checklist e decisioni sono univoci nelle rispettive collezioni;
8. le mutazioni ordinarie sono serializzate su IndexedDB e derivano dallo stato più recente disponibile;
9. importazione ed esportazione non possono iniziare finché esiste una mutazione locale in-flight;
10. durante il ripristino nessuna mutazione locale può essere accodata sopra lo stato importato;
11. l'esportazione rilegge il record persistito corrente e non serializza uno snapshot React potenzialmente stale;
12. l'assenza o la corruzione di IndexedDB viene mostrata come errore esplicito, senza fallback silenzioso a memoria volatile;
13. esportazione e importazione restano accessibili anche senza eventi futuri;
14. gli eventi conclusi con lavoro locale e gli snapshot di eventi rimossi restano raggiungibili come storico locale;
15. l'importazione aggiorna gli editor locali senza consentire che uno stato React precedente sovrascriva il contenuto ripristinato.
