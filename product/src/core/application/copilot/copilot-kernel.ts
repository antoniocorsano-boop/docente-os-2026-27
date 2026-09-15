export type CopilotSurface =
  | 'HOME'
  | 'TODAY'
  | 'PLANNER'
  | 'KNOWLEDGE'
  | 'PLAN'
  | 'DESIGN'
  | 'TIMETABLE'
  | 'CLASSES'
  | 'CLASS'
  | 'LESSON'
  | 'SETTINGS'
  | 'SYSTEM'

export type CopilotActionKind =
  | 'READ_ONLY'
  | 'PROPOSE'
  | 'WRITE_REVERSIBLE'
  | 'WRITE_EXTERNAL'
  | 'INSTITUTIONAL_DECISION'

export type CopilotAuthority =
  | 'AUTHORITATIVE'
  | 'PROVISIONAL'
  | 'USER_REPORTED'
  | 'INFERRED'
  | 'TO_VERIFY'

export type CopilotResourceState = 'AVAILABLE' | 'MISSING' | 'AMBIGUOUS'
export type CopilotSkillReadiness = 'READY' | 'PARTIAL' | 'BLOCKED'
export type CopilotMissingContextPolicy = 'ASK' | 'PARTIAL' | 'REFUSE_TO_INFER'

export type CopilotEvidenceRef = {
  kind: string
  ref: string
  label?: string
  authority?: CopilotAuthority
}

export type CopilotResourceScope = {
  workspaceId: string
  academicYearId?: string
  sectionId?: string
  disciplineId?: string
  localDate?: string
}

export type CopilotResourceDescriptor = {
  id: string
  kind: CopilotResourceKind
  state: CopilotResourceState
  authority: CopilotAuthority
  scope: CopilotResourceScope
  asOf?: string
  provenance: CopilotEvidenceRef[]
}

export type CopilotPrivacyContext = {
  classification: 'PROFESSIONAL' | 'PERSONAL' | 'SENSITIVE_EDUCATIONAL'
  providerPolicy: 'LOCAL_ONLY' | 'APPROVED_EXTERNAL_PROVIDER' | 'NO_MODEL'
}

export type CopilotRunContext = {
  run: {
    id: string
    localDate: string
    localTime?: string
    surface: CopilotSurface
  }
  identity: {
    workspaceId: string
    academicYearId?: string
    role: string
  }
  focus?: {
    type: string
    id: string
    title?: string
  }
  resources: CopilotResourceDescriptor[]
  capabilities: {
    available: string[]
    forbidden: string[]
  }
  missing: string[]
  privacy: CopilotPrivacyContext
  provenance: CopilotEvidenceRef[]
}

export type CopilotSkillDescriptor = {
  id: CopilotSkillId
  version: string
  title: string
  description: string
  surfaces: CopilotSurface[]
  requiredResources: CopilotResourceKind[]
  optionalResources: CopilotResourceKind[]
  requiredCapabilities: string[]
  actionKind: CopilotActionKind
  missingContextPolicy: CopilotMissingContextPolicy
  priority: number
  tags: string[]
}

export type CopilotSkillCandidate = {
  skill: CopilotSkillDescriptor
  readiness: CopilotSkillReadiness
  missingResources: CopilotResourceKind[]
  ambiguousResources: CopilotResourceKind[]
  missingCapabilities: string[]
}

export const COPILOT_RESOURCE_KINDS = [
  'WORKSPACE_CONTEXT',
  'ACADEMIC_YEAR_CONTEXT',
  'HOME_DAILY_CONTEXT',
  'TIMETABLE_CONTEXT',
  'CALENDAR_CONTEXT',
  'PLANNER_CONTEXT',
  'CLASS_REGISTRY',
  'CLASS_CONTEXT',
  'ANNUAL_PLAN_CONTEXT',
  'LESSON_BRIEF',
  'TEACHING_SESSION_HISTORY',
  'KNOWLEDGE_INDEX',
  'CURRICULUM_AUTHORITY',
  'SCHOOL_COMMUNICATIONS',
  'TEXTBOOK_ADOPTIONS',
  'PUBLISHER_RESOURCES',
  'DRIVE_ASSETS',
  'SYSTEM_CAPABILITIES',
] as const

