const experienceUdaAssetId = process.env.EXPERIENCE_UDA_ASSET_ID ?? process.env.X5_E2E_UDA_ASSET_ID ?? '9fb33f70-c290-44d1-9fd9-db2e2712ad17'

export const EXPERIENCE_SURFACES = [
  { id: 'planner', label: 'Oggi / Planner', path: '/planner' },
  { id: 'knowledge', label: 'Conoscenza', path: '/knowledge' },
  { id: 'annual-plan', label: 'Piano annuale', path: '/piano-annuale' },
  { id: 'design-first-grade', label: 'Progetta — classe prima', path: '/progetta?grade=prima' },
  { id: 'uda-authoring-entry', label: 'Progetta — ingresso documento UDA', path: `/progetta/documenti/nuovo/${experienceUdaAssetId}` },
  { id: 'classes', label: 'Classi', path: '/classi' },
  { id: 'timetable', label: 'Orario', path: '/orario' },
  { id: 'calendar', label: 'Calendario', path: '/calendario' },
  { id: 'settings', label: 'Impostazioni', path: '/impostazioni' },
  { id: 'settings-textbooks', label: 'Impostazioni — Libri di testo', path: '/impostazioni/libri-di-testo' },
]
