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
    assert.match(sql, /alter table private\.arena_provisional_delivery_read_grants enable row level security/i)
    assert.match(sql, /revoke all on private\.arena_provisional_delivery_read_grants\s+from public, anon, authenticated/i)
    assert.match(sql, /'arena-curriculum-private',\s*'arena-curriculum-private',\s*false,\s*2000000,\s*array\['application\/json'\]/i)
    assert.doesNotMatch(sql, /create policy[\s\S]{0,200}?for insert to authenticated/i)
  })

  it('only grants authenticated download for the one immutable object after explicit private access', () => {
    assert.match(sql, /for select to authenticated\s+using\s*\(/i)
    assert.match(sql, /name = 'vertical\/2026-2027\/master-1\.3-rev27\/complete-release\.json'/i)
    assert.match(sql, /storage\.allow_any_operation\(array\[\s*'object\.get_authenticated',\s*'object\.get_authenticated_info'\s*\]\)/i)
    assert.match(sql, /private\.can_read_arena_provisional_release_v1\(\)/i)
    assert.match(sql, /g\.enabled = true/i)
    assert.match(sql, /wm\.user_id = g\.user_id/i)
    assert.match(sql, /g\.user_id = \(select auth\.uid\(\)\)/i)
    assert.match(sql, /is_anonymous/i)
  })

  it('pins Arena 1.3 rev.27 and never writes curriculum adoptions or P7 receipts', () => {
    assert.match(sql, /de58f418b4d1fe0be449895736d6267f6c5a58c1b1a476b1f36558579a200809/)
    assert.match(sql, /source_revision_id = '27'/)
    assert.match(sql, /source_master_version = '1\.3'/)
    assert.doesNotMatch(sql, /insert into public\.annual_plan_curriculum_adoptions/i)
    assert.doesNotMatch(sql, /update public\.annual_plan_curriculum_adoptions/i)
    assert.doesNotMatch(sql, /insert into public\.lesson_preparation_receipts/i)
  })
})
