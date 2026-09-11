import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { resolveLessonRegisterTiming } from '@/core/application/lesson-register-timing'
import { googleOAuthConfigured } from '@/core/infrastructure/google/google-oauth'
import { GoogleOAuthConnectionRepository } from '@/core/infrastructure/google/google-oauth-connection-repository'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseKnowledgeRepository } from '@/core/infrastructure/supabase/supabase-knowledge-repository'
import { SupabaseTeacherSettingsRepository } from '@/core/infrastructure/supabase/supabase-teacher-settings-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { buildClassroomSessionView } from '../classroom-session-model'
import { recordClassroomLesson } from './actions'
import { retryPendingDriveDiary } from './drive-actions'
import './lesson-register.css'

export const dynamic = 'force-dynamic'

export default async function LessonRegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ sectionId: string; assetId: string }>
  searchParams: Promise<{ saved?: string; drive?: string; google?: string; driveSynced?: string; driveRetry?: string }>
}) {
  const { sectionId, assetId } = await params
  const query = await searchParams
  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) redirect('/login')
  if (!context.academicYear) redirect('/workspace')

  const [snapshot, bundle, settings] = await Promise.all([
    new SupabaseAnnualPlanExecutionRepository().list(context.workspace.id, context.academicYear.id),
    new SupabaseKnowledgeRepository().getBundle(context.workspace.id, assetId),
    new SupabaseTeacherSettingsRepository().getOrCreate(context.workspace.id, context.academicYear.id),
  ])
  const section = snapshot.sections.find((item) => item.id === sectionId)
  if (!section || !bundle) notFound()
  const view = buildClassroomSessionView(section, bundle.asset)
  if (!view) notFound()

  const localDate = view.targetDate ?? currentRomeDate()
  const timing = await resolveLessonRegisterTiming({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    sectionId,
    localDate,
  })
  const timeLabel = timing.startAt?.match(/T(\d{2}:\d{2})/)?.[1] ?? null
  const actualMinutes = timing.plannedMinutes ?? 60
  const discipline = disciplineLabel(timing.title ?? undefined, bundle.asset.disciplines)
  const udaLabel = metadataString(bundle.asset.sourceMetadata, 'udaLabel')
    ?? metadataString(bundle.asset.sourceMetadata, 'udaTitle')
    ?? 'Percorso didattico in corso'
  const plannedActivity = metadataString(bundle.asset.sourceMetadata, 'plannedActivity') ?? view.title
  const registerPath = `/classi/${encodeURIComponent(sectionId)}/in-classe/${encodeURIComponent(assetId)}/registra`
  const driveConnectHref = `/api/google/drive/connect?returnTo=${encodeURIComponent(registerPath)}`
  const oauthConfigured = googleOAuthConfigured()
  let googleConnected = false
  if (oauthConfigured) {
    try {
      googleConnected = Boolean(await new GoogleOAuthConnectionRepository().getActive(context.workspace.id))
    } catch {
      googleConnected = false
    }
  }

  return (
    <AppShell
      active="classes"
      academicYearLabel={context.academicYear.label}
      workspaceName={settings.schoolName || context.workspace.name}
      role={context.role}
      contentClassName="lessonRegisterSurface"
    >
      <nav className="lessonRegisterNav" aria-label="Contesto della lezione">
        <Link href={`/classi/${encodeURIComponent(sectionId)}/in-classe/${encodeURIComponent(assetId)}`}>← Torna alla lezione</Link>
        <Link href={`/classi/${encodeURIComponent(sectionId)}`}>Apri classe</Link>
      </nav>

      <header className="lessonRegisterHero">
        <p>DIARIO DEL DOCENTE</p>
        <h1>{view.classLabel} — {discipline}{timeLabel ? ` — ${timeLabel}` : ''}</h1>
        <span>
          {formatDate(localDate)}
          {timing.authority === 'PROVISIONAL_DRAFT' ? ' · orario provvisorio, non ancora attivato' : ''}
        </span>
      </header>

      {query.google === 'connected' ? (
        <section className="lessonRegisterReceipt" role="status">
          <strong>Google Drive collegato</strong>
          <p>
            La memoria documentale è autorizzata per questo docente.
            {Number(query.driveSynced) > 0 ? ` Registrazioni sincronizzate: ${Number(query.driveSynced)}.` : ''}
          </p>
        </section>
      ) : null}

      {query.google && query.google !== 'connected' ? (
        <section className="lessonRegisterReceipt" role="status">
          <strong>Collegamento Drive non completato</strong>
          <p>La registrazione in Docente OS resta disponibile. Puoi ripetere il collegamento senza perdere il diario.</p>
        </section>
      ) : null}

      {query.driveRetry ? (
        <section className="lessonRegisterReceipt" role="status">
          <strong>{query.driveRetry === 'synced' ? 'Sincronizzazione Drive completata' : 'Sincronizzazione Drive da riprendere'}</strong>
          <p>
            {query.driveRetry === 'synced'
              ? `Registrazioni aggiornate sul Diario: ${Number(query.driveSynced) || 0}.`
              : 'Le registrazioni restano conservate in Docente OS e possono essere sincronizzate di nuovo.'}
          </p>
        </section>
      ) : null}

      {query.saved ? (
        <section className="lessonRegisterReceipt" role="status">
          <strong>Lezione registrata</strong>
          <p>La registrazione è stata acquisita nella memoria di Docente OS.</p>
          {query.drive === 'synced' ? <p>Il Diario su Drive è stato aggiornato.</p> : null}
          {query.drive === 'connect' ? (
            <>
              <p>La copia documentale è in attesa dell’autorizzazione Google Drive.</p>
              <Link className="lessonRegisterDriveAction" href={driveConnectHref}>Collega Google Drive</Link>
            </>
          ) : null}
          {query.drive === 'not-configured' ? <p>La copia Drive è in coda: il collegamento Google dell’app deve essere configurato prima della sincronizzazione.</p> : null}
          {query.drive === 'recoverable' ? <p>La copia Drive resta recuperabile dalla registrazione; nessuna evidenza della lezione è andata persa.</p> : null}
        </section>
      ) : null}

      <section className="lessonRegisterDrive" aria-label="Memoria documentale">
        <div>
          <span>MEMORIA DOCUMENTALE</span>
          <strong>{googleConnected ? 'Google Drive collegato' : oauthConfigured ? 'Google Drive da collegare' : 'Google Drive in attesa di configurazione'}</strong>
          <p>
            {googleConnected
              ? 'Dopo la registrazione, Docente OS aggiorna automaticamente il Diario persistente.'
              : oauthConfigured
                ? 'Docente OS conserva comunque la lezione; il collegamento abilita la copia automatica nel Diario Drive.'
                : 'La registrazione resta sicura in Docente OS e verrà sincronizzata quando il collegamento Google sarà attivo.'}
          </p>
        </div>
        {!googleConnected && oauthConfigured ? <Link href={driveConnectHref}>Collega Drive</Link> : null}
        {googleConnected ? (
          <form action={retryPendingDriveDiary}>
            <input type="hidden" name="sectionId" value={sectionId} />
            <input type="hidden" name="assetId" value={assetId} />
            <button type="submit">Sincronizza registrazioni in attesa</button>
          </form>
        ) : null}
      </section>

      <section className="lessonRegisterContext" aria-label="Contesto didattico">
        <div>
          <span>UDA / percorso</span>
          <strong>{udaLabel}</strong>
        </div>
        <div>
          <span>Attività prevista</span>
          <strong>{plannedActivity}</strong>
        </div>
        <div className="lessonRegisterMaterial">
          <span>Materiale didattico</span>
          <a href={view.sourceHref} target="_blank" rel="noreferrer">Apri materiale {view.providerLabel} ↗</a>
        </div>
      </section>

      <form action={recordClassroomLesson} className="lessonRegisterForm">
        <input type="hidden" name="sectionId" value={sectionId} />
        <input type="hidden" name="assetId" value={assetId} />

        <div className="lessonRegisterDuration">
          <label htmlFor="actualMinutes">Durata effettiva</label>
          <div><input id="actualMinutes" name="actualMinutes" type="number" min="1" max="1440" defaultValue={actualMinutes} required /><span>minuti</span></div>
        </div>

        <label>
          <span>Che cosa hai svolto?</span>
          <textarea name="activityDone" required maxLength={450} rows={3} placeholder="Attività realmente svolta, anche se diversa da quella prevista." />
        </label>
        <label>
          <span>Che cosa hai osservato?</span>
          <textarea name="observations" maxLength={450} rows={3} placeholder="Risposta della classe, evidenze di apprendimento, aspetti significativi." />
        </label>
        <label>
          <span>Difficoltà?</span>
          <textarea name="difficulties" maxLength={450} rows={3} placeholder="Ostacoli, tempi, passaggi da riprendere o differenze emerse nel gruppo." />
        </label>
        <label>
          <span>Idee emerse?</span>
          <textarea name="ideas" maxLength={450} rows={3} placeholder="Intuizioni, collegamenti, attività o materiali da sviluppare." />
        </label>
        <label>
          <span>Che cosa potrebbe cambiare nell’UDA?</span>
          <textarea name="udaChangeProposal" maxLength={450} rows={3} placeholder="Annota una proposta. Non modifica automaticamente l’UDA." />
        </label>
        <label>
          <span>Qual è la prossima attività?</span>
          <textarea name="nextActivity" maxLength={450} rows={3} placeholder="Passo successivo previsto per questa classe." />
        </label>

        <aside className="lessonRegisterPrivacy">
          <strong>Osservazioni professionali di classe</strong>
          <p>Non inserire nomi degli alunni o dati personali. Le eventuali modifiche all’UDA restano proposte finché non vengono confermate dal docente.</p>
        </aside>

        <button type="submit" className="lessonRegisterSubmit">Registra la lezione</button>
      </form>
    </AppShell>
  )
}

function metadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key]
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 600) : null
}

function disciplineLabel(occurrenceTitle: string | undefined, disciplines: string[]) {
  const fromOccurrence = occurrenceTitle?.split('·').map((item) => item.trim()).filter(Boolean).at(-1)
  return fromOccurrence || disciplines[0] || 'Disciplina'
}

function formatDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, day)))
}

function currentRomeDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}
