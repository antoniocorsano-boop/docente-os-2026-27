export type DemoTask = { id: string; title: string; meta: string; priority: 'Urgente' | 'Alta' | 'Normale'; date: string; completed: boolean; sourceAssetId?: string; sourceGeneration?: number }
export type DemoAsset = { id: string; title: string; summary: string; category: string; context: string; reliability: string; disciplines: string[]; classLabels: string[]; generation: number }

export const INITIAL_TASKS: DemoTask[] = [
  { id: 'task-1', title: 'Predisporre piano annuale classe 1A', meta: 'Tecnologia · 1A', priority: 'Alta', date: '25 ago', completed: false },
  { id: 'task-2', title: 'Verificare circolare presa di servizio', meta: 'Comunicazioni · Tutte le classi', priority: 'Urgente', date: '22 ago', completed: false },
  { id: 'task-3', title: 'Completare UDA materiali e sostenibilità', meta: 'Tecnologia · 2C', priority: 'Normale', date: '30 ago', completed: false },
]

export const INITIAL_ASSETS: DemoAsset[] = [
  { id: 'asset-1', title: 'Indicazioni nazionali 2025', summary: 'Quadro di riferimento per il curricolo del primo ciclo.', category: 'Risorsa didattica', context: 'Controllata', reliability: 'Verificata', disciplines: ['Tecnologia'], classLabels: ['1A', '2C', '3E'], generation: 2 },
  { id: 'asset-2', title: 'Programmazione annuale Tecnologia', summary: 'Struttura annuale articolata per classi e unità di apprendimento.', category: 'Programmazione', context: 'Controllata', reliability: 'Verificata', disciplines: ['Tecnologia'], classLabels: ['1A', '2C', '3E'], generation: 2 },
  { id: 'asset-3', title: 'Circolare avvio anno scolastico', summary: 'Adempimenti, riunioni iniziali e scadenze operative.', category: 'Circolare', context: 'Da controllare', reliability: 'Da verificare', disciplines: [], classLabels: ['Tutte le classi'], generation: 1 },
]

export function addTask(tasks: DemoTask[], title: string): DemoTask[] {
  const normalized = title.trim()
  if (!normalized) return tasks
  return [...tasks, { id: `task-${tasks.length + 1}`, title: normalized, meta: 'Inserimento locale', priority: 'Normale', date: 'Da pianificare', completed: false }]
}

export function toggleTask(tasks: DemoTask[], id: string): DemoTask[] {
  return tasks.map((task) => task.id === id ? { ...task, completed: !task.completed } : task)
}

export function createTaskFromAsset(tasks: DemoTask[], asset: DemoAsset): DemoTask[] {
  const existing = tasks.find((task) => task.sourceAssetId === asset.id && !task.completed)
  if (existing) return tasks

  return [...tasks, {
    id: `task-${tasks.length + 1}`,
    title: `Esamina: ${asset.title}`,
    meta: `${asset.category} · Generazione #${asset.generation}`,
    priority: asset.context === 'Da controllare' ? 'Alta' : 'Normale',
    date: 'Da pianificare',
    completed: false,
    sourceAssetId: asset.id,
    sourceGeneration: asset.generation,
  }]
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
