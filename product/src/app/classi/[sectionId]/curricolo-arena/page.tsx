import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { SupabaseAnnualPlanCurriculumRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-curriculum-repository'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { Supabase2CP7ReceiptEvidenceRepository } from '@/core/infrastructure/supabase/supabase-2c-p7-receipt-evidence-repository'
import { isEco02PilotClass } from '@/core/domain/cml-discipline-binding'
import { eco02PilotIdentityFromEnv } from '@/core/server/eco02-pilot-config'
import { CurriculumArenaIntakeClient } from './curriculum-arena-intake-client'
import { ArenaCanonicalAlignmentPreviewClient } from './arena-canonical-alignment-preview-client'
import { classify2CPilotBaselineAgainstP7, type Pilot2CP7BaselineStatus } from '@/core/domain/cml-2c-p7-provenance'
import '../../classi.css'
import '../../class-workspace-operational.css'

export const dynamic = 'force-dynamic'

export default async function CurriculumArenaPage({
  params,
  searchParams,
}: {
  params: Promise<{ sectionId: string }>
  searchParams: Promise<{ accepted?: string }>
}) {
  const { sectionId } = await params
  const query = await searchParams
  const context = await new SupabaseWorkspaceRepository().getCurrentContext()
  if (!context) redirect('/login')
  if (!context.academicYear) redirect('/workspace')

  const snapshot = await new SupabaseAnnualPlanExecutionRepository().list(
    context.workspace.id,
    context.academicYear.id,
  )
  const section = snapshot.sections.find((candidate) => candidate.id === sectionId)
  if (!section) notFound()
  if (!isEco02PilotClass({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    sectionId: section.id,
    grade: section.grade,
    sectionCode: section.sectionCode,
  }, eco02PilotIdentityFromEnv())) notFound()

  const curriculumRepository = new SupabaseAnnualPlanCurriculumRepository()
  const baseline = await curriculumRepository.currentBaseline({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    sectionId,
    disciplineRef: 'technology',
  })

  const p7Provenance = classify2CPilotBaselineAgainstP7({
    scope: {
      grade: section.grade,
      sectionCode: section.sectionCode,
      schoolYearRef: context.academicYear.label,
    },
    currentBaseline: baseline ? {
      sourceHandoffFootprintHash: baseline.sourceHandoffFootprintHash,
      alignmentAuthority: baseline.alignmentAuthority,
      acceptedAt: baseline.acceptedAt,
    } : null,
  })

  // Exact P7 evidence is read with the current user's session and workspace RLS.
  // Failure is reported as unverified, never as a new teacher approval.
  const p7ReceiptEvidence = await new Supabase2CP7ReceiptEvidenceRepository()
    .check({
      workspaceId: context.workspace.id,
      academicYearId: context.academicYear.id,
      sectionId,
    })
    .catch(() => null)

  const sectionLabel = `${gradeNumber(section.grade)}ª ${section.sectionCode}`
  const classHref = `/classi/${encodeURIComponent(sectionId)}`

  return (
    <AppShell
      active="classes"
      academicYearLabel={context.academicYear.label}
      workspaceName={context.workspace.name}
      role={context.role}
      contentClassName="classesWorkspaceSurface"
    >
      <section className="classWorkspaceHeader">
        <div>
          <p>CLASSE · CURRICOLO ARENA</p>
          <h1>{sectionLabel}</h1>
          <span>Pilota Tecnologia 2C: acquisisci una baseline provvisoria da Arena senza sincronizzazioni automatiche.</span>
        </div>
      </section>

      {query.accepted ? (
        <section className="classRecordFeedback" aria-label="Esito acquisizione curricolo" role="status" aria-live="polite">
          <strong>{query.accepted === 'known' ? 'Baseline già acquisita.' : 'Acquisizione completata: baseline Arena salvata.'}</strong>
          <span>{query.accepted === 'known'
            ? 'La stessa impronta strutturale è già associata alla classe.'
            : 'La baseline provvisoria è ora associata alla 2C. Puoi tornare alla preparazione della lezione.'}</span>
        </section>
      ) : null}

      <section className="classWorkspaceGrid">
        <article className="classWorkspaceCard">
          <div>
            <h2>Baseline corrente</h2>
            <p>È il contesto che Docente OS usa per controllare progettazione e preparazione della lezione.</p>
          </div>
          {baseline ? (
            <div className="classAssignmentList">
              <div className="classAssignmentItem">
                <div><strong>{baseline.curriculumState === 'APPROVED' ? 'Istituzionale' : 'Provvisoria'}</strong><span>{baseline.alignmentAuthority}</span></div>
                <small>{baseline.requiresRevalidationOnApproval ? 'Rivalidazione futura richiesta' : 'Rivalidazione non richiesta'}</small>
              </div>
              <div className="classAssignmentItem">
                <div><strong>Copertura</strong><span>{baseline.curriculumCoverage.status}</span></div>
                <small>{baseline.curricularContext.requirements.length} requisiti tracciati</small>
              </div>
              <div className="classAssignmentItem">
                <div><strong>Impronta Arena</strong><span>{baseline.sourceHandoffFootprintHash}</span></div>
                <small>Accettata {formatDateTime(baseline.acceptedAt)}</small>
              </div>
            </div>
          ) : (
            <div className="classesEmpty">
              <strong>Nessuna baseline Arena ancora acquisita.</strong>
              <span>Scarica il passaggio da Arena, controllalo qui e confermalo esplicitamente.</span>
            </div>
          )}
          <div className="classAssignmentItem">
            <div>
              <strong>Riscontro con il pilota del 21 settembre</strong>
              <span>{p7SourceStatusLabel(p7Provenance.status)}</span>
            </div>
            <small>Il confronto delle sole impronte non prova l’esistenza attuale della ricevuta di preparazione e non verifica l’identità istituzionale.</small>
          </div>
          <div className="classAssignmentItem">
            <div>
              <strong>Ricevuta di preparazione P7</strong>
              <span>{p7ReceiptEvidence === null
                ? 'Verifica temporaneamente non disponibile'
                : p7ReceiptEvidence.status === 'DOCUMENTED_RECEIPT_VERIFIED'
                  ? 'Presente e coerente con la preparazione del 21 settembre'
                  : p7ReceiptEvidence.status === 'DOCUMENTED_RECEIPT_NOT_FOUND'
                    ? 'Non presente nell’attuale contesto autorizzato'
                    : 'Presente, ma non corrispondente alla prova storica documentata'}</span>
            </div>
            <small>Riscontro autenticato sul solo blocco B01 della 2C; non modifica la progettazione e non approva il nuovo curricolo.</small>
          </div>
        </article>

        <ArenaCanonicalAlignmentPreviewClient
          section={{
            grade: section.grade,
            sectionCode: section.sectionCode,
            schoolYearRef: context.academicYear.label,
          }}
          legacyBaseline={baseline ? {
            sourceHandoffFootprintHash: baseline.sourceHandoffFootprintHash,
            alignmentAuthority: baseline.alignmentAuthority,
            acceptedAt: baseline.acceptedAt,
            reviewedConstraints: baseline.reviewedFramework.constraints.map(constraint => ({
              id: constraint.id,
              description: constraint.description,
            })),
          } : null}
        />
        <CurriculumArenaIntakeClient
          sectionId={sectionId}
          currentFootprint={baseline?.sourceHandoffFootprintHash ?? null}
        />
      </section>

      <details className="technicalDetails">
        <summary><span><strong>Confine di autorità</strong><small>Cosa questa pagina può e non può fare</small></span><b aria-hidden>＋</b></summary>
        <div className="technicalDetailsBody">
          <p>Arena resta la fonte del contesto curricolare e della sua impronta strutturale.</p>
          <p>Docente OS salva la baseline solo dopo una decisione esplicita del docente autenticato.</p>
          <p>Una baseline provvisoria non diventa approvazione istituzionale. Un futuro passaggio approvato richiederà un segnale Arena verificabile lato server e una rivalidazione esplicita del docente.</p>
          <p>Questo caricamento locale non può promuovere autorità istituzionale.</p>
        </div>
      </details>

      <Link href={classHref}>← Torna alla classe</Link>
    </AppShell>
  )
}

function p7SourceStatusLabel(status: Pilot2CP7BaselineStatus): string {
  switch (status) {
    case 'NO_CURRENT_BASELINE':
      return 'Nessuna baseline corrente rilevata per la 2C'
    case 'P7_SOURCE_FOOTPRINT_MATCH':
      return 'La fonte della baseline corrente coincide con quella documentata nel pilota'
    case 'CURRENT_BASELINE_DIFFERS_FROM_P7':
      return 'Fonte corrente diversa da quella documentata: confronto professionale necessario'
    case 'P7_FOOTPRINT_WITH_CHANGED_AUTHORITY':
      return 'Impronta coincidente, ma stato di autorità cambiato: verifica necessaria'
  }
}

function gradeNumber(grade: 'PRIMA' | 'SECONDA' | 'TERZA') {
  if (grade === 'PRIMA') return '1'
  if (grade === 'SECONDA') return '2'
  return '3'
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Europe/Rome',
  }).format(date)
}
