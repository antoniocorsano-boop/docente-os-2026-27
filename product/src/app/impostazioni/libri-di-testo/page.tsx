import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { buildTextbookSettingsCoverage } from '@/core/domain/textbook-adoption'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseTeacherSettingsRepository } from '@/core/infrastructure/supabase/supabase-teacher-settings-repository'
import { SupabaseTeachingAssignmentReader } from '@/core/infrastructure/supabase/supabase-teaching-assignment-reader'
import { SupabaseTextbookRepository } from '@/core/infrastructure/supabase/supabase-textbook-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { addTextbookProposal, confirmTextbookAdoption } from './actions'
import '../settings.css'
import './textbooks.css'

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
          <h1>Collega i libri alle tue classi</h1>
          <span>Un libro può servire più classi e ogni classe può avere più testi. DOCENTE OS li usa come risorse didattiche, senza confonderli con il curricolo.</span>
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
        <section className="textbookSourceCallout">
          <div>
            <span>FONTE UFFICIALE PRONTA</span>
            <strong>Codice scuola {settings.schoolCode}</strong>
            <p>Il codice meccanografico permetterà di proporre le adozioni dai dataset Open Data del Ministero. Ogni proposta dovrà comunque essere confermata da te.</p>
          </div>
          <Link href="/impostazioni#contesto">Modifica codice scuola</Link>
        </section>
      ) : (
        <section className="textbookSourceCallout needsContext">
          <div>
            <span>PER I SUGGERIMENTI AUTOMATICI</span>
            <strong>Aggiungi il codice meccanografico della scuola</strong>
            <p>Non è obbligatorio per inserire i libri manualmente, ma servirà per riconoscere le adozioni ufficiali senza doverle riscrivere.</p>
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
                    {confirmedAdopted ? `${confirmedAdopted} ${confirmedAdopted === 1 ? 'testo adottato' : 'testi adottati'}` : 'Nessun testo confermato'}
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
                            {adoption.sourceKind === 'MIM_OPEN_DATA' ? 'Proposto da Open Data MIM' : 'Inserito dal docente'}
                          </small>
                        </div>
                        <div className="textbookRowActions">
                          {adoption.textbook.officialUrl && (
                            <a href={adoption.textbook.officialUrl} target="_blank" rel="noreferrer">Apri sito ufficiale</a>
                          )}
                          {adoption.status === 'PROPOSED' ? (
                            <form action={confirmTextbookAdoption}>
                              <input type="hidden" name="adoptionId" value={adoption.id} />
                              <button className="settingsPrimaryButton" type="submit">Conferma questo libro</button>
                            </form>
                          ) : <span className="textbookConfirmedLabel">✓ Confermato</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="textbookNoBooks">
                    <strong>Nessun libro collegato.</strong>
                    <span>Puoi aggiungerlo ora oppure lasciare questa Cattedra senza testo: non blocca il lavoro.</span>
                  </div>
                )}

                <details className="textbookAddDisclosure">
                  <summary>Aggiungi un libro</summary>
                  <form action={addTextbookProposal} className="textbookForm">
                    <input type="hidden" name="teachingAssignmentId" value={assignment.id} />
                    <input type="hidden" name="sourceKind" value="MANUAL" />
                    <input type="hidden" name="sourceRef" value="" />
                    <div className="textbookFormGrid">
                      <label><span>ISBN-13</span><input name="isbn13" inputMode="numeric" placeholder="978…" required /></label>
                      <label className="wide"><span>Titolo</span><input name="title" maxLength={320} required /></label>
                      <label><span>Editore</span><input name="publisher" maxLength={200} required /></label>
                      <label><span>Autori <small>facoltativo</small></span><input name="authors" maxLength={400} /></label>
                      <label><span>Edizione <small>facoltativa</small></span><input name="editionLabel" maxLength={160} placeholder="Es. Seconda edizione" /></label>
                      <label><span>Volume <small>facoltativo</small></span><input name="volumeLabel" maxLength={120} /></label>
                      <label className="wide"><span>Sottotitolo <small>facoltativo</small></span><input name="subtitle" maxLength={320} /></label>
                      <label className="wide"><span>Sito ufficiale del libro <small>facoltativo</small></span><input name="officialUrl" type="url" maxLength={1000} placeholder="https://…" /></label>
                      <label><span>Riferimento editore <small>facoltativo</small></span><input name="publisherProductRef" maxLength={200} /></label>
                      <label><span>Uso</span><select name="usageKind" defaultValue="ADOPTED"><option value="ADOPTED">Adottato</option><option value="RECOMMENDED">Consigliato</option><option value="OTHER">Altro testo</option></select></label>
                    </div>
                    <div className="textbookFormAction">
                      <span>Il libro verrà aggiunto come proposta. Potrai controllarlo prima di confermarlo.</span>
                      <button className="settingsPrimaryButton" type="submit">Aggiungi come proposta</button>
                    </div>
                  </form>
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

function formatIsbn(value: string) {
  return `${value.slice(0, 3)}-${value.slice(3, 5)}-${value.slice(5, 7)}-${value.slice(7, 12)}-${value.slice(12)}`
}
