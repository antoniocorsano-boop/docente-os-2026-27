'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefCallback,
} from 'react'
import {
  createProtectedRegionObservation,
  type ProtectedRegionRoot,
  type ResizeObserverLike,
} from './contextual-fab-protected-regions'
import {
  parseContextualFabPreference,
  resolveContextualFabPlacement,
  snapContextualFabPreference,
  type ContextualFabPreference,
  type FabPlacement,
  type FabRect,
} from './contextual-fab-positioning'

const STORAGE_KEY = 'DOCENTE_OS_CONTEXTUAL_FAB_PLACEMENT_V1'
const DRAG_THRESHOLD_PX = 6
const DEFAULT_GAP_PX = 12
const AUTO_PREFERENCE: ContextualFabPreference = { version: 1, mode: 'auto' }

type DragState = {
  pointerId: number
  startX: number
  startY: number
  dragged: boolean
  originalPlacement: FabPlacement
}

export type ContextualFabPosition = {
  triggerRef: RefCallback<HTMLButtonElement>
  ready: boolean
  mode: ContextualFabPreference['mode']
  layout: FabPlacement['layout']
  displaced: boolean
  edge?: 'left' | 'right'
  style: CSSProperties
  hasManualPreference: boolean
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onPointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onPointerCancel: (event: ReactPointerEvent<HTMLButtonElement>) => void
  allowActivation: () => boolean
  resetToAuto: () => void
}

