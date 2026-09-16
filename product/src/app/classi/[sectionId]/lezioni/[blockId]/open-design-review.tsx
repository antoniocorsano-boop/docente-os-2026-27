'use client'

import { useEffect } from 'react'

export function OpenDesignReview({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active) return
    const target = document.getElementById('lesson-design-tools-title')
    if (!target) return
    const disclosure = target.closest('details')
    if (disclosure instanceof HTMLDetailsElement) disclosure.open = true
    target.scrollIntoView({ block: 'center' })
  }, [active])

  return null
}
