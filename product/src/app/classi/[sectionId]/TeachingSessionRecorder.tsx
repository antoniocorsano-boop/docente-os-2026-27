import { randomUUID } from 'node:crypto'
import { isVoiceCaptureEnabled } from '@/core/application/voice/voice-capture-policy'
import {
  TeachingSessionRecorderClient,
  type TeachingSessionRecorderProps,
} from './TeachingSessionRecorderClient'

export function TeachingSessionRecorder(props: TeachingSessionRecorderProps) {
  return (
    <TeachingSessionRecorderClient
      {...props}
      registrationIntentKey={randomUUID()}
      voiceCaptureEnabled={isVoiceCaptureEnabled(process.env.DOCENTE_OS_VOICE_CAPTURE)}
    />
  )
}
