import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { isVoiceCaptureEnabled } from '@/core/application/voice/voice-capture-policy'

const routeSource = readFileSync(new URL('../../../api/voice/transcribe/route.ts', import.meta.url), 'utf8')
const voiceClientSource = readFileSync(new URL('./[blockId]/lesson-voice-capture.tsx', import.meta.url), 'utf8')
const closeClientSource = readFileSync(new URL('./[blockId]/lesson-close-client.tsx', import.meta.url), 'utf8')
const inlineRecorderWrapperSource = readFileSync(new URL('../TeachingSessionRecorder.tsx', import.meta.url), 'utf8')
const inlineRecorderSource = readFileSync(new URL('../TeachingSessionRecorderClient.tsx', import.meta.url), 'utf8')
const pageSource = readFileSync(new URL('./[blockId]/page.tsx', import.meta.url), 'utf8')
const adapterSource = readFileSync(new URL('../../../../core/infrastructure/ai/groq-speech-to-text.ts', import.meta.url), 'utf8')

test('AI-1C voice endpoint reconstructs lesson authority server-side and never persists raw audio', () => {
  assert.match(routeSource, /loadLessonReflectionCopilotContext/)
  assert.match(routeSource, /lessonRecordSurfaceFromRequest/)
  assert.match(routeSource, /request\.formData\(\)/)
  assert.match(routeSource, /VOICE_CAPTURE_MAX_BYTES/)
  assert.match(routeSource, /VOICE_CAPTURE_MAX_DURATION_MS/)
  assert.match(routeSource, /isAllowedVoiceMimeType/)
  assert.match(routeSource, /inspectFreeTextForPilot/)
  assert.match(routeSource, /provider\.transcribe/)
  assert.doesNotMatch(routeSource, /storage\.from|\.insert\(|\.upsert\(|recordLessonExecution|TeachingSession/)
})

test('AI-1C rollout switch disables server endpoint and both modeled and inline voice controls', () => {
  assert.equal(isVoiceCaptureEnabled('off'), false)
  assert.equal(isVoiceCaptureEnabled(' OFF '), false)
  assert.equal(isVoiceCaptureEnabled('on'), true)
  assert.equal(isVoiceCaptureEnabled(undefined), true)
  assert.match(routeSource, /isVoiceCaptureEnabled\(process\.env\.DOCENTE_OS_VOICE_CAPTURE\)/)
  assert.match(pageSource, /isVoiceCaptureEnabled\(process\.env\.DOCENTE_OS_VOICE_CAPTURE\)/)
  assert.match(closeClientSource, /voiceCaptureEnabled \? \(/)
  assert.match(inlineRecorderWrapperSource, /isVoiceCaptureEnabled\(process\.env\.DOCENTE_OS_VOICE_CAPTURE\)/)
  assert.match(inlineRecorderWrapperSource, /voiceCaptureEnabled=/)
  assert.match(inlineRecorderSource, /voiceCaptureEnabled && lessonSurfacePath/)
})

test('AI-1F uses only the documented Groq transcription runtime variables', () => {
  assert.match(adapterSource, /process\.env\.GROQ_STT_API_KEY/)
  assert.match(adapterSource, /process\.env\.GROQ_TRANSCRIPTION_MODEL/)
  assert.doesNotMatch(adapterSource, /OPENAI_STT_API_KEY|OPENAI_TRANSCRIPTION_MODEL|GROQ_API_KEY/)
})

test('AI-1C client sends only ephemeral audio metadata and an untrusted same-origin surface locator', () => {
  assert.match(voiceClientSource, /navigator\.mediaDevices\.getUserMedia/)
  assert.match(voiceClientSource, /new MediaRecorder/)
  assert.match(voiceClientSource, /fetch\('\/api\/voice\/transcribe'/)
  assert.match(voiceClientSource, /form\.append\('audio'/)
  assert.match(voiceClientSource, /form\.append\('durationMs'/)
  assert.match(voiceClientSource, /X-Docente-Surface-Path/)
  assert.doesNotMatch(voiceClientSource, /form\.append\('sectionId'|form\.append\('blockId'|localStorage/)
})

test('AI-1C transcript append cannot exceed the canonical 4000-character note limit', () => {
  assert.match(closeClientSource, /existing\.length >= 4000/)
  assert.match(closeClientSource, /remaining <= separator\.length/)
  assert.match(closeClientSource, /spoken\.slice\(0, remaining - separator\.length\)/)
})

test('AI-1C transcription returns to the existing note and keeps recordLessonExecution as the only persistent close boundary', () => {
  assert.match(closeClientSource, /LessonVoiceCapture/)
  assert.match(closeClientSource, /onTranscript=\{appendVoiceTranscript\}/)
  assert.match(closeClientSource, /recordLessonExecution\(formData\)/)
  assert.doesNotMatch(closeClientSource, /saveVoice|persistTranscript|uploadAudio/)
})

test('AI-1D inline recorder reuses Voice and Copilot without changing its persistent boundary', () => {
  assert.match(inlineRecorderSource, /LessonVoiceCapture/)
  assert.match(inlineRecorderSource, /surfacePath=\{lessonSurfacePath\}/)
  assert.match(inlineRecorderSource, /fetch\('\/api\/copilot'/)
  assert.match(inlineRecorderSource, /body: JSON\.stringify\(\{ prompt: buildLessonReflectionCapturePrompt\(note\) \}\)/)
  assert.match(inlineRecorderSource, /action=\{recordTeachingSession\}/)
  assert.doesNotMatch(inlineRecorderSource, /recordLessonExecution|saveVoice|persistTranscript|uploadAudio/)
})

test('AI-1D inline recorder keeps professional context out of Copilot JSON and uses only the untrusted surface locator', () => {
  assert.match(inlineRecorderSource, /X-Docente-Surface-Path': surfacePath/)
  assert.doesNotMatch(inlineRecorderSource, /JSON\.stringify\(\{[^}]*sectionId|JSON\.stringify\(\{[^}]*blockId|JSON\.stringify\(\{[^}]*projection/)
  assert.match(inlineRecorderSource, /existing\.length >= 4000/)
  assert.match(inlineRecorderSource, /spoken\.slice\(0, remaining - separator\.length\)/)
})

test('AI-1D discards stale Copilot responses after note or primary-block changes', () => {
  assert.match(inlineRecorderSource, /captureGenerationRef/)
  assert.match(inlineRecorderSource, /invalidateCapturePreview/)
  assert.match(inlineRecorderSource, /const requestGeneration = captureGenerationRef\.current \+ 1/)
  assert.match(inlineRecorderSource, /captureGenerationRef\.current !== requestGeneration/)
  assert.match(inlineRecorderSource, /selectPrimaryBlock\(event\.target\.value\)/)
  assert.match(inlineRecorderSource, /updateEvidenceNote\(event\.target\.value\)/)
})
