import { createClient } from '@supabase/supabase-js'
import { E2E_EMAIL, E2E_PASSWORD, requireE2ECredentials } from './e2e-auth.mjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are required for classroom fixture setup')
}

const GRADE_NUMBER = { PRIMA: '1', SECONDA: '2', TERZA: '3' }

export async function createClassroomMaterialFixture({ sectionId, suffix }) {
  requireE2ECredentials()
  const supabase = createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: E2E_EMAIL,
    password: E2E_PASSWORD,
  })
  if (authError || !authData.user) {
    throw new Error(`Classroom fixture identity failed: ${authError?.message ?? 'missing user'}`)
  }

  const { data: section, error: sectionError } = await supabase
    .from('annual_plan_sections')
    .select('id, workspace_id, academic_year_id, grade, section_code')
    .eq('id', sectionId)
    .single()

  if (sectionError || !section) {
    throw new Error(`Classroom fixture section lookup failed: ${sectionError?.message ?? sectionId}`)
  }

  const classLabel = `${GRADE_NUMBER[section.grade] ?? ''}${section.section_code}`.toUpperCase()
  if (!GRADE_NUMBER[section.grade] || !section.section_code) throw new Error(`Unsupported classroom fixture section: ${section.grade}/${section.section_code}`)

  const targetDate = romeDate()
  const title = `HVA cockpit ${classLabel} ${suffix}`
  const { data: asset, error: insertError } = await supabase
    .from('knowledge_assets')
    .insert({
      workspace_id: section.workspace_id,
      academic_year_id: section.academic_year_id,
      asset_kind: 'WEB',
      source_provider: 'MANUAL',
      source_locator: `https://example.com/docente-os-hva/${encodeURIComponent(suffix)}`,
      original_name: title,
      processing_status: 'INDEXED',
      source_metadata: {
        docenteOsResource: 'CLASS_LESSON_MATERIAL',
        provider: 'CANVA',
        resourceKind: 'PRESENTATION',
        audience: 'STUDENT',
        approvalState: 'PENDING_HUMAN',
        targetDate,
        sectionId: section.id,
        canonicalBinding: 'PRE_CANONICAL_DIAGNOSTIC',
        classroomSteps: [
          {
            title: 'Osserva il sistema',
            instruction: 'Riconosci ingresso, processo e uscita nel sistema di illuminazione dell’aula.',
            cue: 'Parti da ciò che gli alunni possono vedere direttamente.',
          },
          {
            title: 'Controlla la comprensione',
            instruction: 'Chiedi come viene comandato il sistema e quale risultato utile produce.',
            cue: 'Distingui il controllo dall’uscita utile.',
          },
        ],
        classroomSupport: {
          simpler: [
            'Un sistema riceve qualcosa, lo trasforma e produce un risultato.',
            'Il controllo dice al sistema quando o come deve funzionare.',
          ],
          examples: [
            'Nell’illuminazione entra energia elettrica e otteniamo luce utile.',
            'L’interruttore è un esempio di controllo del sistema.',
          ],
          checks: [
            'Qual è l’ingresso del sistema di illuminazione?',
            'Che differenza c’è tra controllo e uscita?',
          ],
          visuals: [
            'Schema a tre blocchi: ingresso → processo → uscita, con il controllo rappresentato lateralmente.',
            'Diagramma con interruttore → lampada → luce e una freccia separata per l’energia elettrica.',
          ],
        },
      },
      content_category: 'TEACHING_RESOURCE',
      disciplines: ['Tecnologia'],
      class_labels: [classLabel],
      context_status: 'REVIEWED',
      reliability: 'VERIFIED',
      created_by: authData.user.id,
    })
    .select('id, original_name')
    .single()

  if (insertError || !asset) {
    throw new Error(`Classroom fixture insert failed: ${insertError?.message ?? 'missing asset'}`)
  }

  return { assetId: asset.id, classLabel, targetDate, title }
}

function romeDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}
