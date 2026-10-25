export type ContextualFabPreference =
  | { version: 1; mode: 'auto' }
  | { version: 1; mode: 'manual'; edge: 'left' | 'right'; yRatio: number }

export type FabRect = {
  left: number
  top: number
  right: number
  bottom: number
}

export type FabPlacement =
  | { layout: 'floating'; left: number; top: number; edge: 'left' | 'right'; displaced: boolean }
  | { layout: 'docked'; displaced: boolean }

export type ResolveContextualFabPlacementInput = {
  viewport: FabRect
  fabSize: { width: number; height: number }
  protectedRects: FabRect[]
  preference: ContextualFabPreference
  currentPlacement?: FabPlacement | null
  gap?: number
}

export type SnapContextualFabPreferenceInput = {
  pointerX: number
  pointerY: number
  viewport: FabRect
}

const AUTO_PREFERENCE: ContextualFabPreference = { version: 1, mode: 'auto' }

export function parseContextualFabPreference(raw: string | null): ContextualFabPreference {
  if (!raw) return AUTO_PREFERENCE

  try {
    const parsed = JSON.parse(raw) as Partial<ContextualFabPreference> & { yRatio?: unknown }
    if (parsed.version !== 1) return AUTO_PREFERENCE
    if (parsed.mode === 'auto') return AUTO_PREFERENCE
    if (parsed.mode !== 'manual') return AUTO_PREFERENCE
    if (parsed.edge !== 'left' && parsed.edge !== 'right') return AUTO_PREFERENCE
    if (typeof parsed.yRatio !== 'number' || !Number.isFinite(parsed.yRatio) || parsed.yRatio < 0 || parsed.yRatio > 1) {
      return AUTO_PREFERENCE
    }

    return {
      version: 1,
      mode: 'manual',
      edge: parsed.edge,
      yRatio: parsed.yRatio,
    }
  } catch {
    return AUTO_PREFERENCE
  }
}

export function snapContextualFabPreference({
  pointerX,
  pointerY,
  viewport,
}: SnapContextualFabPreferenceInput): ContextualFabPreference {
  const width = Math.max(1, viewport.right - viewport.left)
  const height = Math.max(1, viewport.bottom - viewport.top)
  const edge = pointerX < viewport.left + width / 2 ? 'left' : 'right'
  const yRatio = clamp((pointerY - viewport.top) / height, 0, 1)

  return { version: 1, mode: 'manual', edge, yRatio }
}

export function resolveContextualFabPlacement({
  viewport,
  fabSize,
  protectedRects,
  preference,
  currentPlacement,
  gap = 12,
}: ResolveContextualFabPlacementInput): FabPlacement {
  const safeLeft = viewport.left + gap
  const safeRight = viewport.right - gap - fabSize.width
  const safeTop = viewport.top + gap
  const safeBottom = viewport.bottom - gap - fabSize.height
  const manual = preference.mode === 'manual'

  if (safeLeft > safeRight || safeTop > safeBottom) {
    return { layout: 'docked', displaced: manual }
  }

  if (currentPlacement?.layout === 'floating') {
    const currentRect = placementRect(currentPlacement, fabSize)
    if (insideViewport(currentRect, viewport, gap) && isClear(currentRect, protectedRects)) {
      return currentPlacement
    }
  }

  const preferredEdge = manual ? preference.edge : 'right'
  const targetTop = preferredTop(preference, viewport, fabSize.height, safeTop, safeBottom)
  const preferred = candidate(preferredEdge, targetTop, safeLeft, safeRight, fabSize)

  if (isClear(preferred.rect, protectedRects)) {
    return {
      layout: 'floating',
      left: preferred.left,
      top: preferred.top,
      edge: preferredEdge,
      displaced: false,
    }
  }

  const edgeOrder: Array<'left' | 'right'> = manual
    ? [preferredEdge]
    : [preferredEdge, preferredEdge === 'right' ? 'left' : 'right']

  for (const edge of edgeOrder) {
    for (const top of candidateTops(targetTop, safeTop, safeBottom, protectedRects, fabSize.height, gap)) {
      const next = candidate(edge, top, safeLeft, safeRight, fabSize)
      if (!isClear(next.rect, protectedRects)) continue
      return {
        layout: 'floating',
        left: next.left,
        top: next.top,
        edge,
        displaced: true,
      }
    }
  }

  return { layout: 'docked', displaced: manual }
}

function preferredTop(
  preference: ContextualFabPreference,
  viewport: FabRect,
  height: number,
  safeTop: number,
  safeBottom: number,
) {
  if (preference.mode === 'manual') {
    const center = viewport.top + (viewport.bottom - viewport.top) * preference.yRatio
    return clamp(center - height / 2, safeTop, safeBottom)
  }

  return safeBottom
}

function candidate(
  edge: 'left' | 'right',
  top: number,
  safeLeft: number,
  safeRight: number,
  fabSize: { width: number; height: number },
) {
  const left = edge === 'left' ? safeLeft : safeRight
  return {
    left,
    top,
    rect: {
      left,
      top,
      right: left + fabSize.width,
      bottom: top + fabSize.height,
    },
  }
}

function candidateTops(
  targetTop: number,
  safeTop: number,
  safeBottom: number,
  protectedRects: FabRect[],
  fabHeight: number,
  gap: number,
) {
  const values = new Set<number>([safeTop, safeBottom])

  for (const rect of protectedRects) {
    values.add(clamp(rect.top - gap - fabHeight, safeTop, safeBottom))
    values.add(clamp(rect.bottom + gap, safeTop, safeBottom))
  }

  return [...values].sort((a, b) => Math.abs(a - targetTop) - Math.abs(b - targetTop))
}

function placementRect(
  placement: Extract<FabPlacement, { layout: 'floating' }>,
  fabSize: { width: number; height: number },
): FabRect {
  return {
    left: placement.left,
    top: placement.top,
    right: placement.left + fabSize.width,
    bottom: placement.top + fabSize.height,
  }
}

function insideViewport(rect: FabRect, viewport: FabRect, gap: number) {
  return rect.left >= viewport.left + gap
    && rect.right <= viewport.right - gap
    && rect.top >= viewport.top + gap
    && rect.bottom <= viewport.bottom - gap
}

function isClear(rect: FabRect, protectedRects: FabRect[]) {
  return protectedRects.every((protectedRect) => !intersects(rect, protectedRect))
}

function intersects(a: FabRect, b: FabRect) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
