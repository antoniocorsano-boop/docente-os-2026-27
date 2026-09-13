import { spawn } from 'node:child_process'

const port = process.env.PORT?.trim() || '3000'
const nextBin = process.platform === 'win32' ? 'next.cmd' : 'next'

const child = spawn(nextBin, ['start', '-H', '0.0.0.0', '-p', port], {
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (!child.killed) child.kill(signal)
  })
}

child.on('error', (error) => {
  console.error('Unable to start Next.js production server:', error)
  process.exitCode = 1
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exitCode = code ?? 1
})
