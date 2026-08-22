import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { WEEKDAYS } from '@/core/domain/teacher-settings'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseTeacherSettingsRepository } from '@/core/infrastructure/supabase/supabase-teacher-settings-repository'
import { SupabaseTeachingAssignmentReader } from '@/core/infrastructure/supabase/supabase-teaching-assignment-reader'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import {
  addSettingsSection,
  addSettingsTeachingAssignment,
  addTeachingDiscipline,
  confirmSettingsSection,
  saveProfessionalContext,
  saveSchoolOrganization,
  setTeachingDisciplineState,
  updateSettingsTeachingAssignment,
} from './actions'
import {
  buildSettingsExperienceModel,
  settingsAreaStatusLabel,
  type SettingsArea,
  type SettingsAreaKey,
} from './settings-experience-model'
import './settings.css'

export const dynamic = 'force-dynamic'

const GRADE_LABELS = {
  PRIMA: 'Prima',
  SECONDA: 'Seconda',
  TERZA: 'Terza',
} as const

export default async function SettingsPage() {
  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) redirect('/login')
  if (!context.academicYear) redirect('/')

  const settingsRepository = new SupabaseTeacherSettingsRepository()
  const annualRepository = new SupabaseAnnualPlanExecutionRepository()
  const assignmentReader = new SupabaseTeachingAssignmentReader()
  const [settings, disciplines, annualSnapshot, assignments] = await Promise.all([
    settingsRepository.getOrCreate(context.workspace.id, context.academicYear.id),
    settingsRepository.listDisciplines(context.workspace.id, context.academicYear.id),
    annualRepository.list(context.workspace.id, context.academicYear.id),
    assignmentReader.list(context.workspace.id, context.academicYear.id),
  ])

  const experience = buildSettingsExperienceModel({
    settings,
    disciplines,
    sections: annualSnapshot.sections,
    assignments,
  })
  const activeDisciplines = disciplines.filter((item) => item.isActive)
  const sectionById = new Map(annualSnapshot.sections.map((section) => [section.id, section]))
  const disciplineById = new Map(disciplines.map((discipline) => [discipline.id, discipline]))
  const configuredPairs = new Set(assignments.map((assignment) => `${assignment.sectionId}|${assignment.disciplineId}`))
  const availablePairs = annualSnapshot.sections.flatMap((section) => activeDisciplines.flatMap((discipline) => {
    const value = `${section.id}|${discipline.id}`
    if (configuredPairs.has(value)) return []
    return [{ value, label: `${sectionLabel(section.grade, section.sectionCode)} · ${discipline.name}` }]
  }))

  return (
    <AppShell
      active="settings"
      academicYearLabel={context.academicYear.label}
      workspaceName={settings.schoolName || context.workspace.name}
      role={context.role}
      contentClassName="settingsSurface"
    >
      <header className="settingsHeader">
        <div>
          <p>{experience.mode === 'GUIDED' ? 'CONFIGURAZIONE GUIDATA' : 'GESTIONE DEL CONTESTO'} · {context.academicYear.label}</p>
          <h1>{experience.mode === 'GUIDED' ? 'Configuriamo il tuo spazio docente' : 'Il tuo spazio docente'}</h1>
          <span>
            {experience.mode === 'GUIDED'
              ? 'Completa solo ciò che serve ora. Potrai modificare tutto in qualsiasi momento.'
              : 'Qui mantieni aggiornato il contesto professionale usato da DOCENTE OS.'}
          </span>
        </div>
        <div className="settingsHeaderProgress" aria-label={`${experience.readyCount} di ${experience.totalCount} aree pronte`}>
          <strong>{experience.readyCount}/{experience.totalCount}</strong>
          <span>aree pronte</span>
        </div>
      </header>

      <section className={`settingsGuidance ${experience.mode === 'MAINTENANCE' ? 'complete' : ''}`} aria-live="polite">
        <div>
          <span>{experience.mode === 'GUIDED' ? 'PROSSIMO PASSO' : 'CONTESTO PRONTO'}</span>
          <strong>
            {experience.nextArea
              ? `${experience.nextArea.label}: ${experience.nextArea.question}`
              : 'Le informazioni essenziali sono configurate.'}
          </strong>
        </div>
        {experience.nextArea
          ? <a className="settingsPrimaryButton" href={experience.nextArea.href}>{experience.nextArea.nextAction}</a>
          : <Link className="settingsSecondaryButton" href="/orario">Apri Orario</Link>}
      </section>

      <nav className="settingsOverview" aria-label="Stato della configurazione">
        {experience.areas.map((area) => (
          <a className={`settingsOverviewCard status-${area.status.toLowerCase()}`} href={area.href} key={area.key}>
            <span className="settingsOverviewNumber">{String(area.number).padStart(2, '0')}</span>
            <div>
              <strong>{area.label}</strong>
              <small>{area.summary}</small>
            </div>
            <span className="settingsStatusBadge">{settingsAreaStatusLabel(area.status)}</span>
          </a>
        ))}
      </nav>

      <section className="settingsCard" id="contesto" aria-labelledby="context-title">
        <SettingsSectionHeading area={areaFor(experience.areas, 'context')} id="context-title" />
        <SettingsContextDisclosure
          serves="Identifica correttamente il tuo spazio di lavoro."
          usedIn="Contesto, intestazioni e documenti."
          doesNotChange="Attività, Piano annuale, Orario o Calendario."
        />
        <form action={saveProfessionalContext} className="settingsFormBlock">
          <div className="settingsGrid twoCols">
            <label className="settingsField"><span>Come vuoi essere indicato in DOCENTE OS?</span><input name="teacherDisplayName" defaultValue={settings.teacherDisplayName} maxLength={160} placeholder="Nome e cognome" /></label>
            <label className="settingsField readOnlyField"><span>Anno scolastico</span><input value={context.academicYear.label} readOnly /></label>
            <label className="settingsField wideField"><span>Istituto</span><input name="schoolName" defaultValue={settings.schoolName} maxLength={240} placeholder="Istituto Comprensivo…" /></label>
            <label className="settingsField"><span>Codice meccanografico <small>facoltativo</small></span><input name="schoolCode" defaultValue={settings.schoolCode ?? ''} maxLength={40} placeholder="Es. AVIC…" /></label>
            <label className="settingsField"><span>Città <small>facoltativa</small></span><input name="schoolCity" defaultValue={settings.schoolCity ?? ''} maxLength={120} placeholder="Comune" /></label>
            <label className="settingsField wideField"><span>Ordine / tipo di scuola</span><input name="schoolType" defaultValue={settings.schoolType} maxLength={160} placeholder="Es. Secondaria di primo grado" /></label>
          </div>
          <div className="settingsActionRow"><span>Questi dati descrivono il tuo contesto professionale.</span><button className="settingsPrimaryButton" type="submit">Salva il contesto</button></div>
        </form>
      </section>

      <section className="settingsCard" id="discipline" aria-labelledby="disciplines-title">
        <SettingsSectionHeading area={areaFor(experience.areas, 'disciplines')} id="disciplines-title" />
        <SettingsContextDisclosure
          serves="Definisce le discipline che fanno parte del tuo incarico."
          usedIn="Cattedra, Orario, progettazione e classi."
          doesNotChange="Classi o lezioni già inserite."
        />
        <form action={addTeachingDiscipline} className="inlineSettingsForm">
          <label className="settingsField"><span>Nuova disciplina</span><input name="disciplineName" maxLength={120} placeholder="Es. Tecnologia" required /></label>
          <button className="settingsSecondaryButton" type="submit">Aggiungi disciplina</button>
        </form>
        <div className="settingsList">
          {disciplines.length ? disciplines.map((discipline) => (
            <div className={`settingsListRow ${discipline.isActive ? '' : 'mutedRow'}`} key={discipline.id}>
              <div><strong>{discipline.name}</strong><span>{discipline.isActive ? 'Attiva' : 'Non attiva'}</span></div>
              <form action={setTeachingDisciplineState}>
                <input type="hidden" name="disciplineId" value={discipline.id} />
                <input type="hidden" name="isActive" value={discipline.isActive ? 'false' : 'true'} />
                <button className="textButton" type="submit">{discipline.isActive ? 'Disattiva' : 'Riattiva'}</button>
              </form>
            </div>
          )) : <GuidedEmpty title="Prima indica cosa insegni" text="Aggiungi almeno una disciplina. Dopo potrai associarla alle tue classi nella Cattedra." />}
        </div>
      </section>

      <section className="settingsCard" id="classi" aria-labelledby="classes-title">
        <SettingsSectionHeading area={areaFor(experience.areas, 'classes')} id="classes-title" />
        <SettingsContextDisclosure
          serves="Definisce le sezioni con cui lavori quest’anno."
          usedIn="Cattedra, Piano annuale, progettazione e Orario."
          doesNotChange="La Cattedra e non inserisce lezioni nell’Orario."
        />
        <p className="settingsInlineHint">Disciplina e monte ore si associano nel passaggio <strong>Cattedra</strong>.</p>
        <form action={addSettingsSection} className="inlineSettingsForm classAddForm">
          <label className="settingsField"><span>Classe</span><select name="grade" defaultValue="PRIMA"><option value="PRIMA">Prima</option><option value="SECONDA">Seconda</option><option value="TERZA">Terza</option></select></label>
          <label className="settingsField"><span>Sezione</span><input name="sectionCode" maxLength={4} placeholder="A" required /></label>
          <button className="settingsSecondaryButton" type="submit">Aggiungi classe</button>
        </form>
        <div className="settingsList">
          {annualSnapshot.sections.length ? annualSnapshot.sections.map((section) => (
            <div className="settingsListRow" key={section.id}>
              <div><strong>{sectionLabel(section.grade, section.sectionCode)}</strong><span>{sectionStatusLabel(section.status)}</span>{section.sourceNote && <small>{section.sourceNote}</small>}</div>
              {section.status !== 'CONFERMATA' && <form action={confirmSettingsSection}><input type="hidden" name="sectionId" value={section.id} /><button className="textButton" type="submit">Conferma classe</button></form>}
            </div>
          )) : <GuidedEmpty title="Nessuna classe ancora configurata" text="Aggiungi le classi con cui lavori. Puoi lasciarle da confermare finché l’assegnazione non è ufficiale." />}
        </div>
      </section>

      <section className="settingsCard" id="cattedra" aria-labelledby="assignments-title">
        <SettingsSectionHeading area={areaFor(experience.areas, 'assignments')} id="assignments-title" />
        <SettingsContextDisclosure
          serves="Collega classi, discipline e monte ore settimanale."
          usedIn="Orario e controlli della capacità settimanale."
          doesNotChange="Piano annuale, Attività o Calendario."
        />

        {!annualSnapshot.sections.length ? (
          <GuidedDependency title="Prima servono le tue classi" text="Per costruire la Cattedra devo sapere con quali classi lavori. Puoi aggiungerle senza definire ancora l’Orario." href="#classi" cta="Configura le classi" />
        ) : !activeDisciplines.length ? (
          <GuidedDependency title="Prima indica cosa insegni" text="Aggiungi almeno una disciplina attiva; poi potrai collegarla alle tue classi." href="#discipline" cta="Configura le discipline" />
        ) : (
          <>
            {availablePairs.length ? (
              <form action={addSettingsTeachingAssignment} className="settingsAssignmentForm">
                <label className="settingsField"><span>Classe e disciplina</span><select name="assignmentPair" required>{availablePairs.map((pair) => <option key={pair.value} value={pair.value}>{pair.label}</option>)}</select></label>
                <label className="settingsField"><span>Minuti a settimana</span><input name="weeklyMinutes" type="number" min="30" max="2400" step="5" defaultValue="120" required /></label>
                <label className="settingsField wideField"><span>Nota <small>facoltativa</small></span><input name="sourceNote" maxLength={1000} placeholder="Es. assegnazione provvisoria, da confermare al collegio…" /></label>
                <button className="settingsPrimaryButton" type="submit">Aggiungi alla cattedra</button>
                <p className="settingsInlineHint settingsAssignmentHint">Non crea lezioni nell’Orario.</p>
              </form>
            ) : <div className="settingsInlineSuccess"><strong>Tutte le associazioni disponibili sono già presenti.</strong><span>Puoi controllare monte ore e stato qui sotto.</span></div>}

            <div className="settingsList assignmentSettingsList">
              {assignments.length ? assignments.map((assignment) => {
                const section = sectionById.get(assignment.sectionId)
                const discipline = disciplineById.get(assignment.disciplineId)
                return (
                  <div className="settingsAssignmentRow" key={assignment.id}>
                    <div className="settingsAssignmentIdentity">
                      <strong>{section ? sectionLabel(section.grade, section.sectionCode) : 'Classe'} · {discipline?.name ?? 'Disciplina'}</strong>
                      <span>{assignment.status === 'CONFIRMED' ? 'Confermata' : 'Da confermare'} · {formatWeeklyMinutes(assignment.weeklyMinutes)}</span>
                      {assignment.sourceNote && <small>{assignment.sourceNote}</small>}
                    </div>
                    <form action={updateSettingsTeachingAssignment} className="settingsAssignmentEdit">
                      <input type="hidden" name="assignmentId" value={assignment.id} />
                      <label><span>Min/settimana</span><input name="weeklyMinutes" type="number" min="30" max="2400" step="5" defaultValue={assignment.weeklyMinutes} /></label>
                      <label><span>Stato</span><select name="status" defaultValue={assignment.status}><option value="PROVISIONAL">Da confermare</option><option value="CONFIRMED">Confermata</option></select></label>
                      <button className="settingsSecondaryButton" type="submit">Salva modifiche</button>
                    </form>
                  </div>
                )
              }) : <GuidedEmpty title="Cattedra ancora vuota" text="Associa almeno una classe e una disciplina. L’Orario userà queste associazioni quando aggiungi le lezioni." />}
            </div>
          </>
        )}
      </section>

      <section className="settingsCard" id="organizzazione" aria-labelledby="organization-title">
        <SettingsSectionHeading area={areaFor(experience.areas, 'organization')} id="organization-title" />
        <SettingsContextDisclosure
          serves="Prepara più velocemente la griglia della settimana tipo."
          usedIn="Interfaccia di costruzione dell’Orario."
          doesNotChange="Slot già registrati, Calendario o Piano annuale."
        />
        <form action={saveSchoolOrganization} className="settingsFormBlock">
          <div className="settingsGrid threeCols">
            <label className="settingsField"><span>Periodi abituali al giorno</span><select name="dailyPeriodCount" defaultValue={String(settings.dailyPeriodCount)}>{[4,5,6,7,8,9,10].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            <label className="settingsField"><span>La giornata inizia alle</span><input name="schoolDayStart" type="time" defaultValue={settings.schoolDayStart} /></label>
            <label className="settingsField"><span>Durata abituale di un periodo</span><select name="defaultPeriodMinutes" defaultValue={String(settings.defaultPeriodMinutes)}>{[45,50,55,60,65,70].map((value) => <option key={value} value={value}>{value} min</option>)}</select></label>
          </div>
          <fieldset className="weekdayFieldset"><legend>Giorni abituali di lezione</legend><div className="weekdayGrid">{WEEKDAYS.map((day) => <label key={day.value} className="weekdayChoice"><input type="checkbox" name="teachingWeekdays" value={day.value} defaultChecked={settings.teachingWeekdays.includes(day.value)} /><span>{day.label}</span></label>)}</div></fieldset>
          <div className="settingsActionRow"><span>Prepara la griglia iniziale; non riscrive gli slot già esistenti.</span><button className="settingsPrimaryButton" type="submit">Salva l’organizzazione</button></div>
        </form>
      </section>
    </AppShell>
  )
}

