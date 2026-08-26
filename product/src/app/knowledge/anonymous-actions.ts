'use server'

import { redirect } from 'next/navigation'
import { inspectFreeTextForPilot } from '@/core/privacy/anonymization-guard'
import { captureKnowledgeNote } from './actions'

export async function captureAnonymousKnowledgeNote(formData: FormData) {
  const titleValue = formData.get('title')
  const textValue = formData.get('text')
  const title = typeof titleValue === 'string' ? titleValue.trim() : ''
  const text = typeof textValue === 'string' ? textValue.trim() : ''

  const combined = [title, text].filter(Boolean).join('\n')
  if (!inspectFreeTextForPilot(combined).allowed) {
    redirect('/knowledge?upload=privacy_blocked')
  }

  return captureKnowledgeNote(formData)
}
