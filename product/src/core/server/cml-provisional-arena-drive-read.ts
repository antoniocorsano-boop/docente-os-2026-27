import { createClient } from '@/lib/supabase/server'
import { GoogleOAuthConnectionRepository } from '@/core/infrastructure/google/google-oauth-connection-repository'
import { activeGoogleAccessToken, googleOAuthConfigured } from '@/core/infrastructure/google/google-oauth'
import { GOOGLE_ARENA_DRIVE_READ_SCOPE, downloadPinnedArenaFromDrive } from '@/core/infrastructure/google/arena-provisional-drive-source'
import { projectPinnedArenaReleaseForClass } from '@/core/domain/cml-provisional-arena-blob'
import type { ProvisionalTechnologyGrade, ProvisionalTechnologyReference } from '@/core/domain/cml-provisional-technology-reference'

// Explicitly confined to the non-production Supabase project, never the institutional rollout.
const PROTOTYPE_SUPABASE_URL = 'https://gnshgapmwyjamhmlikeg.supabase.co'

type Scope = {
  workspaceId: string
  grade: ProvisionalTechnologyGrade
  schoolYearRef: string
}

type Result =
  | { status: 'AVAILABLE'; reference: ProvisionalTechnologyReference }
  | { status: 'NOT_AUTHORIZED' | 'NOT_CONFIGURED' | 'SOURCE_UNAVAILABLE' | 'SOURCE_UNVERIFIED'; reference: null }

export async function readPrivateArenaFromDriveForPrototype(scope: Scope): Promise<Result> {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') !== PROTOTYPE_SUPABASE_URL
    || !googleOAuthConfigured()) return { status: 'NOT_CONFIGURED', reference: null }

  try {
    const supabase = await createClient()
    const { data: userResult, error: userError } = await supabase.auth.getUser()
    const user = userResult.user
    if (userError || !user || user.is_anonymous === true) {
      return { status: 'NOT_AUTHORIZED', reference: null }
    }
    const { data: space, error: spaceError } = await supabase
      .from('workspaces')
      .select('owner_user_id,kind')
      .eq('id', scope.workspaceId)
      .maybeSingle()
    if (spaceError || !space || space.kind !== 'PERSONAL' || space.owner_user_id !== user.id) {
      return { status: 'NOT_AUTHORIZED', reference: null }
    }

    const connection = await new GoogleOAuthConnectionRepository().getActive(scope.workspaceId)
    if (!connection || !connection.scopes.includes(GOOGLE_ARENA_DRIVE_READ_SCOPE)) {
      return { status: 'NOT_CONFIGURED', reference: null }
    }
    // The prototype deliberately requires the same personal identity in Docente OS and Drive.
    if (!user.email || connection.accountEmail?.toLowerCase() !== user.email.toLowerCase()) {
      return { status: 'NOT_AUTHORIZED', reference: null }
    }
    const token = await activeGoogleAccessToken(scope.workspaceId)
    if (!token) return { status: 'SOURCE_UNAVAILABLE', reference: null }

    const bytes = await downloadPinnedArenaFromDrive(token)
    const reference = projectPinnedArenaReleaseForClass({
      bytes,
      grade: scope.grade,
      schoolYearRef: scope.schoolYearRef,
    })
    return { status: 'AVAILABLE', reference }
  } catch {
    // Any OAuth, network, source-integrity or qualification failure stays closed.
    return { status: 'SOURCE_UNVERIFIED', reference: null }
  }
}
