export function presentClassCivicEducationProgress(minutes: number) {
  if (!Number.isInteger(minutes) || minutes < 0) {
    throw new Error('Civic education annual minutes must be a non-negative integer')
  }

  return minutes === 0
    ? 'Educazione civica: nessun contributo registrato finora.'
    : `Educazione civica: ${minutes} minuti registrati nell’anno.`
}
