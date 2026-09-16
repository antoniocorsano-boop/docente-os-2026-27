import { NextResponse } from 'next/server'
import { loadDayReviewBundle } from '@/app/giornata/resoconto/day-review-loader'
import type { TodayDayReviewContext } from '@/core/presentation/next-lesson-preparation'
import { loadCurrentTodayCopilotContext } from '../today-context-loader'

export const dynamic = 'force-dynamic'

export async function GET() {
  const loaded = await loadCurrentTodayCopilotContext()
  if (!loaded) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let dayReview: TodayDayReviewContext | null = null
  if (loaded.context.academicYearId) {
    try {
      const review = await loadDayReviewBundle({
        workspaceId: loaded.context.workspaceId,
        academicYearId: loaded.context.academicYearId,
      }, { todayLoaded: loaded })
      dayReview = {
        localDate: review.localDate,
        tomorrowLocalDate: review.tomorrow.localDate,
        concludedCount: review.today.concludedCount,
        recordedCount: review.today.recordedCount,
        pendingCount: review.today.pendingCount,
        remainingCount: review.today.remainingCount,
        tomorrowLessonCount: review.tomorrow.lessonCount,
        tomorrowReadyCount: review.tomorrow.readyCount,
        tomorrowAttentionCount: review.tomorrow.attentionCount,
        tomorrowBlockedCount: review.tomorrow.blockedCount,
        decisions: review.decisions.map((decision) => ({ ...decision })),
      }
    } catch {
      dayReview = null
    }
  }

  return privateJson({ ...loaded.context, dayReview })
}

function privateJson(payload: unknown) {
  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'private, no-store',
    },
  })
}
