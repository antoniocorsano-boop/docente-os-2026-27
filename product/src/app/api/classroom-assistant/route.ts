import { NextResponse } from 'next/server'
import { ClassroomGenerativeSupportService } from '@/core/application/classroom-generative-support'
import { AiProviderUnavailableError, type ClassroomTextSupportKind } from '@/core/application/ports/ai-orchestrator'
import { OpenAiAiOrchestrator } from '@/core/infrastructure/ai/openai-ai-orchestrator'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseKnowledgeRepository } from '@/core/infrastructure/supabase/supabase-knowledge-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { buildClassroomSessionView, classroomSupportText } from '@/app/classi/[sectionId]/in-classe/[assetId]/classroom-session-model'

const TEXT_KINDS = new Set<ClassroomTextSupportKind>(['SIMPLER', 'EXAMPLE', 'CHECK'])

type RequestBody = {
  mode?: unknown
  sectionId?: unknown
  assetId?: unknown
  stepIndex?: unknown
  supportKind?: unknown
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as RequestBody
    const mode = body.mode === 'TEXT' || body.mode === 'IMAGE' ? body.mode : null
    const sectionId = cleanIdentifier(body.sectionId)
    const assetId = cleanIdentifier(body.assetId)
    const stepIndex = Number.isInteger(body.stepIndex) && Number(body.stepIndex) >= 0 ? Number(body.stepIndex) : null

    if (!mode || !sectionId || !assetId || stepIndex === null) {
      return NextResponse.json({ code: 'INVALID_REQUEST', message: 'Richiesta di assistenza non valida.' }, { status: 400 })
    }

    const workspaceContext = await new SupabaseWorkspaceRepository().getCurrentContext()
    if (!workspaceContext) return NextResponse.json({ code: 'AUTH_REQUIRED' }, { status: 401 })
    if (!workspaceContext.academicYear) return NextResponse.json({ code: 'ACADEMIC_YEAR_REQUIRED' }, { status: 409 })

    const [snapshot, bundle] = await Promise.all([
      new SupabaseAnnualPlanExecutionRepository().list(workspaceContext.workspace.id, workspaceContext.academicYear.id),
      new SupabaseKnowledgeRepository().getBundle(workspaceContext.workspace.id, assetId),
    ])
    const section = snapshot.sections.find((item) => item.id === sectionId)
    if (!section || !bundle) return NextResponse.json({ code: 'CLASSROOM_CONTEXT_NOT_FOUND' }, { status: 404 })
    if (bundle.asset.academicYearId && bundle.asset.academicYearId !== workspaceContext.academicYear.id) {
      return NextResponse.json({ code: 'CLASSROOM_CONTEXT_NOT_FOUND' }, { status: 404 })
    }

    const view = buildClassroomSessionView(section, bundle.asset)
    const step = view?.steps[stepIndex] ?? null
    if (!view || !step) return NextResponse.json({ code: 'CLASSROOM_CONTEXT_NOT_FOUND' }, { status: 404 })

    const service = new ClassroomGenerativeSupportService(new OpenAiAiOrchestrator())
    const common = {
      lessonTitle: view.title,
      stepTitle: step.title,
      instruction: step.instruction,
      cue: step.cue,
    }

    if (mode === 'TEXT') {
      const supportKind = typeof body.supportKind === 'string' && TEXT_KINDS.has(body.supportKind as ClassroomTextSupportKind)
        ? body.supportKind as ClassroomTextSupportKind
        : null
      if (!supportKind) {
        return NextResponse.json({ code: 'INVALID_SUPPORT_KIND', message: 'Tipo di proposta testuale non valido.' }, { status: 400 })
      }
      const local = classroomSupportText(view, stepIndex, supportKind)
      const proposal = await service.proposeText({ ...common, localHint: local.text }, supportKind)
      return NextResponse.json(proposal, { headers: { 'Cache-Control': 'no-store' } })
    }

    const visual = classroomSupportText(view, stepIndex, 'VISUAL')
    const proposal = await service.proposeImage({ ...common, visualBrief: visual.text })
    return NextResponse.json(proposal, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof AiProviderUnavailableError) {
      return NextResponse.json({
        code: 'AI_NOT_CONFIGURED',
        message: 'Il provider generativo non è configurato. Il supporto locale resta disponibile.',
      }, { status: 503 })
    }
    console.error('Classroom generative support failed', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({
      code: 'AI_PROVIDER_FAILED',
      message: 'Il supporto generativo non è disponibile in questo momento. La lezione può continuare con il supporto locale.',
    }, { status: 502 })
  }
}

function cleanIdentifier(value: unknown) {
  if (typeof value !== 'string') return null
  const text = value.trim()
  if (!text || text.length > 160 || !/^[a-zA-Z0-9_-]+$/.test(text)) return null
  return text
}