function SettingsSectionHeading({ area, id }: { area: SettingsArea; id: string }) {
  return (
    <div className="settingsCardHeading">
      <span>{String(area.number).padStart(2, '0')}</span>
      <div><h2 id={id}>{area.label}</h2><p>{area.question}</p></div>
      <span className={`settingsSectionStatus status-${area.status.toLowerCase()}`}>{settingsAreaStatusLabel(area.status)}</span>
    </div>
  )
}

function SettingsContextDisclosure({ serves, usedIn, doesNotChange }: { serves: string; usedIn: string; doesNotChange: string }) {
  return (
    <details className="settingsContextDisclosure">
      <summary><span aria-hidden>ⓘ</span> Come viene usata</summary>
      <div className="settingsContextDisclosureBody">
        <ContextDetail label="Serve a" text={serves} />
        <ContextDetail label="Usato in" text={usedIn} />
        <ContextDetail label="Non modifica" text={doesNotChange} />
      </div>
    </details>
  )
}

function ContextDetail({ label, text }: { label: string; text: string }) {
  return <div><span>{label}</span><strong>{text}</strong></div>
}

function GuidedEmpty({ title, text }: { title: string; text: string }) {
  return <div className="emptySettingsState"><strong>{title}</strong><span>{text}</span></div>
}

function GuidedDependency({ title, text, href, cta }: { title: string; text: string; href: string; cta: string }) {
  return <div className="settingsDependency"><div><strong>{title}</strong><span>{text}</span></div><a className="settingsSecondaryButton" href={href}>{cta}</a></div>
}

function areaFor(areas: SettingsArea[], key: SettingsAreaKey) {
  const area = areas.find((item) => item.key === key)
  if (!area) throw new Error(`Missing Settings area: ${key}`)
  return area
}

function sectionLabel(grade: keyof typeof GRADE_LABELS, sectionCode: string) {
  return `${GRADE_LABELS[grade]} ${sectionCode}`
}

function sectionStatusLabel(value: string) {
  if (value === 'CONFERMATA') return 'Confermata'
  if (value === 'PROVVISORIA') return 'Provvisoria'
  if (value === 'DA_CONFERMARE') return 'Da confermare'
  return value.replaceAll('_', ' ').toLowerCase()
}

function formatWeeklyMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (!hours) return `${minutes} min/settimana`
  if (!rest) return `${hours} ${hours === 1 ? 'ora' : 'ore'}/settimana`
  return `${hours}h ${rest}m/settimana`
}
