'use client'

import Link from 'next/link'
import type { LessonDesignExtension } from '@/core/domain/lesson-design-extension'
import {
  acceptLessonDesignExtension,
  attachKnowledgeResourceToLesson,
  removeLessonDesignExtension,
} from './design-actions'

export type LessonKnowledgeSuggestion = {
  assetId: string
  title: string
  summary: string
  category: string
}

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
  const proposals = extensions.filter((extension) => extension.status === 'PROPOSED')
  const accepted = extensions.filter((extension) => extension.status === 'ACCEPTED')
  const acceptedSequence = accepted.filter((extension) => !isResource(extension.kind))
  const acceptedResources = accepted.filter((extension) => isResource(extension.kind))

  return (
    <section className="lessonDesignTools" aria-labelledby="lesson-design-tools-title">
      <header className="lessonSectionHeading">
        <div><span>STRUMENTI DI PROGETTAZIONE</span><h3 id="lesson-design-tools-title">Arricchisci solo se serve</h3></div>
        <small>{accepted.length} aggiunte attive</small>
      </header>

      <div className="lessonDesignContract">
        <strong>La sequenza canonica resta intatta.</strong>
        <p>Frasi, eventi, micro-video, verifiche e materiali entrano nella lezione solo dopo una tua scelta esplicita. Le proposte degli strumenti compariranno qui prima di essere usate in classe.</p>
        <div aria-label="Tipi di attivazione previsti"><span>Frase</span><span>Evento</span><span>Micro-video</span><span>Domanda</span><span>Verifica rapida</span></div>
      </div>

      {proposals.length ? (
        <div className="lessonDesignProposalList" aria-label="Proposte da controllare">
          <div className="lessonDesignSubheading"><strong>Da controllare</strong><small>{proposals.length}</small></div>
          {proposals.map((extension) => (
            <article className="lessonDesignProposal" key={extension.id}>
              <div>
                <span>{extensionKindLabel(extension.kind)}</span>
                <strong>{extension.title}</strong>
                <p>{extension.body}</p>
                <small>{sourceLabel(extension)}</small>
              </div>
              <div className="lessonDesignProposalActions">
                <form action={acceptLessonDesignExtension}>
                  <ContextFields sectionId={sectionId} blockId={blockId} projectionId={projectionId} />
                  <input type="hidden" name="extensionId" value={extension.id} />
                  <button className="primary" type="submit">Aggiungi alla lezione</button>
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

      {knowledgeSuggestions.length ? (
        <div className="lessonKnowledgeSuggestions" aria-label="Materiali pertinenti dalla Conoscenza">
          <div className="lessonDesignSubheading"><strong>Dalla Conoscenza</strong><small>{knowledgeSuggestions.length} pertinenti</small></div>
          <p className="lessonKnowledgeLead">Sono già collegati a questa fase del piano. Aggiungili solo se vuoi averli a portata di mano mentre prepari o insegni.</p>
          {knowledgeSuggestions.map((item) => (
            <article key={item.assetId}>
              <div>
                <span>{knowledgeCategoryLabel(item.category)}</span>
                <strong>{item.title}</strong>
                <p>{item.summary}</p>
              </div>
              <div>
                <Link href={`/knowledge/${encodeURIComponent(item.assetId)}`}>Controlla</Link>
                <form action={attachKnowledgeResourceToLesson}>
                  <ContextFields sectionId={sectionId} blockId={blockId} projectionId={projectionId} />
                  <input type="hidden" name="assetId" value={item.assetId} />
                  <button type="submit">Aggiungi alla lezione</button>
                </form>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="lessonDesignEmpty">Nessun altro materiale della Conoscenza è collegato esplicitamente a questa fase.</p>
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
