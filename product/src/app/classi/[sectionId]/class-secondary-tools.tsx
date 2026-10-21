import Link from 'next/link'
import type { ClassWorkspaceAssignment, ClassWorkspaceLearningBlock, ClassWorkspaceMaterial, PreparedClassMaterial } from '../class-workspace-model'
import { confirmTeachingBlockCompletion } from './actions'
import type { ClassRecorderEmptyPresentation, ClassTaskState } from './class-task-state'
import { TeachingSessionRecorder } from './TeachingSessionRecorder'
import type { TeachingSessionRecorderProps } from './TeachingSessionRecorderClient'

type PreparedMaterialView = PreparedClassMaterial & { targetDateLabel: string | null }
type LinkedMaterialView = ClassWorkspaceMaterial & { href: string }
type AssignmentView = ClassWorkspaceAssignment & { statusLabel: string; weeklyMinutesLabel: string }
type ToolLink = { href: string; title: string; detail: string }

type AdvancedTools = {
  focusCompletion: boolean
  state: ClassTaskState
  sectionId: string
  blockId: string
  allocatedMinutes: number
  plannedMinutes: number
  recorder: TeachingSessionRecorderProps | null
  fallbackRecorder: TeachingSessionRecorderProps
  emptyPresentation: ClassRecorderEmptyPresentation
  maySuggestCompletion: boolean
}

type TechnicalContext = {
  sectionId: string
  nextBlock: ClassWorkspaceLearningBlock | null
  canonicalPlanCode: string
  canonicalGenerationId: string | null
  sourceNote: string | null
  currentSessionCount: number
}

