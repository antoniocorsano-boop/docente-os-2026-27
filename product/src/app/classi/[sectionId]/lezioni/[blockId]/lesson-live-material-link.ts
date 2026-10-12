import { resolveStudioAtlasLocatorHref } from '@/core/domain/atlas-material-handoff'
import type { LessonDesignExtension } from '@/core/domain/lesson-design-extension'

export type LiveMaterialLink = {
  href: string
  label: 'Apri' | 'Apri su Atlas'
  external: boolean
}

export function resolveLiveMaterialLink(
  extension: Pick<LessonDesignExtension, 'sourceKind' | 'sourceRef' | 'payload'>,
  studioAtlasOrigin: string | null,
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

  if (extension.sourceKind === 'ATLAS') {
    const href = resolveStudioAtlasLocatorHref(studioAtlasOrigin, extension.payload.atlasLocator)
    if (!href) return null
    return {
      href,
      label: 'Apri su Atlas',
      external: true,
    }
  }

  return null
}
