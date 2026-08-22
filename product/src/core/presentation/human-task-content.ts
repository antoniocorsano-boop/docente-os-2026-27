import type { GradeKey } from '@/app/piano-annuale/model'

type CanonicalBlockLike = {
  id: string
  uda: string
  pack: string
  period: string
  focus: string
}

export type HumanTaskContentSource = {
  code: string
  label: string
  url: string
  role: 'PLAN' | 'UDA' | 'PACK'
}

export type HumanTaskResourceKind =
  | 'STUDENT_SHEET'
  | 'EXIT_TICKET'
  | 'TASK_BRIEF'
  | 'RUBRIC'
  | 'ASSESSMENT_GUIDE'

export type HumanTaskResourceSurface = 'PREPARE' | 'OBSERVE'

export type HumanTaskSourceAlignment = {
  level: 'DIRECT' | 'COMPOSED'
  note?: string
}

export type HumanTaskActivityStep = {
  id: string
  minutes: number | null
  title: string
  instruction: string
  cue?: string
  resourceIds?: string[]
}

export type HumanTaskResource = {
  id: string
  kind: HumanTaskResourceKind
  title: string
  instruction: string
  prompts: string[]
  surfaces?: HumanTaskResourceSurface[]
}

export type HumanTaskLessonProjection = {
  projectionId: string
  grade: GradeKey
  blockId: string
  udaCode: string
  udaTitle: string
  packCode: string
  period: string
  title: string
  durationMinutes: number
  why: string
  objective: string
  outcomes: string[]
  preparation: string[]
  steps: HumanTaskActivityStep[]
  resources: HumanTaskResource[]
  evidence: string
  observation: string[]
  assessmentNote: string
  continuation: string
  sourceAlignment: HumanTaskSourceAlignment
  sources: HumanTaskContentSource[]
}

export type HumanTaskLessonTimingStatus = 'FULL' | 'PARTIAL' | 'MIXED' | 'UNSPECIFIED'

export type HumanTaskLessonTiming = {
  durationMinutes: number
  knownMinutes: number
  timedSteps: number
  untimedSteps: number
  unallocatedMinutes: number | null
  status: HumanTaskLessonTimingStatus
}

const PLAN_PRIMA: HumanTaskContentSource = {
  code: 'CAN-PLAN-1',
  label: 'Piano annuale operativo Tecnologia — classe prima',
  role: 'PLAN',
  url: 'https://docs.google.com/document/d/1rNF-MsPXnDuCsBQ_9h31rT1mqjHj4SXD8s3j2lVJ-C4/edit',
}

const PACK_PRIMA_1A: HumanTaskContentSource = {
  code: 'CAN-PACK-1A',
  label: 'Pacchetto operativo di avvio classe prima',
  role: 'PACK',
  url: 'https://docs.google.com/document/d/1vVoF3z1QigzA1S5WnXiqCTe2bvMD08PwWmVv9s5bvR8/edit',
}

const COMMON_PRIMA_UDA0_SOURCES: HumanTaskContentSource[] = [
  PLAN_PRIMA,
  {
    code: 'CAN-UDA-1-00',
    label: 'Entrare nel laboratorio della Tecnologia',
    role: 'UDA',
    url: 'https://docs.google.com/document/d/1YyHBEsKJVdYEqyEdPmJp6f_SOCEWfLibA1Mv3ApMJPw/edit',
  },
  PACK_PRIMA_1A,
]

const COMMON_PRIMA_UDA1_SOURCES: HumanTaskContentSource[] = [
  PLAN_PRIMA,
  {
    code: 'CAN-UDA-1-01',
    label: 'Tecnologia, bisogni, risorse e sistemi',
    role: 'UDA',
    url: 'https://docs.google.com/document/d/19M8a7htra9ntBpBV8sq7-KSCimCR4XoVtyx6vTulydM/edit',
  },
  PACK_PRIMA_1A,
]