export type CopilotResourceKind = (typeof COPILOT_RESOURCE_KINDS)[number]

export const COPILOT_SKILL_IDS = [
  'TODAY_OVERVIEW',
  'NEXT_LESSON_PREPARATION',
  'PENDING_LESSON_REGISTRATION',
  'PLANNER_PRIORITIZE',
  'KNOWLEDGE_EXPLAIN',
  'KNOWLEDGE_FIND_RELEVANT',
  'CLASS_STATUS_OVERVIEW',
  'ANNUAL_PLAN_PROGRESS',
  'LESSON_CONTEXT_EXPLAIN',
  'LESSON_REFLECTION',
  'CURRICULUM_AUTHORITY_CHECK',
  'SCHOOL_COMMUNICATION_IMPACT',
  'TEXTBOOK_RESOURCE_DISCOVERY',
  'SYSTEM_HELP',
] as const

export type CopilotSkillId = (typeof COPILOT_SKILL_IDS)[number]

export const CANONICAL_COPILOT_SKILLS: readonly CopilotSkillDescriptor[] = [
  {
    id: 'TODAY_OVERVIEW',
    version: '1.0.0',
    title: 'Quadro della giornata',
    description: 'Distingue lezioni, attività Planner, registrazioni pendenti e prossimi momenti senza confondere i domini.',
    surfaces: ['HOME', 'TODAY', 'PLANNER'],
    requiredResources: ['HOME_DAILY_CONTEXT'],
    optionalResources: ['PLANNER_CONTEXT', 'CALENDAR_CONTEXT'],
    requiredCapabilities: ['TODAY_READ'],
    actionKind: 'READ_ONLY',
    missingContextPolicy: 'REFUSE_TO_INFER',
    priority: 10,
    tags: ['today', 'time', 'lessons'],
  },
  {
    id: 'NEXT_LESSON_PREPARATION',
    version: '1.0.0',
    title: 'Preparazione della prossima lezione',
    description: 'Collega la prossima lezione al brief, ai materiali pronti e, se utile, alla KB.',
    surfaces: ['HOME', 'TODAY', 'CLASS', 'LESSON'],
    requiredResources: ['HOME_DAILY_CONTEXT', 'LESSON_BRIEF'],
    optionalResources: ['KNOWLEDGE_INDEX', 'ANNUAL_PLAN_CONTEXT', 'CURRICULUM_AUTHORITY'],
    requiredCapabilities: ['TODAY_READ', 'LESSON_READ'],
    actionKind: 'PROPOSE',
    missingContextPolicy: 'ASK',
    priority: 20,
    tags: ['lesson', 'preparation', 'materials'],
  },
  {
    id: 'PENDING_LESSON_REGISTRATION',
    version: '1.0.0',
    title: 'Registrazioni di lezione pendenti',
    description: 'Individua lezioni concluse ma non ancora registrate, senza registrarle automaticamente.',
    surfaces: ['HOME', 'TODAY', 'CLASS'],
    requiredResources: ['HOME_DAILY_CONTEXT', 'TEACHING_SESSION_HISTORY'],
    optionalResources: [],
    requiredCapabilities: ['TODAY_READ', 'TEACHING_SESSION_READ'],
    actionKind: 'PROPOSE',
    missingContextPolicy: 'PARTIAL',
    priority: 30,
    tags: ['lesson', 'registration', 'reflection'],
  },
  {
    id: 'PLANNER_PRIORITIZE',
    version: '1.0.0',
    title: 'Priorità del Planner',
    description: 'Ordina attività reali del Planner per urgenza, scadenza e stato.',
    surfaces: ['HOME', 'TODAY', 'PLANNER'],
    requiredResources: ['PLANNER_CONTEXT'],
    optionalResources: ['HOME_DAILY_CONTEXT'],
    requiredCapabilities: ['PLANNER_READ'],
    actionKind: 'PROPOSE',
    missingContextPolicy: 'REFUSE_TO_INFER',
    priority: 40,
    tags: ['planner', 'priority'],
  },
  {
    id: 'KNOWLEDGE_EXPLAIN',
    version: '1.0.0',
    title: 'Spiegazione di una risorsa della Conoscenza',
    description: 'Spiega un asset organizzato mantenendo fonte, stato e lacune esplicite.',
    surfaces: ['KNOWLEDGE', 'LESSON', 'CLASS', 'DESIGN'],
    requiredResources: ['KNOWLEDGE_INDEX'],
    optionalResources: ['CURRICULUM_AUTHORITY'],
    requiredCapabilities: ['KNOWLEDGE_READ'],
    actionKind: 'READ_ONLY',
    missingContextPolicy: 'PARTIAL',
    priority: 50,
    tags: ['knowledge', 'explain'],
  },
  {
    id: 'KNOWLEDGE_FIND_RELEVANT',
    version: '1.0.0',
    title: 'Ricerca contestuale nella Conoscenza',
    description: 'Recupera risorse pertinenti con filtri professionali e retrieval ibrido.',
    surfaces: ['KNOWLEDGE', 'TODAY', 'CLASS', 'LESSON', 'DESIGN', 'PLAN'],
    requiredResources: ['KNOWLEDGE_INDEX'],
    optionalResources: ['CLASS_CONTEXT', 'ANNUAL_PLAN_CONTEXT'],
    requiredCapabilities: ['KNOWLEDGE_SEARCH'],
    actionKind: 'READ_ONLY',
    missingContextPolicy: 'PARTIAL',
    priority: 60,
    tags: ['knowledge', 'search', 'rag'],
  },
  {
    id: 'CLASS_STATUS_OVERVIEW',
    version: '1.0.0',
    title: 'Stato della classe',
    description: 'Integra classe, Piano annuale, lezioni svolte e prossimi blocchi senza alterare lo stato.',
    surfaces: ['CLASSES', 'CLASS', 'TODAY'],
    requiredResources: ['CLASS_CONTEXT'],
    optionalResources: ['ANNUAL_PLAN_CONTEXT', 'TEACHING_SESSION_HISTORY'],
    requiredCapabilities: ['CLASS_READ'],
    actionKind: 'READ_ONLY',
    missingContextPolicy: 'PARTIAL',
    priority: 70,
    tags: ['class', 'progress'],
  },
  {
    id: 'ANNUAL_PLAN_PROGRESS',
    version: '1.0.0',
    title: 'Avanzamento del Piano annuale',
    description: 'Legge blocchi, scostamenti ed evidenze del Piano senza confondere pianificato ed eseguito.',
    surfaces: ['PLAN', 'CLASS', 'DESIGN'],
    requiredResources: ['ANNUAL_PLAN_CONTEXT'],
    optionalResources: ['TEACHING_SESSION_HISTORY', 'CURRICULUM_AUTHORITY'],
    requiredCapabilities: ['ANNUAL_PLAN_READ'],
    actionKind: 'READ_ONLY',
    missingContextPolicy: 'PARTIAL',
    priority: 80,
    tags: ['plan', 'progress', 'curriculum'],
  },
  {
    id: 'LESSON_CONTEXT_EXPLAIN',
    version: '1.0.0',
    title: 'Contesto della lezione',
    description: 'Spiega obiettivo, stato, preparazione e provenienza della lezione corrente.',
    surfaces: ['LESSON', 'CLASS'],
    requiredResources: ['LESSON_BRIEF'],
    optionalResources: ['CURRICULUM_AUTHORITY', 'KNOWLEDGE_INDEX'],
    requiredCapabilities: ['LESSON_READ'],
    actionKind: 'READ_ONLY',
    missingContextPolicy: 'PARTIAL',
    priority: 90,
    tags: ['lesson', 'context'],
  },
  {
    id: 'LESSON_REFLECTION',
    version: '1.0.0',
    title: 'Riflessione dopo la lezione',
    description: 'Struttura osservazioni e ripresa didattica senza trasformare il racconto in fatto non verificato.',
    surfaces: ['LESSON', 'CLASS', 'TODAY'],
    requiredResources: ['LESSON_BRIEF'],
    optionalResources: ['TEACHING_SESSION_HISTORY'],
    requiredCapabilities: ['LESSON_READ'],
    actionKind: 'PROPOSE',
    missingContextPolicy: 'PARTIAL',
    priority: 100,
    tags: ['lesson', 'reflection', 'journal'],
  },
  {
    id: 'CURRICULUM_AUTHORITY_CHECK',
    version: '1.0.0',
    title: 'Verifica dell’autorità curricolare',
    description: 'Distingue basi approvate, provvisorie, inferite e da rivalidare.',
    surfaces: ['PLAN', 'DESIGN', 'CLASS', 'LESSON', 'KNOWLEDGE'],
    requiredResources: ['CURRICULUM_AUTHORITY'],
    optionalResources: ['ANNUAL_PLAN_CONTEXT'],
    requiredCapabilities: ['CURRICULUM_READ'],
    actionKind: 'READ_ONLY',
    missingContextPolicy: 'REFUSE_TO_INFER',
    priority: 110,
    tags: ['curriculum', 'authority', 'evidence'],
  },
  {
    id: 'SCHOOL_COMMUNICATION_IMPACT',
    version: '1.0.0',
    title: 'Impatto delle comunicazioni scolastiche',
    description: 'Collega circolari e comunicazioni a scadenze, classi e lavoro del docente senza creare automaticamente attività.',
    surfaces: ['HOME', 'TODAY', 'KNOWLEDGE', 'PLANNER'],
    requiredResources: ['SCHOOL_COMMUNICATIONS'],
    optionalResources: ['PLANNER_CONTEXT', 'CLASS_REGISTRY'],
    requiredCapabilities: ['COMMUNICATION_READ'],
    actionKind: 'PROPOSE',
    missingContextPolicy: 'PARTIAL',
    priority: 120,
    tags: ['communications', 'deadlines'],
  },
  {
    id: 'TEXTBOOK_RESOURCE_DISCOVERY',
    version: '1.0.0',
    title: 'Risorse da libri e adozioni',
    description: 'Individua adozioni e risorse editore pertinenti alla classe e alla disciplina.',
    surfaces: ['CLASS', 'LESSON', 'DESIGN', 'KNOWLEDGE'],
    requiredResources: ['TEXTBOOK_ADOPTIONS'],
    optionalResources: ['PUBLISHER_RESOURCES', 'CLASS_CONTEXT'],
    requiredCapabilities: ['TEXTBOOK_READ'],
    actionKind: 'READ_ONLY',
    missingContextPolicy: 'PARTIAL',
    priority: 130,
    tags: ['textbooks', 'resources'],
  },
  {
    id: 'SYSTEM_HELP',
    version: '1.0.0',
    title: 'Aiuto su DOCENTE OS',
    description: 'Spiega funzioni, percorsi e limiti del prodotto usando il catalogo delle capacità disponibili.',
    surfaces: ['HOME', 'TODAY', 'PLANNER', 'KNOWLEDGE', 'PLAN', 'DESIGN', 'TIMETABLE', 'CLASSES', 'CLASS', 'LESSON', 'SETTINGS', 'SYSTEM'],
    requiredResources: ['SYSTEM_CAPABILITIES'],
    optionalResources: [],
    requiredCapabilities: ['SYSTEM_HELP_READ'],
    actionKind: 'READ_ONLY',
    missingContextPolicy: 'PARTIAL',
    priority: 200,
    tags: ['system', 'help'],
  },
]

