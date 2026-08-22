import Link from 'next/link'
import { redirect } from 'next/navigation'
import { WEEKDAYS } from '@/core/domain/teacher-settings'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseTeacherSettingsRepository } from '@/core/infrastructure/supabase/supabase-teacher-settings-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import {
  addSettingsSection,
  addTeachingDiscipline,
  confirmSettingsSection,
  saveTeacherSettings,
  setTeachingDisciplineState,
} from './actions'
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
  const [settings, disciplines, annualSnapshot] = await Promise.all([
    settingsRepository.getOrCreate(context.workspace.id, context.academicYear.id),
    settingsRepository.listDisciplines(context.workspace.id, context.academicYear.id),
    annualRepository.list(context.workspace.id, context.academicYear.id),
  ])

  return (
    <div className="appShell">
      <aside className="navRail" aria-label="Navigazione principale">
        <div className="brandLockup"><span className="brandMark">D</span><div><strong>DOCENTE OS</strong><span>{context.academicYear.label}</span></div></div>
        <nav className="navList">
          <Link className="navItem" href="/"><span aria-hidden>⌂</span> Home</Link>
          <Link className="navItem" href="/planner"><span aria-hidden>◎</span> Oggi</Link>
          <Link className="navItem" href="/piano-annuale"><span aria-hidden>▤</span> Piano annuale</Link>
          <Link className="navItem" href="/progetta"><span aria-hidden>✦</span> Progetta</Link>
          <Link className="navItem" href="/knowledge"><span aria-hidden>◇</span> Conoscenza</Link>
          <Link className="navItem" href="/classi"><span aria-hidden>▦</span> Classi</Link>
          <Link className="navItem active" href="/impostazioni"><span aria-hidden>⚙</span> Impostazioni</Link>
        </nav>
        <div className="navFooter"><span className="workspaceDot" aria-hidden /><div><strong>{context.workspace.name}</strong><span>{context.role}</span></div></div>
      </aside>

      <main className="workSurface settingsSurface">
        <header className="settingsHeader">
          <div><p>IMPOSTAZIONI · {context.academicYear.label}</p><h1>Personalizza il tuo ambiente docente</h1><span>Questi dati alimentano classi, piano annuale e configurazione iniziale dell’orario.</span></div>
          <Link className="secondaryButton" href="/">Torna alla Home</Link>
        </header>

        <form action={saveTeacherSettings} className="settingsStack">
          <section className="settingsCard" aria-labelledby="teacher-settings-title">
            <div className="settingsCardHeading"><span>01</span><div><h2 id="teacher-settings-title">Docente</h2><p>Identità professionale mostrata nell’app e nei documenti generati.</p></div></div>
            <div className="settingsGrid twoCols">
              <label className="settingsField"><span>Nome visualizzato</span><input name="teacherDisplayName" defaultValue={settings.teacherDisplayName} maxLength={160} placeholder="Nome e cognome" /></label>
              <label className="settingsField readOnlyField"><span>Anno scolastico</span><input value={context.academicYear.label} readOnly /></label>
            </div>
          </section>

          <section className="settingsCard" aria-labelledby="school-settings-title">
            <div className="settingsCardHeading"><span>02</span><div><h2 id="school-settings-title">Istituto</h2><p>Dati della scuola usati come contesto per progettazione, orario e documentazione.</p></div></div>
            <div className="settingsGrid twoCols">
              <label className="settingsField wideField"><span>Nome istituto</span><input name="schoolName" defaultValue={settings.schoolName} maxLength={240} placeholder="Istituto Comprensivo…" /></label>
              <label className="settingsField"><span>Codice meccanografico</span><input name="schoolCode" defaultValue={settings.schoolCode ?? ''} maxLength={40} placeholder="Opzionale" /></label>
              <label className="settingsField"><span>Città</span><input name="schoolCity" defaultValue={settings.schoolCity ?? ''} maxLength={120} placeholder="Comune" /></label>
              <label className="settingsField"><span>Ordine / tipo di scuola</span><input name="schoolType" defaultValue={settings.schoolType} maxLength={160} /></label>
            </div>
          </section>

          <section className="settingsCard" aria-labelledby="timetable-defaults-title">
            <div className="settingsCardHeading"><span>03</span><div><h2 id="timetable-defaults-title">Preset orario</h2><p>Valori iniziali per costruire l’orario; non sostituiscono l’orario ufficiale versionato.</p></div></div>
            <div className="settingsGrid threeCols">
              <label className="settingsField"><span>Ore giornaliere</span><select name="dailyPeriodCount" defaultValue={String(settings.dailyPeriodCount)}>{[4,5,6,7,8,9,10].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
              <label className="settingsField"><span>Inizio lezioni</span><input name="schoolDayStart" type="time" defaultValue={settings.schoolDayStart} /></label>
              <label className="settingsField"><span>Durata standard ora</span><select name="defaultPeriodMinutes" defaultValue={String(settings.defaultPeriodMinutes)}>{[45,50,55,60,65,70].map((value) => <option key={value} value={value}>{value} min</option>)}</select></label>
            </div>
            <fieldset className="weekdayFieldset"><legend>Giorni di lezione</legend><div className="weekdayGrid">{WEEKDAYS.map((day) => <label key={day.value} className="weekdayChoice"><input type="checkbox" name="teachingWeekdays" value={day.value} defaultChecked={settings.teachingWeekdays.includes(day.value)} /><span>{day.label}</span></label>)}</div></fieldset>
          </section>

          <div className="settingsSaveBar"><div><strong>Profilo di base</strong><span>Salvato in Supabase e riutilizzato dai moduli dell’app.</span></div><button className="primaryButton" type="submit">Salva impostazioni</button></div>
        </form>

        <section className="settingsCard" aria-labelledby="disciplines-title">
          <div className="settingsCardHeading"><span>04</span><div><h2 id="disciplines-title">Discipline</h2><p>Catalogo canonico dell’anno scolastico. Le discipline attive saranno disponibili per cattedra e orario.</p></div></div>
          <form action={addTeachingDiscipline} className="inlineSettingsForm"><label className="settingsField"><span>Nuova disciplina</span><input name="disciplineName" maxLength={120} placeholder="Es. Tecnologia" required /></label><button className="secondaryButton" type="submit">Aggiungi</button></form>
          <div className="settingsList">{disciplines.map((discipline) => <div className={`settingsListRow ${discipline.isActive ? '' : 'mutedRow'}`} key={discipline.id}><div><strong>{discipline.name}</strong><span>{discipline.isActive ? 'Attiva' : 'Non attiva'}</span></div><form action={setTeachingDisciplineState}><input type="hidden" name="disciplineId" value={discipline.id} /><input type="hidden" name="isActive" value={discipline.isActive ? 'false' : 'true'} /><button className="textButton" type="submit">{discipline.isActive ? 'Disattiva' : 'Riattiva'}</button></form></div>)}</div>
        </section>

        <section className="settingsCard" aria-labelledby="classes-title">
          <div className="settingsCardHeading"><span>05</span><div><h2 id="classes-title">Classi e sezioni</h2><p>È la stessa anagrafica usata dal Piano annuale: nessuna duplicazione.</p></div></div>
          <form action={addSettingsSection} className="inlineSettingsForm classAddForm"><label className="settingsField"><span>Classe</span><select name="grade" defaultValue="PRIMA"><option value="PRIMA">Prima</option><option value="SECONDA">Seconda</option><option value="TERZA">Terza</option></select></label><label className="settingsField"><span>Sezione</span><input name="sectionCode" maxLength={4} placeholder="A" required /></label><button className="secondaryButton" type="submit">Aggiungi classe</button></form>
          <div className="settingsList">{annualSnapshot.sections.length ? annualSnapshot.sections.map((section) => <div className="settingsListRow" key={section.id}><div><strong>{GRADE_LABELS[section.grade]} {section.sectionCode}</strong><span>{section.status.replaceAll('_', ' ')}</span>{section.sourceNote && <small>{section.sourceNote}</small>}</div>{section.status !== 'CONFERMATA' && <form action={confirmSettingsSection}><input type="hidden" name="sectionId" value={section.id} /><button className="textButton" type="submit">Conferma</button></form>}</div>) : <div className="emptySettingsState"><strong>Nessuna classe configurata</strong><span>Aggiungi le sezioni quando l’assegnazione è disponibile.</span></div>}</div>
        </section>

        <section className="settingsInfoStrip"><strong>Contratto dati</strong><span>Le Impostazioni forniscono il contesto iniziale. L’orario ufficiale conserverà versioni, date di efficacia ed eccezioni senza riscrivere queste informazioni di base.</span></section>
      </main>
    </div>
  )
}