const B01_PRIMA: HumanTaskLessonProjection = {
  projectionId: 'HTC-PRIMA-B01-v3',
  grade: 'Prima',
  blockId: 'B01',
  udaCode: '1-00',
  udaTitle: 'Entrare nel laboratorio della Tecnologia',
  packCode: 'CAN-PACK-1A',
  period: 'Settembre',
  title: 'Che cos’è Tecnologia?',
  durationMinutes: 120,
  why: 'Avviare il percorso facendo emergere le idee iniziali degli alunni e introducendo il metodo di osservazione di un oggetto tecnico.',
  objective: 'Far emergere preconoscenze, distinguere tecnica e tecnologia e introdurre il metodo di osservazione.',
  outcomes: [
    'Riconoscere che un oggetto tecnico risponde a un bisogno.',
    'Distinguere in modo iniziale bisogno, funzione, parti e materiali.',
    'Usare un primo lessico tecnico comprensibile.',
    'Osservare prima di formulare giudizi.',
  ],
  preparation: [
    '4–6 oggetti tecnici semplici e diversi tra loro.',
    'Fogli A4 oppure quaderno di Tecnologia.',
    'Matita e righello.',
    'LIM o lavagna.',
    'Una scatola o un vassoio per gli oggetti.',
    'Scheda alunno A — Osservo un oggetto tecnico.',
  ],
  steps: [
    { id: 'S01', minutes: 10, title: 'Domanda-stimolo', instruction: 'Chiedi: “Dove vedi la Tecnologia nella tua giornata?”' },
    { id: 'S02', minutes: 10, title: 'Raccogli le idee', instruction: 'Raccogli rapidamente alla lavagna parole, esempi e associazioni iniziali.' },
    { id: 'S03', minutes: 15, title: 'Modella l’osservazione', instruction: 'Presenta un oggetto tecnico e mostra come passare da ciò che si vede a bisogno, funzione, parti e materiali.' },
    { id: 'S04', minutes: 25, title: 'Osservazione individuale', instruction: 'Gli alunni lavorano con la Scheda alunno A su un oggetto semplice.', resourceIds: ['STUDENT-A'] },
    { id: 'S05', minutes: 10, title: 'Confronto a coppie', instruction: 'Fai confrontare le osservazioni e chiedi di correggere o precisare almeno un elemento.' },
    { id: 'S06', minutes: 20, title: 'Restituzione guidata', instruction: 'Ricostruisci con la classe la catena bisogno → funzione → materiale → parti.' },
    { id: 'S07', minutes: 15, title: 'Mini-sintesi', instruction: 'Fissa il significato iniziale di tecnica, tecnologia e oggetto tecnico.' },
    { id: 'S08', minutes: 5, title: 'Exit ticket', instruction: 'Chiedi una cosa capita e una domanda che rimane.', cue: 'Usalo come evidenza diagnostica, non come voto automatico.', resourceIds: ['EXIT-B01'] },
  ],
  resources: [
    {
      id: 'STUDENT-A',
      kind: 'STUDENT_SHEET',
      title: 'Scheda alunno A — Osservo un oggetto tecnico',
      instruction: 'Guida una osservazione semplice e documentabile dell’oggetto scelto.',
      surfaces: ['PREPARE'],
      prompts: [
        'A quale bisogno risponde?',
        'Qual è la sua funzione principale?',
        'Da quali parti è formato?',
        'Quali materiali riconosci?',
        'Come viene usato correttamente?',
        'Quale caratteristica lo rende adatto alla funzione?',
        'Disegna uno schizzo semplice e indica almeno due parti.',
        'Completa: “Questo oggetto è una soluzione tecnologica perché…”',
      ],
    },
    {
      id: 'EXIT-B01',
      kind: 'EXIT_TICKET',
      title: 'Exit ticket',
      instruction: 'Chiusura rapida della lezione.',
      prompts: ['Una cosa che ho capito…', 'Una domanda che mi rimane…'],
    },
  ],
  evidence: 'Scheda di osservazione di un oggetto tecnico + exit ticket.',
  observation: [
    'Riconosce il bisogno cui risponde l’oggetto.',
    'Distingue funzione e forma.',
    'Individua almeno un materiale.',
    'Usa un lessico tecnico iniziale.',
    'Osserva prima di formulare giudizi.',
  ],
  assessmentNote: 'Diagnostica e formativa. Le evidenze servono a conoscere il punto di partenza della classe e non devono essere trasformate automaticamente in voto.',
  continuation: 'Dopo la registrazione, la lezione successiva riguarda laboratorio, strumenti e sicurezza.',
  sourceAlignment: { level: 'DIRECT' },
  sources: COMMON_PRIMA_UDA0_SOURCES,
}

