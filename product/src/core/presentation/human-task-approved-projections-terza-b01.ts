import type { HumanTaskLessonProjection } from './human-task-content'

const TERZA_B01_SOURCES: HumanTaskLessonProjection['sources'] = [
  {
    code: 'CAN-PLAN-3',
    label: 'Piano annuale operativo Tecnologia — classe terza',
    role: 'PLAN',
    url: 'https://docs.google.com/document/d/1JjAmX3QwfXog5OL6Brlzope1wA9einb3SJPsA6cLND0/edit',
  },
  {
    code: 'CAN-UDA-3-01',
    label: 'Energia: forme, trasformazioni e fabbisogni',
    role: 'UDA',
    url: 'https://docs.google.com/document/d/1fq0iDstOKE5b4P52MMjA4zzT3UXMC9GftEMCGIAal_Y/edit',
  },
  {
    code: 'CAN-PACK-3A',
    label: 'Energia: forme, trasformazioni e fabbisogni — percorso operativo',
    role: 'PACK',
    url: 'https://docs.google.com/document/d/1HAzlPImnX2oImHBpxNestc5Y4UIe5xaG_TklkJNyBOU/edit',
  },
]

export const TERZA_B01_PROJECTION: HumanTaskLessonProjection = {
  projectionId: 'HTC-TERZA-B01-v1',
  grade: 'Terza',
  blockId: 'B01',
  udaCode: '3-01',
  udaTitle: 'Energia: forme, trasformazioni e fabbisogni',
  packCode: 'CAN-PACK-3A',
  period: 'Settembre/Ottobre',
  title: 'Energia: forme, trasformazioni e fabbisogni',
  durationMinutes: 120,
  why: 'Riconoscere le principali forme di energia nei sistemi quotidiani e distinguere l’energia dagli oggetti, dai dispositivi e dai servizi che la rendono osservabile o utilizzabile.',
  objective: 'Riconoscere le principali forme di energia e descrivere in modo semplice dove e come si manifestano nei sistemi tecnologici di uso quotidiano.',
  outcomes: [
    'Riconoscere almeno una forma di energia in un oggetto o sistema osservato.',
    'Collegare la forma di energia a una manifestazione o a un servizio reso.',
    'Distinguere energia, dispositivo o sistema e servizio utilizzando un lessico tecnico essenziale.',
  ],
  preparation: [
    'Immagini o oggetti di sistemi energetici di uso quotidiano.',
    'Scheda 3A-1 — Riconosco l’energia in un sistema.',
    'LIM o lavagna.',
    'Quaderno di Tecnologia.',
  ],
  steps: [
    {
      id: 'S01',
      minutes: null,
      title: 'Dove incontriamo l’energia?',
      instruction: 'Avvia un brainstorming su oggetti e sistemi quotidiani nei quali gli alunni riconoscono effetti o usi dell’energia.',
    },
    {
      id: 'S02',
      minutes: null,
      title: 'Classifica le forme di energia',
      instruction: 'Guida la classificazione degli esempi osservati attraverso movimento, calore, luce, elettricità, energia chimica ed energia potenziale.',
    },
    {
      id: 'S03',
      minutes: null,
      title: 'Distingui energia, dispositivo e servizio',
      instruction: 'Confronta gli esempi per distinguere la forma di energia dall’oggetto o sistema che la utilizza e dal servizio che viene reso.',
    },
    {
      id: 'S04',
      minutes: null,
      title: 'Costruisci una mappa condivisa',
      instruction: 'Organizza con la classe una mappa che colleghi sistemi osservati, forme di energia, manifestazioni e servizi.',
    },
    {
      id: 'S05',
      minutes: null,
      title: 'Riconosci l’energia in un sistema',
      instruction: 'Fai completare la Scheda 3A-1 e chiudi con una breve restituzione guidata.',
      resourceIds: ['STUDENT-3A-1'],
    },
  ],
  resources: [
    {
      id: 'STUDENT-3A-1',
      kind: 'STUDENT_SHEET',
      title: 'Scheda 3A-1 — Riconosco l’energia in un sistema',
      instruction: 'Osserva un oggetto o sistema e collega in modo esplicito forma di energia, manifestazione e servizio.',
      surfaces: ['PREPARE', 'OBSERVE'],
      prompts: [
        'Oggetto o sistema osservato.',
        'Quale forma di energia riconosci?',
        'Come si manifesta?',
        'Quale servizio viene reso?',
        'Qual è il dispositivo o sistema coinvolto?',
        'Rappresenta con un piccolo schema la relazione osservata.',
      ],
    },
  ],
  evidence: 'Scheda 3A-1 completata: riconosce almeno una forma di energia, la collega a una manifestazione o a un servizio e distingue energia, dispositivo o sistema e servizio.',
  observation: [
    'Riconosce le principali forme di energia negli esempi osservati.',
    'Collega in modo coerente forma di energia e servizio.',
    'Distingue energia, dispositivo o sistema e servizio.',
    'Usa un lessico tecnico essenziale e una rappresentazione comprensibile.',
  ],
  assessmentNote: 'Valutazione formativa coerente con CAN-UDA-3-01: osserva correttezza dei concetti e delle relazioni, lessico, rappresentazione e autonomia. La singola attività non genera automaticamente un voto.',
  continuation: 'La lezione successiva approfondisce le trasformazioni dell’energia e le relative catene di trasformazione.',
  sourceAlignment: {
    level: 'DIRECT',
    note: 'CAN-PLAN-3 assegna B01 a UDA 3-01 / CAN-PACK-3A per 120 minuti; UDA e PACK documentano obiettivi, sequenza, prodotto ed evidenze della prima lezione.',
  },
  sources: TERZA_B01_SOURCES,
}

export const APPROVED_HUMAN_TASK_PROJECTIONS_TERZA_B01: readonly HumanTaskLessonProjection[] = [TERZA_B01_PROJECTION]
