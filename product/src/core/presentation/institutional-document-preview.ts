import { findForbiddenTechnicalReferences } from '../application/document-template-quality'
import type { DocumentTemplateVersionDraft, TemplateField, TemplateSection } from '../domain/document-template'

export type InstitutionalPreviewSection = {
  title: string
  role: TemplateSection['renderRole']
  lines: string[]
  table?: { columns: string[]; rows: string[][] }
  checklist?: string[]
}

export type InstitutionalPreview = {
  title: string
  sections: InstitutionalPreviewSection[]
  text: string
}

type TableValue = {
  columns: string[]
  rows: string[][]
}

export function renderInstitutionalPreview(input: {
  template: DocumentTemplateVersionDraft
  values: Record<string, unknown>
}): InstitutionalPreview {
  const sections = input.template.sections.flatMap((section) => {
    if (!section.required && !section.fields.some((field) => hasValue(input.values[field.key]))) return []
    const rendered = renderSection(section, input.values)
    return rendered.lines.length || rendered.table || rendered.checklist?.length ? [rendered] : []
  })
  const text = [
    input.template.name,
    ...sections.flatMap((section) => [
      section.title,
      ...section.lines,
      ...(section.table ? [section.table.columns.join(' | '), ...section.table.rows.map((row) => row.join(' | '))] : []),
      ...(section.checklist ?? []),
    ]),
  ].join('\n')
  assertInstitutionalOutputPurity(text)
  return { title: input.template.name, sections, text }
}

export function assertInstitutionalOutputPurity(text: string): void {
  const forbidden = findForbiddenTechnicalReferences(text)
  if (forbidden.length) {
    throw new Error(`L’output istituzionale contiene riferimenti tecnici vietati: ${forbidden.join(', ')}`)
  }
}

function renderSection(section: TemplateSection, values: Record<string, unknown>): InstitutionalPreviewSection {
  if (section.renderRole === 'TABLE') {
    const table = firstTable(section.fields, values)
    return { title: section.label, role: section.renderRole, lines: [], ...(table ? { table } : {}) }
  }

  if (section.renderRole === 'CHECKLIST') {
    const checklist = section.fields.flatMap((field) => renderChecklist(field, values[field.key]))
    const lines = section.fields.flatMap((field) => field.type === 'MULTI_SELECT' || field.type === 'CHECKLIST'
      ? []
      : renderLabeledValue(field, values[field.key]))
    return { title: section.label, role: section.renderRole, lines, checklist }
  }

  const lines = section.fields.flatMap((field) => renderLabeledValue(field, values[field.key]))
  return { title: section.label, role: section.renderRole, lines }
}

function firstTable(fields: TemplateField[], values: Record<string, unknown>): TableValue | undefined {
  for (const field of fields) {
    const raw = values[field.key]
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue
    const candidate = raw as Partial<TableValue>
    if (!Array.isArray(candidate.columns) || !Array.isArray(candidate.rows)) continue
    const columns = candidate.columns.map(stringValue)
    const rows = candidate.rows.map((row) => Array.isArray(row) ? row.map(stringValue) : [])
    return { columns, rows }
  }
  return undefined
}

function renderChecklist(field: TemplateField, raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const selected = new Set(raw.filter((value): value is string => typeof value === 'string'))
  return (field.options ?? []).filter((option) => selected.has(option.value)).map((option) => option.label)
}

function renderLabeledValue(field: TemplateField, raw: unknown): string[] {
  if (!hasValue(raw)) return []
  if (field.type === 'MULTI_SELECT' || field.type === 'CHECKLIST') return renderChecklist(field, raw)
  if (Array.isArray(raw)) return raw.map((value) => `${field.label}: ${stringValue(value)}`)
  return [`${field.label}: ${stringValue(raw)}`]
}

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  return true
}

function stringValue(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}
