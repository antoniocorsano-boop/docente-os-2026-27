'use client'

import { useEffect, useRef, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from './alert'

export type TransientFeedbackTone = 'success' | 'error' | 'info' | 'warning'

type TransientFeedbackProps = {
  title?: string
  message: string
  tone?: TransientFeedbackTone
  durationMs?: number
}

export function TransientFeedback({
  title,
  message,
  tone = 'success',
  durationMs = 4200
}: TransientFeedbackProps) {
  const [visible, setVisible] = useState(true)
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (host && !reducedMotion) {
      host.animate(
        [
          { opacity: 0, transform: 'translate3d(28px, 0, 0)' },
          { opacity: 1, transform: 'translate3d(0, 0, 0)' },
        ],
        { duration: 180, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' },
      )
    }

    let exitAnimation: Animation | null = null
    const finishDismiss = () => {
      setVisible(false)
    }
    const timer = window.setTimeout(() => {
      if (!host || reducedMotion) {
        finishDismiss()
        return
      }
      exitAnimation = host.animate(
        [
          { opacity: 1, transform: 'translate3d(0, 0, 0)' },
          { opacity: 0, transform: 'translate3d(18px, 0, 0)' },
        ],
        { duration: 160, easing: 'ease-in', fill: 'both' },
      )
      void exitAnimation.finished.then(finishDismiss).catch(() => undefined)
    }, durationMs)

    return () => {
      window.clearTimeout(timer)
      exitAnimation?.cancel()
    }
  }, [durationMs])

  if (!visible) return null

  const variant = tone === 'error' ? 'destructive' : tone
  const role = tone === 'error' ? 'alert' : 'status'

  return (
    <div
      ref={hostRef}
      className="pointer-events-none fixed right-3 top-[76px] z-[1600] w-[min(420px,calc(100vw-24px))] md:right-5 md:top-5"
      data-visual-priority="status-transient"
      data-visual-moment="now"
    >
      <Alert
        className="pointer-events-auto shadow-[var(--shadow-float)]"
        variant={variant}
        role={role}
        aria-live={tone === 'error' ? 'assertive' : 'polite'}
      >
        {title ? <AlertTitle>{title}</AlertTitle> : null}
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    </div>
  )
}
