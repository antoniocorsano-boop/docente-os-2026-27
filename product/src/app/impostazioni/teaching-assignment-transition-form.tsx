'use client'

import { useActionState } from 'react'
import {
  confirmSettingsTeachingAssignment,
  reopenSettingsTeachingAssignment,
  type TeachingAssignmentTransitionState,
} from './actions'

const INITIAL_STATE: TeachingAssignmentTransitionState = { status: 'idle', message: '' }

type Props = {
  assignmentId: string
  expectedStatus: 'PROVISIONAL' | 'CONFIRMED'
  expectedUpdatedAt: string
  mode: 'confirm' | 'reopen'
}

export function TeachingAssignmentTransitionForm({
  assignmentId,
  expectedStatus,
  expectedUpdatedAt,
  mode,
}: Props) {
  const action = mode === 'confirm' ? confirmSettingsTeachingAssignment : reopenSettingsTeachingAssignment
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE)
  const isConfirm = mode === 'confirm'

  return (
    <form action={formAction} className={isConfirm ? 'humanConfirmForm' : 'humanReopenForm'}>
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <input type="hidden" name="expectedStatus" value={expectedStatus} />
      <input type="hidden" name="expectedUpdatedAt" value={expectedUpdatedAt} />
      <button
        className={isConfirm ? 'settingsPrimaryButton humanConfirmButton' : 'textButton humanReopenButton'}
        type="submit"
        disabled={pending}
        aria-disabled={pending}
      >
        {pending ? 'Salvataggio…' : isConfirm ? 'Conferma' : 'Rimetti da controllare'}
      </button>
      {state.status !== 'idle' ? (
        <p
          className={state.status === 'success' ? 'settingsInlineActionSuccess' : 'settingsInlineActionError'}
          role={state.status === 'success' ? 'status' : 'alert'}
          aria-live={state.status === 'success' ? 'polite' : 'assertive'}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  )
}
