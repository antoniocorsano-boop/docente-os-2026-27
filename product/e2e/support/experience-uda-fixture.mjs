export function experienceUdaFixtureToken() {
  return process.env.GITHUB_RUN_ID ?? process.env.EXPERIENCE_FIXTURE_TOKEN ?? 'local'
}

export function experienceUdaFixtureTitle() {
  return `UDA tecnica HVA classe prima — ${experienceUdaFixtureToken()}`
}

export const EXPERIENCE_UDA_FIXTURE_TEXT = `
UDA tecnica per la verifica Human + Visual Acceptance di DOCENTE OS.

Classe prima — Tecnologia.
Obiettivo: verificare che il percorso Progetta → Unità di apprendimento sia realmente percorribile e leggibile.

Il docente parte da un problema concreto, osserva bisogni e vincoli, formula una semplice proposta progettuale, documenta le scelte e raccoglie evidenze del percorso. La risorsa è esclusivamente tecnica, viene creata attraverso i normali confini applicativi e rimossa al termine del collaudo.
`.trim()
