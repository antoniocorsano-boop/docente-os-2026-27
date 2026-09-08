import type { TextbookAdoptionWithBook } from './textbook-adoption'

export type TeachingMaterialPedagogicalRole =
  | 'PLANNING_SUPPORT'
  | 'EXPLANATION'
  | 'VISUAL_SUPPORT'
  | 'PRACTICE'
  | 'ASSESSMENT'
  | 'INCLUSION'
  | 'LABORATORY'
  | 'RECOVERY'
  | 'ENRICHMENT'

export type TeachingMaterialClassification = {
  roles: TeachingMaterialPedagogicalRole[]
  primaryRole: TeachingMaterialPedagogicalRole | null
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  evidence: string[]
}

export type TextbookTeachingKitSlot = {
  id: string
  label: string
  description: string
  roles: TeachingMaterialPedagogicalRole[]
  expectedCategory: 'PROGRAMMING' | 'TEACHING_RESOURCE' | 'ASSESSMENT'
  requiredForPilot: boolean
}

export type TextbookTeachingKit = {
  id: string
  title: string
  courseLabel: string
  guide: {
    title: string
    isbn13: string
    pages: number
    accessModel: 'EXTERNAL_ACCOUNT'
    identityUrl: string
  }
  slots: TextbookTeachingKitSlot[]
  publicAlignment: {
    title: string
    url: string
    role: 'EDITORIAL_ALIGNMENT'
  }
}

type TeachingKitTextbookContext = Pick<TextbookAdoptionWithBook, 'status'> & {
  textbook: Pick<TextbookAdoptionWithBook['textbook'], 'isbn13' | 'title' | 'publisher'>
}

const TECNOLOGIA_VERDE_2ED_ISBNS = new Set([
  '9788808950758',
  '9788808899798',
  '9788808804013',
  '9788808861689',
  '9788808264572',
])

const TECNOLOGIA_VERDE_2ED_PILOT_KIT: TextbookTeachingKit = {
  id: 'KIT-TV2ED-01',
  title: 'Kit pilota materiali docente',
  courseLabel: 'Tecnologia.verde · seconda edizione',
  guide: {
    title: 'Idee per insegnare',
    isbn13: '9788808667861',
    pages: 144,
    accessModel: 'EXTERNAL_ACCOUNT',
    identityUrl: 'https://www.zanichelli.it/ricerca/prodotti/tecnologia-verde-2ed?qid=9788808843081',
  },
  slots: [
    {
      id: 'PROGRAMMING_COMPETENCIES',
      label: 'Programmazione per competenze',
      description: 'Per controllare il raccordo tra percorso editoriale, competenze e Piano annuale senza sostituire la programmazione canonica.',
      roles: ['PLANNING_SUPPORT'],
      expectedCategory: 'PROGRAMMING',
      requiredForPilot: true,
    },
    {
      id: 'LESSON_POWERPOINT',
      label: 'Lezione PowerPoint',
      description: 'Per verificare suggerimenti di spiegazione e supporto visivo nel punto didattico corretto.',
      roles: ['EXPLANATION', 'VISUAL_SUPPORT'],
      expectedCategory: 'TEACHING_RESOURCE',
      requiredForPilot: true,
    },
    {
      id: 'ASSESSMENT',
      label: 'Prova di verifica',
      description: 'Per verificare che il sistema proponga una prova soprattutto quando il percorso richiede esercitazione o controllo degli apprendimenti.',
      roles: ['ASSESSMENT'],
      expectedCategory: 'ASSESSMENT',
      requiredForPilot: true,
    },
    {
      id: 'ACCESSIBLE_ASSESSMENT',
      label: 'Prova di verifica ad alta leggibilità',
      description: 'Per distinguere una variante inclusiva dalla prova ordinaria, mantenendo comune l’obiettivo didattico.',
      roles: ['ASSESSMENT', 'INCLUSION'],
      expectedCategory: 'ASSESSMENT',
      requiredForPilot: true,
    },
  ],
  publicAlignment: {
    title: 'Raccordo con le Indicazioni Nazionali 2025',
    url: 'https://staticmy.zanichelli.it/catalogo/assets/aC7.9788808264572.pdf',
    role: 'EDITORIAL_ALIGNMENT',
  },
}

