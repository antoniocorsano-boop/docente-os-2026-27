CML–DOCENTE OS PROFESSIONAL GUIDED WORKFLOW CONTRACT — V1


Contract ID: CML-DOS-PROFESSIONAL-GUIDED-WORKFLOW-V1
Status: CANONICAL_SHARED_CONTRACT
Scope: CurManLight Arena ↔ Docente OS
Date: 2026-09-21
Program context: ECO-02 professional controlled pilot


1. Scopo


Questo contratto disciplina il funzionamento professionale, controllato e guidato del passaggio curricolare da CurManLight Arena a Docente OS.


L’obiettivo è eliminare attività tecniche non professionali — download, ricerca e caricamento ripetuto di file — senza eliminare il controllo umano sulle decisioni che modificano il contesto operativo del docente.


Principio guida:


TRASPORTO ASSISTITO O AUTOMATIZZATO · PROVENIENZA VISIBILE · DECISIONE UMANA OBBLIGATORIA


La sequenza canonica è:


Arena → proposta/versione di baseline → trasferimento → controllo Docente OS → anteprima leggibile → decisione del docente → baseline della classe → utilizzo nelle lezioni.


La singola lezione non reimporta il curricolo.


2. Unità governata


L’unità di trasferimento è la baseline curricolare della classe, non la singola lezione.


La baseline deve essere identificata almeno da:
- istituzione;
- anno scolastico;
- disciplina;
- grado;
- sezione o coorte;
- curriculumVersionRef;
- stato di autorità;
- provenienza;
- structural footprint;
- requisiti curricolari;
- regole transitorie e applicabilità;
- eventuale decisione istituzionale verificabile.


Esempio operativo:


Tecnologia · 2ª C · A.S. 2026/27


costituisce una baseline riusabile da tutte le lezioni della classe fino a una variazione significativa.


3. Persistenza e riuso


Una baseline accettata dal docente viene memorizzata in Docente OS e diventa il riferimento curricolare corrente della classe.


Le lezioni successive leggono la baseline già acquisita e non richiedono una nuova importazione.


Flusso corretto:


baseline classe → piano annuale → UDA/sequenza → prossima lezione → materiali → uso in classe → evidenze/diario.


Flusso da evitare:


Arena → importazione → lezione 1
Arena → importazione → lezione 2
Arena → importazione → lezione 3


Il curricolo appartiene al contesto classe/disciplina/versione. La lezione lo consuma, non lo importa nuovamente.


4. Trasporto professionale


L’esperienza ordinaria non deve richiedere la gestione manuale di file.


Il comportamento obiettivo è:


Arena — “Passa a Docente OS”
→ il passaggio canonico viene trasportato;
→ Docente OS apre o individua il contesto esatto della classe;
→ valida automaticamente identità, anno, disciplina, grado, sezione, provenienza e impronta;
→ mostra l’anteprima al docente;
→ il docente decide se accettare.


Il file .cml-handoff.json resta ammesso come:
- formato interoperabile;
- esportazione portabile;
- strumento diagnostico;
- modalità di emergenza;
- strumento di collaudo;
- fallback offline o degradato.


Il file manuale non è il modello professionale finale.


5. Trasporto automatico non significa scrittura automatica


È consentito automatizzare il trasporto del passaggio tra Arena e Docente OS.


Non è consentito automatizzare silenziosamente la persistenza di una nuova baseline o una modifica significativa della baseline già in uso.


Il sistema può:
- trasferire;
- riconoscere;
- prevalidare;
- confrontare;
- proporre;
- spiegare.


Il sistema non può:
- accettare al posto del docente;
- sostituire silenziosamente la baseline corrente;
- attribuire autorità istituzionale da un dato locale non verificato;
- mutare il curricolo canonico di Arena da Docente OS.


Non è prevista alcuna scrittura diretta o condivisa tra i database dei due prodotti.


6. Stati canonici


Ciclo minimo di una baseline:


NOT_ACQUIRED
→ AVAILABLE_FOR_REVIEW
→ ACCEPTED_PROVISIONAL
→ UPDATE_AVAILABLE
→ REVALIDATION_REQUIRED
→ ACCEPTED_UPDATED


Per il passaggio da una baseline provvisoria a una baseline istituzionalmente approvata:


ACCEPTED_PROVISIONAL
→ APPROVED_SIGNAL_AVAILABLE
→ REVALIDATION_REQUIRED
→ ACCEPTED_INSTITUTIONAL


Le transizioni che cambiano la baseline effettiva richiedono una decisione esplicita del docente.


7. Baseline provvisoria


Una baseline PROVISIONAL_COMPLETE, se completa per progettare e valida per il contesto, può sostenere:
- piano annuale;
- progettazione;
- UDA;
- sequenze didattiche;
- preparazione della lezione;
- materiali;
- controllo di copertura;
- suggerimenti operativi.


