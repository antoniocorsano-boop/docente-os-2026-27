import { createClient } from '@/lib/supabase/server'
import {
  mayConsultProvisionalTechnology,
  type ProvisionalTechnologyGrade,
  type ProvisionalTechnologyReference,
} from '@/core/domain/cml-provisional-technology-reference'
import { projectPinnedArenaReleaseForClass } from '@/core/domain/cml-provisional-arena-blob'

type Scope = {
  workspaceId: string
  academicYearId: string
  sectionId: string
  schoolYearRef: string
  grade: ProvisionalTechnologyGrade
  assignments: readonly {
    workspaceId: string
    academicYearId: string
    sectionId: string
    disciplineId: string
  }[]
  disciplines: readonly { id: string; name: string }[]
}

export type ProvisionalArenaServerResult =
  | { status: 'AVAILABLE'; reference: ProvisionalTechnologyReference }
  | { status: 'NOT_AUTHORIZED' | 'NOT_CONFIGURED' | 'SOURCE_UNAVAILABLE' | 'SOURCE_UNVERIFIED'; reference: null }

/**
 * Read-only server adapter. The bucket and object key are provisioned by the
 * authorized source operator, never accepted from the browser, query string,
 * file upload, or a teacher decision. Download uses the current user's
 * Supabase session/RLS, NEVER a service-role credential.
 */
export async function readProvisionalArenaReferenceForClass(
  scope: Scope,
): Promise<ProvisionalArenaServerResult> {
  if (!mayConsultProvisionalTechnology(scope)) {
    return { status: 'NOT_AUTHORIZED', reference: null }
  }

  const bucket = process.env.ARENA_VERTICAL_RELEASE_BUCKET?.trim()
  const objectKey = process.env.ARENA_VERTICAL_RELEASE_OBJECT_KEY?.trim()
  const authorizedWorkspaceId = process.env.ARENA_VERTICAL_RELEASE_WORKSPACE_ID?.trim()
  if (!bucket || !objectKey || !authorizedWorkspaceId
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(authorizedWorkspaceId)) {
    return { status: 'NOT_CONFIGURED', reference: null }
  }
  if (scope.workspaceId !== authorizedWorkspaceId) {
    return { status: 'NOT_AUTHORIZED', reference: null }
  }
  // This limits the current teacher's *provisional consultation* to one
  // provisioned workspace. It does not attest institutional adoption.
  // The server-provisioned path must encode the SAME workspace that the
  // authenticated class scope requires. SQL checks that path against its
  // separately authorized workspace binding and individual read grant.
  const scopedObjectKey = `${authorizedWorkspaceId.toLowerCase()}/vertical/2026-2027/master-1.3-rev27/complete-release.json`
  if (bucket !== 'arena-curricolo-private'
    || objectKey !== scopedObjectKey) {
    return { status: 'NOT_CONFIGURED', reference: null }
  }
  try {
    const supabase = await createClient()
    const { data: userResult, error: userError } = await supabase.auth.getUser()
    if (userError || !userResult.user || userResult.user.is_anonymous === true) {
      return { status: 'NOT_AUTHORIZED', reference: null }
    }

    const { data: file, error } = await supabase.storage.from(bucket).download(objectKey)
    if (error || !file) {
      return { status: 'SOURCE_UNAVAILABLE', reference: null }
    }
    if (file.size === 0 || file.size > 2_000_000) {
      return { status: 'SOURCE_UNVERIFIED', reference: null }
    }

    const reference = projectPinnedArenaReleaseForClass({
      bytes: new Uint8Array(await file.arrayBuffer()),
      grade: scope.grade,
      schoolYearRef: scope.schoolYearRef,
    })
    return { status: 'AVAILABLE', reference }
  } catch {
    return { status: 'SOURCE_UNVERIFIED', reference: null }
  }
}
