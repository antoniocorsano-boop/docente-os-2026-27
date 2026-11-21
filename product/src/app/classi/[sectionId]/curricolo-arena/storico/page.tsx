import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { SupabaseAnnualPlanCurriculumRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-curriculum-repository'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseTeachingAssignmentReader } from '@/core/infrastructure/supabase/supabase-teaching-assignment-reader'
import { SupabaseTeacherSettingsRepository } from '@/core/infrastructure/supabase/supabase-teacher-settings-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { Supabase2CP7ReceiptEvidenceRepository } from '@/core/infrastructure/supabase/supabase-2c-p7-receipt-evidence-repository'
import { mayConsultProvisionalTechnology } from '@/core/domain/cml-provisional-technology-reference'
import { isEco02PilotClass } from '@/core/domain/cml-discipline-binding'
import { eco02PilotIdentityFromEnv } from '@/core/server/eco02-pilot-config'
import { classify2CPilotBaselineAgainstP7, type Pilot2CP7BaselineStatus } from '@/core/domain/cml-2c-p7-provenance'
import { ArenaCanonicalAlignmentPreviewClient } from '../arena-canonical-alignment-preview-client'
import { CurriculumArenaIntakeClient } from '../curriculum-arena-intake-client'
import '../../../classi.css'
import '../../../class-workspace-operational.css'

export const dynamic = 'force-dynamic'

/**
 * One optional archive for all authorized classes. Its primary view reads the
 * class-scoped baseline; only documented historical P7 evidence activates the
 * legacy review, without changing the common curriculum consultation route.
 */
export default async function ClassCurriculumArchivePage({
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

  const [assignments, disciplines] = await Promise.all([
    new SupabaseTeachingAssignmentReader().list(context.workspace.id, context.academicYear.id),
    new SupabaseTeacherSettingsRepository().listDisciplines(context.workspace.id, context.academicYear.id),
  ])
  if (!mayConsultProvisionalTechnology({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    sectionId,
    schoolYearRef: context.academicYear.label,
    assignments,
    disciplines,
  })) notFound()

  const baseline = await new SupabaseAnnualPlanCurriculumRepository().currentBaseline({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    sectionId,
    disciplineRef: 'technology',
  })

  // Historical compatibility only: never used to choose the curriculum
  // segment or to grant access. Other sections receive the same archive view.
  const hasDocumentedLegacyScope = isEco02PilotClass({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    sectionId,
    grade: section.grade,
    sectionCode: section.sectionCode,
  }, eco02PilotIdentityFromEnv())

  const legacyProvenance = hasDocumentedLegacyScope
    ? classify2CPilotBaselineAgainstP7({
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
    : null
  const legacyReceipt = hasDocumentedLegacyScope
    ? await new Supabase2CP7ReceiptEvidenceRepository().check({
      workspaceId: context.workspace.id,
      academicYearId: context.academicYear.id,
      sectionId,
    }).catch(() => null)
    : null

  const classHref = `/classi/${encodeURIComponent(sectionId)}`
  const curriculumHref = `${classHref}/curricolo-arena`
  const sectionLabel = `${gradeNumber(section.grade)}ª ${section.sectionCode}`

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
          <p>CLASSE · RIFERIMENTI ACQUISITI</p>
          <h1>{sectionLabel}</h1>
          <span>
            Archivio delle registrazioni curricolari già associate alla classe.
            La consultazione del curricolo resta comune a tutte le sezioni.
          </span>
        </div>
      </section>

      <section className="classWorkspaceGrid" aria-label="Riferimenti curricolari della classe">
        <article className="classWorkspaceCard">
          <div>
            <h2>Riferimento già acquisito</h2>
            <p>
              Questa registrazione della classe è distinta dalla fonte unica di Arena.
              La consultazione del curricolo non comporta adozioni o modifiche ai dati.
            </p>
          </div>
          {baseline ? (
            <div className="classAssignmentList">
              <div className="classAssignmentItem">
                <div>
                  <strong>{baseline.curriculumState === 'APPROVED' ? 'Istituzionale' : 'Provvisoria'}</strong>
                  <span>{baseline.alignmentAuthority}</span>
                </div>
                <small>{baseline.requiresRevalidationOnApproval
                  ? 'Rivalidazione futura richiesta'
                  : 'Rivalidazione non richiesta'}</small>
              </div>
              <div className="classAssignmentItem">
                <div><strong>Copertura</strong><span>{baseline.curriculumCoverage.status}</span></div>
                <small>{baseline.curricularContext.requirements.length} requisiti tracciati</small>
              </div>
              <div className="classAssignmentItem">
                <div><strong>Impronta della fonte acquisita</strong><span>{baseline.sourceHandoffFootprintHash}</span></div>
                <small>Accettata {formatDateTime(baseline.acceptedAt)}</small>
              </div>
            </div>
          ) : (
            <div className="classesEmpty">
              <strong>Nessun riferimento curricolare ancora acquisito per questa classe.</strong>
              <span>La consultazione della fonte Arena è comunque disponibile secondo i permessi del docente.</span>
            </div>
          )}
        </article>

        {hasDocumentedLegacyScope && legacyProvenance ? (
          <article className="classWorkspaceCard" aria-label="Documentazione storica ECO-02">
            <div>
              <h2>Documentazione storica del precedente percorso</h2>
              <p>
                Prove e registrazioni antecedenti al modello curricolare condiviso.
                Il loro controllo non modifica né approva il curricolo.
              </p>
            </div>

            {baseline && query.accepted ? (
              <p role="status">
                {query.accepted === 'known'
                  ? 'Il riferimento storico risulta già acquisito.'
                  : 'Verifica lo stato della registrazione nei dati correnti.'}
              </p>
            ) : null}

            <div className="classAssignmentItem">
              <div>
                <strong>Confronto con la fonte storica P7</strong>
                <span>{p7SourceStatusLabel(legacyProvenance.status)}</span>
              </div>
              <small>La sola corrispondenza delle impronte non costituisce una nuova approvazione.</small>
            </div>
            <div className="classAssignmentItem">
              <div>
                <strong>Ricevuta storica di preparazione</strong>
                <span>{legacyReceipt === null
                  ? 'Verifica della ricevuta non disponibile'
                  : legacyReceipt.status === 'DOCUMENTED_RECEIPT_VERIFIED'
                    ? 'Ricevuta presente e coerente'
                    : legacyReceipt.status === 'DOCUMENTED_RECEIPT_NOT_FOUND'
                      ? 'Ricevuta non presente nel contesto autorizzato'
                      : 'Ricevuta presente ma non coerente'}</span>
              </div>
              <small>Verifica autenticata, in sola lettura, senza modifiche alle registrazioni.</small>
            </div>
          </article>
        ) : null}

        {hasDocumentedLegacyScope && legacyProvenance ? (
          <>
            <ArenaCanonicalAlignmentPreviewClient
              p7ReceiptVerified={legacyReceipt?.historicalReceiptVerified === true}
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
          </>
        ) : null}
      </section>

      <details className="technicalDetails">
        <summary>
          <span><strong>Origine e autorità</strong><small>Consultazione, registrazione e approvazione</small></span>
          <b aria-hidden>＋</b>
        </summary>
        <div className="technicalDetailsBody">
          <p>Arena resta la fonte canonica. Le registrazioni precedenti hanno una propria provenienza e non sono sovrascritte.</p>
          <p>Una fonte provvisoria consultata non costituisce curricolo approvato o vigente.</p>
          <p>Qualunque acquisizione o rivalidazione richiede i controlli e le decisioni previste.</p>
        </div>
      </details>

      <p><Link href={curriculumHref}>← Torna al curricolo di riferimento</Link></p>
      <Link href={classHref}>Torna alla classe</Link>
    </AppShell>
  )
}

function p7SourceStatusLabel(status: Pilot2CP7BaselineStatus): string {
  switch (status) {
    case 'NO_CURRENT_BASELINE': return 'Nessun riferimento acquisito presente'
    case 'P7_SOURCE_FOOTPRINT_MATCH': return 'Fonte corrente coerente con la prova storica'
    case 'CURRENT_BASELINE_DIFFERS_FROM_P7': return 'Fonte corrente diversa: confronto professionale richiesto'
    case 'P7_FOOTPRINT_WITH_CHANGED_AUTHORITY': return 'Impronta coincidente, ma autorità cambiata: verifica richiesta'
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
