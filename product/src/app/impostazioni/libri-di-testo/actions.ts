'use server'

import { revalidatePath } from 'next/cache'
import { normalizeIsbn13, type TextbookUsageKind } from '@/core/domain/textbook-adoption'
import { SupabaseTextbookRepository } from '@/core/infrastructure/supabase/supabase-textbook-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'

export type IsbnLookupState = {
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

function humanLookupError(message: string) {
  if (message.includes('checksum')) return 'Controlla l’ISBN: il codice non supera la verifica ISBN-13.'
  if (message.includes('13 digits')) return 'L’ISBN deve contenere 13 cifre. Puoi anche incollarlo con trattini o spazi.'
  return message
}