const B02_PRIMA: HumanTaskLessonProjection = {
  projectionId: 'HTC-PRIMA-B02-v2',
  grade: 'Prima',
  blockId: 'B02',
  udaCode: '1-00',
  udaTitle: 'Entrare nel laboratorio della Tecnologia',
  packCode: 'CAN-PACK-1A',
  period: 'Settembre',
  title: 'Laboratorio, strumenti e sicurezza',
  durationMinutes: 120,
  why: 'Stabilire fin dall’inizio routine sicure e responsabili per usare spazi, strumenti e materiali con ordine, precisione e collaborazione.',
  objective: 'Costruire routine operative e responsabilità nell’uso di spazi, strumenti e materiali.',
  outcomes: [
    'Riconoscere il laboratorio come ambiente regolato da procedure e comportamenti responsabili.',
    'Organizzare correttamente il posto di lavoro.',
    'Riconoscere la funzione di alcuni strumenti realmente disponibili a scuola.',
    'Collegare l’uso di uno strumento a una procedura sicura e a un errore da evitare.',
    'Contribuire a regole condivise per lavorare con ordine, precisione e responsabilità.',
  ],
  preparation: [
    'Strumenti realmente disponibili a scuola.',
    'Esempi di uso corretto e non corretto.',
    'Cartoncini oppure post-it.',
    'Scheda alunno B — Lavorare bene in Tecnologia.',
  ],
  steps: [
    { id: 'S01', minutes: null, title: 'Esplora ambiente e strumenti', instruction: 'Guida l’esplorazione dell’ambiente di lavoro e degli strumenti realmente disponibili.' },
    { id: 'S02', minutes: null, title: 'Classifica gli strumenti', instruction: 'Organizza gli esempi secondo le funzioni: misurare, tracciare, tagliare, unire, controllare.' },
    { id: 'S03', minutes: null, title: 'Ragiona su sicurezza e procedure', instruction: 'Discuti con la classe rischio, attenzione, ordine e procedura a partire da esempi concreti.' },
    { id: 'S04', minutes: null, title: 'Compila la scheda strumenti', instruction: 'Gli alunni completano la Scheda alunno B collegando funzione, uso sicuro ed errore da evitare.', resourceIds: ['STUDENT-B'] },
    { id: 'S05', minutes: null, title: 'Costruisci il Patto del laboratorio', instruction: 'Raccogli le regole condivise e costruisci con la classe il Patto del laboratorio di Tecnologia.', cue: 'Il patto può essere conservato come prodotto della classe e, se adeguato, usato anche come pannello Open Day.' },
  ],
  resources: [
    {
      id: 'STUDENT-B',
      kind: 'STUDENT_SHEET',
      title: 'Scheda alunno B — Lavorare bene in Tecnologia',
      instruction: 'Completa nel quaderno o sul foglio una scheda essenziale sugli strumenti e sulle regole di lavoro.',
      surfaces: ['PREPARE'],
      prompts: [
        'Per ogni strumento: a cosa serve?',
        'Come si usa in sicurezza?',
        'Quale errore va evitato?',
        'Indica tre regole che consideri indispensabili.',
        'Perché ordine e precisione fanno parte della Tecnologia?',
      ],
    },
  ],
  evidence: 'Scheda strumenti + Patto del laboratorio.',
  observation: [
    'Usa gli strumenti in modo corretto.',
    'Rispetta procedure e sicurezza.',
    'Organizza il posto di lavoro con sufficiente autonomia.',
    'Comprende e segue la consegna.',
    'Collabora e rispetta i ruoli.',
  ],
  assessmentNote: 'Diagnostica e formativa. La griglia UDA 0 può orientare l’osservazione; il totale numerico non deve essere automaticamente trasformato in voto.',
  continuation: 'Con il percorso di ingresso concluso, la lezione successiva passa dai bisogni alle soluzioni.',
  sourceAlignment: { level: 'DIRECT' },
  sources: COMMON_PRIMA_UDA0_SOURCES,
}

