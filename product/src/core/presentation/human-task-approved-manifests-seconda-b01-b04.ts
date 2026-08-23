import type {
  ApprovedHumanTaskCognitiveReceipt,
  ApprovedHumanTaskManifest,
  ApprovedHumanTaskSourceBinding,
} from './human-task-approved-manifest'
import type { HumanTaskContentSource, HumanTaskLessonProjection } from './human-task-content'

const SOURCES: HumanTaskContentSource[] = [
  {
    code: 'CAN-PLAN-2',
    label: 'Piano annuale operativo Tecnologia — classe seconda',
    role: 'PLAN',
    url: '/knowledge/36ef3be5-925f-4e28-afff-df11097827a9',
  },
  {
    code: 'CAN-UDA-2-01',
    label: 'Agricoltura, suolo e produzioni sostenibili',
    role: 'UDA',
    url: '/knowledge/b407c74c-6c04-476e-a444-7262ae830ba0',
  },
  {
    code: 'CAN-PACK-2A',
    label: 'Agricoltura, suolo e produzioni sostenibili — percorso operativo',
    role: 'PACK',
    url: '/knowledge/c0e97e14-eb14-4541-ba14-259df6c8106a',
  },
]

const SOURCE_BINDINGS: ApprovedHumanTaskSourceBinding[] = [
  {
    code: 'CAN-PLAN-2', role: 'PLAN', contribution: 'DIDACTIC',
    assetId: '36ef3be5-925f-4e28-afff-df11097827a9', generationId: 'a1066c0a-2720-40b0-841e-306cb998ce3e',
  },
  {
    code: 'CAN-UDA-2-01', role: 'UDA', contribution: 'DIDACTIC',
    assetId: 'b407c74c-6c04-476e-a444-7262ae830ba0', generationId: '8d905b43-7cb7-4640-977f-6b036fa36910',
  },
  {
    code: 'CAN-PACK-2A', role: 'PACK', contribution: 'DIDACTIC',
    assetId: 'c0e97e14-eb14-4541-ba14-259df6c8106a', generationId: '78ba42d8-f209-4355-bae9-4c9732ea38e4',
  },
]

const COGNITIVE_RECEIPT: ApprovedHumanTaskCognitiveReceipt = {
  status: 'SATISFIED',
  stakeholders: [
    {
      stakeholder: 'TEACHER',
      evidence: ['Ogni blocco espone titolo umano, attività, prodotto, evidenza, preparazione, osservazione e continuazione.'],
      note: 'Il docente può preparare e condurre la lezione senza ricostruire manualmente Piano, UDA e PACK.',
    },
    {
      stakeholder: 'LEARNER',
      evidence: ['Ogni blocco usa una scheda alunno esplicita; il PACK fornisce compito significativo, criteri di qualità e rubrica.'],
      note: 'L’alunno comprende cosa fare, cosa produrre e come controllare o migliorare il lavoro.',
    },
    {
      stakeholder: 'COORDINATION',
      evidence: ['Piano, UDA e PACK mantengono ruoli distinti e le tre generazioni correnti sono congelate nel manifest.'],
      note: 'Il raccordo è professionalmente verificabile e non confonde struttura curricolare e operatività.',
    },
    {
      stakeholder: 'GOVERNANCE',
      evidence: ['Approvazione umana, review package, source binding e miglioramento del ciclo sono registrati.'],
      note: 'La responsabilità professionale resta umana e auditabile.',
    },
    {
      stakeholder: 'SYSTEM',
      evidence: ['DIRECT richiede una lezione 1:1 con durata, attività, prodotto ed evidenza espliciti; il source drift invalida il raccordo.'],
      note: 'L’automazione deriva soltanto campi documentati e si arresta in caso di incompletezza o drift.',
    },
  ],
  note: 'Adempimento cognitivo verificato per tutti gli stakeholder di contesto di Seconda B01-B04.',
}

