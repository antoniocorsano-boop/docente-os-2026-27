import {
  filterProgettaItemsByFocus,
  filterProgettaItemsByGrade,
  filterProgettaItemsBySectionContext,
  type ProgettaItem,
  type ProgettaGrade,
} from '@/app/progetta/progetta-model'
import {
  classifyTeachingMaterial,
  type TeachingMaterialPedagogicalRole,
} from '@/core/domain/textbook-teaching-kit'
import { humanizeKnowledgeTitle } from '@/core/presentation/product-language'

export type ConfirmedLessonTextbook = {
  id: string
  title: string
}

export type LessonKnowledgeSuggestion = {
  assetId: string
  title: string
  summary: string
  category: string
  sourceKind: 'EDITORIAL_KNOWLEDGE' | 'KNOWLEDGE'
  reason: string
  usageTip: string
  pedagogicalRoles: TeachingMaterialPedagogicalRole[]
  classificationConfidence: 'HIGH' | 'MEDIUM' | 'LOW'
  textbookId: string | null
  textbookTitle: string | null
}

type IndexedContentEvidence = {
  relevance: number
  matchedConcepts: number
}

export function buildLessonMaterialSuggestions(input: {
  items: ProgettaItem[]
  grade: ProgettaGrade
  compactSectionLabel: string
  blockId: string
  uda: string
  pack: string
  lessonTitle: string
  objective: string
  excludedAssetIds: Set<string>
  confirmedTextbooks: ConfirmedLessonTextbook[]
}): LessonKnowledgeSuggestion[] {
  const gradeItems = filterProgettaItemsByGrade(input.items, input.grade)
  const scopedItems = filterProgettaItemsBySectionContext(gradeItems, input.compactSectionLabel)
  const focusedItems = filterProgettaItemsByFocus(scopedItems, {
    blockId: input.blockId,
    uda: input.uda,
    pack: input.pack,
  })
  const focusedIds = new Set(focusedItems.map(({ asset }) => asset.id))
  const confirmedBookById = new Map(input.confirmedTextbooks.map((book) => [book.id, book]))
  const lessonContext = `${input.lessonTitle} ${input.objective}`

  return scopedItems
    .filter(({ asset }) => !input.excludedAssetIds.has(asset.id))
    .flatMap((item) => {
      const explicitFocus = focusedIds.has(item.asset.id)
      const textbookId = textbookMaterialId(item.asset.sourceMetadata)
      const textbook = textbookId ? confirmedBookById.get(textbookId) ?? null : null
      const editorialMatch = Boolean(textbook)
      if (!explicitFocus && !editorialMatch) return []

      const title = humanizeKnowledgeTitle(item.document?.title ?? item.asset.originalName)
      const summary = item.document?.summary?.trim() || 'Contenuto già presente nella Conoscenza.'
      const sourceKind = editorialMatch ? 'EDITORIAL_KNOWLEDGE' as const : 'KNOWLEDGE' as const
      const relevance = lexicalOverlapScore(`${title} ${summary}`, lessonContext)
      const indexedEvidence = indexedContentEvidence(item.document?.normalizedText, lessonContext)
      const contextualEvidence = relevance > 0 || indexedEvidence.relevance >= 2

      // Un libro confermato rende il materiale ammissibile, non automaticamente pertinente.
      // I collegamenti espliciti B/UDA/PACK restano invece autoritativi per il contesto della lezione.
      if (!explicitFocus && editorialMatch && !contextualEvidence) return []

      const classification = classifyTeachingMaterial({
        title,
        summary,
        category: item.asset.contentCategory,
        sourceMetadata: item.asset.sourceMetadata,
      })
      const contentOnlyEvidence = relevance === 0 && indexedEvidence.relevance >= 2
      const pedagogicalFit = contentOnlyEvidence ? 0 : pedagogicalFitScore(classification.roles, lessonContext)
      const score = (explicitFocus ? 60 : 0)
        + (editorialMatch ? 25 : 0)
        + relevance * 8
        + indexedEvidence.relevance * 10
        + pedagogicalFit
        + categoryRank(item.asset.contentCategory)
      const suggestionRoles = contentOnlyEvidence ? [] : classification.roles

      return [{
        item,
        score,
        suggestion: {
          assetId: item.asset.id,
          title,
          summary,
          category: item.asset.contentCategory,
          sourceKind,
          reason: suggestionReason({
            explicitFocus,
            blockId: input.blockId,
            uda: input.uda,
            textbookTitle: textbook?.title ?? null,
            relevance,
            indexedEvidence,
            pedagogicalFit,
          }),
          usageTip: usageTip({
            roles: suggestionRoles,
            editorial: editorialMatch,
            indexedContentMatch: contentOnlyEvidence,
          }),
          pedagogicalRoles: suggestionRoles,
          classificationConfidence: contentOnlyEvidence ? 'MEDIUM' : classification.confidence,
          textbookId: textbook?.id ?? null,
          textbookTitle: textbook?.title ?? null,
        },
      }]
    })
    .sort((a, b) => b.score - a.score || b.item.asset.capturedAt.localeCompare(a.item.asset.capturedAt))
    .slice(0, 4)
    .map(({ suggestion }) => suggestion)
}

