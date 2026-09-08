import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { createClient } from '@/lib/supabase/server'

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

  const supabase = await createClient()
  const { data: adoptions, error: adoptionError } = await supabase
    .from('textbook_adoptions')
    .select('textbook_id')
    .eq('workspace_id', context.workspace.id)
    .eq('academic_year_id', context.academicYear.id)
    .eq('textbook_id', normalizedId)
    .eq('status', 'CONFIRMED')
    .limit(1)

  if (adoptionError || !adoptions?.length) return null

  const { data: textbook, error: textbookError } = await supabase
    .from('textbooks')
    .select('id,isbn13,title,publisher')
    .eq('workspace_id', context.workspace.id)
    .eq('academic_year_id', context.academicYear.id)
    .eq('id', normalizedId)
    .maybeSingle()

  if (textbookError || !textbook) return null

  return {
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    textbook: {
      id: textbook.id,
      isbn13: textbook.isbn13,
      title: textbook.title,
      publisher: textbook.publisher,
    },
  }
}