const COMMON = {
  grade: 'Seconda' as const,
  udaCode: '2-01',
  udaTitle: 'Agricoltura, suolo e produzioni sostenibili',
  packCode: 'CAN-PACK-2A',
  period: 'Settembre/Ottobre',
  durationMinutes: 120,
  assessmentNote: 'Valutazione formativa coerente con UDA 2-01: osservazioni sistematiche, elaborato, breve restituzione orale e, quando prevista, prova strutturata. I criteri del PACK sostengono il feedback senza generare automaticamente un voto.',
  sourceAlignment: {
    level: 'DIRECT' as const,
    note: 'CAN-PLAN-2 assegna collocazione, ordine e durata del segmento; CAN-UDA-2-01 assegna semantica e valutazione; CAN-PACK-2A documenta in modo completo la singola lezione 1:1.',
  },
  sources: SOURCES,
}

export const SECONDA_B01_PROJECTION: HumanTaskLessonProjection = {
  ...COMMON,
  projectionId: 'HTC-SECONDA-B01-v1',
  blockId: 'B01',
  title: 'Il territorio agricolo come sistema',
  why: 'Leggere il paesaggio agricolo come sistema tecnico-produttivo, mettendo in relazione risorse naturali, infrastrutture, lavoro, energia, input e output.',
  objective: 'Riconoscere componenti e relazioni essenziali di un sistema agricolo.',
  outcomes: [
    'Individuare risorse naturali, elementi tecnici e attività umane.',
    'Riconoscere input e output del sistema.',
    'Rappresentare relazioni mediante uno schema input → processo → output.',
  ],
  preparation: ['Immagini o casi di paesaggi agricoli diversi.', 'Scheda 2A-1.', 'Matita, righello e materiali per una semplice rappresentazione grafica.'],
  steps: [{
    id: 'S01', minutes: 120, title: 'Leggere un paesaggio agricolo',
    instruction: 'Guida la lettura di immagini o casi e fai individuare suolo, acqua, colture, infrastrutture, macchine, lavoro umano, energia, input e output; gli alunni documentano l’analisi nella Scheda 2A-1.',
    resourceIds: ['SCHEDA-2A-1'],
  }],
  resources: [{
    id: 'SCHEDA-2A-1', kind: 'STUDENT_SHEET', title: 'Leggo un paesaggio agricolo',
    instruction: 'Analizza il paesaggio come sistema e rappresentane le relazioni.', surfaces: ['PREPARE', 'OBSERVE'],
    prompts: ['Che cosa viene prodotto?', 'Quali risorse naturali riconosci?', 'Quali elementi tecnici o infrastrutture sono presenti?', 'Quali forme di energia sono necessarie?', 'Quali attività umane sono indispensabili?', 'Quali input entrano nel sistema?', 'Quali output utili escono?', 'Quali possibili impatti osservi o puoi ipotizzare?', 'Disegna uno schema input → processo → output.'],
  }],
  evidence: 'Scheda 2A-1 completata: riconosce componenti e relazioni del sistema agricolo.',
  observation: ['Riconosce componenti naturali e tecniche.', 'Distingue input, processo e output.', 'Rappresenta relazioni in modo leggibile.'],
  continuation: 'La lezione successiva approfondisce il suolo, le sue proprietà osservabili, le funzioni e i principali rischi.',
}

