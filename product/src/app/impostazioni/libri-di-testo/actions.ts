'use server'

import { revalidatePath } from 'next/cache'
import { matchMimTextbookAdoptions, type MimTeachingContext } from '@/core/domain/mim-textbook-discovery'
import { normalizeIsbn13, type TextbookUsageKind } from '@/core/domain/textbook-adoption'
import { MimTextbookAdoptionClient } from '@/core/infrastructure/mim/mim-textbook-adoption-client'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseTeacherSettingsRepository } from '@/core/infrastructure/supabase/supabase-teacher-settings-repository'
import { SupabaseTeachingAssignmentReader } from '@/core/infrastructure/supabase/supabase-teaching-assignment-reader'
import { SupabaseTextbookRepository } from '@/core/infrastructure/supabase/supabase-textbook-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'

export type IsbnLookupState = {
  status: 'idle' | 'success' | 'error'
  message: string
}

export type MimDiscoveryState = {
  status: 'idle' | 'success' | 'error'
  message: string
}

type GoogleBooksResponse = {
  items?: Array<{
    id: string
    volumeInfo?: {
      title?: string
      subtitle?: string
      authors?: string[]
      publisher?: string
      infoLink?: string
    }
  }>
}

export async function discoverMimTextbookAdoptions(
  _previousState: MimDiscoveryState,
  _formData: FormData,
): Promise<MimDiscoveryState> {
  try {
    const context = await requireContext()
    const settingsRepository = new SupabaseTeacherSettingsRepository()
    const annualRepository = new SupabaseAnnualPlanExecutionRepository()
    const assignmentReader = new SupabaseTeachingAssignmentReader()

    const [settings, disciplines, annualSnapshot, assignments] = await Promise.all([
      settingsRepository.getOrCreate(context.workspace.id, context.academicYear.id),
      settingsRepository.listDisciplines(context.workspace.id, context.academicYear.id),
      annualRepository.list(context.workspace.id, context.academicYear.id),
      assignmentReader.list(context.workspace.id, context.academicYear.id),
    ])

    if (!settings.schoolCode) {
      return { status: 'error', message: 'Aggiungi prima il codice meccanografico in Impostazioni → Tu e la scuola.' }
    }

    const sectionById = new Map(annualSnapshot.sections.map((section) => [section.id, section]))
    const disciplineById = new Map(disciplines.filter((discipline) => discipline.isActive).map((discipline) => [discipline.id, discipline]))
    const teachingContexts: MimTeachingContext[] = assignments.flatMap((assignment) => {
      const section = sectionById.get(assignment.sectionId)
      const discipline = disciplineById.get(assignment.disciplineId)
      if (!section || !discipline) return []
      return [{
        teachingAssignmentId: assignment.id,
        grade: section.grade,
        sectionCode: section.sectionCode,
        disciplineName: discipline.name,
      }]
    })

    if (!teachingContexts.length) {
      return { status: 'error', message: 'Completa prima la Cattedra: servono almeno una classe e una disciplina attiva.' }
    }

    const academicYearCode = toMimAcademicYearCode(
      context.academicYear.startsOn,
      context.academicYear.endsOn,
    )
    const mimClient = new MimTextbookAdoptionClient()
    const discovery = await mimClient.discoverBySchoolCode(settings.schoolCode, academicYearCode)
    if (!discovery.records.length) {
      return {
        status: 'success',
        message: `Nessuna adozione MIM trovata nei ${discovery.resolvedSchoolCodes.length} plessi/codici verificati per ${context.academicYear.label}. Non è stato creato alcun dato manuale.`,
      }
    }

    const matches = matchMimTextbookAdoptions(discovery.records, teachingContexts)
    if (!matches.length) {
      return {
        status: 'success',
        message: `Il MIM contiene dati per i plessi collegati a ${settings.schoolCode}, ma nessuna riga coincide in modo sufficientemente affidabile con classe, sezione e disciplina della tua Cattedra.`,
      }
    }

    const textbookRepository = new SupabaseTextbookRepository()
    for (const match of matches) {
      const record = match.record
      await textbookRepository.addProposal({
        workspaceId: context.workspace.id,
        academicYearId: context.academicYear.id,
        draft: {
          teachingAssignmentId: match.teachingAssignmentId,
          isbn13: record.isbn13,
          title: record.title,
          subtitle: record.subtitle,
          authors: record.authors,
          publisher: record.publisher,
          editionLabel: null,
          volumeLabel: normalizeMimVolume(record.volume),
          officialUrl: null,
          publisherProductRef: null,
          usageKind: match.usageKind,
          sourceKind: 'MIM_OPEN_DATA',
          sourceRef: mimSourceRef(record, academicYearCode),
        },
      })
    }

    revalidateTextbooks()
    const assignmentCount = new Set(matches.map((match) => match.teachingAssignmentId)).size
    return {
      status: 'success',
      message: `Trovate ${matches.length} ${matches.length === 1 ? 'adozione' : 'adozioni'} MIM coerenti con ${assignmentCount} ${assignmentCount === 1 ? 'Cattedra' : 'Cattedre'}. Sono proposte da controllare: nessun libro è stato confermato automaticamente.`,
    }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? humanMimError(error.message) : 'Impossibile interrogare le adozioni MIM.',
    }
  }
}