export function textbookTeachingKitForAdoption(
  adoption: TeachingKitTextbookContext,
): TextbookTeachingKit | null {
  if (adoption.status !== 'CONFIRMED') return null
  if (!isZanichelli(adoption.textbook.publisher)) return null
  if (!TECNOLOGIA_VERDE_2ED_ISBNS.has(adoption.textbook.isbn13)) return null
  return TECNOLOGIA_VERDE_2ED_PILOT_KIT
}

export function classifyTeachingMaterial(input: {
  title: string
  summary?: string | null
  category?: string | null
  sourceMetadata?: Record<string, unknown>
}): TeachingMaterialClassification {
  const haystack = normalize(`${input.title} ${input.summary ?? ''}`)
  const roles: TeachingMaterialPedagogicalRole[] = []
  const evidence: string[] = []

  const add = (role: TeachingMaterialPedagogicalRole, reason: string) => {
    if (!roles.includes(role)) roles.push(role)
    if (!evidence.includes(reason)) evidence.push(reason)
  }

  if (/alta leggibil|bes|inclus|semplificat|facilitat/.test(haystack)) {
    add('INCLUSION', 'Il titolo o la sintesi indica una variante inclusiva o ad alta leggibilità.')
  }
  if (/verific|prova|quiz|test/.test(haystack) || input.category === 'ASSESSMENT') {
    add('ASSESSMENT', 'Il contenuto è identificabile come prova o materiale di verifica.')
  }
  if (/powerpoint|slide|presentaz/.test(haystack)) {
    add('EXPLANATION', 'Il contenuto è una presentazione utilizzabile durante la spiegazione.')
    add('VISUAL_SUPPORT', 'La forma dichiarata è un supporto visivo.')
  }
  if (/programmaz|competenz|curricol|indicazioni|obiettiv minim/.test(haystack) || input.category === 'PROGRAMMING') {
    add('PLANNING_SUPPORT', 'Il contenuto riguarda programmazione, competenze o raccordo curricolare.')
  }
  if (/laborator|tinkering|costruisc|costruzione|scheda operativ/.test(haystack)) {
    add('LABORATORY', 'Il contenuto richiama un’attività pratica o laboratoriale.')
  }
  if (/recuper/.test(haystack)) {
    add('RECOVERY', 'Il contenuto è esplicitamente destinato al recupero.')
    add('PRACTICE', 'Il recupero richiede un uso operativo o esercitativo.')
  }
  if (/approfond|potenzi/.test(haystack)) {
    add('ENRICHMENT', 'Il contenuto è indicato come approfondimento o potenziamento.')
  }
  if (/eserciz|esercitaz|scheda/.test(haystack) && !roles.includes('ASSESSMENT')) {
    add('PRACTICE', 'Il contenuto è presentato come esercizio, esercitazione o scheda.')
  }

  const textbookMaterial = input.sourceMetadata?.materialRole === 'TEXTBOOK_TEACHER_MATERIAL'
  const confidence = roles.length >= 2
    ? 'HIGH'
    : roles.length === 1 && (textbookMaterial || input.category === 'ASSESSMENT' || input.category === 'PROGRAMMING')
      ? 'HIGH'
      : roles.length === 1
        ? 'MEDIUM'
        : 'LOW'

  return {
    roles,
    primaryRole: primaryRole(roles),
    confidence,
    evidence,
  }
}

export function teachingMaterialRoleLabel(role: TeachingMaterialPedagogicalRole) {
  const labels: Record<TeachingMaterialPedagogicalRole, string> = {
    PLANNING_SUPPORT: 'Raccordo alla progettazione',
    EXPLANATION: 'Spiegazione',
    VISUAL_SUPPORT: 'Supporto visivo',
    PRACTICE: 'Esercitazione',
    ASSESSMENT: 'Verifica',
    INCLUSION: 'Inclusione',
    LABORATORY: 'Laboratorio',
    RECOVERY: 'Recupero',
    ENRICHMENT: 'Approfondimento',
  }
  return labels[role]
}

function primaryRole(roles: TeachingMaterialPedagogicalRole[]) {
  const priority: TeachingMaterialPedagogicalRole[] = [
    'INCLUSION',
    'ASSESSMENT',
    'LABORATORY',
    'RECOVERY',
    'EXPLANATION',
    'PRACTICE',
    'ENRICHMENT',
    'PLANNING_SUPPORT',
    'VISUAL_SUPPORT',
  ]
  return priority.find((role) => roles.includes(role)) ?? null
}

function isZanichelli(value: string) {
  return normalize(value).split(' ').includes('zanichelli')
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}