export function textbookMaterialId(sourceMetadata: Record<string, unknown>): string | null {
  if (sourceMetadata.materialRole !== 'TEXTBOOK_TEACHER_MATERIAL') return null
  const textbook = sourceMetadata.textbook
  if (!textbook || typeof textbook !== 'object' || Array.isArray(textbook)) return null
  const id = (textbook as Record<string, unknown>).id
  return typeof id === 'string' && id.trim() ? id.trim() : null
}

function suggestionReason(input: {
  explicitFocus: boolean
  blockId: string
  uda: string
  textbookTitle: string | null
  relevance: number
  indexedEvidence: IndexedContentEvidence
  pedagogicalFit: number
}) {
  if (input.explicitFocus && input.textbookTitle) {
    return `È già collegato a ${input.blockId} / UDA ${input.uda} e proviene dai materiali di “${input.textbookTitle}”, libro confermato per questa classe.`
  }
  if (input.explicitFocus) return `È già collegato esplicitamente a ${input.blockId} / UDA ${input.uda}.`
  if (input.textbookTitle && input.relevance === 0 && input.indexedEvidence.relevance >= 2) {
    return `Proviene dai materiali di “${input.textbookTitle}”, libro confermato per questa classe; la ricerca nel contenuto indicizzato trova più concetti chiave coerenti con l’obiettivo della lezione.`
  }
  if (input.textbookTitle && input.relevance > 0 && input.indexedEvidence.relevance >= 2) {
    return `Proviene dai materiali di “${input.textbookTitle}”, libro confermato per questa classe; titolo o sintesi e contenuto indicizzato sono coerenti con l’obiettivo della lezione.`
  }
  if (input.textbookTitle && input.relevance > 0 && input.pedagogicalFit > 0) {
    return `Proviene dai materiali di “${input.textbookTitle}”, libro confermato per questa classe; contenuto dichiarato e funzione didattica sono coerenti con l’obiettivo della lezione.`
  }
  if (input.textbookTitle && input.relevance > 0) {
    return `Proviene dai materiali di “${input.textbookTitle}”, libro confermato per questa classe, e titolo o sintesi presentano elementi coerenti con l’obiettivo della lezione.`
  }
  return 'È pertinente al contesto corrente della lezione.'
}

function usageTip(input: {
  roles: TeachingMaterialPedagogicalRole[]
  editorial: boolean
  indexedContentMatch: boolean
}) {
  if (input.indexedContentMatch) {
    return 'Apri il materiale e usa solo la parte pertinente all’obiettivo corrente: la corrispondenza viene dal contenuto indicizzato, non dal titolo, e resta da controllare prima di allegarla alla lezione.'
  }
  if (input.roles.includes('INCLUSION') && input.roles.includes('ASSESSMENT')) {
    return 'Qui potresti affiancarlo alla prova ordinaria come variante ad alta leggibilità o supporto inclusivo, mantenendo invariato l’obiettivo della verifica.'
  }
  if (input.roles.includes('ASSESSMENT')) {
    return 'Qui potresti usarlo come esercitazione guidata, verifica rapida o controllo finale, scegliendo solo le parti coerenti con l’obiettivo della lezione.'
  }
  if (input.roles.includes('LABORATORY')) {
    return 'Qui potresti usarlo per trasformare la spiegazione in un’attività pratica o laboratoriale, controllando prima materiali, tempi e consegna.'
  }
  if (input.roles.includes('RECOVERY')) {
    return 'Qui potresti usarlo come recupero mirato dopo un controllo degli apprendimenti, senza rallentare l’intero percorso della classe.'
  }
  if (input.roles.includes('EXPLANATION') || input.roles.includes('VISUAL_SUPPORT')) {
    return 'Qui potresti usarlo come supporto visivo durante la spiegazione, mantenendo la sequenza della lezione come struttura principale.'
  }
  if (input.roles.includes('PRACTICE')) {
    return 'Qui potresti usarlo per far applicare subito ciò che è stato spiegato, prima di passare alla fase successiva.'
  }
  if (input.roles.includes('ENRICHMENT')) {
    return 'Qui potresti proporlo come approfondimento o potenziamento, senza renderlo necessario per completare il nucleo comune.'
  }
  if (input.roles.includes('PLANNING_SUPPORT')) {
    return 'Qui può servirti per controllare il raccordo tra percorso editoriale e obiettivo didattico; resta però una risorsa di supporto, non la programmazione canonica.'
  }
  if (input.editorial) {
    return 'Qui potresti agganciarti al testo usando questo materiale come supporto operativo alla spiegazione o all’attività, senza trasformarlo automaticamente nella tua progettazione.'
  }
  return 'Qui potresti usarlo come materiale operativo della lezione; aprilo prima per verificare quale parte è davvero pertinente.'
}

