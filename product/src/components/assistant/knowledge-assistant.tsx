'use client'

import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
  useLocalRuntime,
  type ChatModelAdapter,
} from '@assistant-ui/react'
import { SendHorizontal, ShieldCheck, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  respondToKnowledgeAssistant,
  type KnowledgeAssistantContext,
} from '@/core/presentation/assistant-context'

const SUGGESTED_PROMPTS = [
  'Cosa contiene?',
  'Cosa devo controllare?',
  'Ci sono azioni o scadenze?',
  'Qual è il prossimo passo?',
] as const

export function KnowledgeAssistant({
  context,
  enabled = true,
  presentation = 'inline',
}: {
  context: KnowledgeAssistantContext
  enabled?: boolean
  presentation?: 'inline' | 'floating'
}) {
  if (!enabled) return null
  return <KnowledgeAssistantRuntime context={context} presentation={presentation} />
}

function KnowledgeAssistantRuntime({
  context,
  presentation,
}: {
  context: KnowledgeAssistantContext
  presentation: 'inline' | 'floating'
}) {
  const [expanded, setExpanded] = useState(false)
  const adapter = useMemo<ChatModelAdapter>(() => ({
    async run({ messages }) {
      const prompt = extractLastUserText(messages)
      const response = respondToKnowledgeAssistant(context, prompt)
      return {
        content: [{ type: 'text', text: response.text }],
      }
    },
  }), [context])

  const runtime = useLocalRuntime(adapter)

  if (presentation === 'floating' && !expanded) {
    return (
      <button className="dosAssistantFloatingTrigger" type="button" onClick={() => setExpanded(true)}>
        <span className="dosAssistantIcon" aria-hidden><Sparkles size={17} /></span>
        <span><strong>Chiedi a DOCENTE OS</strong><small>Su questo contenuto</small></span>
      </button>
    )
  }

  return (
    <section className={`dosAssistantPanel ${presentation === 'floating' ? 'floating' : ''}`} aria-labelledby="knowledge-assistant-title">
      <div className="dosAssistantHeader">
        <div className="dosAssistantIdentity">
          <span className="dosAssistantIcon" aria-hidden><Sparkles size={19} /></span>
          <div>
            <span className="panelEyebrow">AIUTO SUL CONTESTO</span>
            <h2 id="knowledge-assistant-title">Cosa vuoi capire?</h2>
          </div>
        </div>
        <div className="dosAssistantSafety"><ShieldCheck size={15} aria-hidden /><span>Non modifica dati</span></div>
      </div>

      <p className="dosAssistantLead">
        Leggo solo le informazioni già disponibili in questa pagina e ti aiuto a orientarti. Le azioni restano sotto il tuo controllo.
      </p>

      <div className="dosAssistantContextStrip" aria-label="Contesto usato dall’assistente">
        <span>{context.knowledge.category}</span>
        <span>{context.knowledge.sourceLabel}</span>
        <span>{context.knowledge.statusLabel}</span>
        {context.knowledge.classLabels.slice(0, 1).map((item) => <span key={`class-${item}`}>{item}</span>)}
        {context.knowledge.disciplines.slice(0, 1).map((item) => <span key={`discipline-${item}`}>{item}</span>)}
      </div>

      {!expanded ? (
        <div className="dosAssistantStart">
          <div>
            <strong>Puoi chiedere:</strong>
            <div className="dosAssistantPromptHints">
              {SUGGESTED_PROMPTS.map((prompt) => <span key={prompt}>{prompt}</span>)}
            </div>
          </div>
          <button type="button" onClick={() => setExpanded(true)}>Apri</button>
        </div>
      ) : (
        <AssistantRuntimeProvider runtime={runtime}>
          <KnowledgeAssistantThread onClose={() => setExpanded(false)} />
        </AssistantRuntimeProvider>
      )}
    </section>
  )
}

