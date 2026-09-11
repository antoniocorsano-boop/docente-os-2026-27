import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { WORKSPACE_PINNED_RESOURCE_SLOTS } from '@/core/domain/workspace-pinned-resource'
import { SupabaseTeacherSettingsRepository } from '@/core/infrastructure/supabase/supabase-teacher-settings-repository'
import { SupabaseWorkspacePinnedResourceRepository } from '@/core/infrastructure/supabase/supabase-workspace-pinned-resource-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { saveWorkspacePinnedResource } from './actions'
import '../settings.css'

export const dynamic = 'force-dynamic'

export default async function HomeLinksSettingsPage() {
  const context = await new SupabaseWorkspaceRepository().getCurrentContext()
  if (!context) redirect('/login')
  if (!context.academicYear) redirect('/')

  const [settings, resources] = await Promise.all([
    new SupabaseTeacherSettingsRepository().getOrCreate(context.workspace.id, context.academicYear.id),
    new SupabaseWorkspacePinnedResourceRepository().list(context.workspace.id, context.academicYear.id),
  ])
  const resourcesByKind = new Map(resources.map((resource) => [resource.kind, resource]))

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
          <p>HOME · {context.academicYear.label}</p>
          <h1>Collegamenti del tuo spazio docente</h1>
          <span>
            Questi accessi appartengono esclusivamente al workspace corrente. Non vengono copiati, condivisi o letti da altri spazi docente.
          </span>
        </div>
        <div className="settingsHeaderProgress" aria-label={`${resources.length} di ${WORKSPACE_PINNED_RESOURCE_SLOTS.length} collegamenti configurati`}>
          <strong>{resources.length}/{WORKSPACE_PINNED_RESOURCE_SLOTS.length}</strong>
          <span>collegamenti attivi</span>
        </div>
      </header>

      <section className="settingsGuidance complete" aria-label="Confine del workspace">
        <div>
          <span>CONFINE DATI</span>
          <strong>{settings.teacherDisplayName || 'Il docente'} · {settings.schoolName || context.workspace.name}</strong>
        </div>
        <Link className="settingsSecondaryButton" href="/impostazioni">Torna alle impostazioni</Link>
      </section>

      {WORKSPACE_PINNED_RESOURCE_SLOTS.map((slot, index) => {
        const resource = resourcesByKind.get(slot.kind)
        const anchor = slot.kind.toLowerCase()
        return (
          <section className="settingsCard" id={anchor} aria-labelledby={`${anchor}-title`} key={slot.kind}>
            <div className="settingsCardHeading">
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div>
                <h2 id={`${anchor}-title`}>{slot.label}</h2>
                <p>{slot.description}</p>
              </div>
            </div>

            <form action={saveWorkspacePinnedResource} className="settingsFormBlock">
              <input type="hidden" name="kind" value={slot.kind} />
              <div className="settingsGrid twoCols">
                <label className="settingsField wideField">
                  <span>Collegamento</span>
                  <input
                    name="targetUrl"
                    defaultValue={resource?.targetUrl ?? ''}
                    maxLength={2048}
                    placeholder="https://drive.google.com/... oppure /percorso-interno"
                    inputMode="url"
                  />
                </label>
                <label className="settingsField wideField">
                  <span>Nota <small>facoltativa</small></span>
                  <input
                    name="note"
                    defaultValue={resource?.note ?? ''}
                    maxLength={500}
                    placeholder="Cosa troverai aprendo questo accesso"
                  />
                </label>
              </div>
              <div className="settingsActionRow">
                <span>{resource ? 'Collegamento attivo. Lascia vuoto il campo e salva per rimuoverlo.' : 'Nessun collegamento configurato in questo workspace.'}</span>
                <button className="settingsPrimaryButton" type="submit">Salva collegamento</button>
              </div>
            </form>
          </section>
        )
      })}
    </AppShell>
  )
}
