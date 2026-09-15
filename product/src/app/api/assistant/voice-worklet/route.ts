const WORKLET_SOURCE = `
class DocenteOSVoiceCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.chunk = new Float32Array(4096)
    this.offset = 0
    this.port.onmessage = (event) => {
      if (event.data?.type !== 'flush') return
      this.flush()
      this.port.postMessage({ type: 'flushed' })
    }
  }

  flush() {
    if (this.offset === 0) return
    const copy = this.chunk.slice(0, this.offset)
    this.offset = 0
    this.port.postMessage({ type: 'chunk', buffer: copy.buffer }, [copy.buffer])
  }

  process(inputs, outputs) {
    const input = inputs[0]?.[0]
    const output = outputs[0]?.[0]
    if (output) output.fill(0)

    if (input) {
      let inputOffset = 0
      while (inputOffset < input.length) {
        const writable = Math.min(this.chunk.length - this.offset, input.length - inputOffset)
        this.chunk.set(input.subarray(inputOffset, inputOffset + writable), this.offset)
        this.offset += writable
        inputOffset += writable
        if (this.offset === this.chunk.length) this.flush()
      }
    }

    return true
  }
}

registerProcessor('docente-os-voice-capture', DocenteOSVoiceCaptureProcessor)
`

export async function GET() {
  return new Response(WORKLET_SOURCE, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
