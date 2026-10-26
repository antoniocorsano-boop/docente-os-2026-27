export type NavigationKey =
  | 'today'
  | 'timetable'
  | 'classes'
  | 'more'
  | 'activities'
  | 'design'
  | 'annual-plan'
  | 'knowledge'
  | 'calendar'
  | 'documentation'
  | 'settings'
  | 'account'

export type NavigationItem = {
  key: NavigationKey
  href: string
  label: string
  shortLabel: string
  description: string
  keywords: string[]
}

export type NavigationGroup = {
  key: 'primary' | 'work' | 'resources' | 'system'
  label: string
  description: string
  items: NavigationKey[]
}

export const PRIMARY_NAVIGATION: readonly NavigationItem[] = [
  { key: 'today', href: '/planner', label: 'Oggi', shortLabel: 'Oggi', description: 'Il lavoro didattico immediato e gli impegni di oggi.', keywords: ['oggi', 'lezione', 'adesso', 'registra'] },
  { key: 'timetable', href: '/orario', label: 'Orario', shortLabel: 'Orario', description: 'Consulta la giornata o la settimana e apri la lezione pertinente.', keywords: ['orario', 'lezioni', 'settimana', 'ore'] },
  { key: 'classes', href: '/classi', label: 'Classi', shortLabel: 'Classi', description: 'Entra nella continuità professionale di una sezione.', keywords: ['classi', 'sezioni', 'diario', 'continuità'] },
  { key: 'more', href: '/altro', label: 'Altro', shortLabel: 'Altro', description: 'Apri gli strumenti professionali che non servono sempre.', keywords: ['altro', 'strumenti', 'attività', 'materiali', 'impostazioni'] },
] as const

export const TOOL_NAVIGATION: readonly NavigationItem[] = [
  { key: 'activities', href: '/attivita', label: 'Attività', shortLabel: 'Attività', description: 'Gestisci attività, priorità, attese e scadenze.', keywords: ['attività', 'da fare', 'priorità', 'scadenze', 'planner'] },
  { key: 'design', href: '/progetta', label: 'Progetta', shortLabel: 'Progetta', description: 'Prepara e adatta la progettazione didattica.', keywords: ['uda', 'progettazione', 'prepara', 'didattica'] },
  { key: 'annual-plan', href: '/piano-annuale', label: 'Piano annuale', shortLabel: 'Piano', description: 'Registra e rivedi l’avanzamento didattico per sezione.', keywords: ['piano annuale', 'blocchi', 'avanzamento'] },
  { key: 'knowledge', href: '/knowledge', label: 'Materiali e fonti', shortLabel: 'Materiali', description: 'Trova documenti, fonti e materiali quando ti servono.', keywords: ['documenti', 'fonti', 'ricerca', 'materiali', 'conoscenza'] },
  { key: 'calendar', href: '/calendario', label: 'Calendario', shortLabel: 'Calendario', description: 'Registra date reali, sospensioni, impegni e scadenze.', keywords: ['calendario', 'date', 'sospensioni', 'riunioni', 'scadenze', 'eventi'] },
  { key: 'documentation', href: '/documentazione', label: 'Documentazione', shortLabel: 'Documenti', description: 'Prepara e rivedi i documenti professionali dell’anno scolastico.', keywords: ['documentazione', 'relazione finale', 'programmazione', 'documenti'] },
  { key: 'settings', href: '/impostazioni', label: 'Impostazioni', shortLabel: 'Impostazioni', description: 'Configura contesto professionale, istituto, cattedra e organizzazione.', keywords: ['impostazioni', 'istituto', 'discipline', 'cattedra', 'configurazione'] },
  { key: 'account', href: '/account', label: 'Account e sicurezza', shortLabel: 'Account', description: 'Gestisci identità di accesso, password, MFA e sessioni.', keywords: ['account', 'sicurezza', 'password', 'mfa', 'sessioni', 'accesso'] },
] as const

const ALL_NAVIGATION: readonly NavigationItem[] = [...PRIMARY_NAVIGATION, ...TOOL_NAVIGATION]

export const MOBILE_NAVIGATION_KEYS: readonly NavigationKey[] = ['today', 'timetable', 'classes', 'more']

export const SECONDARY_NAVIGATION_GROUPS: readonly NavigationGroup[] = [
  { key: 'work', label: 'Lavoro', description: 'Attività e progettazione professionale.', items: ['activities', 'design', 'annual-plan'] },
  { key: 'resources', label: 'Risorse e organizzazione', description: 'Materiali, date e documentazione.', items: ['knowledge', 'calendar', 'documentation'] },
  { key: 'system', label: 'Sistema', description: 'Configurazione e sicurezza.', items: ['settings', 'account'] },
] as const

export const NAVIGATION_GROUPS: readonly NavigationGroup[] = [
  { key: 'primary', label: 'Principale', description: 'I tre contesti quotidiani principali.', items: ['today', 'timetable', 'classes'] },
  ...SECONDARY_NAVIGATION_GROUPS,
]

export function navigationItem(key: NavigationKey) {
  return ALL_NAVIGATION.find((item) => item.key === key) ?? PRIMARY_NAVIGATION[0]
}

export function navigationGroupItems(group: NavigationGroup) {
  return group.items.map(navigationItem)
}

export function workNavigationItems() {
  return MOBILE_NAVIGATION_KEYS.map(navigationItem)
}

export function isSecondaryNavigationKey(key: NavigationKey) {
  return key !== 'today' && key !== 'timetable' && key !== 'classes' && key !== 'more'
}
