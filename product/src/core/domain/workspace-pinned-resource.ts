export const WORKSPACE_PINNED_RESOURCE_SLOTS = [
  {
    kind: 'TODAY',
    label: 'Oggi',
    description: 'Orario, impegni e punto di partenza della giornata.',
  },
  {
    kind: 'SECTION',
    label: 'Sezione',
    description: 'Contesto operativo della classe o sezione di riferimento.',
  },
  {
    kind: 'PLANNING',
    label: 'Progettazione',
    description: 'Programmazione, UDA e materiali in corso.',
  },
  {
    kind: 'DIARY',
    label: 'Diario',
    description: 'Registrazione di ciò che è realmente accaduto.',
  },
  {
    kind: 'PROBATION',
    label: 'Anno di prova',
    description: 'Evidenze, formazione e adempimenti professionali.',
  },
] as const

export type WorkspacePinnedResourceKind = typeof WORKSPACE_PINNED_RESOURCE_SLOTS[number]['kind']

export type WorkspacePinnedResource = {
  id: string
  workspaceId: string
  academicYearId: string
  kind: WorkspacePinnedResourceKind
  targetUrl: string
  note: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

export function asWorkspacePinnedResourceKind(value: string): WorkspacePinnedResourceKind {
  const slot = WORKSPACE_PINNED_RESOURCE_SLOTS.find((candidate) => candidate.kind === value)
  if (!slot) throw new Error(`Unsupported workspace pinned resource kind: ${value}`)
  return slot.kind
}

export function normalizeWorkspacePinnedResourceTarget(value: string) {
  const normalized = value.trim()
  if (!normalized) throw new Error('Pinned resource target required')
  if (normalized.length > 2048) throw new Error('Pinned resource target too long')
  if (normalized.startsWith('/')) return normalized

  let parsed: URL
  try {
    parsed = new URL(normalized)
  } catch {
    throw new Error('Pinned resource target must be an internal path or HTTPS URL')
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Pinned resource external target must use HTTPS')
  }
  return parsed.toString()
}

export function normalizeWorkspacePinnedResourceNote(value: string | null) {
  const normalized = value?.trim() ?? ''
  if (normalized.length > 500) throw new Error('Pinned resource note too long')
  return normalized || null
}
