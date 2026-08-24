'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { KnowledgeAssistant } from './knowledge-assistant'
import { PlannerAssistant } from './planner-assistant'
import type { KnowledgeAssistantContext } from '@/core/presentation/assistant-context'
import type { PlannerAssistantContext } from '@/core/presentation/planner-assistant-context'

type LoadedAssistantContext =
  | { kind: 'knowledge'; context: KnowledgeAssistantContext }
  | { kind: 'planner'; context: PlannerAssistantContext }

type AssistantTarget = {
  kind: LoadedAssistantContext['kind']
  key: string
  url: string
}

export function ContextualAssistantBoundary({ active }: { active: string }) {
  const pathname = usePathname()
  const [loaded, setLoaded] = useState<LoadedAssistantContext | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'unavailable'>('idle')
  const assistantEnabled = process.env.NEXT_PUBLIC_DOCENTE_OS_ASSISTANT !== 'off'
  const target = assistantTarget(active, pathname)

  useEffect(() => {
    if (!assistantEnabled || !target) return

    const controller = new AbortController()
    const frame = window.requestAnimationFrame(() => {
      setState('loading')
      setLoaded(null)

      void fetch(target.url, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) throw new Error(`assistant-context-${response.status}`)
          return response.json() as Promise<KnowledgeAssistantContext | PlannerAssistantContext>
        })
        .then((payload) => {
          if (target.kind === 'knowledge' && payload.surface === 'KNOWLEDGE') {
            setLoaded({ kind: 'knowledge', context: payload as KnowledgeAssistantContext })
            setState('ready')
            return
          }
          if (target.kind === 'planner' && payload.surface === 'PLANNER') {
            setLoaded({ kind: 'planner', context: payload as PlannerAssistantContext })
            setState('ready')
            return
          }
          throw new Error('assistant-context-surface-mismatch')
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return
          console.warn('[DOCENTE OS] Assistant context unavailable', error)
          setLoaded(null)
          setState('unavailable')
        })
    })

    return () => {
      window.cancelAnimationFrame(frame)
      controller.abort()
    }
  }, [assistantEnabled, target?.key])

  if (!assistantEnabled || !target) return null

  if (state === 'loading') {
    return <div className="dosAssistantFloatingStatus" role="status">Sto preparando l’aiuto contestuale…</div>
  }

  if (state === 'unavailable') {
    return (
      <div className="dosAssistantFloatingStatus unavailable" role="status">
        Assistente temporaneamente non disponibile. La pagina e tutte le azioni manuali restano utilizzabili.
      </div>
    )
  }

  if (!loaded) return null
  if (loaded.kind === 'knowledge') return <KnowledgeAssistant context={loaded.context} presentation="floating" />
  return <PlannerAssistant context={loaded.context} presentation="floating" />
}

function assistantTarget(active: string, pathname: string): AssistantTarget | null {
  if (active === 'knowledge') {
    const assetId = knowledgeAssetId(pathname)
    if (!assetId) return null
    return {
      kind: 'knowledge',
      key: `knowledge:${assetId}`,
      url: `/api/assistant/knowledge-context?assetId=${encodeURIComponent(assetId)}`,
    }
  }

  if (active === 'today' && /^\/planner\/?$/.test(pathname)) {
    return {
      kind: 'planner',
      key: 'planner:today',
      url: '/api/assistant/planner-context',
    }
  }

  return null
}

function knowledgeAssetId(pathname: string) {
  const match = pathname.match(/^\/knowledge\/([^/?#]+)\/?$/)
  return match?.[1] ? decodeURIComponent(match[1]) : null
}
