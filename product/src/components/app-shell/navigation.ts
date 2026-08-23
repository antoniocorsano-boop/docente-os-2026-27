export type NavigationKey =
  | 'home'
  | 'today'
  | 'design'
  | 'knowledge'
  | 'classes'
  | 'timetable'
  | 'calendar'
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
    description: 'Riprendi dal prossimo passo utile.',
    keywords: ['inizio', 'riprendi', 'prossimo passo', 'home'],
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
    description: 'Prepara la prossima fase didattica o esplora il nucleo del grado.',
    keywords: ['uda', 'progettazione', 'prepara', 'didattica', 'materiali'],
  },
  {
    key: 'knowledge',
    href: '/knowledge',
    label: 'Conoscenza',
    shortLabel: 'Conoscenza',
    description: 'Trova documenti, fonti e materiali quando ti servono.',
    keywords: ['documenti', 'fonti', 'ricerca', 'materiali', 'conoscenza'],
  },
  {
    key: 'classes',
    href: '/classi',
    label: 'Classi',
    shortLabel: 'Classi',
    description: 'Entra nel contesto operativo di una sezione.',
    keywords: ['classi', 'sezioni', 'lezione', 'prima', 'seconda', 'terza'],
  },
  {
    key: 'timetable',
    href: '/orario',
    label: 'Orario',
    shortLabel: 'Orario',
    description: 'Vedi dove sei nella settimana e apri la lezione pertinente.',
    keywords: ['orario', 'lezioni', 'settimana', 'adesso', 'ore'],
  },
  {
    key: 'calendar',
    href: '/calendario',
    label: 'Calendario',
    shortLabel: 'Calendario',
    description: 'Registra giorni reali, sospensioni, impegni e scadenze dell’anno scolastico.',
    keywords: ['calendario', 'date', 'sospensioni', 'festività', 'riunioni', 'scadenze', 'eventi'],
  },
  {
    key: 'annual-plan',
    href: '/piano-annuale',
    label: 'Piano annuale',
    shortLabel: 'Piano',
    description: 'Registra e rivedi l’avanzamento didattico per sezione.',
    keywords: ['piano annuale', 'registra', 'blocchi', 'b01', 'avanzamento'],
  },
  {
    key: 'settings',
    href: '/impostazioni',
    label: 'Impostazioni',
    shortLabel: 'Impostazioni',
    description: 'Configura profilo, istituto, cattedra e organizzazione.',
    keywords: ['impostazioni', 'profilo', 'istituto', 'discipline', 'configurazione'],
  },
] as const

export const NAVIGATION_GROUPS: readonly NavigationGroup[] = [
  {
    key: 'work',
    label: 'Adesso',
    description: 'Riprendi il lavoro o affronta ciò che richiede attenzione.',
    items: ['home', 'today'],
  },
  {
    key: 'teaching',
    label: 'Prepara e insegna',
    description: 'Lavora con una classe, prepara la fase e registra ciò che hai svolto.',
    items: ['classes', 'design', 'annual-plan'],
  },
  {
    key: 'time',
    label: 'Tempo',
    description: 'Distingui lo schema ricorrente dalle date reali dell’anno scolastico.',
    items: ['timetable', 'calendar'],
  },
  {
    key: 'resources',
    label: 'Trova',
    description: 'Cerca una fonte o un materiale soltanto quando ti serve.',
    items: ['knowledge'],
  },
  {
    key: 'system',
    label: 'Configura',
    description: 'Modifica il contesto professionale e l’organizzazione.',
    items: ['settings'],
  },
] as const

export function navigationItem(key: NavigationKey) {
  return PRIMARY_NAVIGATION.find((item) => item.key === key) ?? PRIMARY_NAVIGATION[0]
}

export function navigationGroupItems(group: NavigationGroup) {
  return group.items.map(navigationItem)
}
