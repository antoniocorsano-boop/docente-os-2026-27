import type { SupabaseClient } from '@supabase/supabase-js'
import type { MimTextbookRecord } from '@/core/domain/mim-textbook-discovery'
import { createClient } from '@/lib/supabase/server'

type SyncRunRow = {
  id: string
  academic_year_code: string
  status: string
  activated_at: string | null
}

type SchoolScopeRow = {
  run_id: string
  academic_year_code: string
  institute_code: string
  school_code: string
  province: string | null
}

type AdoptionCacheRow = {
  id: string
  run_id: string
  academic_year_code: string
  source_dataset: string
  school_code: string
  grade_number: number
  section_code: string
  school_grade_type: string | null
  combination: string | null
  discipline: string
  isbn13: string
  authors: string | null
  title: string
  subtitle: string | null
  volume: string | null
  publisher: string
  price: string | null
  new_adoption: string | null
  to_purchase: string | null
  recommended: string | null
  source_subject: string
}

type MimCacheDatabase = {
  public: {
    Tables: {
      mim_textbook_sync_runs: {
        Row: SyncRunRow
        Insert: never
        Update: never
        Relationships: []
      }
      mim_school_scope_cache: {
        Row: SchoolScopeRow
        Insert: never
        Update: never
        Relationships: []
      }
      mim_textbook_adoption_cache: {
        Row: AdoptionCacheRow
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

export type MimCachedDiscovery = {
  datasetCodes: string[]
  records: MimTextbookRecord[]
  resolvedSchoolCodes: string[]
  activatedAt: string
}

export class SupabaseMimTextbookCacheRepository {
  async discoverBySchoolCode(
    schoolCode: string,
    academicYearCode: string,
  ): Promise<MimCachedDiscovery> {
    const normalizedSchoolCode = normalizeSchoolCode(schoolCode)
    const yearCode = normalizeAcademicYearCode(academicYearCode)
    const supabase = await mimCacheClient()

    const { data: run, error: runError } = await supabase
      .from('mim_textbook_sync_runs')
      .select('id,academic_year_code,status,activated_at')
      .eq('academic_year_code', yearCode)
      .eq('status', 'ACTIVE')
      .order('activated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (runError) throw new Error(runError.message)
    if (!run?.activated_at) {
      throw new Error(`La cache Open Data MIM per l’anno scolastico ${formatAcademicYearCode(yearCode)} non è ancora disponibile.`)
    }

    const { data: scopeRows, error: scopeError } = await supabase
      .from('mim_school_scope_cache')
      .select('run_id,academic_year_code,institute_code,school_code,province')
      .eq('run_id', run.id)
      .or(`institute_code.eq.${normalizedSchoolCode},school_code.eq.${normalizedSchoolCode}`)
      .order('school_code')

    if (scopeError) throw new Error(scopeError.message)
    const resolvedSchoolCodes = unique((scopeRows ?? []).map((row) => row.school_code))
    if (!resolvedSchoolCodes.length) {
      throw new Error(`La cache MIM attiva non contiene plessi verificati per il codice ${normalizedSchoolCode}.`)
    }

    const { data: adoptionRows, error: adoptionError } = await supabase
      .from('mim_textbook_adoption_cache')
      .select('*')
      .eq('run_id', run.id)
      .in('school_code', resolvedSchoolCodes)
      .order('school_code')
      .order('grade_number')
      .order('section_code')
      .order('discipline')
      .order('title')

    if (adoptionError) throw new Error(adoptionError.message)
    const records = (adoptionRows ?? []).map(toMimTextbookRecord)

    return {
      datasetCodes: unique(records.map((record) => record.sourceDataset)),
      records,
      resolvedSchoolCodes,
      activatedAt: run.activated_at,
    }
  }
}

async function mimCacheClient() {
  return (await createClient()) as unknown as SupabaseClient<MimCacheDatabase>
}

function toMimTextbookRecord(row: AdoptionCacheRow): MimTextbookRecord {
  return {
    schoolCode: row.school_code,
    gradeNumber: row.grade_number,
    sectionCode: row.section_code,
    schoolGradeType: row.school_grade_type,
    combination: row.combination,
    discipline: row.discipline,
    isbn13: row.isbn13,
    authors: row.authors,
    title: row.title,
    subtitle: row.subtitle,
    volume: row.volume,
    publisher: row.publisher,
    price: row.price,
    newAdoption: row.new_adoption,
    toPurchase: row.to_purchase,
    recommended: row.recommended,
    sourceDataset: row.source_dataset,
    sourceSubject: row.source_subject,
  }
}

function normalizeSchoolCode(value: string) {
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!/^[A-Z0-9]{6,12}$/.test(normalized)) throw new Error('Codice meccanografico non valido')
  return normalized
}

function normalizeAcademicYearCode(value: string) {
  const normalized = value.trim()
  if (!/^20[0-9]{4}$/.test(normalized)) throw new Error('Codice anno scolastico MIM non valido')
  const startYear = Number.parseInt(normalized.slice(0, 4), 10)
  const endYear = Number.parseInt(normalized.slice(4), 10)
  if (endYear !== (startYear + 1) % 100) throw new Error('Codice anno scolastico MIM non valido')
  return normalized
}

function formatAcademicYearCode(value: string) {
  return `${value.slice(0, 4)}/${value.slice(4)}`
}

function unique<T>(values: T[]) {
  return [...new Set(values)]
}
