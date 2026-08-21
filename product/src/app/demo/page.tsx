import { notFound } from 'next/navigation'
import { DemoWorkspace } from './demo-workspace'

export const dynamic = 'force-dynamic'

export default function DemoPage() {
  if (process.env.DOCENTE_OS_DEMO_MODE !== '1') notFound()
  return <DemoWorkspace />
}
