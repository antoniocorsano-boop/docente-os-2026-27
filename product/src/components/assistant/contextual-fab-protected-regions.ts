export type ProtectedRegionRoot<TElement, TMutationTarget = unknown> = {
  queryProtectedRegions: () => Iterable<TElement>
  queryBottomNavigation: () => TElement | null
  mutationTarget?: TMutationTarget
}

export type ResizeObserverLike<TElement> = {
  disconnect: () => void
  observe: (element: TElement) => void
}

export type MutationObserverLike<TMutationTarget> = {
  disconnect: () => void
  observe: (target: TMutationTarget, options: { childList: true; subtree: true }) => void
}

export type ProtectedRegionObservationInput<
  TElement,
  TMutationTarget = unknown,
> = {
  root: ProtectedRegionRoot<TElement, TMutationTarget>
  trigger: TElement
  resizeObserver: ResizeObserverLike<TElement> | null
  createMutationObserver?: (
    callback: () => void,
  ) => MutationObserverLike<TMutationTarget>
  onGeometryChange: () => void
}

export function createProtectedRegionObservation<
  TElement,
  TMutationTarget = unknown,
>({
  root,
  trigger,
  resizeObserver,
  createMutationObserver,
  onGeometryChange,
}: ProtectedRegionObservationInput<TElement, TMutationTarget>) {
  const syncResizeObserver = () => {
    if (!resizeObserver) return
    resizeObserver.disconnect()

    const observed = new Set<TElement>()
    const observe = (element: TElement | null) => {
      if (!element || observed.has(element)) return
      observed.add(element)
      resizeObserver.observe(element)
    }

    observe(trigger)
    for (const element of root.queryProtectedRegions()) observe(element)
    observe(root.queryBottomNavigation())
  }

  syncResizeObserver()

  const mutationObserver = createMutationObserver?.(() => {
    syncResizeObserver()
    onGeometryChange()
  })

  if (mutationObserver) {
    const target = root.mutationTarget ?? (root as unknown as TMutationTarget)
    mutationObserver.observe(target, { childList: true, subtree: true })
  }

  return () => {
    mutationObserver?.disconnect()
    resizeObserver?.disconnect()
  }
}