Deve restare chiaramente identificata come provvisoria.


L’uso professionale della baseline non le attribuisce automaticamente autorità istituzionale.


8. Baseline approvata e canale di autorità


Un file locale, un payload browser o un dato controllabile dall’utente non possono, da soli, attestare lo stato istituzionale APPROVED.


La promozione o acquisizione come baseline istituzionalmente approvata richiede:
1. un segnale Arena verificabile lato server;
2. identità della decisione o dell’autorità;
3. verifica della versione e dell’impronta;
4. confronto con la baseline corrente;
5. rivalidazione esplicita del docente.


La distinzione resta invariabile:


trasporto ≠ autorità
anteprima ≠ accettazione
accettazione docente ≠ approvazione istituzionale.


9. Comportamento nella singola lezione


Quando il docente apre “Prepara la lezione”, Docente OS deve recuperare automaticamente il contesto già disponibile:
- baseline curricolare della classe;
- disciplina;
- progressione annuale;
- obiettivi e requisiti pertinenti;
- vincoli transitori;
- attività già svolte;
- stato della sequenza/UDA;
- materiali già disponibili;
- eventuali risorse provenienti da Atlas;
- decisioni professionali già registrate.


Il docente non deve ripetere l’acquisizione del curricolo.


La domanda operativa principale è:


“Cosa devo fare nella prossima lezione con questa classe?”


non:


“Quale file devo importare?”


10. Aggiornamenti durante l’anno


Una nuova decisione viene richiesta soltanto quando esiste una variazione significativa della baseline.


Esempi:
- nuova versione curricolare;
- modifica dei requisiti obbligatori;
- variazione dello stato di approvazione;
- modifica dell’applicabilità;
- modifica di una regola transitoria;
- modifica della structural footprint;
- variazione di disciplina, grado, sezione o anno;
- altra variazione con effetto materiale sulla progettazione.


Una modifica puramente descrittiva o non sostanziale può essere registrata senza interrompere il lavoro del docente, purché non alteri autorità, copertura o comportamento operativo.


11. Aggiornamento disponibile e rivalidazione


Quando Arena dispone di una baseline diversa da quella corrente, Docente OS non la applica automaticamente.


Deve mostrare un avviso professionale, ad esempio:


“Aggiornamento curricolare disponibile da Arena. La baseline utilizzata dalla 2ª C è cambiata. Esamina le differenze prima di applicarla.”


Il docente può:
- esaminare;
- confrontare;
- accettare;
- rinviare.


La baseline corrente resta valida fino alla conclusione della decisione, salvo un blocco esplicito imposto da un vincolo normativo o di autorità.


12. Confronto leggibile


Prima della rivalidazione, Docente OS deve tradurre le differenze tecniche in elementi professionali.


Categorie minime:
- Aggiunto;
- Modificato;
- Rimosso;
- Invariato.


Il confronto deve riguardare, quando applicabile:
- obiettivi;
- competenze;
- requisiti;
- contenuti/segmenti;
- applicabilità;
- regole transitorie;
- effetti su piano annuale, UDA e sequenze.


Il docente non deve confrontare manualmente JSON, hash o codici tecnici.


13. Provenienza visibile


Docente OS deve poter mostrare almeno:


Fonte: CurManLight Arena
Classe: 2ª C
Disciplina: Tecnologia
Anno: 2026/27
Stato: Provvisoria / Istituzionale
Versione: …
Impronta: …
Accettata: data/ora
Aggiornamento disponibile: sì/no


Questi dettagli devono essere facilmente accessibili, senza occupare permanentemente lo spazio dedicato al compito corrente.


14. Feedback obbligatorio


Ogni azione significativa deve produrre un feedback immediato, leggibile e non ambiguo.


Esempi:


Trasferimento:
“Baseline ricevuta da Arena. Controllala prima di applicarla.”


Elaborazione:
“Verifica in corso. Controllo classe, disciplina e provenienza.”


Successo:
“Baseline acquisita per 2ª C · Tecnologia.”


Rifiuto:
“Acquisizione non eseguita. Il passaggio non corrisponde alla classe corrente.”


Aggiornamento:
“È disponibile una nuova baseline Arena. La versione corrente non è stata modificata.”


Sono da considerare difetti di esperienza utente:
- azioni riuscite senza feedback;
- errori che non chiariscono se una scrittura sia avvenuta;
- pulsanti ancora apparentemente attivi dopo un rifiuto incompatibile;
- presentazione di identificativi tecnici al posto del contesto professionale.


15. Fail-closed e atomicità


Il sistema opera in modalità fail-closed.


In presenza di incongruenze su:
- workspace;
- anno;
- disciplina;
- grado;
- sezione/coorte;
- provenienza;
- impronta;
- requisiti;
- autorità;


la baseline non viene persistita.


