import {
  filterProgettaItemsByFocus,
  filterProgettaItemsByGrade,
  filterProgettaItemsBySectionContext,
  type ProgettaItem,
  type ProgettaGrade,
} from '@/app/progetta/progetta-model'
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
  textbookId: string | null
  textbookTitle: string | null
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
      const relevance = lexicalOverlapScore(
        `${title} ${summary}`,
        `${input.lessonTitle} ${input.objective}`,
      )
      const score = (explicitFocus ? 60 : 0)
        + (editorialMatch ? 35 : 0)
        + relevance * 6
        + categoryRank(item.asset.contentCategory)

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
          }),
          usageTip: usageTip({
            title,
            summary,
            category: item.asset.contentCategory,
            editorial: editorialMatch,
          }),
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
}) {
  if (input.explicitFocus && input.textbookTitle) {
    return `È già collegato a ${input.blockId} / UDA ${input.uda} e proviene dai materiali di “${input.textbookTitle}”, libro confermato per questa classe.`
  }
  if (input.explicitFocus) return `È già collegato esplicitamente a ${input.blockId} / UDA ${input.uda}.`
  if (input.textbookTitle && input.relevance > 0) {
    return `Proviene dai materiali di “${input.textbookTitle}”, libro confermato per questa classe, e presenta elementi coerenti con l’obiettivo della lezione.`
  }
  if (input.textbookTitle) return `Proviene dai materiali di “${input.textbookTitle}”, libro confermato per questa classe.`
  return 'È pertinente al contesto corrente della lezione.'
}

function usageTip(input: { title: string; summary: string; category: string; editorial: boolean }) {
  const haystack = `${input.title} ${input.summary}`.toLowerCase()
  if (/\b(verific|prova|quiz|test|eserciz)/.test(haystack) || input.category === 'ASSESSMENT') {
    return 'Qui potresti usarlo come esercitazione guidata, verifica rapida o controllo finale, scegliendo solo le parti coerenti con l’obiettivo della lezione.'
  }
  if (/\b(powerpoint|slide|presentaz)/.test(haystack)) {
    return 'Qui potresti usarlo come supporto visivo durante la spiegazione, mantenendo la sequenza della lezione come struttura principale.'
  }
  if (/\b(bes|inclus|semplificat|facilitat)/.test(haystack)) {
    return 'Qui potresti usarlo come variante inclusiva o supporto differenziato, senza duplicare l’UDA comune.'
  }
  if (/\b(programmaz|competenz|indicazioni|curricol)/.test(haystack)) {
    return 'Qui può servirti per controllare il raccordo tra percorso editoriale e obiettivo didattico; resta però una risorsa di supporto, non la programmazione canonica.'
  }
  if (input.editorial) {
    return 'Qui potresti agganciarti al testo usando questo materiale come supporto operativo alla spiegazione o all’attività, senza trasformarlo automaticamente nella tua progettazione.'
  }
  return 'Qui potresti usarlo come materiale operativo della lezione; aprilo prima per verificare quale parte è davvero pertinente.'
}

function lexicalOverlapScore(left: string, right: string) {
  const leftTerms = terms(left)
  const rightTerms = new Set(terms(right))
  let overlap = 0
  for (const term of leftTerms) if (rightTerms.has(term)) overlap += 1
  return Math.min(overlap, 4)
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