function KnowledgeAssistantThread({ onClose }: { onClose: () => void }) {
  return (
    <div className="dosAssistantConversation">
      <div className="dosAssistantConversationTop">
        <div>
          <strong>Parliamo di questo contenuto</strong>
          <span>Posso leggere e proporre. Non eseguo modifiche.</span>
        </div>
        <button type="button" onClick={onClose}>Chiudi</button>
      </div>

      <ThreadPrimitive.Root className="dosAssistantThread">
        <ThreadPrimitive.Viewport className="dosAssistantViewport">
          <div className="dosAssistantMessages">
            <ThreadPrimitive.Messages>
              {() => <AssistantThreadMessage />}
            </ThreadPrimitive.Messages>
          </div>
          <ThreadPrimitive.ViewportFooter className="dosAssistantComposerDock">
            <ComposerPrimitive.Root className="dosAssistantComposer">
              <ComposerPrimitive.Input
                className="dosAssistantInput"
                placeholder="Es. Cosa devo controllare?"
                aria-label="Domanda per l’assistente contestuale"
                rows={2}
              />
              <ComposerPrimitive.Send asChild>
                <button className="dosAssistantSend" type="button" aria-label="Invia domanda">
                  <SendHorizontal size={18} aria-hidden />
                </button>
              </ComposerPrimitive.Send>
            </ComposerPrimitive.Root>
          </ThreadPrimitive.ViewportFooter>
        </ThreadPrimitive.Viewport>
      </ThreadPrimitive.Root>

      <div className="dosAssistantFooterNote">
        <ShieldCheck size={14} aria-hidden />
        <span>Solo lettura e proposte. Nessuna scrittura automatica.</span>
      </div>
    </div>
  )
}

function AssistantThreadMessage() {
  const role = useAuiState((state) => state.message.role)
  return role === 'user' ? <UserMessage /> : <AssistantMessage />
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="dosAssistantMessage user">
      <div className="dosAssistantBubble user">
        <MessagePrimitive.Parts>
          {({ part }) => part.type === 'text' ? <PlainMessageText text={part.text} /> : null}
        </MessagePrimitive.Parts>
      </div>
    </MessagePrimitive.Root>
  )
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="dosAssistantMessage assistant">
      <div className="dosAssistantBubble assistant">
        <div className="dosAssistantMessageLabel"><Sparkles size={14} aria-hidden /> DOCENTE OS</div>
        <MessagePrimitive.Parts>
          {({ part }) => part.type === 'text' ? <StructuredAssistantText text={part.text} /> : null}
        </MessagePrimitive.Parts>
      </div>
    </MessagePrimitive.Root>
  )
}

function PlainMessageText({ text }: { text: string }) {
  return <p>{text}</p>
}

function StructuredAssistantText({ text }: { text: string }) {
  const blocks = text.split('\n\n').filter(Boolean)
  return (
    <div className="dosAssistantStructuredText">
      {blocks.map((block, index) => {
        const lines = block.split('\n').filter(Boolean)
        const heading = lines[0]?.match(/^\*\*(.+)\*\*$/)?.[1]
        if (heading) {
          return (
            <section key={`${heading}-${index}`}>
              <strong>{heading}</strong>
              {lines.slice(1).map((line) => <p key={line}>{line}</p>)}
            </section>
          )
        }
        return <p key={`${block}-${index}`}>{block.replaceAll('**', '')}</p>
      })}
    </div>
  )
}

function extractLastUserText(messages: readonly { role: string; content: readonly unknown[] }[]) {
  const userMessage = [...messages].reverse().find((message) => message.role === 'user')
  if (!userMessage) return ''

  return userMessage.content.flatMap((part) => {
    if (part && typeof part === 'object' && 'type' in part && 'text' in part) {
      const candidate = part as { type?: unknown; text?: unknown }
      if (candidate.type === 'text' && typeof candidate.text === 'string') return [candidate.text]
    }
    return []
  }).join('\n')
}
