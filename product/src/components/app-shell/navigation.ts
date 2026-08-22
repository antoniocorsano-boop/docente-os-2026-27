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
    description: 'Attività da fare e priorità operative.',
    keywords: ['attività', 'da fare', 'priorità', 'scadenze', 'oggi'],
  },
  {
    key: 'design',
    href: '/progetta',
    label: 'Progetta',
    shortLabel: 'Progetta',
    description: 'Progettazione didattica, UDA e lavoro delle classi.',
    keywords: ['uda', 'progettazione', 'didattica', 'curricolo'],
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
    description: 'Sezioni, contesto didattico e avanzamento.',
    keywords: ['classi', 'sezioni', 'prima', 'seconda', 'terza'],
  },
  {
    key: 'timetable',
    href: '/orario',
    label: 'Orario',
    shortLabel: 'Orario',
    description: 'Schema settimanale ricorrente delle lezioni.',
    keywords: ['orario', 'lezioni', 'settimana', 'ore', 'ricorrente'],
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

export function navigationItem(key: NavigationKey) {
  return PRIMARY_NAVIGATION.find((item) => item.key === key) ?? PRIMARY_NAVIGATION[0]
}