function indexedContentEvidence(content: string | null | undefined, lessonContext: string): IndexedContentEvidence {
  if (!content?.trim()) return { relevance: 0, matchedConcepts: 0 }
  const lessonTerms = Array.from(new Set(
    terms(lessonContext).filter((term) => !LESSON_EVIDENCE_STOP_TERMS.has(term)),
  )).slice(0, 8)
  if (!lessonTerms.length) return { relevance: 0, matchedConcepts: 0 }

  const normalizedContent = normalizeSearchText(content)
  let matchedConcepts = 0
  for (const term of lessonTerms) {
    if (containsConcept(normalizedContent, term)) matchedConcepts += 1
  }
  return {
    relevance: Math.min(matchedConcepts, 4),
    matchedConcepts,
  }
}

function containsConcept(normalizedContent: string, term: string) {
  const root = conceptRoot(term)
  if (!root) return false
  const escaped = root.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`\\b${escaped}[a-z0-9]*\\b`).test(normalizedContent)
}

function conceptRoot(term: string) {
  if (term.length >= 8) return term.slice(0, 7)
  return term
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
}

function lexicalOverlapScore(left: string, right: string) {
  const leftTerms = terms(left)
  const rightTerms = new Set(terms(right))
  let overlap = 0
  for (const term of leftTerms) if (rightTerms.has(term)) overlap += 1
  return Math.min(overlap, 4)
}

function pedagogicalFitScore(roles: TeachingMaterialPedagogicalRole[], lessonContext: string) {
  const context = lessonContext.toLowerCase()
  let score = 0
  if (roles.includes('ASSESSMENT') && /verific|valut|controll|accert/.test(context)) score += 10
  if (roles.includes('LABORATORY') && /laborator|costru|realizz|progett|operativ/.test(context)) score += 10
  if ((roles.includes('EXPLANATION') || roles.includes('VISUAL_SUPPORT')) && /conosc|comprend|descriv|spieg|riconosc/.test(context)) score += 8
  if (roles.includes('PRACTICE') && /applic|esercit|usare|utilizz|calcol/.test(context)) score += 8
  if (roles.includes('PLANNING_SUPPORT') && /competenz|obiettiv|curricol/.test(context)) score += 4
  return score
}

function terms(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length >= 5 && !STOP_TERMS.has(term))
}

function categoryRank(category: string) {
  if (category === 'ASSESSMENT') return 8
  if (category === 'TEACHING_RESOURCE') return 7
  if (category === 'UDA') return 5
  if (category === 'MODEL') return 4
  if (category === 'PROGRAMMING') return 2
  return 0
}

const STOP_TERMS = new Set([
  'della', 'delle', 'degli', 'dello', 'dalla', 'dalle', 'nella', 'nelle', 'questo', 'questa', 'lezione', 'classe', 'materiale', 'attivita',
])

const LESSON_EVIDENCE_STOP_TERMS = new Set([
  'tecnologia',
  'riconoscere',
  'comprendere',
  'descrivere',
  'spiegare',
  'individuare',
  'confrontare',
  'utilizzare',
  'applicare',
  'sapere',
  'essere',
  'avere',
])
