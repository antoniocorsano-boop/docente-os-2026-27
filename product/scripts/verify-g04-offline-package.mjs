/**
 * Verify the actual packaged HTML in Chromium, without network or app services.
 * Browser must mount the original React panel and expose both criteria.
 */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'

const root = process.cwd()
const dir = path.join(root, 'artifacts', 'g04-offline')
const htmlFile = path.join(dir, 'G04-prova-offline.html')
const manifest = JSON.parse(readFileSync(path.join(dir, 'manifest.json'), 'utf8'))
const original = readFileSync(htmlFile, 'utf8')
assert.equal(createHash('sha256').update(original).digest('hex'), manifest.sha256)
assert.equal(manifest.dataStorage, false)
assert.equal(manifest.networkRequired, false)
assert.equal(manifest.authorizedForStudentData, false)
assert.equal((original.match(/Solo dimostrazione\./g) || []).length, 0,
  'redundant standalone disclaimer must stay removed')
assert.ok(original.includes('\n<script>\n') && original.endsWith('\n</script></body></html>'),
  'single embedded entrypoint and closed HTML required')
assert.equal((original.match(/^\s*<(?:link|iframe|script\s+src=)/gm) || []).length, 0,
  'offline package cannot load external assets')
const options = [
  process.env.G04_CHROME_PATH,
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean)
const chrome = options.find((candidate) => existsSync(candidate))
assert.ok(chrome, 'Chrome/Chromium required; no false PASS without browser')
const temp = mkdtempSync(path.join(tmpdir(), 'g04-verify-'))
try {
  const injected = original.replace('</body></html>', [
    '<script>',
    'setTimeout(function(){',
    '  try {',
    '    const labels=[...document.querySelectorAll(".g04CriterionChoice")];',
    '    const button=document.querySelector(".g04CriterionActions button");',
    '    const inputs=[...document.querySelectorAll(".g04CriterionChoice input")];',
    '    if(labels.length!==2||inputs.length!==2||!button||!button.disabled)throw Error("NOT_MOUNTED");',
    '    const disclosures=[...document.querySelectorAll(".g04CriterionEvidence")];',
    '    if(disclosures.length!==2 || disclosures.some(item=>item.open))throw Error("DETAILS_NOT_COMPACT");',
    '    if(!document.querySelector(".g04CriteriaPanel").textContent.includes("Riferimento curricolare locale proposto"))throw Error("BAD_CURRICOLO_LABEL");',
    '    if(document.querySelector(".g04CriteriaPanel").textContent.includes("Nucleo del curricolo locale"))throw Error("FALSE_CURRICOLO_NUCLEUS");',
    '    disclosures[0].open=true;',
    '    if(!disclosures[0].textContent.includes("Matrice di confronto"))throw Error("EVIDENCE_LOST");',
    '    disclosures[0].open=false;',
    '    inputs[0].click();',
    '    setTimeout(function(){',
    '      try {',
    '        if(button.disabled)throw Error("SELECT_FAILED");',
    '        button.click();',
    '        setTimeout(function(){',
    '          if(!button.disabled)throw Error("CONFIRM_FAILED");',
    '          inputs[1].click();',
    '          setTimeout(function(){',
    '            if(button.disabled)throw Error("REVOKE_FAILED");',
    '            document.body.dataset.offlineCheck="PASS";',
    '          },30);',
    '        },30);',
    '      }catch(e){document.body.dataset.offlineCheck="FAIL:"+e.message;}',
    '    },30);',
    '  } catch(e){ document.body.dataset.offlineCheck="FAIL:"+e.message; }',
    '},150);',
    '</script></body></html>',
  ].join('\n'))
  const testFile = path.join(temp, 'test.html')
  writeFileSync(testFile, injected)
  const result = execFileSync(chrome, [
    '--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--no-first-run', '--no-default-browser-check', '--allow-file-access-from-files',
    '--window-size=500,900', '--virtual-time-budget=4500', '--dump-dom',
    pathToFileURL(testFile).href,
  ], { encoding: 'utf8', timeout: 30000, maxBuffer: 20 * 1024 * 1024,
       stdio: ['ignore','pipe','ignore'] })
  const status = /data-offline-check="([^"]+)"/.exec(result)?.[1] ?? 'NOT_SET'
  assert.equal(status, 'PASS', 'Actual standalone HTML did not work: ' + status)
  console.log('G04 standalone HTML: browser execution, interaction and SHA256 PASS')
} finally {
  rmSync(temp, { recursive: true, force: true })
}
