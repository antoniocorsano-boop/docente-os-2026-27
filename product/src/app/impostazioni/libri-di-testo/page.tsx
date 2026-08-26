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
import { IsbnLookupForm } from './isbn-lookup-form'
import { MimDiscoveryForm } from './mim-discovery-form'
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
          <h1>Controlla i libri associati alle tue classi</h1>
          <span>DOCENTE OS recupera i dati del libro da fonti esterne e ti chiede solo di verificarli. Il libro resta una risorsa didattica, distinta dal curricolo.</span>
        </div>
        <div className="textbookHeroStats" aria-label="Stato libri di testo">
          <strong>{coverage.confirmedBookCount}</strong>
          <span>libri confermati</span>
          {coverage.proposedBookCount > 0 && <small>{coverage.proposedBookCount} da controllare</small>}
        </div>
      </header>

      <section className="textbookPrinciples" aria-label="Come vengono usati i libri">
        <div><strong>Serve a</strong><span>ricordare quale testo usi in ogni classe e disciplina.</span></div>
        <div><strong>Usato in</strong><span>Piano annuale, UDA, lezioni e suggerimenti di materiali.</span></div>
        <div><strong>Non modifica</strong><span>curricolo, copertura curricolare, Orario o attività già create.</span></div>
        <div><strong>Accesso editore</strong><span>DOCENTE OS non salva password o credenziali dei siti editoriali.</span></div>
      </section>

      {settings.schoolCode ? (
        <>
          <section className="textbookSourceCallout">
            <div>
              <span>DISCOVERY MIM · CONTESTO PRONTO</span>
              <strong>Codice scuola {settings.schoolCode}</strong>
              <p>Il codice meccanografico è il binding per proporre automaticamente le adozioni dai dataset Open Data MIM. Nessuna proposta diventa confermata senza una tua decisione.</p>
            </div>
            <Link href="/impostazioni#contesto">Modifica codice scuola</Link>
          </section>
          {relevantAssignments.length ? <MimDiscoveryForm schoolCode={settings.schoolCode} /> : null}
        </>
      ) : (
        <section className="textbookSourceCallout needsContext">
          <div>
            <span>PER LE PROPOSTE AUTOMATICHE MIM</span>
            <strong>Aggiungi il codice meccanografico della scuola</strong>
            <p>Serve a riconoscere le adozioni ufficiali senza riscrivere titolo, autori, editore o altri dati bibliografici.</p>
          </div>
          <Link href="/impostazioni#contesto">Completa il contesto</Link>
        </section>
      )}

      {!relevantAssignments.length ? (
        <section className="textbookEmptyState">
          <strong>Prima serve la Cattedra.</strong>
          <p>I libri vengono collegati alla relazione reale classe + disciplina. Configura almeno una Cattedra per evitare duplicazioni e associazioni ambigue.</p>
          <Link className="settingsPrimaryButton" href="/impostazioni#cattedra">Configura la Cattedra</Link>
        </section>
      ) : (
        <section className="textbookAssignmentGrid" aria-label="Libri per classe e disciplina">
          {relevantAssignments.map((assignment) => {
            const section = sectionById.get(assignment.sectionId)
            const discipline = disciplineById.get(assignment.disciplineId)
            const books = adoptionsByAssignment.get(assignment.id) ?? []
            const confirmedAdopted = books.filter((item) => item.status === 'CONFIRMED' && item.usageKind === 'ADOPTED').length
            return (
              <article className="textbookAssignmentCard" key={assignment.id}>
                <header>
                  <div>
                    <span>{assignment.status === 'CONFIRMED' ? 'CATTEDRA CONFERMATA' : 'CATTEDRA DA CONTROLLARE'}</span>
                    <h2>{section ? `${GRADE_NUMBER[section.grade]}ª ${section.sectionCode}` : 'Classe'} · {discipline?.name ?? 'Disciplina'}</h2>
                  </div>
                  <span className={`textbookCoverageBadge ${confirmedAdopted ? 'complete' : 'optional'}`}>
                    {confirmedAdopted ? `${confirmedAdopted} ${confirmedAdopted === 1 ? 'testo adottato' : 'testi adottati'}` : 'Nessun testo adottato confermato'}
                  </span>
                </header>

                {books.length ? (
                  <div className="textbookList">
                    {books.map((adoption) => (
                      <div className={`textbookRow ${adoption.status === 'PROPOSED' ? 'proposed' : 'confirmed'}`} key={adoption.id}>
                        <div className="textbookIdentity">
                          <div className="textbookTitleLine">
                            <strong>{adoption.textbook.title}</strong>
                            <span>{usageLabel(adoption.usageKind)}</span>
                          </div>
                          <span>{adoption.textbook.publisher} · ISBN {formatIsbn(adoption.textbook.isbn13)}</span>
                          <small>
                            {adoption.textbook.editionLabel ? `${adoption.textbook.editionLabel} · ` : ''}
                            {sourceLabel(adoption.sourceKind)}
                          </small>
                        </div>
                        <div className="textbookRowActions">
                          {adoption.textbook.officialUrl && (
                            <a href={adoption.textbook.officialUrl} target="_blank" rel="noreferrer">Apri riferimento fonte</a>
                          )}
                          {adoption.status === 'PROPOSED' ? (
                            <form action={confirmTextbookAdoption}>
                              <input type="hidden" name="adoptionId" value={adoption.id} />
                              <button className="settingsPrimaryButton" type="submit">Conferma questo libro</button>
                            </form>
                          ) : <span className="textbookConfirmedLabel">✓ Confermato</span>}
                          <details className="textbookRowManage">
                            <summary>Gestisci</summary>
                            <form action={removeTextbookAdoption}>
                              <input type="hidden" name="adoptionId" value={adoption.id} />
                              <span>Rimuove solo il collegamento a questa Cattedra. Non modifica classe, disciplina o Piano annuale.</span>
                              <button className="textButton" type="submit">Rimuovi collegamento</button>
                            </form>
                          </details>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="textbookNoBooks">
                    <strong>Nessun libro ancora proposto.</strong>
                    <span>Puoi lasciare la Cattedra senza testo. Se devi aggiungere un libro non ancora trovato dal sistema, basta il suo ISBN.</span>
                  </div>
                )}

                <details className="textbookAddDisclosure">
                  <summary>Trova un libro non ancora proposto</summary>
                  <div className="textbookLookupPanel">
                    <div>
                      <strong>Niente catalogazione manuale</strong>
                      <span>Inserisci o scansiona soltanto l’ISBN. DOCENTE OS recupera automaticamente i metadati e crea una proposta da controllare.</span>
                    </div>
                    <IsbnLookupForm teachingAssignmentId={assignment.id} />
                  </div>
                </details>
              </article>
            )
          })}
        </section>
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
  if (kind === 'MIM_OPEN_DATA') return 'Proposto da Open Data MIM'
  if (kind === 'ISBN_LOOKUP') return 'Metadati recuperati da ISBN'
  return 'Dato storico inserito manualmente'
}

function formatIsbn(value: string) {
  return `${value.slice(0, 3)}-${value.slice(3, 5)}-${value.slice(5, 7)}-${value.slice(7, 12)}-${value.slice(12)}`
}
