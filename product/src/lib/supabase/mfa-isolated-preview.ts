/**
 * Temporary RB-04 testing perimeter. This project has Auth and MFA but not
 * the complete Docente OS workspace schema. The bypass below applies only
 * when BOTH the Vercel target is Preview and the Supabase project is exactly
 * the dedicated MFA test project. It must be reviewed before any merge.
 *
 * This is a routing decision, NEVER an authorization policy.
 * Supabase Auth and RLS remain authoritative.
 */
export function isIsolatedMfaPreview(
  env: Pick<NodeJS.ProcessEnv, 'VERCEL_ENV' | 'NEXT_PUBLIC_SUPABASE_URL'> = process.env,
): boolean {
  return env.VERCEL_ENV === 'preview'
    && env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '') === 'https://xyowtnivxnzgwewvvmyz.supabase.co'
}
