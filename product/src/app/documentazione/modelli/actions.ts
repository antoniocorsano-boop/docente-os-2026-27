'use server'

import { revalidatePath } from 'next/cache'
import { SupabaseDocumentTemplateRepository } from '@/core/infrastructure/supabase/supabase-document-template-repository'
import { SupabaseInstitutionalBaseRepository } from '@/core/infrastructure/supabase/supabase-institutional-base-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import type { TemplateBuilderLifecycleActionKey } from './template-builder-model'

async function requireTemplateGovernance() {
  const context = await new SupabaseWorkspaceRepository().getCurrentContext()
  if (!context) throw new Error('Sessione non disponibile.')
  if (context.role !== 'OWNER' && context.role !== 'ADMIN') {
    throw new Error('Questa operazione richiede un ruolo di governo dei modelli istituzionali.')
  }
  return context
}

function requiredString(formData: FormData, key: string): string {
  const value = formData.get(key)
  if (typeof value !== 'string' || !value.trim()) throw new Error('Dati della richiesta incompleti.')
  return value.trim()
}

function requestedAction(formData: FormData): TemplateBuilderLifecycleActionKey {
  const value = requiredString(formData, 'lifecycleAction')
  if (value === 'ACTIVATE' || value === 'BLOCK' || value === 'CLEAR_BLOCK' || value === 'RETIRE') return value
  throw new Error('Operazione non riconosciuta.')
}

function currentVersionNo(formData: FormData): number {
  const value = Number(requiredString(formData, 'currentVersionNo'))
  if (!Number.isInteger(value) || value < 1) throw new Error('Versione corrente non valida.')
  return value
}

function humanNote(formData: FormData): string {
  return requiredString(formData, 'note')
}

function humanReviewConfirmed(formData: FormData): boolean {
  return formData.get('humanReviewConfirmed') === 'on'
}

export async function mutateInstitutionalBaseAction(formData: FormData): Promise<void> {
  await requireTemplateGovernance()
  const repository = new SupabaseInstitutionalBaseRepository()
  const baseId = requiredString(formData, 'identityId')
  const action = requestedAction(formData)

  switch (action) {
    case 'ACTIVATE':
      if (!humanReviewConfirmed(formData)) throw new Error('Conferma umana richiesta prima dell’attivazione.')
      await repository.activate({
        baseId,
        versionNo: currentVersionNo(formData),
        humanReviewConfirmed: true,
      })
      break
    case 'BLOCK':
      await repository.block({ baseId, note: humanNote(formData) })
      break
    case 'CLEAR_BLOCK':
      await repository.clearBlock({ baseId, note: humanNote(formData) })
      break
    case 'RETIRE':
      await repository.retire({ baseId, note: humanNote(formData) })
      break
  }

  revalidatePath('/documentazione/modelli')
}

export async function mutateFamilyTemplateAction(formData: FormData): Promise<void> {
  await requireTemplateGovernance()
  const repository = new SupabaseDocumentTemplateRepository()
  const templateId = requiredString(formData, 'identityId')
  const action = requestedAction(formData)

  switch (action) {
    case 'ACTIVATE':
      if (!humanReviewConfirmed(formData)) throw new Error('Conferma umana richiesta prima dell’attivazione.')
      await repository.activate({
        templateId,
        versionNo: currentVersionNo(formData),
        humanReviewConfirmed: true,
      })
      break
    case 'BLOCK':
      await repository.block({ templateId, note: humanNote(formData) })
      break
    case 'CLEAR_BLOCK':
      await repository.clearBlock({ templateId, note: humanNote(formData) })
      break
    case 'RETIRE':
      await repository.retire({ templateId, note: humanNote(formData) })
      break
  }

  revalidatePath('/documentazione/modelli')
}
