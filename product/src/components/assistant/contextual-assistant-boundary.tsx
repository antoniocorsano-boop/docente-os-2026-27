'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LessonMaterialsQuickAction } from '@/components/app-shell/lesson-materials-quick-action'
import { KnowledgeAssistant } from './knowledge-assistant'
import { LessonAssistant } from './lesson-assistant'
import { PlannerAssistant } from './planner-assistant'
import { TodayAssistant } from './today-assistant'
import type { KnowledgeAssistantContext } from '@/core/presentation/assistant-context'
import type { TodayCopilotK2Context } from '@/core/presentation/next-lesson-preparation'
import type { PlannerAssistantContext } from '@/core/presentation/planner-assistant-context'
import type { LessonCopilotContext } from '@/core/presentation/teacher-copilot-context'

type LoadedAssistantContext =
  | { kind: 'knowledge'; context: KnowledgeAssistantContext }
  | { kind: 'planner'; context: PlannerAssistantContext }
  | { kind: 'lesson'; context: LessonCopilotContext }
  | { kind: 'today'; context: TodayCopilotK2Context }

type AssistantTarget = {
  kind: LoadedAssistantContext['kind']
  key: string
  url: string
}

type AssistantContextPayload = KnowledgeAssistantContext | PlannerAssistantContext | LessonCopilotContext | TodayCopilotK2Context

export function ContextualAssistantBoundary({ active }: { active: string }) {
  const pathname = usePathname()
  const [loaded, setLoaded] = useState<LoadedAssistantContext | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'unavailable'>('idle')
  const assistantEnabled = process.env.NEXT_PUBLIC_DOCENTE_OS_ASSISTANT !== 'off'
  const target = assistantTarget(active, pathname)
  const materialsContext = assistantEnabled && target?.kind === 'today'
    ? loaded?.kind === 'today' ? loaded.context : null
    : undefined
  const materialsQuickAction = <LessonMaterialsQuickAction active={active} context={materialsContext} />

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
          return response.json() as Promise<AssistantContextPayload>
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
          if (target.kind === 'lesson' && payload.surface === 'LESSON') {
            setLoaded({ kind: 'lesson', context: payload as LessonCopilotContext })
            setState('ready')
            return
          }
          if (target.kind === 'today' && payload.surface === 'TODAY' && 'today' in payload && 'planner' in payload && 'nextLessonPreparation' in payload) {
            setLoaded({ kind: 'today', context: payload as TodayCopilotK2Context })
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

  if (!assistantEnabled || !target) return materialsQuickAction

  if (state === 'loading') {
    return (
      <>
        {materialsQuickAction}
        <div className="dosAssistantFloatingStatus" role="status">Sto preparando l’aiuto contestuale…</div>
      </>
    )
  }

  if (state === 'unavailable') {
    return (
      <>
        {materialsQuickAction}
        <div className="dosAssistantFloatingStatus unavailable" role="status">
          Assistente temporaneamente non disponibile. La pagina e tutte le azioni manuali restano utilizzabili.
        </div>
      </>
    )
  }

  if (!loaded) return materialsQuickAction
  if (loaded.kind === 'knowledge') return <>{materialsQuickAction}<KnowledgeAssistant context={loaded.context} presentation="floating" /></>
  if (loaded.kind === 'lesson') return <>{materialsQuickAction}<LessonAssistant context={loaded.context} presentation="floating" /></>
  if (loaded.kind === 'today') return <>{materialsQuickAction}<TodayAssistant context={loaded.context} presentation="floating" /></>
  return <>{materialsQuickAction}<PlannerAssistant context={loaded.context} presentation="floating" /></>
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

  if (active === 'classes') {
    const lesson = lessonPathContext(pathname)
    if (lesson) {
      return {
        kind: 'lesson',
        key: `lesson:${lesson.sectionId}:${lesson.blockId}`,
        url: `/api/assistant/lesson-context?sectionId=${encodeURIComponent(lesson.sectionId)}&blockId=${encodeURIComponent(lesson.blockId)}`,
      }
    }
  }

  if (active === 'today' && /^\/planner\/?$/.test(pathname)) {
    return {
      kind: 'today',
      key: 'today:daily-context',
      url: '/api/assistant/today-context',
    }
  }

  return null
}

function knowledgeAssetId(pathname: string) {
  const match = pathname.match(/^\/knowledge\/([^/?#]+)\/?$/)
  return match?.[1] ? decodeURIComponent(match[1]) : null
}

function lessonPathContext(pathname: string) {
  const match = pathname.match(/^\/classi\/([^/?#]+)\/lezioni\/([^/?#]+)\/?$/)
  if (!match?.[1] || !match[2]) return null
  return {
    sectionId: decodeURIComponent(match[1]),
    blockId: decodeURIComponent(match[2]),
  }
}
