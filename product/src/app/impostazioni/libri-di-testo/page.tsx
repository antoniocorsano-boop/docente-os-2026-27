import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { buildTextbookSettingsCoverage } from '@/core/domain/textbook-adoption'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseTeacherSettingsRepository } from '@/core/infrastructure/supabase/supabase-teacher-settings-repository'
import { SupabaseTeachingAssignmentReader } from '@/core/infrastructure/supabase/supabase-teaching-assignment-reader'
import { SupabaseTextbookRepository } from '@/core/infrastructure/supabase/supabase-textbook-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { confirmTextbookAdoption, removeTextbookAdoption } from './actions'
import { BulkIsbnLookupForm } from './bulk-isbn-lookup-form'
import { MimDiscoveryForm } from './mim-discovery-form'
import { PublisherResources } from './publisher-resources'
import '../settings.css'
import './textbooks.css'
import './manage.css'

export const dynamic = 'force-dynamic'

const GRADE_NUMBER = { PRIMA: '1', SECONDA: '2', TERZA: '3' } as const

export default async function TextbookSettingsPage() {
  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) redirect('/login')
  if (!context.academicYear) redirect('/')

  const settingsRepository = new SupabaseTeacherSettingsRepository()
  const annualRepository = new SupabaseAnnualPlanExecutionRepository()
  const assignmentReader = new SupabaseTeachingAssignmentReader()
  const textbookRepository = new SupabaseTextbookRepository()
  const [settings, disciplines, annualSnapshot, assignments, adoptions] = await Promise.all([
    settingsRepository.getOrCreate(context.workspace.id, context.academicYear.id),
    settingsRepository.listDisciplines(context.workspace.id, context.academicYear.id),
    annualRepository.list(context.workspace.id, context.academicYear.id),
    assignmentReader.list(context.workspace.id, context.academicYear.id),
    textbookRepository.list(context.workspace.id, context.academicYear.id),
  ])

  const activeDisciplineIds = new Set(disciplines.filter((item) => item.isActive).map((item) => item.id))
  const relevantAssignments = assignments.filter((assignment) => activeDisciplineIds.has(assignment.disciplineId))
  const coverage = buildTextbookSettingsCoverage({
    assignmentIds: relevantAssignments.map((assignment) => assignment.id),
    adoptions,
  })
  const sectionById = new Map(annualSnapshot.sections.map((section) => [section.id, section]))
  const disciplineById = new Map(disciplines.map((discipline) => [discipline.id, discipline]))
  const bulkAssignmentOptions = relevantAssignments
    .filter((assignment) => assignment.status === 'CONFIRMED')
    .flatMap((assignment) => {
      const section = sectionById.get(assignment.sectionId)
      const discipline = disciplineById.get(assignment.disciplineId)
      if (!section || !discipline) return []
      return [{
        id: assignment.id,
        label: `${GRADE_NUMBER[section.grade]}ª ${section.sectionCode} · ${discipline.name}`,
      }]
    })
  const adoptionsByAssignment = new Map<string, typeof adoptions>()
  for (const adoption of adoptions) {
    const current = adoptionsByAssignment.get(adoption.teachingAssignmentId) ?? []
    current.push(adoption)
    adoptionsByAssignment.set(adoption.teachingAssignmentId, current)
  }

  return (
    <AppShell
      active="settings"
      academicYearLabel={context.academicYear.label}
      workspaceName={settings.schoolName || context.workspace.name}
      role={context.role}
      contentClassName="settingsSurface textbookSettingsSurface"
    >
      <div className="textbookBackRow">
        <Link href="/impostazioni">← Impostazioni</Link>
      </div>

      <header className="textbookHero">
        <div>
          <p>LIBRI DI TESTO · {context.academicYear.label}</p>
          <h1>Libri di testo</h1>
          <span>Trova i libri della scuola, controlla le proposte e conferma soltanto quelli che usi davvero nelle tue classi.</span>
        </div>
        <div className="textbookHeroStats" aria-label="Stato libri di testo">
          <strong>{coverage.confirmedBookCount}</strong>
          <span>confermati</span>
          <small>{coverage.proposedBookCount} da controllare</small>
        </div>
      </header>

      <section className="textbookWorkflow" aria-label="Procedura libri di testo">
        <div><strong>1</strong><span>Trova</span><small>Parti dalle adozioni ufficiali già disponibili.</small></div>
        <div><strong>2</strong><span>Controlla</span><small>Verifica libro, classe e tipo di utilizzo.</small></div>
        <div><strong>3</strong><span>Conferma</span><small>Solo la tua conferma rende il collegamento definitivo.</small></div>
      </section>

      {!relevantAssignments.length ? (
        <section className="textbookEmptyState">
          <strong>Prima configura almeno una classe con la sua disciplina.</strong>
          <p>I libri vengono collegati alla Cattedra reale, così ogni proposta arriva già nella classe corretta.</p>
          <Link className="settingsPrimaryButton" href="/impostazioni#cattedra">Configura la Cattedra</Link>
        </section>
      ) : (
        <>
          <section className="textbookFindSection" aria-labelledby="textbook-find-title">
            <header>
              <div>
                <span>1 · TROVA</span>
                <h2 id="textbook-find-title">Trova i libri delle tue classi</h2>
                <p>La prima scelta è automatica: DOCENTE OS usa il contesto della tua Cattedra e prepara soltanto proposte da verificare.</p>
              </div>
            </header>

            {settings.schoolCode ? (
              <MimDiscoveryForm schoolCode={settings.schoolCode} />
            ) : (
              <div className="textbookContextPrompt">
                <div>
                  <strong>Manca il codice della scuola.</strong>
                  <span>Serve una sola volta per riconoscere le adozioni ufficiali associate all’Istituto.</span>
                </div>
                <Link className="settingsPrimaryButton" href="/impostazioni#contesto">Aggiungi il codice scuola</Link>
              </div>
            )}

            {bulkAssignmentOptions.length ? (
              <details className="textbookFallbackDisclosure" id="aggiungi-isbn">
                <summary>
                  <span>Non trovi un libro?</span>
                  <strong>Aggiungilo con ISBN o foto</strong>
                </summary>
                <BulkIsbnLookupForm assignments={bulkAssignmentOptions} />
              </details>
            ) : null}
          </section>

          <section id="libri-per-classe" className="textbookReviewSection" aria-labelledby="textbook-review-title">
            <header className="textbookReviewHeader">
              <div>
                <span>2 · CONTROLLA &nbsp; 3 · CONFERMA</span>
                <h2 id="textbook-review-title">Controlla ciò che è stato trovato</h2>
                <p>Ogni proposta resta separata per classe e disciplina. Nulla viene confermato automaticamente.</p>
              </div>
              {coverage.proposedBookCount > 0 ? <strong>{coverage.proposedBookCount} da controllare</strong> : null}
            </header>

            <div className="textbookAssignmentGrid" aria-label="Libri per classe e disciplina">
              {relevantAssignments.map((assignment) => {
                const section = sectionById.get(assignment.sectionId)
                const discipline = disciplineById.get(assignment.disciplineId)
                const books = adoptionsByAssignment.get(assignment.id) ?? []
                const orderedBooks = [...books].sort((left, right) => Number(left.status === 'CONFIRMED') - Number(right.status === 'CONFIRMED'))
                const proposedCount = books.filter((item) => item.status === 'PROPOSED').length
                const confirmedAdopted = books.filter((item) => item.status === 'CONFIRMED' && item.usageKind === 'ADOPTED').length
                return (
                  <article className="textbookAssignmentCard" key={assignment.id}>
                    <header>
                      <div>
                        <span>{assignment.status === 'CONFIRMED' ? 'CATTEDRA CONFERMATA' : 'CATTEDRA DA CONTROLLARE'}</span>
                        <h3>{section ? `${GRADE_NUMBER[section.grade]}ª ${section.sectionCode}` : 'Classe'} · {discipline?.name ?? 'Disciplina'}</h3>
                      </div>
                      <span className={`textbookCoverageBadge ${proposedCount ? 'attention' : confirmedAdopted ? 'complete' : 'optional'}`}>
                        {proposedCount
                          ? `${proposedCount} ${proposedCount === 1 ? 'da controllare' : 'da controllare'}`
                          : confirmedAdopted
                            ? `${confirmedAdopted} ${confirmedAdopted === 1 ? 'testo confermato' : 'testi confermati'}`
                            : 'Nessun libro confermato'}
                      </span>
                    </header>

                    {orderedBooks.length ? (
                      <div className="textbookList">
                        {orderedBooks.map((adoption) => (
                          <div className={`textbookRow ${adoption.status === 'PROPOSED' ? 'proposed' : 'confirmed'}`} key={adoption.id}>
                            <div className="textbookIdentity">
                              <div className="textbookTitleLine">
                                <strong>{adoption.textbook.title}</strong>
                                <span>{usageLabel(adoption.usageKind)}</span>
                              </div>
                              <span>{adoption.textbook.publisher} · ISBN {formatIsbn(adoption.textbook.isbn13)}</span>
                              {adoption.textbook.editionLabel ? <small>{adoption.textbook.editionLabel}</small> : null}
                            </div>
                            <div className="textbookRowActions">
                              {adoption.status === 'PROPOSED' ? (
                                <form action={confirmTextbookAdoption}>
                                  <input type="hidden" name="adoptionId" value={adoption.id} />
                                  <button className="settingsPrimaryButton" type="submit">Conferma</button>
                                </form>
                              ) : <span className="textbookConfirmedLabel">✓ Confermato</span>}
                              <details className="textbookRowManage">
                                <summary>Dettagli</summary>
                                <div className="textbookRowDetails">
                                  <span>{sourceLabel(adoption.sourceKind)}</span>
                                  {adoption.textbook.officialUrl ? (
                                    <a href={adoption.textbook.officialUrl} target="_blank" rel="noreferrer">Apri la fonte</a>
                                  ) : null}
                                  <PublisherResources adoption={adoption} />
                                  <form action={removeTextbookAdoption}>
                                    <input type="hidden" name="adoptionId" value={adoption.id} />
                                    <small>Rimuove soltanto il collegamento a questa classe.</small>
                                    <button className="textButton" type="submit">Rimuovi collegamento</button>
                                  </form>
                                </div>
                              </details>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="textbookNoBooks">
                        <strong>Nessun libro associato.</strong>
                        <span>Puoi lasciare la classe senza testo oppure usare <a href="#aggiungi-isbn">ISBN o foto</a> se il libro non compare tra le proposte.</span>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          </section>
        </>
      )}
    </AppShell>
  )
}

function usageLabel(kind: 'ADOPTED' | 'RECOMMENDED' | 'OTHER') {
  if (kind === 'ADOPTED') return 'Adottato'
  if (kind === 'RECOMMENDED') return 'Consigliato'
  return 'Altro testo'
}

function sourceLabel(kind: 'MANUAL' | 'MIM_OPEN_DATA' | 'ISBN_LOOKUP') {
  if (kind === 'MIM_OPEN_DATA') return 'Fonte: adozioni ufficiali MIM'
  if (kind === 'ISBN_LOOKUP') return 'Fonte: metadati recuperati tramite ISBN'
  return 'Fonte: dato storico inserito manualmente'
}

function formatIsbn(value: string) {
  return `${value.slice(0, 3)}-${value.slice(3, 5)}-${value.slice(5, 7)}-${value.slice(7, 12)}-${value.slice(12)}`
}
