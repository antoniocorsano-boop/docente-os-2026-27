import { randomUUID } from 'node:crypto'
import { isVoiceCaptureReady } from '@/core/application/voice/voice-capture-policy'
import {
  TeachingSessionRecorderClient,
  type TeachingSessionRecorderProps,
} from './TeachingSessionRecorderClient'

export function TeachingSessionRecorder(props: TeachingSessionRecorderProps) {
  return (
    <TeachingSessionRecorderClient
      {...props}
      registrationKey={randomUUID()}
      voiceCaptureEnabled={isVoiceCaptureReady(process.env.DOCENTE_OS_VOICE_CAPTURE, process.env.GROQ_STT_API_KEY)}
    />
  )
}
