import assert from 'node:assert/strict'
import test from 'node:test'

import {
  presentClassMaterialAcceptance,
  type ClassMaterialAcceptanceState,
} from './class-material-acceptance-projection'

const states: readonly ClassMaterialAcceptanceState[] = [
  'PREPARED',
  'REVALIDATION_REQUIRED',
  'CONFIRMED',
]

test('class material projection keeps prepared, revalidation and canonical confirmation distinct', () => {
  assert.deepEqual(
    states.map((state) => presentClassMaterialAcceptance(state)),
    [
      {
        state: 'PREPARED',
        label: 'Predisposto',
        canonicalConfirmed: false,
        requiresRevalidation: false,
      },
      {
        state: 'REVALIDATION_REQUIRED',
        label: 'Da riconfermare',
        canonicalConfirmed: false,
        requiresRevalidation: true,
      },
      {
        state: 'CONFIRMED',
        label: 'Confermato',
        canonicalConfirmed: true,
        requiresRevalidation: false,
      },
    ],
  )
})
