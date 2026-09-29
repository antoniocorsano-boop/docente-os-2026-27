import { ShareTargetIntake } from './ShareTargetIntake'

export const dynamic = 'force-dynamic'

export default async function ShareTargetPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  const { id } = await searchParams

  if (!id) {
    return (
      <main className="sharedIntakeSurface">
        <section className="sharedIntakeCard">
          <h1>Condividi con Docente OS</h1>
          <p>Apri il menu Condividi del dispositivo e scegli Docente OS per inviare un documento.</p>
        </section>
      </main>
    )
  }

  return <ShareTargetIntake intakeId={id} />
}