const B03_PRIMA: HumanTaskLessonProjection = {
  projectionId: 'HTC-PRIMA-B03-v1',
  grade: 'Prima',
  blockId: 'B03',
  udaCode: '1-01',
  udaTitle: 'Tecnologia, bisogni, risorse e sistemi',
  packCode: 'CAN-PACK-1A',
  period: 'Settembre/Ottobre',
  title: 'Dai bisogni alle soluzioni',
  durationMinutes: 120,
  why: 'Far riconoscere che prodotti, servizi e sistemi tecnologici nascono per rispondere a bisogni reali e possono essere messi in relazione in modo esplicito.',
  objective: 'Riconoscere bisogni e distinguere semplici soluzioni tecnologiche, costruendo una prima mappa bisogno → soluzione.',
  outcomes: [
    'Riconoscere bisogni in semplici situazioni reali.',
    'Collegare bisogni a prodotti, servizi o sistemi.',
    'Distinguere in modo iniziale prodotto, servizio e sistema.',
    'Rappresentare relazioni con una mappa comprensibile.',
  ],
  preparation: [
    'Immagini o carte di oggetti e servizi quotidiani.',
    'Fogli A3 oppure quaderno di Tecnologia.',
    'Post-it.',
    'Lavagna o schermo interattivo.',
  ],
  steps: [
    { id: 'S01', minutes: null, title: 'Raccogli bisogni reali', instruction: 'Parti da esempi della vita quotidiana e raccogli bisogni individuali o collettivi riconoscibili dagli alunni.' },
    { id: 'S02', minutes: null, title: 'Collega bisogni e soluzioni', instruction: 'Classifica gli esempi secondo il bisogno soddisfatto e individua le soluzioni tecniche corrispondenti.' },
    { id: 'S03', minutes: null, title: 'Distingui le forme di soluzione', instruction: 'Confronta esempi per distinguere prodotto, servizio e sistema in modo iniziale.' },
    { id: 'S04', minutes: null, title: 'Costruisci una mappa', instruction: 'Rappresenta con parole e frecce i collegamenti bisogno → soluzione e rendi visibili le categorie emerse.' },
    { id: 'S05', minutes: null, title: 'Restituisci e correggi', instruction: 'Fai confrontare le classificazioni e correggi insieme alla classe i collegamenti poco chiari.' },
  ],
  resources: [],
  evidence: 'Classificazione guidata + prima mappa bisogno → soluzione.',
  observation: [
    'Riconosce il bisogno soddisfatto da una soluzione.',
    'Distingue prodotto, servizio e sistema in esempi semplici.',
    'Stabilisce collegamenti comprensibili tra bisogno e soluzione.',
    'Usa il lessico essenziale in modo pertinente.',
  ],
  assessmentNote: 'Formativa. Osserva soprattutto correttezza dei collegamenti, lessico e capacità di motivare la classificazione; non è prevista una valutazione sommativa autonoma in questo passaggio.',
  continuation: 'La lezione successiva mette a fuoco le risorse necessarie e i vincoli che condizionano una soluzione tecnologica.',
  sourceAlignment: {
    level: 'COMPOSED',
    note: 'Il Piano annuale separa “Dai bisogni alle soluzioni” e “Risorse e vincoli”, mentre la guida operativa del pacchetto raccoglie bisogni, prodotti/servizi e risorse in una sola scheda docente. Questa vista usa solo gli elementi chiaramente pertinenti al primo blocco e non assegna tempi non documentati.',
  },
  sources: COMMON_PRIMA_UDA1_SOURCES,
}

