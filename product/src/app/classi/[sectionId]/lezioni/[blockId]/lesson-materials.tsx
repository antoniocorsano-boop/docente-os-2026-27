'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { SourceProvenance } from '@/components/source-provenance/source-provenance'
import type { LessonDesignExtension } from '@/core/domain/lesson-design-extension'
import { teachingMaterialRoleLabel } from '@/core/domain/textbook-teaching-kit'
import { buildTaskAwareKnowledgeHref, buildTaskAwareKnowledgeListHref } from '@/core/presentation/task-continuity'
import {
  runLessonDesignWrite,
  type DesignWriteState,
} from './design-actions'
import type { LessonAtlasSuggestion } from './atlas-material-suggestions'
import type { LessonKnowledgeSuggestion } from './lesson-material-suggestions'

type MaterialPreparationIntent = 'reuse' | 'adapt' | 'create'

type LessonMaterialsProps = {
  sectionId: string
  blockId: string
  projectionId: string
  extensions: LessonDesignExtension[]
  knowledgeSuggestions: LessonKnowledgeSuggestion[]
  atlasSuggestions: LessonAtlasSuggestion[]
  returnTo: string
}

export function LessonMaterials({
  sectionId,
  blockId,
  projectionId,
  extensions,
  knowledgeSuggestions,
  atlasSuggestions,
  returnTo,
}: LessonMaterialsProps) {
  const [materialIntent, setMaterialIntent] = useState<MaterialPreparationIntent>('reuse')
  const [writeState, writeAction] = useActionState(
    runLessonDesignWrite,
    { notice: null, revision: 0 } satisfies DesignWriteState,
  )
  const materialProposals = extensions.filter(
    (extension) =>
      (extension.status === 'PROPOSED' || extension.status === 'MODIFIED')
      && isResource(extension.kind),
  )
  const acceptedResources = extensions.filter(
    (extension) => extension.status === 'ACCEPTED' && isResource(extension.kind),
  )
  const notice = materialNoticeMessage(writeState.notice)

  return (
    <section
      className="lessonDesignTools lessonMaterialsTask"
      data-lesson-subtask="materials"
      aria-labelledby="lesson-materials-title"
    >
      <header className="lessonSectionHeading">
        <div>
          <span>MATERIALI</span>
          <h3 id="lesson-materials-title">Prepara ciò che userai in questa lezione</h3>
        </div>
        <small>{acceptedResources.length} allegati</small>
      </header>

      <p className="lessonKnowledgeLead">
        Riutilizza una risorsa, adattane una per questa lezione oppure crea un nuovo contenuto.
      </p>

      {notice ? (
        <div
          className="lessonDesignFeedback"
          role={writeState.notice === 'failed' ? 'alert' : 'status'}
          aria-live={writeState.notice === 'failed' ? 'assertive' : 'polite'}
        >
          <strong>{notice}</strong>
        </div>
      ) : null}

      <div className="lessonMaterialIntent" role="group" aria-label="Come vuoi preparare il materiale?">
        <button type="button" aria-pressed={materialIntent === 'reuse'} onClick={() => setMaterialIntent('reuse')}>Riutilizza</button>
        <button type="button" aria-pressed={materialIntent === 'adapt'} onClick={() => setMaterialIntent('adapt')}>Adatta</button>
        <button type="button" aria-pressed={materialIntent === 'create'} onClick={() => setMaterialIntent('create')}>Crea nuovo</button>
      </div>

      {materialIntent === 'reuse' ? (
        <ReuseMaterials
          sectionId={sectionId}
          blockId={blockId}
          projectionId={projectionId}
          knowledgeSuggestions={knowledgeSuggestions}
          atlasSuggestions={atlasSuggestions}
          writeAction={writeAction}
          returnTo={returnTo}
        />
      ) : null}

      {materialIntent === 'adapt' ? (
        <AdaptMaterials
          sectionId={sectionId}
          blockId={blockId}
          projectionId={projectionId}
          materialProposals={materialProposals}
          acceptedResources={acceptedResources}
          writeAction={writeAction}
        />
      ) : null}

      {materialIntent === 'create' ? (
        <div className="lessonKnowledgeSuggestions" aria-label="Crea un materiale">
          <p className="lessonKnowledgeLead">
            Crea o carica un contenuto. Resta separato dalla lezione finché non scegli esplicitamente di usarlo qui.
          </p>
          <Link href={buildKnowledgeCaptureHref(sectionId, blockId, returnTo)}>Aggiungi un nuovo contenuto</Link>
        </div>
      ) : null}

      {acceptedResources.length ? (
        <details className="lessonAttachedResources">
          <summary>Già nella lezione <span>{acceptedResources.length}</span></summary>
          <div aria-label="Materiali allegati alla lezione">
            {acceptedResources.map((extension) => (
              <article key={extension.id}>
                <div>
                  <span>{resourceKindLabel(extension.kind)}</span>
                  <strong>{extension.title}</strong>
                  <SourceProvenance kind={extension.sourceKind} />
                </div>
                <form action={writeAction}>
                  <input type="hidden" name="designIntent" value="remove" />
                  <ContextFields sectionId={sectionId} blockId={blockId} projectionId={projectionId} />
                  <input type="hidden" name="extensionId" value={extension.id} />
                  <MaterialActionSubmit idle="Rimuovi" pendingLabel="Rimozione…" />
                </form>
              </article>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  )
}

function ReuseMaterials({
  sectionId,
  blockId,
  projectionId,
  knowledgeSuggestions,
  atlasSuggestions,
  writeAction,
  returnTo,
}: {
  sectionId: string
  blockId: string
  projectionId: string
  knowledgeSuggestions: LessonKnowledgeSuggestion[]
  atlasSuggestions: LessonAtlasSuggestion[]
  writeAction: (payload: FormData) => void
  returnTo: string
}) {
  return (
    <div className="lessonKnowledgeSuggestions" aria-label="Materiali disponibili">
      <div className="lessonDesignSubheading">
        <strong>Materiali disponibili</strong>
        <small>{atlasSuggestions.length + knowledgeSuggestions.length}</small>
      </div>
      <p className="lessonKnowledgeLead">Controlla la pertinenza e scegli se usare la risorsa in questa lezione.</p>

      {atlasSuggestions.map((item) => (
        <article key={item.materialId}>
          <div>
            <SourceProvenance kind="ATLAS" />
            <span>{item.kind.toUpperCase()}</span>
            <strong>{item.title}</strong>
            <p>{item.summary}</p>
            <details data-material-details className="lessonMaterialDetails">
              <summary>Perché può servire qui</summary>
              <div>
                <small className="lessonSuggestionReason">{item.reason}</small>
                <small className="lessonSuggestionReason">Provenienza: {item.provenance} · versione {item.version} · stato {item.state}</small>
                <div className="lessonSuggestionTip"><b>TIP</b><p>{item.usageTip}</p></div>
              </div>
            </details>
          </div>
          <div>
            <a href={item.publicUrl} target="_blank" rel="noreferrer">Controlla</a>
            <form action={writeAction}>
              <input type="hidden" name="designIntent" value="attach-atlas" />
              <ContextFields sectionId={sectionId} blockId={blockId} projectionId={projectionId} />
              <input type="hidden" name="atlasMaterialId" value={item.materialId} />
              <MaterialActionSubmit idle="Usa questo materiale" pendingLabel="Aggiunta…" />
            </form>
          </div>
        </article>
      ))}

      {knowledgeSuggestions.map((item) => (
        <article key={item.assetId}>
          <div>
            <SourceProvenance kind={item.sourceKind} />
            <span>{knowledgeCategoryLabel(item.category)}</span>
            <strong>{item.title}</strong>
            <p>{item.summary}</p>
            {(item.pedagogicalRoles.length > 0 || item.usageTip) ? (
              <details data-material-details className="lessonMaterialDetails">
                <summary>Perché può servire qui</summary>
                <div>
                  {item.pedagogicalRoles.length ? (
                    <small className="lessonSuggestionRoles">Uso suggerito: {item.pedagogicalRoles.slice(0, 3).map(teachingMaterialRoleLabel).join(' · ')}</small>
                  ) : null}
                  <div className="lessonSuggestionTip"><b>TIP</b><p>{item.usageTip}</p></div>
                </div>
              </details>
            ) : null}
          </div>
          <div>
            <Link href={buildFocusedKnowledgeHref(item.assetId, sectionId, blockId, returnTo)}>Controlla</Link>
            <form action={writeAction}>
              <input type="hidden" name="designIntent" value="attach-knowledge" />
              <ContextFields sectionId={sectionId} blockId={blockId} projectionId={projectionId} />
              <input type="hidden" name="assetId" value={item.assetId} />
              <MaterialActionSubmit idle="Usa questo materiale" pendingLabel="Aggiunta…" />
            </form>
          </div>
        </article>
      ))}

      {!atlasSuggestions.length && !knowledgeSuggestions.length ? (
        <p className="lessonDesignEmpty">Non ci sono materiali pertinenti da suggerire. Puoi creare un nuovo contenuto oppure proseguire con la lezione già preparata.</p>
      ) : null}
    </div>
  )
}

function AdaptMaterials({
  sectionId,
  blockId,
  projectionId,
  materialProposals,
  acceptedResources,
  writeAction,
}: {
  sectionId: string
  blockId: string
  projectionId: string
  materialProposals: LessonDesignExtension[]
  acceptedResources: LessonDesignExtension[]
  writeAction: (payload: FormData) => void
}) {
  const resources = [...materialProposals, ...acceptedResources]
  return (
    <div className="lessonDesignProposalList" aria-label="Materiali da adattare">
      <p className="lessonKnowledgeLead">
        Adatta nome e note per questa lezione. L’originale resta invariato e una modifica a una risorsa già accettata richiederà una nuova conferma.
      </p>
      {resources.map((extension) => (
        <article className="lessonDesignProposal" key={extension.id}>
          <div>
            <strong>{extension.title}</strong>
            <p>{extension.body}</p>
            <SourceProvenance kind={extension.sourceKind} />
          </div>
          <details className="lessonDesignEdit">
            <summary>Adatta</summary>
            <form action={writeAction}>
              <input type="hidden" name="designIntent" value="revise" />
              <ContextFields sectionId={sectionId} blockId={blockId} projectionId={projectionId} />
              <input type="hidden" name="extensionId" value={extension.id} />
              <label><span>Nome</span><input name="title" defaultValue={extension.title} maxLength={240} required /></label>
              <label><span>Testo</span><textarea name="body" defaultValue={extension.body} maxLength={5000} rows={4} required /></label>
              <MaterialActionSubmit idle="Salva adattamento" pendingLabel="Salvataggio…" />
            </form>
          </details>
        </article>
      ))}
      {!resources.length ? (
        <p className="lessonDesignEmpty">Non ci sono ancora materiali da adattare. Riutilizza prima una risorsa disponibile oppure crea un nuovo contenuto.</p>
      ) : null}
    </div>
  )
}

function ContextFields({ sectionId, blockId, projectionId }: { sectionId: string; blockId: string; projectionId: string }) {
  return (
    <>
      <input type="hidden" name="sectionId" value={sectionId} />
      <input type="hidden" name="blockId" value={blockId} />
      <input type="hidden" name="projectionId" value={projectionId} />
    </>
  )
}

function MaterialActionSubmit({ idle, pendingLabel }: { idle: string; pendingLabel: string }) {
  const { pending } = useFormStatus()
  return (
    <>
      <button type="submit" disabled={pending}>{pending ? pendingLabel : idle}</button>
      {pending ? <span className="lessonDesignPending" role="status" aria-live="polite">{pendingLabel}</span> : null}
    </>
  )
}

function buildFocusedKnowledgeHref(assetId: string, sectionId: string, blockId: string, returnTo: string) {
  return buildTaskAwareKnowledgeHref(assetId, {
    mode: 'prepare',
    returnTo,
    sectionId,
    blockId,
  })
}

function buildKnowledgeCaptureHref(sectionId: string, blockId: string, returnTo: string) {
  const href = buildTaskAwareKnowledgeListHref({
    mode: 'prepare',
    returnTo,
    sectionId,
    blockId,
  })
  return `${href}&capture=text`
}

function isResource(kind: LessonDesignExtension['kind']) {
  return kind === 'TEACHER_RESOURCE' || kind === 'STUDENT_RESOURCE'
}

function resourceKindLabel(kind: LessonDesignExtension['kind']) {
  return kind === 'STUDENT_RESOURCE' ? 'MATERIALE STUDENTI' : 'MATERIALE DOCENTE'
}

function knowledgeCategoryLabel(category: string) {
  if (category === 'UDA') return 'UDA'
  if (category === 'ASSESSMENT') return 'VALUTAZIONE'
  if (category === 'MODEL') return 'MODELLO'
  if (category === 'PROGRAMMING') return 'PIANO'
  return 'MATERIALE'
}

function materialNoticeMessage(notice: string | null) {
  if (notice === 'accepted' || notice === 'material-attached') return 'Materiale aggiunto alla lezione.'
  if (notice === 'modified') return 'Adattamento salvato. Controlla e conferma di nuovo la proposta prima di usarla.'
  if (notice === 'removed') return 'Materiale rimosso dalla lezione.'
  if (notice === 'failed') return 'Operazione non completata. Nessuna modifica è stata confermata.'
  return null
}
