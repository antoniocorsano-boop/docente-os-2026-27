import type { DriveDiaryProjection } from '@/core/domain/teaching-session-reflection'
import { SupabaseTeachingSessionDriveOutboxRepository } from '@/core/infrastructure/supabase/supabase-teaching-session-drive-outbox-repository'
import { syncDriveDiaryProjection, type DriveDiarySyncOutcome } from './google-sheets-diary-adapter'

export type DriveDiaryRuntimeState = DriveDiarySyncOutcome | 'FAILED'

export async function synchronizeDriveDiaryReceipt(input: {
  outboxId: string
  workspaceId: string
  projection: DriveDiaryProjection
}): Promise<DriveDiaryRuntimeState> {
  const outbox = new SupabaseTeachingSessionDriveOutboxRepository()
  try {
    const outcome = await syncDriveDiaryProjection(input.workspaceId, input.projection)
    if (outcome === 'SYNCED') await outbox.finish(input.outboxId, 'SYNCED')
    return outcome
  } catch (error) {
    await outbox.finish(input.outboxId, 'FAILED', safeError(error)).catch(() => {})
    return 'FAILED'
  }
}

export async function synchronizePendingDriveDiary(workspaceId: string) {
  const outbox = new SupabaseTeachingSessionDriveOutboxRepository()
  const pending = await outbox.listPending(workspaceId, 20)
  const result = { attempted: pending.length, synced: 0, pending: 0, failed: 0 }

  for (const item of pending) {
    const state = await synchronizeDriveDiaryReceipt({
      outboxId: item.id,
      workspaceId,
      projection: item.projection,
    })
    if (state === 'SYNCED') result.synced += 1
    else if (state === 'FAILED') result.failed += 1
    else result.pending += 1
  }

  return result
}

function safeError(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 1000) : 'Google Drive diary synchronization failed'
}
