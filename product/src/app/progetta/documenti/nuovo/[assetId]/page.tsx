import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { buildBlocks, GRADE_UI } from '@/app/piano-annuale/model'
import { buildStudioAtlasMaterialHref, type TeachingContextSnapshot } from '@/core/domain/atlas-material-handoff'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseKnowledgeRepository } from '@/core/infrastructure/supabase/supabase-knowledge-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { humanizeKnowledgeTitle } from '@/core/presentation/product-language'
import { openUdaAuthoring } from '../../../authoring-actions'
import './new-uda-authoring.css'

export const dynamic = 'force-dynamic'

type NewUdaSearchParams = {
  section?: string
  block?: string
}

const GRADE_STORAGE = { prima: 'PRIMA', seconda: 'SECONDA', terza: 'TERZA' } as const
const GRADE_NUMBER = { PRIMA: '1', SECONDA: '2', TERZA: '3' } as const

export default async function NewUdaAuthoringPage({
  params,
  searchParams,
}: {
  params: Promise<{ assetId: string }>
  searchParams: Promise<NewUdaSearchParams>
}) {
  const [{ assetId }, query, requestHeaders] = await Promise.all([params, searchParams, headers()])
  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) redirect('/login')
  if (!context.academicYear) redirect('/workspace')

  const knowledge = new SupabaseKnowledgeRepository()
  const bundle = await knowledge.getBundle(context.workspace.id, assetId)
  if (!bundle || bundle.asset.contentCategory !== 'UDA') notFound()

  const title = humanizeKnowledgeTitle(bundle.document?.title ?? bundle.asset.originalName)
  const sourceHref = `/knowledge/${encodeURIComponent(assetId)}`
  const studioOrigin = process.env.NEXT_PUBLIC_STUDIO_ATLAS_ORIGIN
  const docenteOrigin = process.env.NEXT_PUBLIC_DOCENTE_OS_ORIGIN ?? process.env.RENDER_EXTERNAL_URL ?? 'http://localhost:3000'
  const grade = asGrade(bundle.asset.sourceMetadata.grade)
  const discipline = metadataString(bundle.asset.sourceMetadata.discipline) ?? 'Tecnologia'
  const udaId = metadataString(bundle.asset.sourceMetadata.uda) ?? assetId
  const referrer = requestHeaders.get('referer')
  const requestedSectionId = clean(query.section) || referrerParam(referrer, 'section')
  const requestedBlockId = (clean(query.block) || referrerParam(referrer, 'block')).toUpperCase()

  const annualRepository = new SupabaseAnnualPlanExecutionRepository()
  const annualSnapshot = requestedSectionId
    ? await annualRepository.list(context.workspace.id, context.academicYear.id)
    : null
  const section = grade && annualSnapshot
    ? annualSnapshot.sections.find((item) => item.id === requestedSectionId && item.grade === GRADE_STORAGE[grade]) ?? null
    : null
  const gradeKey = section ? GRADE_UI[section.grade] : null
  const block = gradeKey && requestedBlockId
    ? buildBlocks(gradeKey).find((item) => item.id === requestedBlockId && item.uda === udaId) ?? null
    : null
  const sectionLabel = section
    ? `${GRADE_NUMBER[section.grade]}${section.sectionCode}`
    : firstSectionLabel(bundle.asset.classLabels ?? [])

  const returnUrl = new URL('/progetta/atlas/ritorno', docenteOrigin)
  if (section) returnUrl.searchParams.set('sectionId', section.id)
  returnUrl.searchParams.set('uda', udaId)
  if (block) returnUrl.searchParams.set('blockId', block.id)

  const atlasHref = studioOrigin && grade && section
    ? buildStudioAtlasMaterialHref(studioOrigin, {
        schema: 'docente-os.teaching-context/v0.1',
        source: 'docente-os',
        udaId,
        udaTitle: title,
        grade,
        sectionId: section.id,
        sectionLabel: sectionLabel ?? `${GRADE_NUMBER[section.grade]}${section.sectionCode}`,
        discipline,
        ...(block ? { blockId: block.id, packId: block.pack, period: block.period } : {}),
        returnUrl: returnUrl.toString(),
      } satisfies TeachingContextSnapshot)
    : null

  const atlasUnavailable = !studioOrigin
    ? 'Studio Atlas non è collegato a questo ambiente.'
    : !section
      ? 'Apri questa UDA dal contesto di una classe per preparare i materiali.'
      : 'Il contesto dell’UDA non è completo.'

  return (
    <AppShell active="design" academicYearLabel={context.academicYear.label} workspaceName={context.workspace.name} role={context.role} contentClassName="newUdaAuthoringSurface">
      <nav className="newUdaBack"><Link href="/progetta">← Progetta</Link></nav>
      <main className="newUdaGate" aria-labelledby="new-uda-title">
        <header className="newUdaGateCopy">
          <h1 id="new-uda-title">Cosa vuoi preparare?</h1>
        </header>

        <section className="newUdaContext" aria-label="Contesto UDA">
          <div><small>UDA</small><strong>{title}</strong></div>
          <span>{sectionLabel ? `${sectionLabel} · ` : ''}{discipline}</span>
        </section>

        <section className="newUdaChoices" aria-label="Azioni disponibili">
          {atlasHref ? (
            <a className="newUdaAtlasAction" href={atlasHref}>
              <span><strong>Prepara materiali con Atlas</strong><small>Presentazione, scheda, guida e rubrica</small></span>
              <b aria-hidden>→</b>
            </a>
          ) : (
            <div className="newUdaAtlasUnavailable"><strong>Prepara materiali con Atlas</strong><span>{atlasUnavailable}</span></div>
          )}

          <form action={openUdaAuthoring.bind(null, assetId)}>
            <button className="newUdaWorkAction" type="submit">
              <span><strong>Lavora sull’UDA</strong><small>Apri il documento di lavoro</small></span>
              <b aria-hidden>→</b>
            </button>
          </form>
        </section>

        <Link className="newUdaSourceLink" href={sourceHref}>Controlla la fonte</Link>
      </main>
    </AppShell>
  )
}

function asGrade(value: unknown): TeachingContextSnapshot['grade'] | null {
  return value === 'prima' || value === 'seconda' || value === 'terza' ? value : null
}

function metadataString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function firstSectionLabel(labels: string[]) {
  return labels.find((label) => /^[1-3]\s*[A-Z]$/i.test(label.replace(/[ªº°]/g, '').trim()))
}

function clean(value: string | undefined) {
  return typeof value === 'string' ? value.trim() : ''
}

function referrerParam(referrer: string | null, name: string) {
  if (!referrer) return ''
  try {
    return new URL(referrer).searchParams.get(name)?.trim() ?? ''
  } catch {
    return ''
  }
}
