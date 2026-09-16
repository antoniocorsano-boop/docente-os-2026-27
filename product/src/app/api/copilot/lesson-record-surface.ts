import type { LessonReflectionSurface } from './lesson-reflection-context-loader'

export const LESSON_SURFACE_HEADER = 'x-docente-surface-path'

export function lessonRecordSurfaceFromRequest(request: Request): LessonReflectionSurface | null {
  const current = new URL(request.url)
  const referer = request.headers.get('referer')

  if (referer) {
    try {
      const refererUrl = new URL(referer)
      if (refererUrl.origin === current.origin) {
        const surface = lessonRecordSurfaceFromUrl(refererUrl)
        if (surface) return surface
      }
    } catch {
      // Fall through to the explicit same-origin surface locator.
    }
  }

  const relativeSurface = request.headers.get(LESSON_SURFACE_HEADER)
  if (!relativeSurface || !relativeSurface.startsWith('/') || relativeSurface.startsWith('//')) return null

  try {
    const surfaceUrl = new URL(relativeSurface, current.origin)
    if (surfaceUrl.origin !== current.origin) return null
    return lessonRecordSurfaceFromUrl(surfaceUrl)
  } catch {
    return null
  }
}

export function lessonRecordSurfaceFromUrl(surfaceUrl: URL): LessonReflectionSurface | null {
  if (surfaceUrl.searchParams.get('mode') !== 'record') return null

  const match = surfaceUrl.pathname.match(/^\/classi\/([^/]+)\/lezioni\/([^/]+)$/)
  if (!match) return null

  try {
    const sectionId = decodeURIComponent(match[1]).trim()
    const blockId = decodeURIComponent(match[2]).trim().toUpperCase()
    if (!sectionId || !/^[A-Z0-9-]+$/.test(blockId)) return null
    return { sectionId, blockId }
  } catch {
    return null
  }
}
