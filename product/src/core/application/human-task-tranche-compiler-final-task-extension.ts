import { discoverNextHumanTaskTranche } from './human-task-tranche-compiler'
import {
  compileHumanTaskTrancheReviewWithDirectPack,
  explicitPackSectionDurationMinutes,
  resolveExplicitPackSetTiming,
  type CompileDirectHumanTaskTrancheInput,
  type HumanTaskDirectAlignmentBlock,
  type HumanTaskDirectCompilerItem,
  type HumanTaskDirectTrancheReview,
} from './human-task-tranche-compiler-direct-extension'
import { extractCanonicalPack, type ExtractedPackSection } from './human-task-content-pipeline'

export type HumanTaskFinalTaskRecovery = {
  status: 'NOT_NEEDED' | 'READY' | 'BLOCKED'
  blockId: string | null
  note: string
}

export type HumanTaskFinalTaskTrancheReview = Omit<HumanTaskDirectTrancheReview, 'compilerVersion'> & {
  compilerVersion: 4
  finalTaskRecovery: HumanTaskFinalTaskRecovery
}

/**
 * Compiler v4 keeps v3 as the default path and adds one explicit grammar for
 * a final authentic task. It is accepted only when the source itself contains:
 * `Compito significativo`, `Consegna`, `Il gruppo deve produrre`, an explicit
 * student-sheet heading, a rubric and `CRITERI OD-READY`. No missing field is
 * invented and the canonical duration rules of v3 remain unchanged.
 */
export function compileHumanTaskTrancheReviewWithFinalTask(
  input: CompileDirectHumanTaskTrancheInput,
): HumanTaskFinalTaskTrancheReview {
  const base = compileHumanTaskTrancheReviewWithDirectPack(input)
  if (base.status === 'READY_FOR_HUMAN_REVIEW') {
    return {
      ...base,
      compilerVersion: 4,
      finalTaskRecovery: {
        status: 'NOT_NEEDED',
        blockId: null,
        note: 'Il raccordo DIRECT standard è già completo; nessun recupero di compito finale necessario.',
      },
    }
  }

  const tranche = discoverNextHumanTaskTranche(input.grade, input.coveredBlockIds)
  if (!tranche.length || !base.directAlignment.note.match(/non contiene contemporaneamente Attività, Prodotto ed Evidenza\/Evidenze/i)) {
    return blocked(base, null, 'Il blocco del compiler v3 non corrisponde alla sola grammatica esplicita del compito finale.')
  }

  const packCode = tranche[0]?.pack
  if (!packCode || tranche.some((block) => block.pack !== packCode || block.segmentKey !== tranche[0].segmentKey)) {
    return blocked(base, null, 'La tranche non usa un unico PACK e un unico segmento: il recupero finale non è applicabile.')
  }

  const packSource = input.sources.find((source) => source.code === packCode)
  if (!packSource) return blocked(base, null, `Sorgente ${packCode} non disponibile.`)

  const pack = extractCanonicalPack(packCode, packSource.normalizedText)
  const lessons = pack.sections.filter(isLesson)
  if (lessons.length !== tranche.length) {
    return blocked(base, null, `Il PACK espone ${lessons.length} lezioni per ${tranche.length} blocchi.`)
  }

  const setTiming = resolveExplicitPackSetTiming(packSource.normalizedText, tranche.length)
  if (setTiming.status === 'INVALID') return blocked(base, null, setTiming.note)

  const aligned: HumanTaskDirectAlignmentBlock[] = []
  for (let index = 0; index < lessons.length; index += 1) {
    const block = tranche[index]
    const section = lessons[index]
    if (lessonNumber(section.heading) !== index + 1) {
      return blocked(base, block.id, `Sequenza PACK non continua in ${section.heading}.`)
    }

    const perLessonDuration = explicitPackSectionDurationMinutes(section)
    const durationMinutes = perLessonDuration ?? (setTiming.status === 'READY' ? setTiming.durationMinutes : null)
    if (durationMinutes !== block.hours * 60) {
      return blocked(base, block.id, `${section.heading} non documenta esattamente ${block.hours * 60} minuti.`)
    }

    if (index < lessons.length - 1) {
      const activity = section.activity?.trim() ?? ''
      const product = section.product?.trim() ?? ''
      const evidence = sourceEvidence(section)
      if (!activity || !product || !evidence) {
        return blocked(base, block.id, `${section.heading} non soddisfa il contratto DIRECT standard.`)
      }
      aligned.push({ blockId: block.id, heading: section.heading, sectionOrdinal: section.ordinal, durationMinutes, activity, product, evidence })
      continue
    }

    const recovered = recoverExplicitFinalTask(section, pack.sections)
    if (!recovered) {
      return blocked(base, block.id, `${section.heading} non documenta integralmente compito, consegna, prodotto, scheda, rubrica e criteri OD-READY.`)
    }
    aligned.push({
      blockId: block.id,
      heading: section.heading,
      sectionOrdinal: section.ordinal,
      durationMinutes,
      activity: recovered.activity,
      product: recovered.product,
      evidence: recovered.evidence,
    })
  }

  const byBlock = new Map(aligned.map((item) => [item.blockId, item]))
  const items: HumanTaskDirectCompilerItem[] = tranche.map((block) => {
    const direct = byBlock.get(block.id)
    if (!direct) throw new Error(`Raccordo finale incompleto per ${block.id}.`)
    return {
      blockId: block.id,
      title: block.title,
      status: 'READY_FOR_HUMAN_REVIEW',
      proposedRecipe: 'DIRECT',
      proposedPhaseOrdinals: [],
      alternativePhaseSets: [],
      score: null,
      proposedPackHeadings: [direct.heading],
      note: block.id === tranche.at(-1)?.id
        ? `${direct.heading} usa la grammatica esplicita del compito significativo: consegna, prodotto, scheda, rubrica e criteri sono tutti presenti nella fonte. Nessuna evidenza è sintetizzata.`
        : `${direct.heading} soddisfa il contratto DIRECT standard.`,
    }
  })

  return {
    ...base,
    compilerVersion: 4,
    status: 'READY_FOR_HUMAN_REVIEW',
    promotion: 'HUMAN_REVIEW_REQUIRED',
    items,
    issues: [],
    directAlignment: {
      status: 'READY',
      packCode,
      blocks: aligned,
      note: 'Raccordo DIRECT completo. Le lezioni ordinarie usano Attività/Prodotto/Evidenza; l’ultima usa esclusivamente la grammatica documentata del compito significativo con scheda, rubrica e criteri OD-READY.',
    },
    finalTaskRecovery: {
      status: 'READY',
      blockId: tranche.at(-1)?.id ?? null,
      note: 'Compito finale recuperato da campi e artefatti espliciti della fonte; nessuna inferenza di contenuto o durata.',
    },
  }
}

