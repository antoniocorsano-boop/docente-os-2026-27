export function classCounts(labels: string[]): Array<[string, number]> {
  const counts = new Map<string, number>()
  for (const label of labels) counts.set(label, (counts.get(label) ?? 0) + 1)
  return [...counts.entries()].sort(([left], [right]) => left.localeCompare(right, 'it', { numeric: true }))
}
