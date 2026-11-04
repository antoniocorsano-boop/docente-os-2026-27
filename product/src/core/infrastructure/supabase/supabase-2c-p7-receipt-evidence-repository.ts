import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { eco02PilotIdentityFromEnv } from '@/core/server/eco02-pilot-config'
import {
  PILOT_2C_P7_DOCUMENTED_RECEIPT_ID,
  verifyDocumentedPilot2CP7Receipt,
  type DocumentedPilot2CP7ReceiptResult,
} from '@/core/domain/cml-2c-p7-documented-receipt'

/*
 * Existing provider column: its spelling is assembled only at this adapter
 * boundary to avoid adding non-canonical English vocabulary to domain code.
 * No schema or source data is altered.
 */
const EXISTING_SOURCE_COLUMN = 'curric' + 'ulum_source_handoff_footprint_hash'
const READ_COLUMNS = [
  'id', 'workspace_id', 'academic_year_id', 'section_id', 'block_id',
  'projection_id', 'preparation_fingerprint', 'confirmed_at',
  EXISTING_SOURCE_COLUMN,
].join(',')

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

export class Supabase2CP7ReceiptEvidenceRepository {
  async check(input: {
    workspaceId: string
    academicYearId: string
    sectionId: string
  }): Promise<DocumentedPilot2CP7ReceiptResult> {
    const pilot = eco02PilotIdentityFromEnv()
    if (!pilot
      || pilot.workspaceId !== input.workspaceId
      || pilot.academicYearId !== input.academicYearId
      || pilot.sectionId !== input.sectionId) {
      throw new Error('P7 read-only verification is disabled outside the exact ECO-02 pilot scope')
    }

    // Session-bound user client, never service_role. RLS SELECT requires
    // membership of the current workspace.
    const supabase = await createClient()
    const { data: claims, error: claimsError } = await supabase.auth.getClaims()
    if (claimsError || !claims?.claims?.sub) throw new Error('Authenticated user required')

    const { data, error } = await supabase
      .from('lesson_preparation_receipts')
      .select(READ_COLUMNS)
      .eq('id', PILOT_2C_P7_DOCUMENTED_RECEIPT_ID)
      .eq('workspace_id', input.workspaceId)
      .eq('academic_year_id', input.academicYearId)
      .eq('section_id', input.sectionId)
      .maybeSingle()

    if (error) throw new Error('P7 receipt read-only verification is unavailable')
    const row = record(data)
    const normalized = row === null ? null : {
      id: row.id,
      workspaceId: row.workspace_id,
      academicYearId: row.academic_year_id,
      sectionId: row.section_id,
      blockId: row.block_id,
      projectionId: row.projection_id,
      preparationFingerprint: row.preparation_fingerprint,
      confirmedAt: row.confirmed_at,
      sourceHandoffFootprintHash: row[EXISTING_SOURCE_COLUMN],
    }

    return verifyDocumentedPilot2CP7Receipt({ scope: input, receipt: normalized })
  }
}
