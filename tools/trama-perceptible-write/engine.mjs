import { FEEDBACK_ASSERTION, UI_FEEDBACK, matchesPattern } from './lib.mjs'

export function requireComparison(base, head) {
  if (!base || !head || /^0+$/.test(base) || /^0+$/.test(head)) {
    return ['comparison base/head required']
  }
  return []
}

export function validateEvidenceModel({
  surfaces,
  mutationPaths,
  deletedPaths = [],
  trackedFiles = [],
  baseSurfaces = [],
  exists,
  readFile,
}) {
  const errors = []
  const current = surfaces ?? []

  for (const surface of current) {
    if (!surface.id || !Array.isArray(surface.sourcePatterns) || !surface.sourcePatterns.length) {
      errors.push('surface entry missing id/sourcePatterns')
      continue
    }
    if (!Array.isArray(surface.feedbackFiles) || !surface.feedbackFiles.length) {
      errors.push(surface.id + ': feedbackFiles required')
      continue
    }
    if (!Array.isArray(surface.testFiles) || !surface.testFiles.length) {
      errors.push(surface.id + ': testFiles required')
      continue
    }

    for (const file of [...surface.feedbackFiles, ...surface.testFiles]) {
      if (!exists(file)) errors.push(surface.id + ': referenced evidence file missing: ' + file)
    }

    if (surface.feedbackFiles.every(exists)) {
      const feedbackText = surface.feedbackFiles.map(readFile).join('\n')
      if (!UI_FEEDBACK.test(feedbackText)) {
        errors.push(surface.id + ': no observable UI feedback marker in declared feedbackFiles')
      }
    }

    if (surface.testFiles.every(exists)) {
      const testText = surface.testFiles.map(readFile).join('\n')
      if (!FEEDBACK_ASSERTION.test(testText)) {
        errors.push(surface.id + ': tests do not assert perceived feedback')
      }
    }
  }

  for (const path of mutationPaths) {
    const bound = current.filter((surface) =>
      surface.sourcePatterns?.some((pattern) => matchesPattern(pattern, path))
    )
    if (bound.length !== 1) {
      errors.push(path + ': changed mutation must bind to exactly one declared write surface')
    }
  }

  const currentIds = new Set(current.map((surface) => surface.id))
  for (const oldSurface of baseSurfaces ?? []) {
    if (!currentIds.has(oldSurface.id)) {
      const sourceStillExists = (oldSurface.sourcePatterns ?? []).some((pattern) =>
        trackedFiles.some((path) => matchesPattern(pattern, path))
      )
      if (sourceStillExists) errors.push(oldSurface.id + ': write surface removed while source still exists')
    }
  }

  for (const path of deletedPaths) {
    for (const surface of current) {
      if ([...(surface.feedbackFiles ?? []), ...(surface.testFiles ?? [])].includes(path)) {
        errors.push(surface.id + ': declared evidence file deleted: ' + path)
      }
    }
  }

  return [...new Set(errors)]
}
