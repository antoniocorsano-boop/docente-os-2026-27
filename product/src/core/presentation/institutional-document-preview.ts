import { findForbiddenTechnicalReferences } from '../application/document-template-quality'
import type {
  DocumentTemplateVersionDraft,
  InstitutionalBaseVersionDraft,
  InstitutionalRenderPin,
  TemplateField,
  TemplateSection,
} from '../domain/document-template'

export type InstitutionalBaseRenderVersion = {
  baseId: string
  versionNo: number
  draft: InstitutionalBaseVersionDraft
}

export type DocumentTemplateRenderVersion = {
  templateId: string
  versionNo: number
  draft: DocumentTemplateVersionDraft
}

export type InstitutionalPreviewSection = {
  title: string
  role: TemplateSection['renderRole']
  lines: string[]
  table?: { columns: string[]; rows: string[][] }
  tables?: { columns: string[]; rows: string[][] }[]
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
  institutionalBase: InstitutionalBaseRenderVersion
  template: DocumentTemplateRenderVersion
  values: Record<string, unknown>
}): InstitutionalPreview {
  assertResolvedVersions(input.institutionalBase, input.template)

  const base = input.institutionalBase.draft
  const template = input.template.draft
  const sections = template.sections.flatMap((section) => {
    if (!section.required && !section.fields.some((field) => hasValue(input.values[field.key]))) return []
    const rendered = renderSection(section, input.values)
    return rendered.lines.length || rendered.table || rendered.checklist?.length ? [rendered] : []
  })
  const text = [
    base.identityProfile.institutionName,
    ...base.headerProfile.lines,
    template.name,
    ...sections.flatMap((section) => [
      section.title,
      ...section.lines,
      ...((section.tables ?? (section.table ? [section.table] : [])).flatMap((table) => [
        table.columns.join(' | '),
        ...table.rows.map((row) => row.join(' | ')),
      ])),
      ...(section.checklist ?? []),
    ]),
    ...base.footerProfile.lines,
  ].filter((line) => line.trim().length > 0).join('\n')
  assertInstitutionalOutputPurity(text)
  return { title: template.name, sections, text }
}

export function renderPinnedInstitutionalPreview(input: {
  pin: InstitutionalRenderPin
  institutionalBase: InstitutionalBaseRenderVersion
  template: DocumentTemplateRenderVersion
  values: Record<string, unknown>
}): InstitutionalPreview {
  const { pin, institutionalBase, template } = input
  if (
    pin.institutionalBaseId !== institutionalBase.baseId
    || pin.institutionalBaseVersionNo !== institutionalBase.versionNo
    || pin.familyTemplateId !== template.templateId
    || pin.familyTemplateVersionNo !== template.versionNo
  ) {
    throw new Error('Il pin istituzionale non corrisponde alle versioni risolte di base e modello.')
  }

  return renderInstitutionalPreview({ institutionalBase, template, values: input.values })
}

export function assertInstitutionalOutputPurity(text: string): void {
  const forbidden = findForbiddenTechnicalReferences(text)
  if (forbidden.length) {
    throw new Error(`L’output istituzionale contiene riferimenti tecnici vietati: ${forbidden.join(', ')}`)
  }
}

function assertResolvedVersions(
  institutionalBase: InstitutionalBaseRenderVersion,
  template: DocumentTemplateRenderVersion,
): void {
  if (
    !Number.isInteger(institutionalBase.versionNo)
    || institutionalBase.versionNo < 1
    || institutionalBase.draft.version !== institutionalBase.versionNo
  ) {
    throw new Error('La versione risolta della base istituzionale non corrisponde al relativo contenuto.')
  }
  if (
    !Number.isInteger(template.versionNo)
    || template.versionNo < 1
    || template.draft.version !== template.versionNo
  ) {
    throw new Error('La versione risolta del modello documentale non corrisponde al relativo contenuto.')
  }
  if (!institutionalBase.baseId.trim() || !template.templateId.trim()) {
    throw new Error('Le identità risolte di base e modello sono obbligatorie.')
  }
}

function renderSection(section: TemplateSection, values: Record<string, unknown>): InstitutionalPreviewSection {
  if (section.renderRole === 'TABLE') {
    const tables = section.fields.flatMap((field) => {
      const table = tableValue(values[field.key])
      return table ? [table] : []
    })
    const lines = section.fields.flatMap((field) => (
      tableValue(values[field.key]) ? [] : renderLabeledValue(field, values[field.key])
    ))
    return {
      title: section.label,
      role: section.renderRole,
      lines,
      ...(tables.length ? { table: tables[0], tables } : {}),
    }
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

function tableValue(raw: unknown): TableValue | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const candidate = raw as Partial<TableValue>
  if (!Array.isArray(candidate.columns) || !Array.isArray(candidate.rows)) return undefined
  const columns = candidate.columns.map(stringValue)
  const rows = candidate.rows.map((row) => Array.isArray(row) ? row.map(stringValue) : [])
  return { columns, rows }
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
