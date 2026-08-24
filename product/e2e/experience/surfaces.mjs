const x5UdaAssetId = process.env.X5_E2E_UDA_ASSET_ID ?? '9fb33f70-c290-44d1-9fd9-db2e2712ad17'

export const EXPERIENCE_SURFACES = [
  { id: 'planner', label: 'Oggi / Planner', path: '/planner' },
  { id: 'knowledge', label: 'Conoscenza', path: '/knowledge' },
  { id: 'annual-plan', label: 'Piano annuale', path: '/piano-annuale' },
  { id: 'design-first-grade', label: 'Progetta — classe prima', path: '/progetta?grade=prima' },
  { id: 'uda-authoring-entry', label: 'Progetta — ingresso documento UDA', path: `/progetta/documenti/nuovo/${x5UdaAssetId}` },
  { id: 'classes', label: 'Classi', path: '/classi' },
  { id: 'timetable', label: 'Orario', path: '/orario' },
  { id: 'calendar', label: 'Calendario', path: '/calendario' },
  { id: 'settings', label: 'Impostazioni', path: '/impostazioni' },
]