export function discoverCopilotSkills(input: {
  surface: CopilotSurface
  resources: readonly CopilotResourceDescriptor[]
  availableCapabilities: readonly string[]
  skills?: readonly CopilotSkillDescriptor[]
  limit?: number
}): CopilotSkillCandidate[] {
  const skills = input.skills ?? CANONICAL_COPILOT_SKILLS
  const capabilities = new Set(input.availableCapabilities)
  const byKind = groupResources(input.resources)

  return skills
    .filter((skill) => skill.surfaces.includes(input.surface))
    .map((skill) => evaluateSkill(skill, byKind, capabilities))
    .sort(compareCandidates)
    .slice(0, normalizeLimit(input.limit))
}

export function modelVisibleCopilotSkills(input: Parameters<typeof discoverCopilotSkills>[0]) {
  return discoverCopilotSkills(input).filter((candidate) => candidate.readiness !== 'BLOCKED')
}

export function resourceDescriptor(input: Omit<CopilotResourceDescriptor, 'provenance'> & { provenance?: CopilotEvidenceRef[] }): CopilotResourceDescriptor {
  return { ...input, provenance: input.provenance ?? [] }
}

function evaluateSkill(
  skill: CopilotSkillDescriptor,
  resources: Map<CopilotResourceKind, CopilotResourceDescriptor[]>,
  capabilities: Set<string>,
): CopilotSkillCandidate {
  const missingResources: CopilotResourceKind[] = []
  const ambiguousResources: CopilotResourceKind[] = []

  for (const kind of skill.requiredResources) {
    const candidates = resources.get(kind) ?? []
    if (candidates.some((resource) => resource.state === 'AMBIGUOUS')) {
      ambiguousResources.push(kind)
      continue
    }
    if (!candidates.some((resource) => resource.state === 'AVAILABLE')) missingResources.push(kind)
  }

  const missingCapabilities = skill.requiredCapabilities.filter((capability) => !capabilities.has(capability))
  const readiness = resolveReadiness(skill, missingResources, ambiguousResources, missingCapabilities)

  return { skill, readiness, missingResources, ambiguousResources, missingCapabilities }
}

