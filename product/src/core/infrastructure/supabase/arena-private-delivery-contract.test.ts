import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const migrationPath = fileURLToPath(new URL(
  '../../../../supabase/migrations/0106_arena_provisional_private_delivery_acl.sql',
  import.meta.url,
))
const sql = readFileSync(migrationPath, 'utf8')

describe('provisional Arena private Storage transport governance', () => {
  it('starts with empty grants and a non-public JSON-only bucket', () => {
    assert.match(sql, /create table private\.arena_provisional_delivery_read_grants/i)
    assert.match(sql, /enabled boolean not null default false/i)
    assert.equal((sql.match(/enabled boolean not null default false/gi) ?? []).length, 2)
    assert.match(sql, /alter table private\.arena_provisional_delivery_read_grants enable row level security/i)
    assert.match(sql, /revoke all on private\.arena_provisional_delivery_read_grants\s+from public, anon, authenticated/i)
    assert.match(sql, /'arena-curricolo-private',\s*'arena-curricolo-private',\s*false,\s*2000000,\s*array\['application\/json'\]/i)
    assert.doesNotMatch(sql, /create policy[\s\S]{0,200}?for insert to authenticated/i)
  })

  it('only grants authenticated download for the one immutable object after explicit private access', () => {
    assert.match(sql, /for select to authenticated\s+using\s*\(/i)
    assert.match(sql, /name = 'vertical\/2026-2027\/master-1\.3-rev27\/complete-release\.json'/i)
    assert.match(sql, /storage\.allow_any_operation\(array\[\s*'object\.get_authenticated',\s*'object\.get_authenticated_info'\s*\]\)/i)
    assert.match(sql, /private\.can_read_arena_provisional_release_v1\(\)/i)
    assert.match(sql, /create table private\.arena_provisional_delivery_active_binding/i)
    assert.match(sql, /alter table private\.arena_provisional_delivery_active_binding enable row level security/i)
    assert.match(sql, /revoke all on private\.arena_provisional_delivery_active_binding\s+from public, anon, authenticated/i)
    assert.match(sql, /b\.source_key = 'arena-1\.3-rev27'/i)
    assert.match(sql, /b\.workspace_id = g\.workspace_id/i)
    assert.match(sql, /b\.academic_year_id = g\.academic_year_id/i)
    assert.match(sql, /b\.source_sha256 = g\.source_sha256/i)
    assert.match(sql, /b\.enabled = true/i)

    assert.match(sql, /g\.enabled = true/i)
    assert.match(sql, /wm\.user_id = g\.user_id/i)
    assert.match(sql, /g\.user_id = \(select auth\.uid\(\)\)/i)
    assert.match(sql, /is_anonymous/i)
  })

  it('pins Arena 1.3 rev.27 and never writes institutional adoptions or P7 receipts', () => {
    assert.match(sql, /de58f418b4d1fe0be449895736d6267f6c5a58c1b1a476b1f36558579a200809/)
    assert.match(sql, /source_revision_id = '27'/)
    assert.match(sql, /source_master_version = '1\.3'/)
    const insertTargets = [...sql.matchAll(/insert into\s+([a-z_]+\.[a-z_]+)/gi)]
      .map(match => match[1].toLowerCase())
      .sort()
    assert.deepEqual(insertTargets, [
      'private.runtime_schema_required_migrations',
      'storage.buckets',
    ].sort())
    assert.doesNotMatch(sql, /\bupdate\s+public\./i)
    assert.doesNotMatch(sql, /\bdelete\s+from\s+public\./i)
  })
})