const B04_PRIMA: HumanTaskLessonProjection = {
  projectionId: 'HTC-PRIMA-B04-v1',
  grade: 'Prima',
  blockId: 'B04',
  udaCode: '1-01',
  udaTitle: 'Tecnologia, bisogni, risorse e sistemi',
  packCode: 'CAN-PACK-1A',
  period: 'Settembre/Ottobre',
  title: 'Risorse e vincoli',
  durationMinutes: 120,
  why: 'Mostrare che ogni soluzione tecnologica richiede risorse diverse e che disponibilità, limiti ed effetti condizionano le scelte.',
  objective: 'Individuare materia, energia, informazione e persone/organizzazione necessarie a una soluzione e riconoscere primi vincoli ed effetti.',
  outcomes: [
    'Individuare le principali risorse impiegate in un prodotto o servizio.',
    'Distinguere materia, energia, informazione e persone/organizzazione.',
    'Comprendere che le risorse hanno disponibilità e limiti.',
    'Collegare bisogno, soluzione, risorse, processo ed effetti in uno schema semplice.',
  ],
  preparation: [
    'Oggetti reali oppure immagini di prodotti e servizi quotidiani.',
    'Fogli A3 oppure quaderno di Tecnologia.',
    'Post-it.',
    'Scheda alunno C — Dal bisogno alla soluzione.',
  ],
  steps: [
    { id: 'S01', minutes: null, title: 'Scegli una soluzione concreta', instruction: 'Parti da un prodotto o servizio quotidiano e richiama il bisogno a cui risponde.' },
    { id: 'S02', minutes: null, title: 'Individua le risorse', instruction: 'Riconosci materia/materiali, energia, informazioni e persone/organizzazione necessarie.' },
    { id: 'S03', minutes: null, title: 'Introduci limiti e disponibilità', instruction: 'Ragiona su ciò che può rendere una risorsa limitata, difficile da ottenere o da usare responsabilmente.' },
    { id: 'S04', minutes: null, title: 'Completa la scheda', instruction: 'Gli alunni collegano bisogno, soluzione, risorse, processo ed effetti nella Scheda alunno C.', resourceIds: ['STUDENT-C'] },
    { id: 'S05', minutes: null, title: 'Confronta effetti e scelte', instruction: 'Concludi facendo emergere almeno un vantaggio e un possibile problema o impatto della soluzione analizzata.' },
  ],
  resources: [
    {
      id: 'STUDENT-C',
      kind: 'STUDENT_SHEET',
      title: 'Scheda alunno C — Dal bisogno alla soluzione',
      instruction: 'Una traccia per collegare bisogno, soluzione, risorse, processo ed effetti senza trasformare il lavoro in un elenco isolato.',
      surfaces: ['PREPARE'],
      prompts: [
        'Quale bisogno soddisfa?',
        'È soprattutto un prodotto, un servizio o un sistema?',
        'Quali materiali o materia servono?',
        'Quale energia serve?',
        'Quali informazioni servono?',
        'Quali persone o forme di organizzazione servono?',
        'Che cosa deve accadere perché la soluzione sia disponibile e utilizzabile?',
        'Indica un vantaggio e un possibile problema o impatto.',
      ],
    },
  ],
  evidence: 'Scheda “Dal bisogno alla soluzione”.',
  observation: [
    'Individua le principali risorse necessarie.',
    'Distingue materia, energia, informazione e persone/organizzazione.',
    'Riconosce un limite o vincolo pertinente.',
    'Collega bisogno, soluzione, risorse, processo ed effetti.',
    'Organizza le informazioni in modo comprensibile.',
  ],
  assessmentNote: 'Formativa. Valuta la correttezza delle categorie e dei collegamenti; l’attenzione agli effetti prepara le successive attività sulla sostenibilità senza anticiparne una valutazione autonoma.',
  continuation: 'La lezione successiva introduce la lettura di un sistema attraverso input, processo, output e controllo.',
  sourceAlignment: {
    level: 'COMPOSED',
    note: 'Il pacchetto operativo concentra bisogni, prodotti/servizi e risorse in una sola guida da 2 ore, mentre il Piano annuale dedica un blocco autonomo alle risorse e ai vincoli. Questa vista raccorda Piano, UDA e Scheda C senza attribuire tempi alle singole attività.',
  },
  sources: COMMON_PRIMA_UDA1_SOURCES,
}