function resolveReadiness(
  skill: CopilotSkillDescriptor,
  missingResources: CopilotResourceKind[],
  ambiguousResources: CopilotResourceKind[],
  missingCapabilities: string[],
): CopilotSkillReadiness {
  if (missingCapabilities.length || ambiguousResources.length) return 'BLOCKED'
  if (!missingResources.length) return 'READY'
  return skill.missingContextPolicy === 'PARTIAL' ? 'PARTIAL' : 'BLOCKED'
}

function groupResources(resources: readonly CopilotResourceDescriptor[]) {
  const result = new Map<CopilotResourceKind, CopilotResourceDescriptor[]>()
  for (const resource of resources) {
    const current = result.get(resource.kind) ?? []
    current.push(resource)
    result.set(resource.kind, current)
  }
  return result
}

function compareCandidates(a: CopilotSkillCandidate, b: CopilotSkillCandidate) {
  const readinessRank: Record<CopilotSkillReadiness, number> = { READY: 0, PARTIAL: 1, BLOCKED: 2 }
  const byReadiness = readinessRank[a.readiness] - readinessRank[b.readiness]
  if (byReadiness !== 0) return byReadiness
  if (a.skill.priority !== b.skill.priority) return a.skill.priority - b.skill.priority
  return a.skill.id.localeCompare(b.skill.id)
}

function normalizeLimit(value: number | undefined) {
  if (!Number.isFinite(value)) return 12
  return Math.min(24, Math.max(1, Math.round(value!)))
}
