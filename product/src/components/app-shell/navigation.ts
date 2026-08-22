export type NavigationKey =
  | 'home'
  | 'today'
  | 'design'
  | 'knowledge'
  | 'classes'
  | 'timetable'
  | 'annual-plan'
  | 'settings'

export type NavigationItem = {
  key: NavigationKey
  href: string
  label: string
  shortLabel: string
  description: string
  keywords: string[]
}

export type NavigationGroup = {
  key: 'work' | 'teaching' | 'time' | 'resources' | 'system'
  label: string
  description: string
  items: NavigationKey[]
}

export const PRIMARY_NAVIGATION: readonly NavigationItem[] = [
  {
    key: 'home',
    href: '/',
    label: 'Home',
    shortLabel: 'Home',
    description: 'Panoramica del tuo spazio docente.',
    keywords: ['inizio', 'panoramica', 'dashboard'],
  },
  {
    key: 'today',
    href: '/planner',
    label: 'Oggi',
    shortLabel: 'Oggi',
    description: 'Attività, priorità e cose da fare adesso.',
    keywords: ['attività', 'da fare', 'priorità', 'scadenze', 'oggi'],
  },
  {
    key: 'design',
    href: '/progetta',
    label: 'Progetta',
    shortLabel: 'Progetta',
    description: 'Prepara UDA, percorsi, attività e materiali didattici.',
    keywords: ['uda', 'progettazione', 'didattica', 'curricolo', 'materiali'],
  },
  {
    key: 'knowledge',
    href: '/knowledge',
    label: 'Conoscenza',
    shortLabel: 'Conoscenza',
    description: 'Documenti, fonti e contenuti organizzati.',
    keywords: ['documenti', 'fonti', 'ricerca', 'kb', 'conoscenza'],
  },
  {
    key: 'classes',
    href: '/classi',
    label: 'Classi',
    shortLabel: 'Classi',
    description: 'Sezioni, contesto didattico e lavoro delle classi.',
    keywords: ['classi', 'sezioni', 'prima', 'seconda', 'terza'],
  },
  {
    key: 'timetable',
    href: '/orario',
    label: 'Orario',
    shortLabel: 'Orario',
    description: 'Il tuo schema settimanale ricorrente, autonomo dal Calendario.',
    keywords: ['orario', 'lezioni', 'settimana', 'ore', 'schema settimanale'],
  },
  {
    key: 'annual-plan',
    href: '/piano-annuale',
    label: 'Piano annuale',
    shortLabel: 'Piano',
    description: 'Sequenza didattica e avanzamento per classe.',
    keywords: ['piano annuale', 'blocchi', 'b01', 'programma', 'copertura', 'avanzamento'],
  },
  {
    key: 'settings',
    href: '/impostazioni',
    label: 'Impostazioni',
    shortLabel: 'Impostazioni',
    description: 'Profilo, istituto, discipline, classi e configurazione.',
    keywords: ['impostazioni', 'profilo', 'istituto', 'discipline', 'configurazione'],
  },
] as const

export const NAVIGATION_GROUPS: readonly NavigationGroup[] = [
  {
    key: 'work',
    label: 'Il mio lavoro',
    description: 'Cosa richiede attenzione e cosa devo fare.',
    items: ['home', 'today'],
  },
  {
    key: 'teaching',
    label: 'Didattica',
    description: 'Cosa preparo, insegno e seguo nelle classi.',
    items: ['design', 'annual-plan', 'classes'],
  },
  {
    key: 'time',
    label: 'Tempo',
    description: 'Come è organizzata la settimana di lavoro.',
    items: ['timetable'],
  },
  {
    key: 'resources',
    label: 'Risorse',
    description: 'Fonti e contenuti da cui partire.',
    items: ['knowledge'],
  },
  {
    key: 'system',
    label: 'Sistema',
    description: 'Configurazione dello spazio docente.',
    items: ['settings'],
  },
] as const

export function navigationItem(key: NavigationKey) {
  return PRIMARY_NAVIGATION.find((item) => item.key === key) ?? PRIMARY_NAVIGATION[0]
}

export function navigationGroupItems(group: NavigationGroup) {
  return group.items.map(navigationItem)
}