export const SECONDA_B02_PROJECTION: HumanTaskLessonProjection = {
  ...COMMON,
  projectionId: 'HTC-SECONDA-B02-v1',
  blockId: 'B02',
  title: 'Il suolo: struttura, funzioni e rischi',
  why: 'Osservare il suolo come risorsa tecnica e ambientale, distinguendo proprietà osservabili, interpretazioni, funzioni e rischi.',
  objective: 'Descrivere proprietà essenziali del suolo e collegarle a funzioni, rischi e azioni di tutela.',
  outcomes: ['Distinguere dato osservato e interpretazione.', 'Riconoscere proprietà quali tessitura, porosità, permeabilità e sostanza organica.', 'Individuare un rischio e una possibile azione di tutela.'],
  preparation: ['Immagini o piccoli campioni di suolo in contenitori chiusi e puliti.', 'Eventuali vasetti trasparenti e acqua per una prova semplice, se consentita.', 'Scheda 2A-2.'],
  steps: [{
    id: 'S01', minutes: 120, title: 'Suoli a confronto',
    instruction: 'Fai osservare campioni o immagini, distinguendo dato e interpretazione; quando fattibile svolgi una semplice prova comparativa e registra proprietà, funzione, rischio e tutela nella Scheda 2A-2.',
    resourceIds: ['SCHEDA-2A-2'],
  }],
  resources: [{
    id: 'SCHEDA-2A-2', kind: 'STUDENT_SHEET', title: 'Carta d’identità del suolo',
    instruction: 'Registra ciò che osservi e separalo dalla tua interpretazione.', surfaces: ['PREPARE', 'OBSERVE'],
    prompts: ['Aspetto e colore.', 'Granulometria percepita.', 'Presenza di residui organici.', 'Assorbimento/permeabilità osservata.', 'Compattezza.', 'Dato osservato.', 'Interpretazione.', 'Una funzione del suolo.', 'Un rischio per il suolo.', 'Una possibile azione di tutela.'],
  }],
  evidence: 'Scheda 2A-2 e, quando fattibile, prova comparativa: distingue proprietà osservabili, dato e interpretazione.',
  observation: ['Descrive proprietà osservabili senza confonderle con interpretazioni.', 'Riconosce almeno una funzione del suolo.', 'Collega rischio e azione di tutela.'],
  continuation: 'La lezione successiva ricostruisce il ciclo colturale e collega operazioni, risorse, mezzi tecnici, criticità e miglioramenti.',
}

export const SECONDA_B03_PROJECTION: HumanTaskLessonProjection = {
  ...COMMON,
  projectionId: 'HTC-SECONDA-B03-v1',
  blockId: 'B03',
  title: 'Dal campo al prodotto: ciclo colturale e mezzi tecnici',
  why: 'Ricostruire una sequenza produttiva agricola collegando fasi, risorse, mezzi tecnici, criticità e possibili miglioramenti.',
  objective: 'Ordinare le fasi di una coltura e riconoscere input, output, mezzi tecnici e criticità.',
  outcomes: ['Ordinare correttamente le principali fasi colturali.', 'Associare operazioni a risorse e macchine/attrezzi.', 'Riconoscere una criticità e proporre un miglioramento.'],
  preparation: ['Scheda 2A-3.', 'Esempi o immagini di colture e mezzi tecnici.', 'Materiali per costruire un diagramma di processo leggibile.'],
  steps: [{
    id: 'S01', minutes: 120, title: 'Dal seme al raccolto',
    instruction: 'Fai ordinare preparazione del terreno, semina o trapianto, gestione di acqua e nutrienti, controllo delle avversità, raccolta e prima gestione del prodotto; per ogni fase collega operazione, risorsa, mezzo tecnico, criticità e miglioramento.',
    resourceIds: ['SCHEDA-2A-3'],
  }],
  resources: [{
    id: 'SCHEDA-2A-3', kind: 'STUDENT_SHEET', title: 'Dal seme al raccolto',
    instruction: 'Costruisci un diagramma di processo della coltura scelta.', surfaces: ['PREPARE', 'OBSERVE'],
    prompts: ['Coltura scelta.', 'Ordina le fasi del ciclo.', 'Per ogni fase indica operazione.', 'Risorsa utilizzata.', 'Macchina o attrezzo.', 'Possibile criticità.', 'Scelta di miglioramento.', 'Concludi con un diagramma di processo leggibile.'],
  }],
  evidence: 'Scheda 2A-3 con diagramma: ricostruisce una sequenza produttiva e riconosce input/output.',
  observation: ['Ordina correttamente le fasi.', 'Collega risorse e mezzi tecnici alle operazioni.', 'Individua input/output e almeno una criticità.'],
  continuation: 'La lezione successiva confronta pratiche agricole e richiede tre scelte motivate per rendere la produzione più sostenibile.',
}

