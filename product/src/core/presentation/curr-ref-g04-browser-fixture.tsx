/**
 * G04: isolated browser fixture. Not an application route.
 * It uses the REAL approved B25 projection, criteria model and panel;
 * no network, authentication, student data, or persistence.
 */
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import G04CriteriaPanel from '@/app/classi/[sectionId]/lezioni/[blockId]/g04-criteria-panel'
import { APPROVED_HUMAN_TASK_PROJECTIONS_B23_B27 } from './human-task-approved-projections-b23-b27'
import {
  EMPTY_G04_SELECTION,
  confirmG04Selection,
  resolveG04CriteriaProposal,
  toggleG04Criterion,
  type G04SessionSelection,
} from './curr-ref-g04-criteria'

const projection = APPROVED_HUMAN_TASK_PROJECTIONS_B23_B27.find((item) => item.blockId === 'B25')
if (!projection) throw new Error('G04_BROWSER_NO_B25')
const proposal = resolveG04CriteriaProposal(projection)
if (!proposal) throw new Error('G04_BROWSER_SOURCE_DRIFT')

function Fixture() {
  const [selection, setSelection] = useState<G04SessionSelection>(EMPTY_G04_SELECTION)
  return (
    <G04CriteriaPanel
      proposal={proposal!}
      selection={selection}
      onToggle={(id) => setSelection((previous) => toggleG04Criterion(previous, proposal!, id))}
      onConfirm={() => setSelection((previous) => confirmG04Selection(previous, proposal!))}
    />
  )
}

const root = document.getElementById('root')
if (!root) throw new Error('G04_BROWSER_NO_ROOT')
createRoot(root).render(<Fixture />)
