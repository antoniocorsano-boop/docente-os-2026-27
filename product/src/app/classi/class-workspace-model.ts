import type { AnnualPlanBlockProgress, AnnualPlanSection, AnnualPlanSectionStatus } from '@/core/domain/annual-plan-execution'
import type { KnowledgeAsset, KnowledgeDocument } from '@/core/domain/knowledge'
import type { TeachingDiscipline } from '@/core/domain/teacher-settings'
import type { TeachingAssignment } from '@/core/domain/timetable'
import { buildBlocks, CANONICAL_PLAN_SOURCES, GRADE_UI } from '../piano-annuale/model'

const GRADE_NUMBER = { PRIMA: '1', SECONDA: '2', TERZA: '3' } as const
const GRADE_WORD = { PRIMA: 'prima', SECONDA: 'seconda', TERZA: 'terza' } as const
const COMPLETE_STATUSES = new Set(['SVOLTO', 'RECUPERATO', 'RIMODULATO'])
const MATERIAL_CATEGORIES = new Set<KnowledgeAsset['contentCategory']>(['UDA', 'ASSESSMENT', 'TEACHING_RESOURCE'])

export type ClassWorkspaceAssignment = {
  id: string
  discipline: string
  weeklyMinutes: number
  status: 'PROVISIONAL' | 'CONFIRMED'
}

export type ClassWorkspaceSummary = {
  sectionId: string
  compactLabel: string
  displayLabel: string
  gradeQuery: 'prima' | 'seconda' | 'terza'
  sectionStatus: AnnualPlanSectionStatus
  sectionStatusLabel: string
  assignments: ClassWorkspaceAssignment[]
  completedBlocks: number
  hasProgress: boolean
}

export type ClassWorkspaceLearningBlock = {
  id: string
  uda: string
  pack: string
  period: string
  focus: string
  statusLabel: 'Pianificato' | 'Da preparare'
}

export type ClassWorkspaceMaterial = {
  assetId: string
  title: string
  categoryLabel: string
  relevanceLabel: 'Fase corrente' | 'Classe' | 'Grado'
}

export type ClassWorkspaceLearningFocus = {
  completedBlocks: number
  nextBlock: ClassWorkspaceLearningBlock | null
  materials: ClassWorkspaceMaterial[]
}

type KnowledgeItem = { asset: KnowledgeAsset; document: KnowledgeDocument | null }

export function buildClassWorkspaceSummary(
  section: AnnualPlanSection,
  assignments: TeachingAssignment[],
  disciplines: TeachingDiscipline[],
  progress: AnnualPlanBlockProgress[],
): ClassWorkspaceSummary {
  const disciplineById = new Map(disciplines.map((discipline) => [discipline.id, discipline.name]))
  const sectionAssignments = assignments
    .filter((assignment) => assignment.sectionId === section.id)
    .map((assignment) => ({
      id: assignment.id,
      discipline: disciplineById.get(assignment.disciplineId) ?? 'Disciplina',
      weeklyMinutes: assignment.weeklyMinutes,
      status: assignment.status,
    }))
    .sort((a, b) => a.discipline.localeCompare(b.discipline, 'it'))
  const sectionProgress = progress.filter((entry) => entry.sectionId === section.id)

  return {
    sectionId: section.id,
    compactLabel: `${GRADE_NUMBER[section.grade]}${section.sectionCode}`,
    displayLabel: `${GRADE_NUMBER[section.grade]}ª ${section.sectionCode}`,
    gradeQuery: GRADE_WORD[section.grade],
    sectionStatus: section.status,
    sectionStatusLabel: sectionStatusLabel(section.status),
    assignments: sectionAssignments,
    completedBlocks: sectionProgress.filter((entry) => COMPLETE_STATUSES.has(entry.status)).length,
    hasProgress: sectionProgress.length > 0,
  }
}

