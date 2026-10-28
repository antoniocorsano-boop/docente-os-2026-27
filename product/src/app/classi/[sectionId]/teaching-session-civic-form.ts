import { normalizeCivicEducationContribution } from '@/core/domain/teaching-session'

export function civicEducationContributionFromFormData(formData: FormData, actualMinutes: number) {
  const minutesText = optionalText(formData.get('civicEducationMinutes'))
  const evidenceNote = optionalText(formData.get('civicEducationEvidenceNote'))

  return normalizeCivicEducationContribution({
    actualMinutes,
    minutes: minutesText === null ? null : Number(minutesText),
    evidenceNote,
  })
}

function optionalText(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') return null
  return value.trim() || null
}
