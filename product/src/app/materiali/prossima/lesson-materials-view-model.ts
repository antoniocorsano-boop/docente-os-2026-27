export type MaterialView = 'lim' | 'visuale' | 'scheda' | 'docente'

export type MaterialViewOption = Readonly<{
  id: MaterialView
  label: string
  priority: 'primary' | 'secondary'
}>

export const MATERIAL_VIEW_OPTIONS: readonly MaterialViewOption[] = [
  { id: 'lim', label: 'Proietta', priority: 'primary' },
  { id: 'visuale', label: 'Mappa visuale', priority: 'secondary' },
  { id: 'scheda', label: 'Scheda studenti', priority: 'secondary' },
  { id: 'docente', label: 'Guida docente', priority: 'secondary' },
]
