import type { LessonDesignExtension } from '@/core/domain/lesson-design-extension'

export type LiveMaterialLink = {
  href: string
  label: 'Apri' | 'Apri su Atlas'
  external: boolean
}

export function resolveLiveMaterialLink(
  extension: Pick<LessonDesignExtension, 'sourceKind' | 'sourceRef' | 'payload'>,
): LiveMaterialLink | null {
  if (extension.sourceRef?.startsWith('knowledge:')) {
    const assetId = extension.sourceRef.slice('knowledge:'.length).trim()
    if (!assetId) return null
    return {
      href: `/knowledge/${encodeURIComponent(assetId)}`,
      label: 'Apri',
      external: false,
    }
  }

  if (extension.sourceKind === 'ATLAS' && typeof extension.payload.publicUrl === 'string') {
    const href = extension.payload.publicUrl.trim()
    if (!href) return null
    return {
      href,
      label: 'Apri su Atlas',
      external: true,
    }
  }

  return null
}
