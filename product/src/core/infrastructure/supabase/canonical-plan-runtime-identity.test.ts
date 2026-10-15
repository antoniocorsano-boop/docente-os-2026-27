import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CanonicalPlanSourceError,
  SupabaseCanonicalPlanSourceRepository,
  type CanonicalPlanReadClient,
} from './supabase-canonical-plan-source-repository'

type BindingRow = {
  workspace_id: string
  academic_year_id: string
  canonical_plan_code: string
  asset_id: string
  generation_id: string
  authority_epoch: number
}

type AssetRow = {
  id: string
  workspace_id: string
  academic_year_id: string | null
  current_generation_id: string | null
}

type GenerationRow = {
  id: string
  asset_id: string
  workspace_id: string
  status: string
}

type Fixture = {
  bindings?: BindingRow[]
  assets?: AssetRow[]
  generations?: GenerationRow[]
}

const IDS = {
  workspace: '11111111-1111-4111-8111-111111111111',
  otherWorkspace: '22222222-2222-4222-8222-222222222222',
  year: '33333333-3333-4333-8333-333333333333',
  otherYear: '44444444-4444-4444-8444-444444444444',
  asset: '55555555-5555-4555-8555-555555555555',
  otherAsset: '66666666-6666-4666-8666-666666666666',
  boundGeneration: '77777777-7777-4777-8777-777777777777',
  currentGeneration: '88888888-8888-4888-8888-888888888888',
} as const

const lookup = {
  workspaceId: IDS.workspace,
  academicYearId: IDS.year,
  code: 'CAN-PLAN-1' as const,
}

function validFixture(): Required<Fixture> {
  return {
    bindings: [{
      workspace_id: IDS.workspace,
      academic_year_id: IDS.year,
      canonical_plan_code: 'CAN-PLAN-1',
      asset_id: IDS.asset,
      generation_id: IDS.boundGeneration,
      authority_epoch: 0,
    }],
    assets: [{
      id: IDS.asset,
      workspace_id: IDS.workspace,
      academic_year_id: IDS.year,
      current_generation_id: IDS.boundGeneration,
    }],
    generations: [{
      id: IDS.boundGeneration,
      asset_id: IDS.asset,
      workspace_id: IDS.workspace,
      status: 'SUCCEEDED',
    }],
  }
}

function fakeClient(fixture: Fixture) {
  const tables = {
    canonical_plan_runtime_bindings: fixture.bindings ?? [],
    knowledge_assets: fixture.assets ?? [],
    knowledge_processing_generations: fixture.generations ?? [],
  }
  const queries: string[] = []

  const client: CanonicalPlanReadClient = {
    from(table) {
      queries.push(table)
      const filters = new Map<string, unknown>()
      const builder = {
        select() {
          return builder
        },
        eq(column: string, value: unknown) {
          filters.set(column, value)
          return builder
        },
        async maybeSingle() {
          const rows = tables[table].filter((row) => [...filters].every(([column, value]) => (
            (row as unknown as Record<string, unknown>)[column] === value
          )))
          if (rows.length > 1) return { data: null, error: { message: 'multiple rows' } }
          return { data: rows[0] ?? null, error: null }
        },
      }
      return builder
    },
  }

  return { client, queries }
}

async function expectSourceError(
  repository: SupabaseCanonicalPlanSourceRepository,
  expectedCode: CanonicalPlanSourceError['code'],
) {
  await assert.rejects(
    () => repository.resolve(lookup),
    (error: unknown) => error instanceof CanonicalPlanSourceError && error.code === expectedCode,
  )
}

test('valid governed binding resolves its asset, generation, and authority epoch', async () => {
  const { client } = fakeClient(validFixture())
  const repository = new SupabaseCanonicalPlanSourceRepository(async () => client)

  assert.deepEqual(await repository.resolve(lookup), {
    code: 'CAN-PLAN-1',
    assetId: IDS.asset,
    generationId: IDS.boundGeneration,
    authorityEpoch: 0,
  })
})

test('missing governed binding fails closed', async () => {
  const fixture = validFixture()
  fixture.bindings = []
  const { client, queries } = fakeClient(fixture)
  const repository = new SupabaseCanonicalPlanSourceRepository(async () => client)

  await expectSourceError(repository, 'CANONICAL_PLAN_BINDING_MISSING')
  assert.deepEqual(queries, ['canonical_plan_runtime_bindings'])
})

test('asset workspace or academic-year mismatch fails closed', async () => {
  for (const patch of [
    { workspace_id: IDS.otherWorkspace },
    { academic_year_id: IDS.otherYear },
  ]) {
    const fixture = validFixture()
    fixture.assets[0] = { ...fixture.assets[0], ...patch }
    const { client } = fakeClient(fixture)
    const repository = new SupabaseCanonicalPlanSourceRepository(async () => client)
    await expectSourceError(repository, 'CANONICAL_PLAN_CONTEXT_MISMATCH')
  }
})

test('generation-to-asset mismatch fails closed', async () => {
  const fixture = validFixture()
  fixture.generations[0].asset_id = IDS.otherAsset
  const { client } = fakeClient(fixture)
  const repository = new SupabaseCanonicalPlanSourceRepository(async () => client)

  await expectSourceError(repository, 'CANONICAL_PLAN_BINDING_INVALID')
})

test('bound generation must be SUCCEEDED', async () => {
  const fixture = validFixture()
  fixture.generations[0].status = 'FAILED'
  const { client } = fakeClient(fixture)
  const repository = new SupabaseCanonicalPlanSourceRepository(async () => client)

  await expectSourceError(repository, 'CANONICAL_PLAN_GENERATION_NOT_READY')
})

test('a valid pinned CPRI generation resolves even when asset current_generation_id has advanced', async () => {
  const fixture = validFixture()
  fixture.assets[0].current_generation_id = IDS.currentGeneration
  fixture.generations.push({
    id: IDS.currentGeneration,
    asset_id: IDS.asset,
    workspace_id: IDS.workspace,
    status: 'SUCCEEDED',
  })
  const { client } = fakeClient(fixture)
  const repository = new SupabaseCanonicalPlanSourceRepository(async () => client)

  const result = await repository.resolve(lookup)
  assert.equal(result.generationId, IDS.boundGeneration)
})

test('resolver has no metadata or static fallback when the binding is absent', async () => {
  const fixture = validFixture()
  fixture.bindings = []
  const { client, queries } = fakeClient(fixture)
  const repository = new SupabaseCanonicalPlanSourceRepository(async () => client)

  await expectSourceError(repository, 'CANONICAL_PLAN_BINDING_MISSING')
  assert.equal(queries.includes('knowledge_assets'), false)
  assert.equal(queries.includes('knowledge_processing_generations'), false)
})
