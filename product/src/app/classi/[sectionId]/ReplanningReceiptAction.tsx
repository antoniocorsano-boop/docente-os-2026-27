import { promoteTeachingSessionAdjustment } from './actions'

export function ReplanningReceiptAction({
  sectionId,
  teachingSessionId,
  blockId,
}: {
  sectionId: string
  teachingSessionId: string
  blockId: string
}) {
  return (
    <form action={promoteTeachingSessionAdjustment}>
      <input type="hidden" name="sectionId" value={sectionId} />
      <input type="hidden" name="teachingSessionId" value={teachingSessionId} />
      <input type="hidden" name="blockId" value={blockId} />
      <button type="submit">Porta alla riprogettazione</button>
      <small>Crea una proposta da rivedere. Il Piano e l’UDA non vengono modificati automaticamente.</small>
    </form>
  )
}
