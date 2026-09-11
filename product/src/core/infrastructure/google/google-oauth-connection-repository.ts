import { createClient } from '@/lib/supabase/server'
import { decryptGoogleToken, encryptGoogleToken } from './google-token-crypto'

type DbError = { message: string }
type ConnectionRow = {
  id: string
  workspace_id: string
  user_id: string
  account_email: string | null
  scopes: string[]
  access_token_enc: string
  refresh_token_enc: string | null
  expires_at: string
  status: 'ACTIVE' | 'REVOKED'
}

type SingleResult<T> = Promise<{ data: T | null; error: DbError | null }>
interface Filter<T> {
  eq(column: string, value: string): Filter<T>
  select(columns: string): { single(): SingleResult<T> }
  maybeSingle(): SingleResult<T>
  single(): SingleResult<T>
}
interface ConnectionTable {
  select(columns: string): Filter<ConnectionRow>
  upsert(value: Record<string, unknown>, options: { onConflict: string }): { select(columns: string): { single(): SingleResult<ConnectionRow> } }
  update(value: Record<string, unknown>): Filter<ConnectionRow>
}
interface ConnectionClient { from(table: 'google_oauth_connections'): ConnectionTable }

export type ActiveGoogleConnection = {
  id: string
  workspaceId: string
  userId: string
  accountEmail: string | null
  scopes: string[]
  accessToken: string
  refreshToken: string | null
  expiresAt: string
}

export class GoogleOAuthConnectionRepository {
  async getActive(workspaceId: string): Promise<ActiveGoogleConnection | null> {
    const { supabase, userId } = await authenticatedClient()
    const db = supabase as unknown as ConnectionClient
    const { data, error } = await db
      .from('google_oauth_connections')
      .select('id,workspace_id,user_id,account_email,scopes,access_token_enc,refresh_token_enc,expires_at,status')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('provider', 'GOOGLE')
      .eq('status', 'ACTIVE')
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data ? decryptRow(data) : null
  }

  async save(input: {
    workspaceId: string
    accountEmail: string | null
    scopes: string[]
    accessToken: string
    refreshToken: string | null
    expiresAt: string
  }) {
    const { supabase, userId } = await authenticatedClient()
    const db = supabase as unknown as ConnectionClient
    const existing = await this.getActive(input.workspaceId)
    const refreshToken = input.refreshToken ?? existing?.refreshToken ?? null
    const { data, error } = await db
      .from('google_oauth_connections')
      .upsert({
        workspace_id: input.workspaceId,
        user_id: userId,
        provider: 'GOOGLE',
        account_email: input.accountEmail,
        scopes: input.scopes,
        access_token_enc: encryptGoogleToken(input.accessToken),
        refresh_token_enc: refreshToken ? encryptGoogleToken(refreshToken) : null,
        expires_at: input.expiresAt,
        status: 'ACTIVE',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'workspace_id,user_id,provider' })
      .select('id,workspace_id,user_id,account_email,scopes,access_token_enc,refresh_token_enc,expires_at,status')
      .single()
    if (error) throw new Error(error.message)
    if (!data) throw new Error('Google OAuth connection receipt missing')
    return decryptRow(data)
  }

  async updateAccessToken(input: { workspaceId: string; accessToken: string; expiresAt: string }) {
    const { supabase, userId } = await authenticatedClient()
    const db = supabase as unknown as ConnectionClient
    const { data, error } = await db
      .from('google_oauth_connections')
      .update({
        access_token_enc: encryptGoogleToken(input.accessToken),
        expires_at: input.expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('workspace_id', input.workspaceId)
      .eq('user_id', userId)
      .eq('provider', 'GOOGLE')
      .eq('status', 'ACTIVE')
      .select('id,workspace_id,user_id,account_email,scopes,access_token_enc,refresh_token_enc,expires_at,status')
      .single()
    if (error) throw new Error(error.message)
    if (!data) throw new Error('Google OAuth refresh receipt missing')
    return decryptRow(data)
  }
}

async function authenticatedClient() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error) throw new Error(error.message)
  if (!data.user) throw new Error('Authenticated user required')
  return { supabase, userId: data.user.id }
}

function decryptRow(row: ConnectionRow): ActiveGoogleConnection {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    accountEmail: row.account_email,
    scopes: [...row.scopes],
    accessToken: decryptGoogleToken(row.access_token_enc),
    refreshToken: row.refresh_token_enc ? decryptGoogleToken(row.refresh_token_enc) : null,
    expiresAt: row.expires_at,
  }
}
