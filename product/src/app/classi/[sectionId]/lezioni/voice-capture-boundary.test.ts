import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { isVoiceCaptureEnabled } from '@/core/application/voice/voice-capture-policy'

const routeSource = readFileSync(new URL('../../../api/voice/transcribe/route.ts', import.meta.url), 'utf8')
const voiceClientSource = readFileSync(new URL('./[blockId]/lesson-voice-capture.tsx', import.meta.url), 'utf8')
const closeClientSource = readFileSync(new URL('./[blockId]/lesson-close-client.tsx', import.meta.url), 'utf8')
const pageSource = readFileSync(new URL('./[blockId]/page.tsx', import.meta.url), 'utf8')
const adapterSource = readFileSync(new URL('../../../../core/infrastructure/ai/openai-speech-to-text.ts', import.meta.url), 'utf8')

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

test('AI-1C rollout switch disables both server endpoint and visible voice control', () => {
  assert.equal(isVoiceCaptureEnabled('off'), false)
  assert.equal(isVoiceCaptureEnabled(' OFF '), false)
  assert.equal(isVoiceCaptureEnabled('on'), true)
  assert.equal(isVoiceCaptureEnabled(undefined), true)
  assert.match(routeSource, /isVoiceCaptureEnabled\(process\.env\.DOCENTE_OS_VOICE_CAPTURE\)/)
  assert.match(pageSource, /isVoiceCaptureEnabled\(process\.env\.DOCENTE_OS_VOICE_CAPTURE\)/)
  assert.match(closeClientSource, /voiceCaptureEnabled \? \(/)
})

test('AI-1C uses the documented transcription model runtime variable', () => {
  assert.match(adapterSource, /process\.env\.OPENAI_TRANSCRIPTION_MODEL/)
  assert.doesNotMatch(adapterSource, /OPENAI_STT_MODEL/)
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
