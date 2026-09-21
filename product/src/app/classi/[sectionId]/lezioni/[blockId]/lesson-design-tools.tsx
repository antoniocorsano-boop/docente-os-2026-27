'use client'

import Link from 'next/link'
import {
  isTeachingAdjustment,
  type LessonDesignExtension,
} from '@/core/domain/lesson-design-extension'
import { teachingMaterialRoleLabel } from '@/core/domain/textbook-teaching-kit'
import {
  acceptLessonDesignExtension,
  attachKnowledgeResourceToLesson,
  proposeLessonActivationQuestion,
  reviseLessonDesignExtension,
  removeLessonDesignExtension,
} from './design-actions'
import type { LessonKnowledgeSuggestion } from './lesson-material-suggestions'
export type { LessonKnowledgeSuggestion } from './lesson-material-suggestions'

const ACTIVATION_QUESTION_TOOL_ID = 'LESSON_ACTIVATION_QUESTION_V1'

export function LessonDesignTools({
  sectionId,
  blockId,
  projectionId,
  extensions,
  knowledgeSuggestions,
}: {
  sectionId: string
  blockId: string
  projectionId: string
  extensions: LessonDesignExtension[]
  knowledgeSuggestions: LessonKnowledgeSuggestion[]
}) {
  const proposals = extensions.filter(
    (extension) =>
      (extension.status === 'PROPOSED' || extension.status === 'MODIFIED')
      && !isTeachingAdjustment(extension),
  )
  const replanningReview = extensions.filter(
    (extension) =>
      isTeachingAdjustment(extension)
      && (extension.status === 'PROPOSED' || extension.status === 'MODIFIED'),
  )
  const accepted = extensions.filter((extension) => extension.status === 'ACCEPTED')
  const acceptedLessonAdditions = accepted.filter((extension) => !isTeachingAdjustment(extension))
  const acceptedSequence = acceptedLessonAdditions.filter((extension) => !isResource(extension.kind))
  const acceptedResources = acceptedLessonAdditions.filter((extension) => isResource(extension.kind))
  const acceptedReplanning = accepted.filter((extension) => isTeachingAdjustment(extension))
  const activationQuestionPresent = extensions.some((extension) => extension.payload.toolId === ACTIVATION_QUESTION_TOOL_ID)

  return (
    <section className="lessonDesignTools" aria-labelledby="lesson-design-tools-title">
      <header className="lessonSectionHeading">
        <div><span>STRUMENTI DI PROGETTAZIONE</span><h3 id="lesson-design-tools-title">Arricchisci solo se serve</h3></div>
        <small>{acceptedLessonAdditions.length} aggiunte attive</small>
      </header>

      <div className="lessonDesignContract">
        <strong>La sequenza canonica resta intatta.</strong>
        <p>Frasi, eventi, micro-video, verifiche e materiali entrano nella lezione solo dopo una tua scelta esplicita. Le proposte degli strumenti compariranno qui prima di essere usate in classe.</p>
        <div aria-label="Tipi di attivazione previsti"><span>Frase</span><span>Evento</span><span>Micro-video</span><span>Domanda</span><span>Verifica rapida</span></div>
      </div>

      {!activationQuestionPresent ? (
        <div className="lessonDesignAvailableTools" aria-label="Strumenti disponibili">
          <div className="lessonDesignSubheading"><strong>Prova uno strumento</strong><small>1 disponibile</small></div>
          <article>
            <div>
              <span>DOMANDA · LOCALE</span>
              <strong>Domanda guida</strong>
              <p>Prepara una bozza legata al contenuto e all’obiettivo della lezione. Prima di entrare nella sequenza resta modificabile e richiede una tua conferma esplicita.</p>
            </div>
            <form action={proposeLessonActivationQuestion}>
              <ContextFields sectionId={sectionId} blockId={blockId} projectionId={projectionId} />
              <button type="submit">Proponi domanda guida</button>
            </form>
          </article>
        </div>
      ) : null}

      {proposals.length ? (
        <div className="lessonDesignProposalList" aria-label="Proposte da controllare">
          <div className="lessonDesignSubheading"><strong>Da controllare</strong><small>{proposals.length}</small></div>
          {proposals.map((extension) => (
            <article className="lessonDesignProposal" key={extension.id}>
              <div>
                <span>{extensionKindLabel(extension.kind)}</span>
                <strong>{extension.title}</strong>
                {extension.kind === 'HOOK_QUESTION' ? (
                  <QuestionEditForm
                    extension={extension}
                    sectionId={sectionId}
                    blockId={blockId}
                    projectionId={projectionId}
                    alwaysOpen
                  />
                ) : <p>{extension.body}</p>}
                <small>{extension.status === 'MODIFIED' ? 'Modificata dal docente · da riconfermare' : sourceLabel(extension)}</small>
              </div>
              <div className="lessonDesignProposalActions">
                <form action={acceptLessonDesignExtension}>
                  <ContextFields sectionId={sectionId} blockId={blockId} projectionId={projectionId} />
                  <input type="hidden" name="extensionId" value={extension.id} />
                  <button className="primary" type="submit">{extension.status === 'MODIFIED' ? 'Conferma e usa' : 'Aggiungi alla lezione'}</button>
                </form>
                <form action={removeLessonDesignExtension}>
                  <ContextFields sectionId={sectionId} blockId={blockId} projectionId={projectionId} />
                  <input type="hidden" name="extensionId" value={extension.id} />
                  <button type="submit">Scarta</button>
                </form>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {replanningReview.length ? (
        <div className="lessonDesignProposalList" aria-label="Proposte di riprogettazione da riesaminare">
          <div className="lessonDesignSubheading"><strong>Riprogettazione da riesaminare</strong><small>{replanningReview.length}</small></div>
          <p className="lessonKnowledgeLead">Queste riflessioni restano separate dalla lezione. Confermarle registra una decisione di riprogettazione, senza modificare automaticamente Piano annuale o UDA.</p>
          {replanningReview.map((extension) => (
            <article className="lessonDesignProposal" key={extension.id}>
              <div>
                <span>RIPROGETTAZIONE</span>
                <strong>{extension.title}</strong>
                <p>{extension.body}</p>
                <small>{sourceLabel(extension)}</small>
              </div>
              <div className="lessonDesignProposalActions">
                <form action={acceptLessonDesignExtension}>
                  <ContextFields sectionId={sectionId} blockId={blockId} projectionId={projectionId} />
                  <input type="hidden" name="extensionId" value={extension.id} />
                  <button className="primary" type="submit">Conferma riprogettazione</button>
                </form>
                <form action={removeLessonDesignExtension}>
                  <ContextFields sectionId={sectionId} blockId={blockId} projectionId={projectionId} />
                  <input type="hidden" name="extensionId" value={extension.id} />
                  <button type="submit">Scarta</button>
                </form>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {acceptedSequence.length ? (
        <div className="lessonDesignAccepted" aria-label="Aggiunte alla sequenza">
          <div className="lessonDesignSubheading"><strong>Nella sequenza</strong><small>{acceptedSequence.length}</small></div>
          {acceptedSequence.map((extension) => (
            <AcceptedItem
              extension={extension}
              sectionId={sectionId}
              blockId={blockId}
              projectionId={projectionId}
              key={extension.id}
            />
          ))}
        </div>
      ) : null}

      {acceptedResources.length ? (
        <div className="lessonDesignAccepted" aria-label="Materiali allegati alla lezione">
          <div className="lessonDesignSubheading"><strong>Materiali allegati</strong><small>{acceptedResources.length}</small></div>
          {acceptedResources.map((extension) => (
            <AcceptedItem
              extension={extension}
              sectionId={sectionId}
              blockId={blockId}
              projectionId={projectionId}
              key={extension.id}
            />
          ))}
        </div>
      ) : null}

      {acceptedReplanning.length ? (
        <div className="lessonDesignAccepted" aria-label="Decisioni di riprogettazione accettate">
          <div className="lessonDesignSubheading"><strong>Riprogettazione</strong><small>{acceptedReplanning.length}</small></div>
          <p className="lessonKnowledgeLead">Decisioni accettate da tenere presenti nella riprogettazione. Non sono aggiunte alla sequenza e non modificano automaticamente Piano annuale o UDA.</p>
          {acceptedReplanning.map((extension) => (
            <article className="lessonDesignAcceptedItem" key={extension.id}>
              <div>
                <span>RIPROGETTAZIONE</span>
                <strong>{extension.title}</strong>
                <small>Decisione accettata · {sourceLabel(extension)}</small>
              </div>
              <div>
                <form action={removeLessonDesignExtension}>
                  <ContextFields sectionId={sectionId} blockId={blockId} projectionId={projectionId} />
                  <input type="hidden" name="extensionId" value={extension.id} />
                  <button type="submit">Rimuovi</button>
                </form>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {knowledgeSuggestions.length ? (
        <div className="lessonKnowledgeSuggestions" aria-label="Suggerimenti contestuali per questa lezione">
          <div className="lessonDesignSubheading"><strong>Potrebbe servirti qui</strong><small>{knowledgeSuggestions.length}</small></div>
          <p className="lessonKnowledgeLead">DOCENTE OS incrocia questa fase con i materiali già presenti nella tua Conoscenza e con i libri confermati per la classe. È sempre un suggerimento: nulla entra nella lezione senza una tua scelta.</p>
          {knowledgeSuggestions.map((item) => (
            <article key={item.assetId}>
              <div>
                <span>{item.sourceKind === 'EDITORIAL_KNOWLEDGE' ? 'DAL LIBRO' : 'DALLA CONOSCENZA'} · {knowledgeCategoryLabel(item.category)}</span>
                <strong>{item.title}</strong>
                <p>{item.summary}</p>
                {item.pedagogicalRoles.length ? (
                  <small className="lessonSuggestionRoles">Uso suggerito: {item.pedagogicalRoles.slice(0, 3).map(teachingMaterialRoleLabel).join(' · ')}</small>
                ) : null}
                <small className="lessonSuggestionReason">Perché qui: {item.reason}</small>
                <div className="lessonSuggestionTip">
                  <b>TIP</b>
                  <p>{item.usageTip}</p>
                </div>
              </div>
              <div>
                <Link href={`/knowledge/${encodeURIComponent(item.assetId)}`}>Controlla</Link>
                <form action={attachKnowledgeResourceToLesson}>
                  <ContextFields sectionId={sectionId} blockId={blockId} projectionId={projectionId} />
                  <input type="hidden" name="assetId" value={item.assetId} />
                  <button type="submit">Usa in questa lezione</button>
                </form>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="lessonDesignEmpty">Non ci sono ancora materiali abbastanza pertinenti da suggerire per questa fase. La lezione canonica resta comunque utilizzabile così com’è.</p>
      )}
    </section>
  )
}

function AcceptedItem({
  extension,
  sectionId,
  blockId,
  projectionId,
}: {
  extension: LessonDesignExtension
  sectionId: string
  blockId: string
  projectionId: string
}) {
  const knowledgeHref = extension.sourceRef?.startsWith('knowledge:')
    ? `/knowledge/${encodeURIComponent(extension.sourceRef.slice('knowledge:'.length))}`
    : null

  return (
    <article className="lessonDesignAcceptedItem">
      <div>
        <span>{extensionKindLabel(extension.kind)}</span>
        <strong>{extension.title}</strong>
        {extension.kind === 'HOOK_QUESTION' ? (
          <>
            <p className="lessonDesignAcceptedBody">{extension.body}</p>
            <QuestionEditForm
              extension={extension}
              sectionId={sectionId}
              blockId={blockId}
              projectionId={projectionId}
            />
          </>
        ) : null}
        <small>{placementLabel(extension)} · {sourceLabel(extension)}</small>
      </div>
      <div>
        {knowledgeHref ? <Link href={knowledgeHref}>Apri</Link> : null}
        <form action={removeLessonDesignExtension}>
          <ContextFields sectionId={sectionId} blockId={blockId} projectionId={projectionId} />
          <input type="hidden" name="extensionId" value={extension.id} />
          <button type="submit">Rimuovi</button>
        </form>
      </div>
    </article>
  )
}

function QuestionEditForm({
  extension,
  sectionId,
  blockId,
  projectionId,
  alwaysOpen = false,
}: {
  extension: LessonDesignExtension
  sectionId: string
  blockId: string
  projectionId: string
  alwaysOpen?: boolean
}) {
  const form = (
    <form className="lessonDesignQuestionEditor" action={reviseLessonDesignExtension}>
      <ContextFields sectionId={sectionId} blockId={blockId} projectionId={projectionId} />
      <input type="hidden" name="extensionId" value={extension.id} />
      <label>
        <span>Testo della domanda</span>
        <textarea name="body" defaultValue={extension.body} rows={3} maxLength={1000} required />
      </label>
      <small>Salvando la modifica, la domanda torna “da controllare” e non rientra nella sequenza finché non la confermi di nuovo.</small>
      <button type="submit">Salva modifica</button>
    </form>
  )

  if (alwaysOpen) return form
  return (
    <details className="lessonDesignQuestionEditDisclosure">
      <summary>Modifica domanda</summary>
      {form}
    </details>
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

function isResource(kind: LessonDesignExtension['kind']) {
  return kind === 'TEACHER_RESOURCE' || kind === 'STUDENT_RESOURCE'
}

function extensionKindLabel(kind: LessonDesignExtension['kind']) {
  if (kind === 'HOOK_QUOTE') return 'FRASE'
  if (kind === 'HOOK_EVENT') return 'EVENTO'
  if (kind === 'HOOK_VIDEO') return 'MICRO-VIDEO'
  if (kind === 'HOOK_QUESTION') return 'DOMANDA'
  if (kind === 'FORMATIVE_CHECK') return 'VERIFICA RAPIDA'
  if (kind === 'STUDENT_RESOURCE') return 'MATERIALE STUDENTI'
  if (kind === 'TEACHING_ADJUSTMENT') return 'RIPROGETTAZIONE'
  return 'MATERIALE DOCENTE'
}

function sourceLabel(extension: LessonDesignExtension) {
  return extension.sourceLabel || (
    extension.sourceKind === 'EDITORIAL_KNOWLEDGE' ? 'Conoscenza editoriale'
      : extension.sourceKind === 'KNOWLEDGE' ? 'Conoscenza'
        : extension.sourceKind === 'WEB' ? 'Fonte web'
          : extension.sourceKind === 'AI_TOOL' ? 'Strumento assistito'
            : 'Inserimento docente'
  )
}

function placementLabel(extension: LessonDesignExtension) {
  if (isResource(extension.kind)) return 'Allegato alla lezione'
  if (extension.insertionPosition === 'START') return 'All’inizio'
  if (extension.insertionPosition === 'END') return 'Alla fine'
  if (extension.insertionPosition === 'BEFORE_STEP') return `Prima di ${extension.anchorStepId}`
  return `Dopo ${extension.anchorStepId}`
}

function knowledgeCategoryLabel(category: string) {
  if (category === 'UDA') return 'UDA'
  if (category === 'ASSESSMENT') return 'VALUTAZIONE'
  if (category === 'MODEL') return 'MODELLO'
  if (category === 'PROGRAMMING') return 'PIANO'
  return 'MATERIALE'
}
