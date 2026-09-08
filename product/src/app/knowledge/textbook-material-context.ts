import { SupabaseTextbookRepository } from '@/core/infrastructure/supabase/supabase-textbook-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'

export const TEXTBOOK_MATERIAL_CONTEXT_COOKIE = 'docente_os_textbook_material'

export type ConfirmedTextbookMaterialContext = {
  workspaceId: string
  academicYearId: string
  textbook: {
    id: string
    isbn13: string
    title: string
    publisher: string
  }
}

export async function resolveConfirmedTextbookMaterialContext(
  textbookId: string,
): Promise<ConfirmedTextbookMaterialContext | null> {
  const normalizedId = textbookId.trim()
  if (!normalizedId) return null

  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context?.academicYear) return null

  const textbookRepository = new SupabaseTextbookRepository()
  const adoptions = await textbookRepository.list(context.workspace.id, context.academicYear.id)
  const confirmed = adoptions.find((adoption) => (
    adoption.status === 'CONFIRMED' && adoption.textbook.id === normalizedId
  ))
  if (!confirmed) return null

  return {
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    textbook: {
      id: confirmed.textbook.id,
      isbn13: confirmed.textbook.isbn13,
      title: confirmed.textbook.title,
      publisher: confirmed.textbook.publisher,
    },
  }
}