Un fallimento non deve lasciare una scrittura parziale. L’utente deve poter sapere con certezza se la baseline è stata acquisita oppure no.


16. Autorità dei prodotti


CurManLight Arena è autorevole per:
- struttura curricolare;
- provenienza;
- versioni;
- requisiti;
- applicabilità;
- stato istituzionale;
- processi e decisioni di approvazione;
- contratti di handoff.


Docente OS è autorevole per:
- decisione di utilizzo del docente;
- pianificazione operativa;
- piano annuale come lavoro professionale;
- UDA e sequenze operative;
- preparazione delle lezioni;
- adattamenti professionali;
- materiali;
- osservazioni ed evidenze;
- storia delle rivalidazioni.


Arena non è il workspace quotidiano della classe.


Docente OS non è un’autorità curricolare istituzionale.


17. Ruolo di Curriculum Atlas


Curriculum Atlas può fornire:
- esplorazione grafica;
- navigazione semantica;
- relazioni;
- risorse;
- learning object;
- collegamenti tra requisiti e materiali.


Atlas non sostituisce l’autorità curricolare di Arena e non sostituisce la decisione professionale del docente in Docente OS.


Modello:


Arena = curricolo, provenienza e autorità
Atlas = esplorazione, relazioni e risorse
Docente OS = lavoro professionale quotidiano


18. Protezione dei dati


Il passaggio curricolare non deve contenere dati personali degli studenti.


Il trasporto riguarda esclusivamente contesto curricolare e didattico necessario.


Identità, autorizzazioni, decisioni e scritture del docente devono essere gestite nell’ambiente autorizzato di Docente OS.


19. Esperienza professionale minima


Il flusso ordinario deve essere spiegabile in tre passaggi:


1. Arena rende disponibile il curricolo o un aggiornamento.
2. Docente OS lo controlla e il docente decide.
3. Docente OS usa la baseline nelle lezioni successive.


Ogni attività tecnica aggiuntiva deve essere:
- eliminata;
- automatizzata senza perdere controllo umano;
- oppure relegata a diagnostica, fallback o manutenzione.


20. Regola fondamentale


Il sistema può automatizzare ciò che è meccanico, ma non ciò che costituisce una decisione professionale o istituzionale.


Pertanto:


trasporto automatico: SÌ
riconoscimento automatico del contesto: SÌ
controlli automatici: SÌ
confronto automatico: SÌ
proposta automatica: SÌ
persistenza di una nuova baseline senza conferma: NO
applicazione silenziosa di cambiamenti significativi: NO
approvazione istituzionale derivata da file locale: NO
decisione finale al posto del docente: NO


21. Modalità transitoria ECO-02


Durante ECO-02 il trasferimento tramite CML_LOCAL_HANDOFF_V2 e file .cml-handoff.json è una modalità di collaudo controllato.


Serve a verificare:
- contratto;
- provenienza;
- identità di classe;
- disciplina;
- anno;
- structural footprint;
- copertura;
- confini di autorità;
- persistenza;
- feedback umano.


Il successo del pilota non trasforma il caricamento manuale nel modello di prodotto definitivo.


La maturità professionale richiede l’eliminazione della gestione manuale del file dal percorso ordinario.


22. Criterio di accettazione


Il flusso è maturo quando il docente può passare da Arena alla preparazione della lezione senza:
- scaricare o cercare file;
- reinserire classe o disciplina;
- ripetere l’acquisizione per ogni lezione;
- interpretare codici tecnici;
- chiedersi se il sistema abbia salvato qualcosa;


e può sempre comprendere:
- da dove arriva il curricolo;
- quale classe e disciplina riguarda;
- quale versione sta usando;
- quale autorità possiede;
- cosa è cambiato;
- quale decisione gli viene richiesta.


23. Invarianti architetturali


Questo contratto non autorizza:
- database condivisi tra Arena e Docente OS;
- scritture canoniche automatiche cross-system;
- DOS-A1 o altre capacità differite;
- promozioni Production implicite;
- scritture autonome dell’agente;
- sostituzione del gate umano.


Il trasporto professionale deve quindi essere implementato come canale controllato tra applicazioni o tramite altro meccanismo versionato e verificabile, mantenendo separati trasporto, validazione, autorità e persistenza.


24. Compatibilità


Questo contratto integra e precisa:
- CML-DOS-INTEGRATED-GOVERNANCE-V1;
- CML_LOCAL_HANDOFF_V2;
- ECO-01 lesson-preparation contracts;
- ECO-02 controlled teacher-first pilot.


In caso di conflitto, la memoria governata integrata e i confini di autorità prevalgono fino a un esplicito emendamento condiviso.


Formula canonica finale:


TRASPORTO INVISIBILE O GUIDATO · PROVENIENZA VISIBILE · DECISIONE UMANA OBBLIGATORIA