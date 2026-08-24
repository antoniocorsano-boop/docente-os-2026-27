import type { AuthoredDocumentSnapshot, AuthoredDocumentVersion } from '@/core/domain/authored-document'

export type ExportBlock =
  | { kind: 'heading'; level: 1 | 2 | 3; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'bullet'; text: string }
  | { kind: 'numbered'; number: string; text: string }
  | { kind: 'blank' }

export function selectExportVersion(snapshot: AuthoredDocumentSnapshot, requestedVersion?: string | null): AuthoredDocumentVersion | null {
  if (!requestedVersion) return snapshot.current
  if (!/^\d+$/.test(requestedVersion)) return null
  const versionNo = Number(requestedVersion)
  return snapshot.versions.find((version) => version.versionNo === versionNo) ?? null
}

export function exportBlocks(markdown: string): ExportBlock[] {
  return markdown.replace(/\r\n?/g, '\n').split('\n').map((raw) => {
    const line = raw.trimEnd()
    if (!line.trim()) return { kind: 'blank' } as const
    const heading = /^(#{1,3})\s+(.+)$/.exec(line.trim())
    if (heading) return { kind: 'heading', level: heading[1].length as 1 | 2 | 3, text: heading[2].trim() } as const
    const bullet = /^[-*]\s+(.+)$/.exec(line.trim())
    if (bullet) return { kind: 'bullet', text: bullet[1].trim() } as const
    const numbered = /^(\d+)[.)]\s+(.+)$/.exec(line.trim())
    if (numbered) return { kind: 'numbered', number: numbered[1], text: numbered[2].trim() } as const
    return { kind: 'paragraph', text: line.trim() } as const
  })
}