export function ClassSecondaryTools({
  open,
  advanced,
  preparedMaterials,
  linkedMaterials,
  knowledgeHref,
  assignments,
  toolLinks,
  technical,
}: {
  open: boolean
  advanced: AdvancedTools | null
  preparedMaterials: PreparedMaterialView[]
  linkedMaterials: LinkedMaterialView[]
  knowledgeHref: string
  assignments: AssignmentView[]
  toolLinks: ToolLink[]
  technical: TechnicalContext
}) {
  return (
    <details id="altro-della-classe" className="humanTaskSecondary classSecondaryTools" open={open}>
      <summary>Altro della classe</summary>
      <div className="humanTaskSecondaryBody classSecondaryToolsBody">
        {advanced ? (
          <section className="classSecondaryToolsSection teachingSessionCard" aria-labelledby="class-advanced-tools-title">
            <div className="teachingSessionHeading">
              <div>
                <p>{advanced.focusCompletion ? 'DECISIONE PROFESSIONALE' : 'REGISTRAZIONE AVANZATA'}</p>
                <h2 id="class-advanced-tools-title">{advanced.focusCompletion ? 'Valuta se il blocco è davvero concluso' : advanced.state === 'CATCH_UP' ? 'Registra la lezione precedente' : 'Registra ciò che hai svolto'}</h2>
              </div>
              <span>{advanced.blockId}: <strong>{advanced.allocatedMinutes}/{advanced.plannedMinutes} min</strong></span>
            </div>

            {!advanced.focusCompletion ? (
              advanced.recorder ? (
                <TeachingSessionRecorder {...advanced.recorder} />
              ) : (
                <>
                  <div className="teachingSessionEmpty">
                    <strong>{advanced.emptyPresentation.title}</strong>
                    <span>{advanced.emptyPresentation.detail}</span>
                    {advanced.emptyPresentation.showScheduleLinks ? <div><Link href="/calendario">Apri Calendario</Link><Link href="/orario">Apri Orario</Link></div> : null}
                  </div>
                  <section className="classRetroactiveRecorder" id="registrazione-retroattiva" aria-label="Registrazione retroattiva">
                    <h3>Registra una lezione precedente</h3>
                    <TeachingSessionRecorder {...advanced.fallbackRecorder} />
                  </section>
                </>
              )
            ) : null}

            {advanced.maySuggestCompletion ? (
              <div className="teachingCompletionProposal">
                <div><strong>Il monte minuti previsto è stato raggiunto.</strong><span>{advanced.allocatedMinutes} minuti effettivi registrati su {advanced.blockId}. Questo dato non certifica da solo il completamento didattico.</span></div>
                <form action={confirmTeachingBlockCompletion}>
                  <input type="hidden" name="sectionId" value={advanced.sectionId} />
                  <input type="hidden" name="blockId" value={advanced.blockId} />
                  <input type="hidden" name="note" value={`Completamento confermato dal docente dopo ${advanced.allocatedMinutes} minuti effettivi registrati.`} />
                  <button type="submit">Conferma come svolto</button>
                </form>
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="classSecondaryToolsSection" aria-labelledby="class-materials-title">
          <div><h2 id="class-materials-title">Supporti e materiali</h2><p>Aprili solo quando servono al lavoro della classe.</p></div>
          {preparedMaterials.length ? (
            <article className="classWorkspaceCard classMaterialsCard" aria-label="Materiale predisposto per la classe">
              <div><h2>Già predisposto</h2><p>Risorse pronte per il prossimo incontro, senza alterare automaticamente il Piano.</p></div>
              <div className="classMaterialList">
                {preparedMaterials.map((material) => (
                  <a href={material.href} key={material.assetId}>
                    <div>
                      <strong>{material.title}</strong>
                      <span>{material.resourceKindLabel} · {material.providerLabel}{material.targetDateLabel ? ` · ${material.targetDateLabel}` : ''}</span>
                      {material.canonicalBindingLabel ? <span>{material.canonicalBindingLabel}</span> : null}
                    </div>
                    <small>{material.stateLabel} · {material.audienceLabel}</small>
                  </a>
                ))}
              </div>
            </article>
          ) : null}
          <article className="classWorkspaceCard classMaterialsCard">
            <div><h2>Materiali collegati</h2><p>Contenuti pertinenti alla prossima lezione, al grado o a questa sezione.</p></div>
            {linkedMaterials.length ? <div className="classMaterialList">{linkedMaterials.map((material) => <Link href={material.href} key={material.assetId}><div><strong>{material.title}</strong><span>{material.categoryLabel}</span></div><small>{material.relevanceLabel}</small></Link>)}</div> : <div className="classMaterialsEmpty"><span>Nessun materiale esplicitamente collegato alla prossima lezione.</span><Link href={knowledgeHref}>Cerca nei materiali</Link></div>}
          </article>
        </section>

        <section className="classSecondaryToolsSection classWorkspaceGrid" aria-label="Strumenti e contesto della classe">
          <article className="classWorkspaceCard">
            <div><h2>Cattedra</h2><p>Disciplina e carico settimanale previsto.</p></div>
            {assignments.length ? <div className="classAssignmentList">{assignments.map((assignment) => <div className="classAssignmentItem" key={assignment.id}><div><strong>{assignment.discipline}</strong><span>{assignment.statusLabel}</span></div><small>{assignment.weeklyMinutesLabel}</small></div>)}</div> : <div className="classesEmpty"><strong>Questa classe non è ancora nella tua cattedra.</strong><Link href="/impostazioni#cattedra">Gestisci cattedra</Link></div>}
          </article>
          <article className="classWorkspaceCard">
            <div><h2>Strumenti della classe</h2><p>Usali quando devi uscire dal compito corrente.</p></div>
            <div className="classQuickLinks">{toolLinks.map((item) => <Link href={item.href} key={`${item.title}:${item.href}`}><strong>{item.title}</strong><span>{item.detail}</span></Link>)}</div>
          </article>
        </section>

        <section className="classSecondaryToolsSection classTechnicalContext" aria-labelledby="class-provenance-title">
          <div><h2 id="class-provenance-title">Provenienza</h2><p>Riferimenti utili per controllare il contesto senza esporli nel primo livello.</p></div>
          <div className="technicalDetailsBody">
            <p>Identificatore sezione: <strong>{technical.sectionId}</strong></p>
            {technical.nextBlock ? <p>Prossimo riferimento: <strong>{technical.nextBlock.id}</strong> · UDA {technical.nextBlock.uda} · {technical.nextBlock.pack}</p> : null}
            <p>Identità piano: <strong>{technical.canonicalPlanCode}</strong>{technical.canonicalGenerationId ? ` · generazione ${technical.canonicalGenerationId}` : ' · collegamento runtime non disponibile'}</p>
            <p>Fonte sezione: {technical.sourceNote ?? 'Registro delle classi dell’anno scolastico corrente.'}</p>
            <p>Sessioni effettive correnti: <strong>{technical.currentSessionCount}</strong>. Le sessioni sostituite restano nella storia e non contribuiscono ai totali correnti.</p>
          </div>
        </section>
      </div>
    </details>
  )
}
