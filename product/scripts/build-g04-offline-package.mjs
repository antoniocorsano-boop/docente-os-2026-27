/**
 * Private G04 offline package built from the REAL React panel, not a clone.
 * No network requests, Supabase, student data, persistence, or publication.
 */
import { build } from 'esbuild'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const output = path.join(root, 'artifacts', 'g04-offline')
mkdirSync(output, { recursive: true })
const result = await build({
  entryPoints: [path.join(root, 'src/core/presentation/curr-ref-g04-browser-fixture.tsx')],
  bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic',
  target: 'chrome120', absWorkingDir: root,
  tsconfig: path.join(root, 'tsconfig.json'),
  write: false, metafile: true, logLevel: 'warning',
})
if (result.outputFiles.length !== 1) throw new Error('G04_UNEXPECTED_BROWSER_ASSETS')
const names = Object.keys(result.metafile.inputs)
const forbidden = /(?:supabase|\/(?:infrastructure|server|actions)\/|student|assessmentEvidence|api\/)/i
if (names.some((name) => forbidden.test(name))) {
  throw new Error('G04_UNAUTHORIZED_DEPENDENCY: ' +
    names.filter((name) => forbidden.test(name)).join(', '))
}
const js = Buffer.from(result.outputFiles[0].contents).toString('utf8')
  .replace(/<\/script/gi, '<\\/script')
const cssPath = path.join(root, 'src/app/classi/[sectionId]/lezioni/[blockId]')
const css = ['lesson-workspace.css', 'lesson-workspace-maturity.css']
  .map((file) => readFileSync(path.join(cssPath, file), 'utf8')).join('\n')
  .replace(/<\/style/gi, '<\\/style')
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
const html = [
  '<!doctype html><html lang="it"><head>',
  '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
  '<meta name="color-scheme" content="light">',
  '<title>G04 — Prova criteri didattici · Docente OS</title>',
  '<style>',
  '*,*::before,*::after{box-sizing:border-box}',
  'html,body{margin:0;padding:0;background:#f5f7fa;color:#172033;font-family:system-ui,-apple-system,Segoe UI,sans-serif}',
  '.g04OfflineWrap{width:min(100%,680px);margin:0 auto;padding:clamp(12px,4vw,30px)}',
  '.g04OfflineHeader{margin-bottom:15px}',
  '.g04OfflineHeader span{font-size:12px;font-weight:800;color:#315fa2}',
  '.g04OfflineHeader h1{font-size:clamp(21px,5vw,28px);line-height:1.15;margin:8px 0}',
  '.g04OfflineHeader p{line-height:1.5;color:#46566d;font-size:14px}',
  '.g04OfflineFooter{font-size:12px;color:#516078;line-height:1.6;margin-top:18px}',
  '.g04OfflineFooter code{overflow-wrap:anywhere}',
  css,
  '</style></head><body data-g04-offline="v1">',
  '<main class="g04OfflineWrap">',
  '<header class="g04OfflineHeader">',
  '<span>DOCENTE OS · TECNOLOGIA · PRIMA · B25</span>',
  '<h1>Confrontare e scegliere</h1>',
  '<p>Prova offline della scelta dei criteri di osservazione.</p>',
  '</header>',
  '<div id="root" aria-label="Selezione dei criteri didattici"></div>',
  '<footer class="g04OfflineFooter">',
  '<p>Per ricominciare, ricarica la pagina. Nessuna connessione richiesta.</p>',
  '</footer></main>',
  '<script>', js, '</script></body></html>',
].join('\n')
const fileName = 'G04-prova-offline.html'
writeFileSync(path.join(output, fileName), html)
const sha256 = createHash('sha256').update(html).digest('hex')
const manifest = {
  type: 'G04_OFFLINE_COMPONENT_PREVIEW',
  version: '1.1',
  state: 'PRIVATE_DEMONSTRATOR_NOT_PRODUCT_RELEASE',
  source: {
    product: 'DOCENTE_OS',
    repository: 'antoniocorsano-boop/docente-os-2026-27',
    sourceCommit,
    pullRequest: 801,
    projectionId: 'HTC-PRIMA-B25-PLAN-v1',
    blocco: 'B25',
    uda: 'CAN-UDA-1-05',
    criteria: ['CR-G01-01','CR-G01-02'],
    reference: 'TRAMA PR #348 / CURR-REF-01/G03',
  },
  file: fileName, sha256,
  networkRequired: false,
  dataStorage: false,
  authorizedForStudentData: false,
  authorizesCurricolo: false,
  importsIntoRegistro: false,
}
writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
writeFileSync(path.join(output, 'LEGGIMI.txt'), [
  'G04 — PROVA OFFLINE DOCENTE OS',
  '',
  'È il vero componente React B25 della PR #801 confezionato in un file HTML.',
  'Non richiede internet, account, Supabase o dati degli studenti.',
  'Non registra né trasmette nulla.',
  '',
  'SU ANDROID',
  '1. Scarica e decomprimi il pacchetto ZIP.',
  '2. Apri G04-prova-offline.html con Chrome dall’app File.',
  '3. Seleziona il primo criterio e premi «Conferma la scelta».',
  '4. Seleziona il secondo: la conferma precedente deve scomparire.',
  '5. Conferma entrambi, poi ricarica: la selezione torna vuota.',
  '6. Ripeti con testo ingrandito e schermo orizzontale.',
  '',
  'Non inserire dati personali, di classe o credenziali.',
  'Non è un aggiornamento della Beta Android installata.',
  'Se Chrome non apre direttamente il file, segnala il comportamento.',
  'Non modificare le impostazioni di sicurezza del telefono.',
  '',
  'ORIGINE',
  JSON.stringify(manifest.source, null, 2),
].join('\n') + '\n')
console.log('G04 offline package ready:', fileName, 'SHA-256:', sha256)