export async function lookupTextbookByIsbn(
  _previousState: IsbnLookupState,
  formData: FormData,
): Promise<IsbnLookupState> {
  try {
    const context = await requireContext()
    const teachingAssignmentId = text(formData, 'teachingAssignmentId').trim()
    const isbn13 = normalizeIsbn13(text(formData, 'isbn13'))
    const usage = usageKind(text(formData, 'usageKind'))
    const sourceUrl = `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn13)}&maxResults=1&projection=lite`

    const response = await fetch(sourceUrl, {
      method: 'GET',
      cache: 'no-store',
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(8_000),
    })
    if (!response.ok) throw new Error('Il servizio di ricerca ISBN non è disponibile in questo momento.')

    const payload = await response.json() as GoogleBooksResponse
    const candidate = payload.items?.[0]
    const info = candidate?.volumeInfo
    if (!candidate || !info?.title || !info.publisher) {
      throw new Error('Non ho trovato metadati sufficienti per questo ISBN. Non verranno richiesti dati manuali del libro.')
    }

    const repository = new SupabaseTextbookRepository()
    await repository.addProposal({
      workspaceId: context.workspace.id,
      academicYearId: context.academicYear.id,
      draft: {
        teachingAssignmentId,
        isbn13,
        title: info.title,
        subtitle: info.subtitle ?? null,
        authors: info.authors?.join(', ') ?? null,
        publisher: info.publisher,
        editionLabel: null,
        volumeLabel: null,
        officialUrl: info.infoLink ?? null,
        publisherProductRef: candidate.id,
        usageKind: usage,
        sourceKind: 'ISBN_LOOKUP',
        sourceRef: `google-books:${candidate.id}`,
      },
    })
    revalidateTextbooks()
    return { status: 'success', message: 'Libro recuperato automaticamente. Controlla i dati e conferma la proposta.' }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? humanLookupError(error.message) : 'Impossibile recuperare il libro.',
    }
  }
}

export async function confirmTextbookAdoption(formData: FormData) {
  const context = await requireContext()
  const repository = new SupabaseTextbookRepository()
  await repository.confirm(
    context.workspace.id,
    context.academicYear.id,
    text(formData, 'adoptionId'),
  )
  revalidateTextbooks()
}

export async function removeTextbookAdoption(formData: FormData) {
  const context = await requireContext()
  const repository = new SupabaseTextbookRepository()
  await repository.remove(
    context.workspace.id,
    context.academicYear.id,
    text(formData, 'adoptionId'),
  )
  revalidateTextbooks()
}

async function requireContext() {
  const repository = new SupabaseWorkspaceRepository()
  const context = await repository.getCurrentContext()
  if (!context) throw new Error('Authenticated workspace required')
  if (!context.academicYear) throw new Error('Active academic year required')
  return { ...context, academicYear: context.academicYear }
}

function revalidateTextbooks() {
  revalidatePath('/impostazioni')
  revalidatePath('/impostazioni/libri-di-testo')
  revalidatePath('/classi')
}

function text(formData: FormData, key: string) {
  const value = formData.get(key)
  if (typeof value !== 'string') throw new Error(`${key} required`)
  return value
}

function usageKind(value: string): TextbookUsageKind {
  if (value === 'ADOPTED' || value === 'RECOMMENDED' || value === 'OTHER') return value
  throw new Error('Invalid textbook usage kind')
}

function normalizeMimVolume(value: string | null) {
  if (!value) return null
  return value.trim().toUpperCase() === 'U' ? 'Volume unico' : value.trim()
}

function toMimAcademicYearCode(startsOn: string, endsOn: string) {
  const startYear = Number.parseInt(startsOn.slice(0, 4), 10)
  const endYear = Number.parseInt(endsOn.slice(0, 4), 10)
  if (!Number.isInteger(startYear) || !Number.isInteger(endYear) || endYear !== startYear + 1) {
    throw new Error('L’anno scolastico attivo non ha un intervallo compatibile con la discovery MIM.')
  }
  return `${startYear}${String(endYear).slice(-2)}`
}

function mimSourceRef(
  record: { sourceDataset: string; schoolCode: string; gradeNumber: number; sectionCode: string; isbn13: string },
  academicYearCode: string,
) {
  return `mim:${academicYearCode}:${record.sourceDataset}:${record.schoolCode}:${record.gradeNumber}:${record.sectionCode}:${record.isbn13}`.slice(0, 500)
}

function humanLookupError(message: string) {
  if (message.includes('checksum')) return 'Controlla l’ISBN: il codice non supera la verifica ISBN-13.'
  if (message.includes('13 digits')) return 'L’ISBN deve contenere 13 cifre. Puoi anche incollarlo con trattini o spazi.'
  return message
}

function humanMimError(message: string) {
  if (message.includes('Codice meccanografico')) return message
  if (message.includes('discovery MIM è verificata')) return message
  return `Ricerca MIM non completata: ${message}`
}
