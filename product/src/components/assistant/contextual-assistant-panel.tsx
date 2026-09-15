'use client'

import {
  AssistantRuntimeProvider,
  AuiIf,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
  useLocalRuntime,
  type ChatModelAdapter,
  type DictationAdapter,
} from '@assistant-ui/react'
import { Mic, SendHorizontal, ShieldCheck, Sparkles, Square } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { ServerDictationAdapter } from './server-dictation-adapter'

export type ContextualAssistantPanelProps = {
  presentation?: 'inline' | 'floating'
  eyebrow?: string
  title?: string
  lead: string
  contextChips: string[]
  suggestedPrompts: readonly string[]
  conversationTitle: string
  safetyLabel?: string
  footerLabel?: string
  placeholder?: string
  respond: (prompt: string) => string | Promise<string>
  actionSlot?: ReactNode
  dictationAdapter?: DictationAdapter | null
}

export function ContextualAssistantPanel({
  presentation = 'inline',
  eyebrow = 'AIUTO SUL CONTESTO',
  title = 'Cosa vuoi capire?',
  lead,
  contextChips,
  suggestedPrompts,
  conversationTitle,
  safetyLabel = 'Non modifica dati',
  footerLabel = 'Solo lettura e proposte. Nessuna scrittura automatica.',
  placeholder = 'Scrivi una domanda sul contesto corrente',
  respond,
  actionSlot,
  dictationAdapter,
}: ContextualAssistantPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const sharedDictationAdapter = useMemo(() => new ServerDictationAdapter('/api/assistant/transcribe'), [])
  const resolvedDictationAdapter = dictationAdapter === null ? undefined : dictationAdapter ?? sharedDictationAdapter
  const adapter = useMemo<ChatModelAdapter>(() => ({
    async run({ messages }) {
      const prompt = extractLastUserText(messages)
      const text = await respond(prompt)
      return {
        content: [{ type: 'text', text }],
      }
    },
  }), [respond])
  const runtime = useLocalRuntime(adapter, {
    adapters: { dictation: resolvedDictationAdapter },
  })

  if (presentation === 'floating' && !expanded) {
    return (
      <button className="dosAssistantFloatingTrigger" type="button" onClick={() => setExpanded(true)}>
        <span className="dosAssistantIcon" aria-hidden><Sparkles size={17} /></span>
        <span><strong>Chiedi a DOCENTE OS</strong><small>Su questa pagina</small></span>
      </button>
    )
  }

  const panelClassName = [
    'dosAssistantPanel',
    presentation === 'floating' ? 'floating' : '',
    expanded ? 'expanded' : '',
  ].filter(Boolean).join(' ')

  return (
    <section className={panelClassName} aria-labelledby="contextual-assistant-title">
      <div className="dosAssistantHeader">
        <div className="dosAssistantIdentity">
          <span className="dosAssistantIcon" aria-hidden><Sparkles size={19} /></span>
          <div>
            <span className="panelEyebrow">{eyebrow}</span>
            <h2 id="contextual-assistant-title">{title}</h2>
          </div>
        </div>
        <div className="dosAssistantSafety"><ShieldCheck size={15} aria-hidden /><span>{safetyLabel}</span></div>
      </div>

      <p className="dosAssistantLead">{lead}</p>

      <div className="dosAssistantContextStrip" aria-label="Contesto usato dall’assistente">
        {contextChips.map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}
      </div>

      {!expanded ? (
        <div className="dosAssistantStart">
          <div>
            <strong>Puoi chiedere:</strong>
            <div className="dosAssistantPromptHints">
              {suggestedPrompts.map((prompt) => <span key={prompt}>{prompt}</span>)}
            </div>
          </div>
          <button type="button" onClick={() => setExpanded(true)}>Apri</button>
        </div>
      ) : (
        <>
          <AssistantRuntimeProvider runtime={runtime}>
            <ContextualAssistantThread
              conversationTitle={conversationTitle}
              footerLabel={footerLabel}
              placeholder={placeholder}
              onClose={() => setExpanded(false)}
              dictationEnabled={Boolean(resolvedDictationAdapter)}
            />
          </AssistantRuntimeProvider>
          {actionSlot ? <div className="dosAssistantActionSlot">{actionSlot}</div> : null}
        </>
      )}
    </section>
  )
}

function ContextualAssistantThread({
  conversationTitle,
  footerLabel,
  placeholder,
  onClose,
  dictationEnabled,
}: {
  conversationTitle: string
  footerLabel: string
  placeholder: string
  onClose: () => void
  dictationEnabled: boolean
}) {
  return (
    <div className="dosAssistantConversation">
      <div className="dosAssistantConversationTop">
        <div>
          <strong>{conversationTitle}</strong>
          <span>Posso leggere, spiegare e proporre. Le modifiche richiedono sempre una conferma separata.</span>
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
                placeholder={placeholder}
                aria-label="Domanda per l’assistente contestuale"
                rows={2}
              />
              {dictationEnabled ? (
                <>
                  <AuiIf condition={(state) => state.composer.dictation == null}>
                    <ComposerPrimitive.Dictate
                      className="dosAssistantSend voice"
                      aria-label="Detta al copilota"
                      title="Detta al copilota"
                    >
                      <Mic size={18} aria-hidden />
                    </ComposerPrimitive.Dictate>
                  </AuiIf>
                  <AuiIf condition={(state) => state.composer.dictation != null}>
                    <ComposerPrimitive.StopDictation
                      className="dosAssistantSend voice recording"
                      aria-label="Ferma dettatura"
                      title="Ferma dettatura"
                    >
                      <Square size={16} aria-hidden />
                    </ComposerPrimitive.StopDictation>
                  </AuiIf>
                </>
              ) : null}
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
        <span>{footerLabel}</span>
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
              {lines.slice(1).map((line, lineIndex) => (
                <p className={line.startsWith('• ') ? 'dosAssistantBullet' : undefined} key={`${line}-${lineIndex}`}>
                  {line}
                </p>
              ))}
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