const B05_PRIMA: HumanTaskLessonProjection = {
  projectionId: 'HTC-PRIMA-B05-v1',
  grade: 'Prima',
  blockId: 'B05',
  udaCode: '1-01',
  udaTitle: 'Tecnologia, bisogni, risorse e sistemi',
  packCode: 'CAN-PACK-1A',
  period: 'Settembre/Ottobre',
  title: 'Pensare per sistemi',
  durationMinutes: 120,
  why: 'Passare dalla semplice descrizione di un oggetto alla lettura di ciò che entra nel sistema, di ciò che accade e di ciò che esce.',
  objective: 'Introdurre la lettura input → trasformazione/processo → output, con un primo controllo del funzionamento.',
  outcomes: [
    'Individuare input, processo e output in un sistema semplice.',
    'Distinguere materia, energia e informazioni in ingresso.',
    'Descrivere il funzionamento essenziale senza limitarsi a ciò che si vede.',
    'Rappresentare il sistema con un diagramma comprensibile.',
  ],
  preparation: [
    'Uno o più sistemi semplici e familiari: per esempio temperamatite, distributore d’acqua, bicicletta, lampada o servizio scolastico.',
    'Quaderno oppure foglio per il diagramma.',
    'Scheda alunno D — Leggo un sistema tecnologico.',
    'Lavagna o schermo interattivo.',
  ],
  steps: [
    { id: 'S01', minutes: null, title: 'Scegli un sistema semplice', instruction: 'Presenta un sistema familiare e chiedi di non descrivere soltanto ciò che si vede, ma che cosa entra, che cosa accade e che cosa esce.' },
    { id: 'S02', minutes: null, title: 'Riconosci gli input', instruction: 'Individua materia, energia e informazioni o comandi che entrano nel sistema.', resourceIds: ['STUDENT-D'] },
    { id: 'S03', minutes: null, title: 'Descrivi il processo', instruction: 'Ricostruisci la trasformazione o il processo essenziale che avviene nel sistema.' },
    { id: 'S04', minutes: null, title: 'Individua gli output', instruction: 'Riconosci prodotto o risultato, informazioni ed eventuali scarti o perdite.' },
    { id: 'S05', minutes: null, title: 'Rappresenta e controlla', instruction: 'Costruisci il diagramma input → processo → output e chiedi come capire se il sistema sta funzionando bene.' },
  ],
  resources: [
    {
      id: 'STUDENT-D',
      kind: 'STUDENT_SHEET',
      title: 'Scheda alunno D — Leggo un sistema tecnologico',
      instruction: 'Guida l’analisi funzionale del sistema fino al diagramma essenziale.',
      surfaces: ['PREPARE'],
      prompts: [
        'INPUT — che cosa entra? Materia, energia, informazioni/comandi.',
        'TRASFORMAZIONE / PROCESSO — che cosa accade?',
        'OUTPUT — che cosa otteniamo? Prodotto/risultato, informazioni, scarti/perdite.',
        'CONTROLLO — come capiamo se il sistema sta funzionando bene?',
        'Disegna: [ INPUT ] → [ PROCESSO ] → [ OUTPUT ].',
      ],
    },
  ],
  evidence: 'Diagramma di un sistema tecnologico.',
  observation: [
    'Individua gli input pertinenti.',
    'Descrive il processo o la trasformazione essenziale.',
    'Individua gli output principali.',
    'Riconosce una modalità di controllo del funzionamento.',
    'Costruisce un diagramma leggibile usando lessico appropriato.',
  ],
  assessmentNote: 'Formativa. Osserva comprensione del funzionamento, correttezza dei collegamenti e leggibilità del diagramma; la Scheda D è un supporto operativo, non una prova sommativa automatica.',
  continuation: 'La lezione successiva applica bisogni, risorse e sistemi in un compito significativo e conclude il percorso con verifica e autovalutazione.',
  sourceAlignment: { level: 'DIRECT' },
  sources: COMMON_PRIMA_UDA1_SOURCES,
}