export function buildClassWorkspaceLearningFocus(
  section: AnnualPlanSection,
  progress: AnnualPlanBlockProgress[],
  knowledgeItems: KnowledgeItem[],
): ClassWorkspaceLearningFocus {
  const grade = GRADE_UI[section.grade]
  const canonicalSource = CANONICAL_PLAN_SOURCES[grade]
  const blocks = buildBlocks(grade)
  const progressByBlock = new Map(
    progress
      .filter((entry) => entry.sectionId === section.id && entry.canonicalGenerationId === canonicalSource.generationId)
      .map((entry) => [entry.blockId, entry]),
  )
  const completedBlocks = blocks.filter((block) => COMPLETE_STATUSES.has(progressByBlock.get(block.id)?.status ?? '')).length
  const next = blocks.find((block) => {
    const status = progressByBlock.get(block.id)?.status
    return !COMPLETE_STATUSES.has(status ?? '') && status !== 'ANNULLATO'
  })
  const nextProgress = next ? progressByBlock.get(next.id) : null
  const nextBlock: ClassWorkspaceLearningBlock | null = next ? {
    id: next.id,
    uda: next.uda,
    pack: next.pack,
    period: next.period,
    focus: next.focus,
    statusLabel: nextProgress?.status === 'PIANIFICATO' ? 'Pianificato' : 'Da preparare',
  } : null

  return {
    completedBlocks,
    nextBlock,
    materials: selectPertinentMaterials(section, nextBlock?.pack ?? null, knowledgeItems),
  }
}

function selectPertinentMaterials(section: AnnualPlanSection, pack: string | null, items: KnowledgeItem[]) {
  const compactLabel = `${GRADE_NUMBER[section.grade]}${section.sectionCode}`.toUpperCase()
  const grade = GRADE_WORD[section.grade]
  const normalizedPack = pack?.toLowerCase() ?? null

  return items.flatMap(({ asset, document }) => {
    if (!MATERIAL_CATEGORIES.has(asset.contentCategory)) return []
    const classMatch = asset.classLabels.some((label) => normalizeClassLabel(label) === compactLabel)
    const sourceGrade = typeof asset.sourceMetadata.grade === 'string' ? asset.sourceMetadata.grade.toLowerCase() : ''
    const gradeMatch = sourceGrade === grade
    const searchable = [asset.originalName, document?.title, document?.summary, safeMetadataText(asset.sourceMetadata)]
      .filter((value): value is string => Boolean(value))
      .join(' ')
      .toLowerCase()
    const packMatch = Boolean(normalizedPack && searchable.includes(normalizedPack))
    if (!packMatch && !classMatch && !gradeMatch) return []

    const score = (packMatch ? 300 : 0) + (classMatch ? 200 : 0) + (gradeMatch ? 100 : 0)
    const relevanceLabel: ClassWorkspaceMaterial['relevanceLabel'] = packMatch ? 'Fase corrente' : classMatch ? 'Classe' : 'Grado'
    return [{
      score,
      capturedAt: asset.capturedAt,
      material: {
        assetId: asset.id,
        title: document?.title?.trim() || asset.originalName?.trim() || 'Materiale didattico',
        categoryLabel: materialCategoryLabel(asset.contentCategory),
        relevanceLabel,
      } satisfies ClassWorkspaceMaterial,
    }]
  })
    .sort((a, b) => b.score - a.score || b.capturedAt.localeCompare(a.capturedAt))
    .slice(0, 4)
    .map(({ material }) => material)
}

function normalizeClassLabel(value: string) {
  return value.trim().replace(/\s+/g, '').toUpperCase()
}

function safeMetadataText(value: Record<string, unknown>) {
  try {
    return JSON.stringify(value)
  } catch {
    return ''
  }
}

function materialCategoryLabel(category: KnowledgeAsset['contentCategory']) {
  if (category === 'UDA') return 'UDA'
  if (category === 'ASSESSMENT') return 'Valutazione'
  return 'Materiale'
}

export function sectionStatusLabel(status: AnnualPlanSectionStatus) {
  if (status === 'CONFERMATA') return 'Confermata'
  if (status === 'PROVVISORIA') return 'Provvisoria'
  return 'Da confermare'
}

export function formatWeeklyMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (!hours) return `${rest} min/settimana`
  return rest ? `${hours} h ${rest} min/settimana` : `${hours} h/settimana`
}
