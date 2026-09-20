export function bindArenaDisciplineRefToDocenteOs(source: string): string {
  const value = source.trim()
  if (!value) throw new Error('Curriculum disciplineRef is required')
  if (value.toLocaleLowerCase('it') === 'tecnologia' || value.toLowerCase() === 'technology') {
    return 'technology'
  }
  return value
}