const B06_PRIMA: HumanTaskLessonProjection = {
  projectionId: 'HTC-PRIMA-B06-v1',
  grade: 'Prima',
  blockId: 'B06',
  udaCode: '1-01',
  udaTitle: 'Tecnologia, bisogni, risorse e sistemi',
  packCode: 'CAN-PACK-1A',
  period: 'Settembre/Ottobre',
  title: 'Compito significativo e verifica',
  durationMinutes: 120,
  why: 'Integrare i concetti dell’unità in un caso concreto, comunicarli con uno schema leggibile e raccogliere una verifica individuale prima della chiusura del percorso.',
  objective: 'Analizzare un oggetto quotidiano collegando bisogno, funzione, risorse e sistema; restituire il lavoro e verificare individualmente i concetti essenziali.',
  outcomes: [
    'Collegare bisogno, funzione, risorse e funzionamento di un oggetto quotidiano.',
    'Costruire uno schema input → processo → output pertinente.',
    'Riconoscere almeno un vantaggio e un possibile impatto o limite.',
    'Comunicare il lavoro con lessico e rappresentazione comprensibili.',
    'Applicare individualmente i concetti essenziali in una breve verifica.',
  ],
  preparation: [
    'Una selezione di oggetti quotidiani non troppo complessi.',
    'Fogli A4 o A3.',
    'Consegna del compito significativo.',
    'Criteri di valutazione essenziali.',
    'Una breve prova individuale coerente con la struttura definita dall’UDA.',
  ],
  steps: [
    { id: 'S01', minutes: null, title: 'Presenta il compito', instruction: 'Spiega la consegna e i criteri essenziali prima che gli alunni scelgano o ricevano l’oggetto da analizzare.', resourceIds: ['TASK-B06'] },
    { id: 'S02', minutes: null, title: 'Analizza e rappresenta', instruction: 'Gli alunni costruiscono la scheda A4/A3 collegando bisogno, funzione, materiali, risorse, sistema, vantaggi, limiti e rappresentazione.', resourceIds: ['TASK-B06'] },
    { id: 'S03', minutes: null, title: 'Restituisci il lavoro', instruction: 'Raccogli una presentazione sintetica dei lavori e usa il confronto per chiarire collegamenti o lessico ancora incerti.' },
    { id: 'S04', minutes: null, title: 'Svolgi la breve verifica individuale', instruction: 'Usa una prova breve coerente con i formati indicati dall’UDA. I quesiti specifici non sono definiti nella fonte e non vengono inventati da DOCENTE OS.', resourceIds: ['ASSESS-B06'] },
    { id: 'S05', minutes: null, title: 'Chiudi con autovalutazione', instruction: 'Concludi con una breve autovalutazione sul livello di comprensione e sugli aspetti ancora da consolidare.' },
  ],
  resources: [
    {
      id: 'TASK-B06',
      kind: 'TASK_BRIEF',
      title: 'Racconta la tecnologia nascosta in un oggetto quotidiano',
      instruction: 'Consegna per la scheda A4/A3 del compito significativo.',
      surfaces: ['PREPARE'],
      prompts: [
        'Bisogno.',
        'Funzione.',
        'Principali materiali.',
        'Risorse necessarie.',
        'Schema input → processo → output.',
        'Un vantaggio.',
        'Un possibile impatto o limite.',
        'Uno schizzo o immagine annotata.',
      ],
    },
    {
      id: 'ASSESS-B06',
      kind: 'ASSESSMENT_GUIDE',
      title: 'Struttura della breve verifica individuale',
      instruction: 'La fonte definisce i tipi di quesito, non i quesiti specifici. DOCENTE OS mantiene quindi solo questa struttura.',
      prompts: [
        'Quesiti a risposta breve.',
        'Classificazioni.',
        'Completamento di uno schema.',
        'Breve situazione-problema.',
      ],
    },
    {
      id: 'RUBRIC-B06',
      kind: 'RUBRIC',
      title: 'Criteri essenziali di osservazione',
      instruction: 'Richiama i quattro nuclei della rubrica UDA senza mostrare tutta la documentazione durante il compito.',
      surfaces: ['OBSERVE'],
      prompts: [
        'Comprensione dei concetti.',
        'Analisi di un sistema tecnologico.',
        'Rappresentazione e comunicazione.',
        'Consapevolezza ambientale e qualità delle scelte.',
      ],
    },
  ],
  evidence: 'Scheda A4/A3 + breve verifica individuale.',
  observation: [
    'Collega correttamente bisogni, risorse, processi, prodotti e sistemi.',
    'Analizza un sistema individuando elementi, input, trasformazioni e output.',
    'Usa lessico e rappresentazioni comprensibili.',
    'Riconosce effetti, limiti o possibili miglioramenti.',
  ],
  assessmentNote: 'La chiusura combina evidenze del compito, breve verifica individuale e rubrica a quattro livelli. La valutazione considera autonomia, correttezza concettuale, applicazione a casi concreti e progressione rispetto alla situazione iniziale.',
  continuation: 'Con questa lezione il percorso su bisogni, risorse e sistemi si conclude; il piano prosegue con il riconoscimento e la classificazione dei materiali.',
  sourceAlignment: {
    level: 'COMPOSED',
    note: 'Il Piano annuale definisce compito significativo e verifica nello stesso blocco; il pacchetto dettaglia il compito e la rubrica, mentre l’UDA definisce il formato della verifica individuale e l’autovalutazione. I quesiti specifici non sono presenti nelle fonti e non vengono generati automaticamente.',
  },
  sources: COMMON_PRIMA_UDA1_SOURCES,
}