function recoverExplicitFinalTask(section: ExtractedPackSection, allSections: ExtractedPackSection[]) {
  const task = labeled(section.content, 'Compito significativo')
  const delivery = labeled(section.content, 'Consegna')
  const sheetHeading = inlineStudentSheetHeading(section.content)
  const product = boundedProduct(section.content, sheetHeading)
  const later = allSections.filter((candidate) => candidate.ordinal > section.ordinal)
  const rubric = later.find((candidate) => candidate.kind === 'RUBRIC')
  const hasOdReady = Boolean(rubric?.content.match(/CRITERI\s+OD-READY/i))
  if (!task || !delivery || !product || !sheetHeading || !rubric || !hasOdReady) return null

  return {
    activity: `Compito significativo: ${task}\nConsegna: ${delivery}`,
    product: `Il gruppo deve produrre: ${product}`,
    evidence: `${sheetHeading}; ${rubric.heading}; CRITERI OD-READY`,
  }
}

function labeled(content: string, label: string) {
  const pattern = new RegExp(`(?:^|\\n)${escapeRegExp(label)}\\s*:\\s*([^\\n]+)`, 'i')
  return content.match(pattern)?.[1]?.trim() ?? ''
}

function inlineStudentSheetHeading(content: string) {
  return content.match(/(?:^|\n)(SCHEDA\s+[A-Z0-9-]+\s*[—–-]\s*[^\n]+)/i)?.[1]?.trim() ?? ''
}

function boundedProduct(content: string, sheetHeading: string) {
  if (!sheetHeading) return ''
  const start = content.match(/(?:^|\n)Il gruppo deve produrre\s*:\s*/i)
  if (!start || start.index === undefined) return ''
  const from = start.index + start[0].length
  const end = content.indexOf(sheetHeading, from)
  if (end < 0) return ''
  return content.slice(from, end).trim()
}

function sourceEvidence(section: ExtractedPackSection) {
  const singular = section.evidence?.trim()
  if (singular) return singular
  return section.content.match(/(?:^|\n)Evidenze\s*:\s*([^\n]+)/i)?.[1]?.trim() ?? ''
}

function isLesson(section: ExtractedPackSection) {
  return section.kind === 'TEACHER_GUIDE' && lessonNumber(section.heading) !== null
}

function lessonNumber(heading: string) {
  const match = heading.replace(/^\d+\.\s+/, '').trim().match(/^LEZIONE\s+(\d+)\b/i)
  return match ? Number(match[1]) : null
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function blocked(base: HumanTaskDirectTrancheReview, blockId: string | null, note: string): HumanTaskFinalTaskTrancheReview {
  return {
    ...base,
    compilerVersion: 4,
    finalTaskRecovery: { status: 'BLOCKED', blockId, note },
  }
}