export function useContextualFabPosition({ enabled = true }: { enabled?: boolean } = {}): ContextualFabPosition {
  const [triggerNode, setTriggerNode] = useState<HTMLButtonElement | null>(null)
  const [ready, setReady] = useState(false)
  const [preference, setPreference] = useState<ContextualFabPreference>(AUTO_PREFERENCE)
  const [dragPreference, setDragPreference] = useState<ContextualFabPreference | null>(null)
  const [placement, setPlacement] = useState<FabPlacement>({ layout: 'docked', displaced: false })
  const placementRef = useRef<FabPlacement>(placement)
  const dragRef = useRef<DragState | null>(null)
  const suppressNextClickRef = useRef(false)
  const frameRef = useRef<number | null>(null)

  const triggerRef = useCallback<RefCallback<HTMLButtonElement>>((node) => {
    setTriggerNode(node)
    setReady(false)
    if (node && typeof window !== 'undefined') {
      setPreference(parseContextualFabPreference(window.localStorage.getItem(STORAGE_KEY)))
    }
  }, [])

  const commitPlacement = useCallback((next: FabPlacement) => {
    placementRef.current = next
    setPlacement(next)
  }, [])

  const measure = useCallback((nextPreference: ContextualFabPreference, preserveCurrent: boolean) => {
    if (!enabled || !triggerNode || typeof window === 'undefined') return null

    const viewport = effectiveViewportRect()
    const triggerRect = triggerNode.getBoundingClientRect()
    const protectedRects = collectProtectedRects(triggerNode)
    const next = resolveContextualFabPlacement({
      viewport,
      fabSize: { width: triggerRect.width || 56, height: triggerRect.height || 56 },
      protectedRects,
      preference: nextPreference,
      currentPlacement: preserveCurrent ? placementRef.current : undefined,
      gap: DEFAULT_GAP_PX,
    })
    commitPlacement(next)
    return next
  }, [commitPlacement, enabled, triggerNode])

  const scheduleMeasure = useCallback((nextPreference: ContextualFabPreference, preserveCurrent = true) => {
    if (typeof window === 'undefined') return
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current)
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null
      const measured = measure(nextPreference, preserveCurrent)
      setReady(Boolean(measured))
    })
  }, [measure])

  useEffect(() => {
    if (!enabled || !triggerNode || typeof window === 'undefined') return

    scheduleMeasure(preference, false)

    const remeasure = () => scheduleMeasure(dragPreference ?? preference, true)
    const visualViewport = window.visualViewport
    const nativeResizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(remeasure)
    const resizeObserver: ResizeObserverLike<HTMLElement> | null = nativeResizeObserver
      ? {
          disconnect: () => nativeResizeObserver.disconnect(),
          observe: (element) => nativeResizeObserver.observe(element),
        }
      : null
    const protectedRegionRoot: ProtectedRegionRoot<HTMLElement, Node> = {
      queryProtectedRegions: () => document.querySelectorAll<HTMLElement>('[data-copilot-protected]'),
      queryBottomNavigation: () => document.querySelector<HTMLElement>('.dosBottomNav'),
      mutationTarget: document.body,
    }
    const stopProtectedRegionObservation = createProtectedRegionObservation({
      root: protectedRegionRoot,
      trigger: triggerNode,
      resizeObserver,
      createMutationObserver: typeof MutationObserver === 'undefined'
        ? undefined
        : (callback) => {
            const observer = new MutationObserver(callback)
            return {
              disconnect: () => observer.disconnect(),
              observe: (target, options) => observer.observe(target, options),
            }
          },
      onGeometryChange: remeasure,
    })

    window.addEventListener('resize', remeasure)
    window.addEventListener('scroll', remeasure, true)
    visualViewport?.addEventListener('resize', remeasure)
    visualViewport?.addEventListener('scroll', remeasure)

    return () => {
      stopProtectedRegionObservation()
      window.removeEventListener('resize', remeasure)
      window.removeEventListener('scroll', remeasure, true)
      visualViewport?.removeEventListener('resize', remeasure)
      visualViewport?.removeEventListener('scroll', remeasure)
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
    }
  }, [dragPreference, enabled, preference, scheduleMeasure, triggerNode])

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!enabled || !ready || event.button !== 0) return
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dragged: false,
      originalPlacement: placementRef.current,
    }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }, [enabled, ready])

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId || typeof window === 'undefined') return

    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY)
    if (!drag.dragged && distance < DRAG_THRESHOLD_PX) return
    drag.dragged = true

    const nextPreference = snapContextualFabPreference({
      pointerX: event.clientX,
      pointerY: event.clientY,
      viewport: effectiveViewportRect(),
    })
    setDragPreference(nextPreference)
    measure(nextPreference, false)
  }, [measure])

  const onPointerUp = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId || typeof window === 'undefined') return

    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId)
    }

    if (drag.dragged) {
      const nextPreference = snapContextualFabPreference({
        pointerX: event.clientX,
        pointerY: event.clientY,
        viewport: effectiveViewportRect(),
      })
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPreference))
      setPreference(nextPreference)
      setDragPreference(null)
      measure(nextPreference, false)
      suppressNextClickRef.current = true
    }

    dragRef.current = null
  }, [measure])

  const onPointerCancel = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId)
    }
    setDragPreference(null)
    commitPlacement(drag.originalPlacement)
    dragRef.current = null
  }, [commitPlacement])

  const allowActivation = useCallback(() => {
    if (!suppressNextClickRef.current) return true
    suppressNextClickRef.current = false
    return false
  }, [])

  const resetToAuto = useCallback(() => {
    if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY)
    setDragPreference(null)
    setPreference(AUTO_PREFERENCE)
    measure(AUTO_PREFERENCE, false)
  }, [measure])

  const effectivePreference = dragPreference ?? preference
  const edge = effectivePreference.mode === 'manual'
    ? effectivePreference.edge
    : placement.layout === 'floating' ? placement.edge : undefined
  const style: CSSProperties = placement.layout === 'floating'
    ? { left: placement.left, top: placement.top, right: 'auto', bottom: 'auto' }
    : {}

  return {
    triggerRef,
    ready,
    mode: effectivePreference.mode,
    layout: placement.layout,
    displaced: placement.displaced,
    edge,
    style,
    hasManualPreference: preference.mode === 'manual',
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    allowActivation,
    resetToAuto,
  }
}

function effectiveViewportRect(): FabRect {
  const visualViewport = window.visualViewport
  if (visualViewport) {
    return {
      left: visualViewport.offsetLeft,
      top: visualViewport.offsetTop,
      right: visualViewport.offsetLeft + visualViewport.width,
      bottom: visualViewport.offsetTop + visualViewport.height,
    }
  }

  return { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight }
}

function collectProtectedRects(triggerNode: HTMLElement): FabRect[] {
  const regions = Array.from(document.querySelectorAll<HTMLElement>('[data-copilot-protected]'))
  const bottomNav = document.querySelector<HTMLElement>('.dosBottomNav')
  if (bottomNav) regions.push(bottomNav)

  return regions
    .filter((element) => element !== triggerNode)
    .map((element) => element.getBoundingClientRect())
    .filter((rect) => rect.width > 0 && rect.height > 0)
    .map((rect) => ({ left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom }))
}
