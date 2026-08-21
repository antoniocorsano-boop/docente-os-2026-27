export type DemoTask = {
  id: string
  title: string
  meta: string
  priority: 'Urgente' | 'Alta' | 'Normale'
  dueDate: string
  completed: boolean
  schoolYear: string
  disciplines: string[]
  classLabels: string[]
  verificationStatus: 'Non richiesta' | 'Fonte da verificare' | 'Fonte verificata'
  sourceAssetId?: string
  sourceGeneration?: number
}
export type DemoAsset = { id: string; title: string; summary: string; category: string; context: string; reliability: string; disciplines: string[]; classLabels: string[]; generation: number }

export const INITIAL_TASKS: DemoTask[] = [
  { id: 'task-1', title: 'Predisporre piano annuale classe 1A', meta: 'Programmazione', priority: 'Alta', dueDate: '2026-08-25', completed: false, schoolYear: '2026/27', disciplines: ['Tecnologia'], classLabels: ['1A'], verificationStatus: 'Non richiesta' },
  { id: 'task-2', title: 'Verificare circolare presa di servizio', meta: 'Comunicazioni', priority: 'Urgente', dueDate: '2026-08-22', completed: false, schoolYear: '2026/27', disciplines: [], classLabels: ['Tutte le classi'], verificationStatus: 'Fonte da verificare' },
  { id: 'task-3', title: 'Completare UDA materiali e sostenibilità', meta: 'Unità di apprendimento', priority: 'Normale', dueDate: '2026-08-30', completed: false, schoolYear: '2026/27', disciplines: ['Tecnologia'], classLabels: ['2C'], verificationStatus: 'Non richiesta' },
]

export const INITIAL_ASSETS: DemoAsset[] = [
  { id: 'asset-1', title: 'Indicazioni nazionali 2025', summary: 'Quadro di riferimento per il curricolo del primo ciclo.', category: 'Risorsa didattica', context: 'Controllata', reliability: 'Verificata', disciplines: ['Tecnologia'], classLabels: ['1A', '2C', '3E'], generation: 2 },
  { id: 'asset-2', title: 'Programmazione annuale Tecnologia', summary: 'Struttura annuale articolata per classi e unità di apprendimento.', category: 'Programmazione', context: 'Controllata', reliability: 'Verificata', disciplines: ['Tecnologia'], classLabels: ['1A', '2C', '3E'], generation: 2 },
  { id: 'asset-3', title: 'Circolare avvio anno scolastico', summary: 'Adempimenti, riunioni iniziali e scadenze operative.', category: 'Circolare', context: 'Da controllare', reliability: 'Da verificare', disciplines: [], classLabels: ['Tutte le classi'], generation: 1 },
]

export function addTask(tasks: DemoTask[], title: string): DemoTask[] {
  const normalized = title.trim()
  if (!normalized) return tasks
  return [...tasks, { id: `task-${tasks.length + 1}`, title: normalized, meta: 'Inserimento locale', priority: 'Normale', dueDate: '', completed: false, schoolYear: '2026/27', disciplines: [], classLabels: [], verificationStatus: 'Non richiesta' }]
}

export function toggleTask(tasks: DemoTask[], id: string): DemoTask[] {
  return tasks.map((task) => task.id === id ? { ...task, completed: !task.completed } : task)
}

export function updateTask(tasks: DemoTask[], id: string, patch: Pick<DemoTask, 'priority' | 'dueDate' | 'completed'>): DemoTask[] {
  return tasks.map((task) => task.id === id ? { ...task, ...patch } : task)
}

export function createTaskFromAsset(tasks: DemoTask[], asset: DemoAsset, dueDate = ''): DemoTask[] {
  const existing = tasks.find((task) => task.sourceAssetId === asset.id && !task.completed)
  if (existing) return tasks

  return [...tasks, {
    id: `task-${tasks.length + 1}`,
    title: `Esamina: ${asset.title}`,
    meta: asset.category,
    priority: asset.context === 'Da controllare' ? 'Alta' : 'Normale',
    dueDate,
    completed: false,
    schoolYear: '2026/27',
    disciplines: asset.disciplines,
    classLabels: asset.classLabels,
    verificationStatus: asset.reliability === 'Verificata' ? 'Fonte verificata' : 'Fonte da verificare',
    sourceAssetId: asset.id,
    sourceGeneration: asset.generation,
  }]
}

export function formatDueDate(value: string): string {
  if (!value) return 'Da pianificare'
  const [, month, day] = value.split('-')
  const months = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']
  return `${Number(day)} ${months[Number(month) - 1]}`
}

export function filterAssets(assets: DemoAsset[], category: string, query: string): DemoAsset[] {
  const needle = query.trim().toLocaleLowerCase('it')
  return assets.filter((asset) => (category === 'Tutti' || asset.category === category) && (!needle || [asset.title, asset.summary, ...asset.disciplines, ...asset.classLabels].join(' ').toLocaleLowerCase('it').includes(needle)))
}

export function updateAssetContext(assets: DemoAsset[], id: string, patch: Pick<DemoAsset, 'category' | 'context' | 'reliability' | 'disciplines' | 'classLabels'>): DemoAsset[] {
  return assets.map((asset) => asset.id === id ? { ...asset, ...patch } : asset)
}

export function commaList(value: string): string[] {
  return [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))]
}
