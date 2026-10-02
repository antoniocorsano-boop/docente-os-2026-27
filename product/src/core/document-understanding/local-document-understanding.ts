export type LocalDocumentStrategy =
  | 'NATIVE_TEXT'
  | 'LOCAL_OCR'
  | 'STRUCTURAL_RECONSTRUCTION'
  | 'BROWSER_AI'
  | 'REMOTE_ASSIST'
  | 'MANUAL_REVIEW'

export type LocalDocumentPoint = Readonly<{ x: number; y: number }>

export type LocalDocumentTextItem = Readonly<{
  text: string
  confidence: number | null
  polygon: readonly LocalDocumentPoint[]
  page: number
}>

export type LocalDocumentCapabilities = Readonly<{
  nativeTextUsable: boolean
  localOcrAvailable: boolean
  structuralEvidenceAvailable: boolean
  browserAiAvailable: boolean
  remoteAssistEnabled: boolean
}>

export type LocalDocumentRoutingDecision = Readonly<{
  strategy: LocalDocumentStrategy
  reason:
    | 'native-text-usable'
    | 'raster-local-ocr'
    | 'structure-ready'
    | 'browser-ai-progressive-enhancement'
    | 'remote-assist-governed-fallback'
    | 'manual-review-required'
}>

export function chooseLocalDocumentStrategy(
  input: LocalDocumentCapabilities,
): LocalDocumentRoutingDecision {
  if (input.nativeTextUsable) {
    return { strategy: 'NATIVE_TEXT', reason: 'native-text-usable' }
  }

  if (input.localOcrAvailable) {
    return { strategy: 'LOCAL_OCR', reason: 'raster-local-ocr' }
  }

  if (input.structuralEvidenceAvailable) {
    return { strategy: 'STRUCTURAL_RECONSTRUCTION', reason: 'structure-ready' }
  }

  if (input.browserAiAvailable) {
    return {
      strategy: 'BROWSER_AI',
      reason: 'browser-ai-progressive-enhancement',
    }
  }

  if (input.remoteAssistEnabled) {
    return {
      strategy: 'REMOTE_ASSIST',
      reason: 'remote-assist-governed-fallback',
    }
  }

  return {
    strategy: 'MANUAL_REVIEW',
    reason: 'manual-review-required',
  }
}

export function rectFromPolygon(
  polygon: readonly LocalDocumentPoint[],
): Readonly<{ x: number; y: number; width: number; height: number }> | null {
  if (!polygon.length) return null
  const xs = polygon.map((point) => point.x)
  const ys = polygon.map((point) => point.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  const right = Math.max(...xs)
  const bottom = Math.max(...ys)
  if (![x, y, right, bottom].every(Number.isFinite)) return null
  return {
    x,
    y,
    width: Math.max(0, right - x),
    height: Math.max(0, bottom - y),
  }
}
