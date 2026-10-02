export function normalizePdfExtractedText(value: string) {
  return value
    .replace(/\u0000/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function hasUsablePdfText(value: string) {
  const normalized = normalizePdfExtractedText(value)
  const alphanumeric = normalized.match(/[\p{L}\p{N}]/gu)?.length ?? 0
  return alphanumeric >= 20
}
