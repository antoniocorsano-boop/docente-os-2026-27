import { TimetableExperience } from '../TimetableExperience'

export const dynamic = 'force-dynamic'

export default function TimetableRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  return <TimetableExperience searchParams={searchParams} mode="manage" />
}
