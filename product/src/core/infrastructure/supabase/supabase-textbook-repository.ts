import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import {
  validateTextbookDraft,
  type Textbook,
  type TextbookAdoption,
  type TextbookAdoptionDraft,
  type TextbookAdoptionWithBook,
} from '@/core/domain/textbook-adoption'

type TextbookRow = {
  id: string
  workspace_id: string
  academic_year_id: string
  isbn13: string
  title: string
  subtitle: string | null
  authors: string | null
  publisher: string
  edition_label: string | null
  volume_label: string | null
  official_url: string | null
  publisher_product_ref: string | null
  created_by: string
  created_at: string
  updated_at: string
}

type AdoptionRow = {
  id: string
  workspace_id: string
  academic_year_id: string
  teaching_assignment_id: string
  textbook_id: string
  usage_kind: string
  source_kind: string
  source_ref: string | null
  source_metadata: Record<string, unknown>
  status: string
  confirmed_by: string | null
  confirmed_at: string | null
  created_by: string
  created_at: string
  updated_at: string
}

type AssignmentRow = {
  id: string
  workspace_id: string
  academic_year_id: string
}

type TextbookDatabase = {
  public: {
    Tables: {
      textbooks: {
        Row: TextbookRow
        Insert: Omit<TextbookRow, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Omit<TextbookRow, 'id' | 'workspace_id' | 'academic_year_id' | 'isbn13' | 'created_by' | 'created_at'>>
        Relationships: []
      }
      textbook_adoptions: {
        Row: AdoptionRow
        Insert: Omit<AdoptionRow, 'id' | 'confirmed_by' | 'confirmed_at' | 'created_at' | 'updated_at'> & {
          id?: string
          confirmed_by?: string | null
          confirmed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Pick<AdoptionRow, 'source_kind' | 'source_ref' | 'source_metadata' | 'status' | 'confirmed_by' | 'confirmed_at' | 'updated_at'>>
        Relationships: []
      }
      teaching_assignments: {
        Row: AssignmentRow
        Insert: never
        Update: never
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export class SupabaseTextbookRepository {
  async list(workspaceId: string, academicYearId: string): Promise<TextbookAdoptionWithBook[]> {
    const supabase = await textbookClient()
    const [{ data: adoptions, error: adoptionError }, { data: books, error: bookError }] = await Promise.all([
      supabase
        .from('textbook_adoptions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('academic_year_id', academicYearId)
        .order('created_at'),
      supabase
        .from('textbooks')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('academic_year_id', academicYearId)
        .order('publisher')
        .order('title'),
    ])

    if (adoptionError) throw new Error(adoptionError.message)
    if (bookError) throw new Error(bookError.message)
    const bookById = new Map((books ?? []).map((row) => [row.id, toTextbook(row)]))

    return (adoptions ?? []).flatMap((row) => {
      const textbook = bookById.get(row.textbook_id)
      return textbook ? [{ ...toAdoption(row), textbook }] : []
    })
  }

  async addProposal(input: {
    workspaceId: string
    academicYearId: string
    draft: TextbookAdoptionDraft
  }): Promise<TextbookAdoptionWithBook> {
    const draft = validateTextbookDraft(input.draft)
    const supabase = await textbookClient()
    const userId = await authenticatedUserId(supabase)

    const { data: assignment, error: assignmentError } = await supabase
      .from('teaching_assignments')
      .select('id,workspace_id,academic_year_id')
      .eq('id', draft.teachingAssignmentId)
      .eq('workspace_id', input.workspaceId)
      .eq('academic_year_id', input.academicYearId)
      .maybeSingle()
    if (assignmentError) throw new Error(assignmentError.message)
    if (!assignment) throw new Error('Teaching assignment is outside the active workspace/year')

    const textbook = await findOrCreateTextbook(supabase, {
      workspaceId: input.workspaceId,
      academicYearId: input.academicYearId,
      userId,
      draft,
    })

    const { data: existing, error: existingError } = await supabase
      .from('textbook_adoptions')
      .select('*')
      .eq('teaching_assignment_id', draft.teachingAssignmentId)
      .eq('textbook_id', textbook.id)
      .eq('usage_kind', draft.usageKind)
      .maybeSingle()
    if (existingError) throw new Error(existingError.message)
    if (existing) return { ...toAdoption(existing), textbook }

    const { data, error } = await supabase
      .from('textbook_adoptions')
      .insert({
        workspace_id: input.workspaceId,
        academic_year_id: input.academicYearId,
        teaching_assignment_id: draft.teachingAssignmentId,
        textbook_id: textbook.id,
        usage_kind: draft.usageKind,
        source_kind: draft.sourceKind,
        source_ref: draft.sourceRef,
        source_metadata: {},
        status: 'PROPOSED',
        created_by: userId,
      })
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return { ...toAdoption(data), textbook }
  }

  async confirm(workspaceId: string, academicYearId: string, adoptionId: string): Promise<void> {
    const supabase = await textbookClient()
    const userId = await authenticatedUserId(supabase)
    const { error } = await supabase
      .from('textbook_adoptions')
      .update({
        status: 'CONFIRMED',
        confirmed_by: userId,
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', adoptionId)
      .eq('workspace_id', workspaceId)
      .eq('academic_year_id', academicYearId)
    if (error) throw new Error(error.message)
  }
}

async function findOrCreateTextbook(
  supabase: SupabaseClient<TextbookDatabase>,
  input: { workspaceId: string; academicYearId: string; userId: string; draft: TextbookAdoptionDraft },
) {
  const { data: existing, error: existingError } = await supabase
    .from('textbooks')
    .select('*')
    .eq('workspace_id', input.workspaceId)
    .eq('academic_year_id', input.academicYearId)
    .eq('isbn13', input.draft.isbn13)
    .maybeSingle()
  if (existingError) throw new Error(existingError.message)
  if (existing) return toTextbook(existing)

  const { data, error } = await supabase
    .from('textbooks')
    .insert({
      workspace_id: input.workspaceId,
      academic_year_id: input.academicYearId,
      isbn13: input.draft.isbn13,
      title: input.draft.title,
      subtitle: input.draft.subtitle,
      authors: input.draft.authors,
      publisher: input.draft.publisher,
      edition_label: input.draft.editionLabel,
      volume_label: input.draft.volumeLabel,
      official_url: input.draft.officialUrl,
      publisher_product_ref: input.draft.publisherProductRef,
      created_by: input.userId,
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return toTextbook(data)
}

async function textbookClient() {
  return (await createClient()) as unknown as SupabaseClient<TextbookDatabase>
}

async function authenticatedUserId(supabase: SupabaseClient<TextbookDatabase>) {
  const { data, error } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (error || !userId) throw new Error('Authenticated user required')
  return userId
}

function toTextbook(row: TextbookRow): Textbook {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    academicYearId: row.academic_year_id,
    isbn13: row.isbn13,
    title: row.title,
    subtitle: row.subtitle,
    authors: row.authors,
    publisher: row.publisher,
    editionLabel: row.edition_label,
    volumeLabel: row.volume_label,
    officialUrl: row.official_url,
    publisherProductRef: row.publisher_product_ref,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toAdoption(row: AdoptionRow): TextbookAdoption {
  if (!['ADOPTED', 'RECOMMENDED', 'OTHER'].includes(row.usage_kind)) throw new Error('Unsupported textbook usage kind in storage')
  if (!['MANUAL', 'MIM_OPEN_DATA'].includes(row.source_kind)) throw new Error('Unsupported textbook source kind in storage')
  if (!['PROPOSED', 'CONFIRMED'].includes(row.status)) throw new Error('Unsupported textbook adoption status in storage')
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    academicYearId: row.academic_year_id,
    teachingAssignmentId: row.teaching_assignment_id,
    textbookId: row.textbook_id,
    usageKind: row.usage_kind as TextbookAdoption['usageKind'],
    sourceKind: row.source_kind as TextbookAdoption['sourceKind'],
    sourceRef: row.source_ref,
    status: row.status as TextbookAdoption['status'],
    confirmedBy: row.confirmed_by,
    confirmedAt: row.confirmed_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