export const SECONDA_B04_PROJECTION: HumanTaskLessonProjection = {
  ...COMMON,
  projectionId: 'HTC-SECONDA-B04-v1',
  blockId: 'B04',
  title: 'Agricoltura sostenibile: scegliere e motivare',
  why: 'Passare dall’analisi alla decisione tecnica, confrontando pratiche e motivando scelte su suolo, risorse, sprechi e impatti.',
  objective: 'Formulare scelte tecniche motivate per migliorare la sostenibilità di una produzione agricola.',
  outcomes: ['Confrontare pratiche produttive.', 'Motivare almeno tre scelte di miglioramento.', 'Collegare le proposte a suolo, risorse e riduzione di sprechi o impatti.'],
  preparation: ['Scheda 2A-4.', 'Casi o esempi di pratiche agricole da confrontare.', 'Prodotti delle lezioni precedenti per raccordare sistema, suolo e processo.'],
  steps: [{
    id: 'S01', minutes: 120, title: 'Tre scelte per una produzione più sostenibile',
    instruction: 'Confronta pratiche quali rotazioni, risparmio idrico, tutela del suolo, biodiversità, riduzione degli input e recupero degli scarti; ogni alunno o gruppo formula tre scelte motivate rispettando i vincoli della scheda.',
    resourceIds: ['SCHEDA-2A-4'],
  }],
  resources: [{
    id: 'SCHEDA-2A-4', kind: 'STUDENT_SHEET', title: 'Tre scelte per una produzione più sostenibile',
    instruction: 'Per ogni problema formula una scelta e spiega perché migliora il sistema.', surfaces: ['PREPARE', 'OBSERVE'],
    prompts: ['Contesto.', 'Problema 1 → scelta proposta → perché migliora il sistema.', 'Problema 2 → scelta proposta → perché migliora il sistema.', 'Problema 3 → scelta proposta → perché migliora il sistema.', 'Verifica il vincolo: almeno una scelta sul suolo, una sulle risorse e una sulla riduzione degli sprechi o degli impatti.'],
  }],
  evidence: 'Scheda 2A-4: formula tre scelte tecniche motivate per una produzione più sostenibile.',
  observation: ['Le scelte sono coerenti con il problema.', 'La motivazione collega scelta ed effetto sul sistema.', 'Sono coperti suolo, risorse e sprechi/impatti.'],
  continuation: 'Chiude UDA 2-01 e prepara il passaggio alla filiera alimentare e ai processi di trasformazione e conservazione della UDA successiva.',
}

const PROJECTIONS = [SECONDA_B01_PROJECTION, SECONDA_B02_PROJECTION, SECONDA_B03_PROJECTION, SECONDA_B04_PROJECTION] as const

function manifest(projection: HumanTaskLessonProjection): ApprovedHumanTaskManifest {
  return {
    schemaVersion: 2,
    recipeFamily: 'DIRECT',
    timingSpecificity: 'FULL',
    structuralBinding: {
      grade: projection.grade,
      blockId: projection.blockId,
      udaCode: projection.udaCode,
      packCode: projection.packCode,
      supportPackCodes: [],
      period: projection.period,
      title: projection.title,
    },
    sourceBindings: SOURCE_BINDINGS.map((source) => ({ ...source })),
    projection,
    approval: {
      decision: 'APPROVE',
      approvedAt: '2026-08-23T11:47:00+02:00',
      reviewPackageId: 'HTC-REVIEW-PACKAGE:Seconda:Seconda:1:B01-B04:v1',
      improvementDisposition: 'SYSTEM_IMPROVEMENT_APPLIED',
      improvementNote: 'Riutilizzato il compiler v3 DIRECT fail-closed e resa esplicita la separazione Piano=struttura, UDA=semantica/valutazione, PACK=operatività 1:1 approvata.',
      cognitiveFulfillment: {
        ...COGNITIVE_RECEIPT,
        stakeholders: COGNITIVE_RECEIPT.stakeholders.map((item) => ({ ...item, evidence: [...item.evidence] })),
      },
    },
  }
}

export const APPROVED_HUMAN_TASK_MANIFESTS_SECONDA_B01_B04: readonly ApprovedHumanTaskManifest[] = PROJECTIONS.map(manifest)
