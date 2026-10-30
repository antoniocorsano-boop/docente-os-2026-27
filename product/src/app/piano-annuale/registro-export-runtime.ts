// @trama-readonly — validates runtime provenance and derives a local download name; no persistence or remote mutation.

export type RegistroExportRuntimeProvenance = {
  sourceCommit: string
  sourceBranch: string
}

export function resolveRegistroExportRuntimeProvenance(
  env: Record<string, string | undefined>,
): RegistroExportRuntimeProvenance | null {
  const sourceCommit = env.RENDER_GIT_COMMIT?.trim() ?? ''
  const sourceBranch = env.RENDER_GIT_BRANCH?.trim() ?? ''
  if (!/^[0-9a-f]{40}$/.test(sourceCommit)) return null
  if (!sourceBranch || sourceBranch.length > 255) return null
  return { sourceCommit, sourceBranch }
}

export function projectionDownloadFilename(schoolYear: string) {
  const token = schoolYear.trim().replace(/[^0-9A-Za-z]+/g, '-').replace(/^-+|-+$/g, '')
  if (!token) throw new Error('INVALID_SCHOOL_YEAR')
  return `docente-os-registro-teaching-projection-${token}.json`
}
