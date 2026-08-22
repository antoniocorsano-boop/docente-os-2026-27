'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { KnowledgeAssistant } from './knowledge-assistant'
import type { KnowledgeAssistantContext } from '@/core/presentation/assistant-context'

export function ContextualAssistantBoundary({ active }: { active: string }) {
  const pathname = usePathname()
  const [context, setContext] = useState<KnowledgeAssistantContext | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'unavailable'>('idle')
  const assistantEnabled = process.env.NEXT_PUBLIC_DOCENTE_OS_ASSISTANT !== 'off'

  const assetId = active === 'knowledge' ? knowledgeAssetId(pathname) : null

  useEffect(() => {
    if (!assistantEnabled || !assetId) return

    const controller = new AbortController()
    const frame = window.requestAnimationFrame(() => {
      setState('loading')
      setContext(null)

      void fetch(`/api/assistant/knowledge-context?assetId=${encodeURIComponent(assetId)}`, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) throw new Error(`assistant-context-${response.status}`)
          return response.json() as Promise<KnowledgeAssistantContext>
        })
        .then((payload) => {
          setContext(payload)
          setState('ready')
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return
          console.warn('[DOCENTE OS] Assistant context unavailable', error)
          setContext(null)
          setState('unavailable')
        })
    })

    return () => {
      window.cancelAnimationFrame(frame)
      controller.abort()
    }
  }, [assistantEnabled, assetId])

  if (!assistantEnabled || !assetId) return null

  if (state === 'loading') {
    return <div className="dosAssistantFloatingStatus" role="status">Sto preparando l’aiuto contestuale…</div>
  }

  if (state === 'unavailable') {
    return (
      <div className="dosAssistantFloatingStatus unavailable" role="status">
        Assistente temporaneamente non disponibile. Il documento e tutte le azioni manuali restano utilizzabili.
      </div>
    )
  }

  if (!context) return null
  return <KnowledgeAssistant context={context} presentation="floating" />
}

function knowledgeAssetId(pathname: string) {
  const match = pathname.match(/^\/knowledge\/([^/?#]+)\/?$/)
  return match?.[1] ? decodeURIComponent(match[1]) : null
}
