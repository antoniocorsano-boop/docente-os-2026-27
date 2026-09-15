'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { TodayCopilotK2Context } from '@/core/presentation/next-lesson-preparation'
import {
  isLessonMaterialsSurface,
  resolveLessonMaterialsEntrypoint,
} from './lesson-materials-entrypoint'
import styles from './lesson-materials-entrypoint.module.css'

export function LessonMaterialsQuickAction({
  active,
  context: providedContext,
}: {
  active: string
  context?: TodayCopilotK2Context | null
}) {
  const pathname = usePathname()
  const [fetchedContext, setFetchedContext] = useState<TodayCopilotK2Context | null>(null)
  const supportedSurface = isLessonMaterialsSurface(active, pathname)
  const contextProvided = providedContext !== undefined

  useEffect(() => {
    if (!supportedSurface || contextProvided) return

    const controller = new AbortController()
    const frame = window.requestAnimationFrame(() => {
      void fetch('/api/assistant/today-context', {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) return null
          return response.json() as Promise<TodayCopilotK2Context>
        })
        .then((payload) => {
          if (!payload || payload.surface !== 'TODAY' || !('nextLessonPreparation' in payload)) {
            setFetchedContext(null)
            return
          }
          setFetchedContext(payload)
        })
        .catch(() => {
          if (!controller.signal.aborted) setFetchedContext(null)
        })
    })

    return () => {
      window.cancelAnimationFrame(frame)
      controller.abort()
    }
  }, [contextProvided, pathname, supportedSurface])

  const context = !supportedSurface
    ? null
    : contextProvided
      ? providedContext
      : fetchedContext
  const entrypoint = context
    ? resolveLessonMaterialsEntrypoint({ active, pathname, context })
    : null

  if (!entrypoint) return null

  return (
    <aside className={styles.root} aria-label="Materiali della lezione" data-testid="lesson-materials-entrypoint">
      <div className={styles.copy}>
        <span>{entrypoint.authorityLabel}</span>
        <strong>{entrypoint.sectionLabel}</strong>
        <small>{entrypoint.timeLabel} · {entrypoint.title}</small>
      </div>
      <Link className={styles.action} href={entrypoint.href}>Apri materiali</Link>
    </aside>
  )
}