const PROJECTIONS = new Map<string, HumanTaskLessonProjection>([
  [projectionKey(B01_PRIMA.grade, B01_PRIMA.blockId), B01_PRIMA],
  [projectionKey(B02_PRIMA.grade, B02_PRIMA.blockId), B02_PRIMA],
  [projectionKey(B03_PRIMA.grade, B03_PRIMA.blockId), B03_PRIMA],
  [projectionKey(B04_PRIMA.grade, B04_PRIMA.blockId), B04_PRIMA],
  [projectionKey(B05_PRIMA.grade, B05_PRIMA.blockId), B05_PRIMA],
  [projectionKey(B06_PRIMA.grade, B06_PRIMA.blockId), B06_PRIMA],
])

export function resolveHumanTaskLessonProjection(grade: GradeKey, block: CanonicalBlockLike): HumanTaskLessonProjection | null {
  const projection = PROJECTIONS.get(projectionKey(grade, block.id)) ?? null
  if (!projection) return null
  if (projection.grade !== grade) return null
  if (projection.udaCode !== block.uda) return null
  if (projection.packCode !== block.pack) return null
  if (projection.period !== block.period) return null
  if (!hasValidResourceBindings(projection)) return null
  if (projection.sourceAlignment.level === 'COMPOSED' && !projection.sourceAlignment.note?.trim()) return null
  return projection
}

export function resolveHumanTaskLessonTiming(projection: HumanTaskLessonProjection): HumanTaskLessonTiming {
  const timedSteps = projection.steps.filter((step) => step.minutes !== null)
  const untimedSteps = projection.steps.length - timedSteps.length
  const knownMinutes = timedSteps.reduce((total, step) => total + (step.minutes ?? 0), 0)

  if (knownMinutes > projection.durationMinutes) {
    throw new Error(`Lesson projection ${projection.projectionId} exceeds its duration`)
  }

  if (timedSteps.length === 0) {
    return {
      durationMinutes: projection.durationMinutes,
      knownMinutes: 0,
      timedSteps: 0,
      untimedSteps,
      unallocatedMinutes: null,
      status: 'UNSPECIFIED',
    }
  }

  if (untimedSteps > 0) {
    return {
      durationMinutes: projection.durationMinutes,
      knownMinutes,
      timedSteps: timedSteps.length,
      untimedSteps,
      unallocatedMinutes: null,
      status: 'MIXED',
    }
  }

  const unallocatedMinutes = projection.durationMinutes - knownMinutes
  return {
    durationMinutes: projection.durationMinutes,
    knownMinutes,
    timedSteps: timedSteps.length,
    untimedSteps: 0,
    unallocatedMinutes,
    status: unallocatedMinutes === 0 ? 'FULL' : 'PARTIAL',
  }
}

export function resolveHumanTaskStepResources(
  projection: HumanTaskLessonProjection,
  step: HumanTaskActivityStep,
): HumanTaskResource[] {
  if (!step.resourceIds?.length) return []
  const byId = new Map(projection.resources.map((resource) => [resource.id, resource]))
  return step.resourceIds.flatMap((resourceId) => {
    const resource = byId.get(resourceId)
    return resource ? [resource] : []
  })
}

export function resolveHumanTaskResourcesForSurface(
  projection: HumanTaskLessonProjection,
  surface: HumanTaskResourceSurface,
): HumanTaskResource[] {
  return projection.resources.filter((resource) => resource.surfaces?.includes(surface))
}

export function hasHumanTaskLessonProjection(grade: GradeKey, blockId: string) {
  return PROJECTIONS.has(projectionKey(grade, blockId))
}

export function buildLessonWorkspaceHref(sectionId: string, blockId: string, mode: 'prepare' | 'teach' | 'observe' | 'record' = 'prepare') {
  return `/classi/${encodeURIComponent(sectionId)}/lezioni/${encodeURIComponent(blockId)}?mode=${mode}`
}

function hasValidResourceBindings(projection: HumanTaskLessonProjection) {
  const resourceIds = projection.resources.map((resource) => resource.id)
  if (new Set(resourceIds).size !== resourceIds.length) return false
  const knownIds = new Set(resourceIds)
  return projection.steps.every((step) => (step.resourceIds ?? []).every((resourceId) => knownIds.has(resourceId)))
}

function projectionKey(grade: GradeKey, blockId: string) {
  return `${grade}:${blockId.toUpperCase()}`
}
