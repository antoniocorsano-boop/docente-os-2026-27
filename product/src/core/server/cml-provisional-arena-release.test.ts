import assert from 'node:assert/strict'
import { it } from 'node:test'
import { readProvisionalArenaReferenceForClass } from './cml-provisional-arena-release'

const scope = {
  workspaceId: 'teacher-space',
  academicYearId: 'year-2026',
  sectionId: 'section-1a',
  schoolYearRef: '2026/2027',
  grade: 'PRIMA' as const,
  assignments: [{
    workspaceId: 'teacher-space',
    academicYearId: 'year-2026',
    sectionId: 'section-1a',
    disciplineId: 'technology-id',
  }],
  disciplines: [{ id: 'technology-id', name: 'Tecnologia' }],
}

it('rejects an unassigned class without contacting a source', async () => {
  const result = await readProvisionalArenaReferenceForClass({
    ...scope,
    sectionId: 'another-class',
  })
  assert.deepEqual(result, { status: 'NOT_AUTHORIZED', reference: null })
})

it('requires server-side private source configuration before any remote request', async () => {
  const oldBucket = process.env.ARENA_VERTICAL_RELEASE_BUCKET
  const oldObject = process.env.ARENA_VERTICAL_RELEASE_OBJECT_KEY
  try {
    delete process.env.ARENA_VERTICAL_RELEASE_BUCKET
    delete process.env.ARENA_VERTICAL_RELEASE_OBJECT_KEY
    assert.deepEqual(await readProvisionalArenaReferenceForClass(scope), {
      status: 'NOT_CONFIGURED',
      reference: null,
    })
  } finally {
    if (oldBucket === undefined) delete process.env.ARENA_VERTICAL_RELEASE_BUCKET
    else process.env.ARENA_VERTICAL_RELEASE_BUCKET = oldBucket
    if (oldObject === undefined) delete process.env.ARENA_VERTICAL_RELEASE_OBJECT_KEY
    else process.env.ARENA_VERTICAL_RELEASE_OBJECT_KEY = oldObject
  }
})

it('rejects unqualified storage routes without making a download', async () => {
  const oldBucket = process.env.ARENA_VERTICAL_RELEASE_BUCKET
  const oldObject = process.env.ARENA_VERTICAL_RELEASE_OBJECT_KEY
  try {
    process.env.ARENA_VERTICAL_RELEASE_BUCKET = 'bad/bucket'
    process.env.ARENA_VERTICAL_RELEASE_OBJECT_KEY = 'original.json'
    assert.deepEqual(await readProvisionalArenaReferenceForClass(scope), {
      status: 'NOT_CONFIGURED',
      reference: null,
    })
    process.env.ARENA_VERTICAL_RELEASE_BUCKET = 'arena-private'
    process.env.ARENA_VERTICAL_RELEASE_OBJECT_KEY = '../outside.json'
    assert.deepEqual(await readProvisionalArenaReferenceForClass(scope), {
      status: 'NOT_CONFIGURED',
      reference: null,
    })
  } finally {
    if (oldBucket === undefined) delete process.env.ARENA_VERTICAL_RELEASE_BUCKET
    else process.env.ARENA_VERTICAL_RELEASE_BUCKET = oldBucket
    if (oldObject === undefined) delete process.env.ARENA_VERTICAL_RELEASE_OBJECT_KEY
    else process.env.ARENA_VERTICAL_RELEASE_OBJECT_KEY = oldObject
  }
})


it('does not allow provisional source access in another workspace', async () => {
  const old = {
    bucket: process.env.ARENA_VERTICAL_RELEASE_BUCKET,
    object: process.env.ARENA_VERTICAL_RELEASE_OBJECT_KEY,
    workspace: process.env.ARENA_VERTICAL_RELEASE_WORKSPACE_ID,
  }
  try {
    process.env.ARENA_VERTICAL_RELEASE_BUCKET = 'arena-curricolo-private'
    process.env.ARENA_VERTICAL_RELEASE_OBJECT_KEY =
      'vertical/2026-2027/master-1.3-rev27/complete-release.json'
    process.env.ARENA_VERTICAL_RELEASE_WORKSPACE_ID =
      '00000000-0000-4000-8000-000000000001'
    assert.deepEqual(await readProvisionalArenaReferenceForClass(scope), {
      status: 'NOT_AUTHORIZED',
      reference: null,
    })
  } finally {
    if (old.bucket === undefined) delete process.env.ARENA_VERTICAL_RELEASE_BUCKET
    else process.env.ARENA_VERTICAL_RELEASE_BUCKET = old.bucket
    if (old.object === undefined) delete process.env.ARENA_VERTICAL_RELEASE_OBJECT_KEY
    else process.env.ARENA_VERTICAL_RELEASE_OBJECT_KEY = old.object
    if (old.workspace === undefined) delete process.env.ARENA_VERTICAL_RELEASE_WORKSPACE_ID
    else process.env.ARENA_VERTICAL_RELEASE_WORKSPACE_ID = old.workspace
  }
})

it('rejects an incorrectly configured source key even when the workspace matches', async () => {
  const old = {
    bucket: process.env.ARENA_VERTICAL_RELEASE_BUCKET,
    object: process.env.ARENA_VERTICAL_RELEASE_OBJECT_KEY,
    workspace: process.env.ARENA_VERTICAL_RELEASE_WORKSPACE_ID,
  }
  const id = '00000000-0000-4000-8000-000000000001'
  try {
    process.env.ARENA_VERTICAL_RELEASE_WORKSPACE_ID = id
    process.env.ARENA_VERTICAL_RELEASE_BUCKET = 'arena-curricolo-private'
    process.env.ARENA_VERTICAL_RELEASE_OBJECT_KEY = 'another/release.json'
    assert.deepEqual(await readProvisionalArenaReferenceForClass({
      ...scope, workspaceId: id,
      assignments: scope.assignments.map(assignment => ({ ...assignment, workspaceId: id })),
    }), { status: 'NOT_CONFIGURED', reference: null })
  } finally {
    if (old.bucket === undefined) delete process.env.ARENA_VERTICAL_RELEASE_BUCKET
    else process.env.ARENA_VERTICAL_RELEASE_BUCKET = old.bucket
    if (old.object === undefined) delete process.env.ARENA_VERTICAL_RELEASE_OBJECT_KEY
    else process.env.ARENA_VERTICAL_RELEASE_OBJECT_KEY = old.object
    if (old.workspace === undefined) delete process.env.ARENA_VERTICAL_RELEASE_WORKSPACE_ID
    else process.env.ARENA_VERTICAL_RELEASE_WORKSPACE_ID = old.workspace
  }
})
