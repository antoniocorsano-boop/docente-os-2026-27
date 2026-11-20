/**
 * G04 offline browser smoke: mounts the real React panel in Chromium/Chrome.
 * No app server, Supabase credentials, network calls, or student data.
 * Tests actual 320/390 CSS-pixel widths, at normal and simulated 200% zoom.
 */
import { build } from 'esbuild'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = process.cwd()
const fixture = path.join(root, 'src/core/presentation/curr-ref-g04-browser-fixture.tsx')
const cssRoot = 'src/app/classi/[sectionId]/lezioni/[blockId]'
const css = ['lesson-workspace.css', 'lesson-workspace-maturity.css']
  .map((name) => readFileSync(path.join(root, cssRoot, name), 'utf8')).join('\n')
const browsers = [
  process.env.G04_CHROME_PATH,
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean)
const chrome = browsers.find((candidate) => existsSync(candidate))
assert.ok(chrome, 'G04: browser absent — Chrome/Chromium required; do not report visual PASS')
const dir = mkdtempSync(path.join(tmpdir(), 'g04-offline-'))
try {
  const bundle = path.join(dir, 'g04.js')
  await build({
    entryPoints: [fixture],
    outfile: bundle,
    absWorkingDir: root,
    bundle: true,
    platform: 'browser',
    format: 'iife',
    jsx: 'automatic',
    target: 'chrome120',
    tsconfig: path.join(root, 'tsconfig.json'),
    logLevel: 'warning',
  })
  for (const width of [320, 390]) {
    for (const zoom of [1, 2]) {
      const effective = width / zoom
      const html = `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>*{box-sizing:border-box}html,body{margin:0;padding:0}body{font-family:system-ui,sans-serif;color:#172033;background:#fff}
#outer{width:${width}px;max-width:${width}px;overflow:auto;border:1px solid #dbe1ea}
#scaled{width:${effective}px;zoom:${zoom}}
#root{width:100%;min-width:0}.lessonWorkspaceSurface{max-width:900px}
${css}</style></head>
<body data-g04-status="PENDING">
<div id="outer"><div id="scaled"><div id="root"></div></div></div>
<script src="./g04.js"></script>
<script>
(async function(){
  const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  try {
    await delay(150);
    const box=document.getElementById('outer');
    const root=document.getElementById('root');
    const checks=[...document.querySelectorAll('.g04CriteriaChoices input[type=checkbox]')];
    const button=document.querySelector('.g04CriterionActions button');
    const status=()=>document.querySelector('.g04CriterionActions [role=status]')?.textContent || '';
    const assert=(cond,msg)=>{if(!cond)throw Error(msg)};
    assert(checks.length===2,'two real criteria are required');
    assert(button && button.disabled,'initial confirmation must be disabled');
    assert(!!document.querySelector('fieldset legend'),'fieldset must have a legend');
    assert(!!document.querySelector('[aria-live=polite]'),'status must be announced');
    const panel=document.querySelector('.g04CriteriaPanel');
    const evidence=[...document.querySelectorAll('.g04CriterionEvidence')];
    assert(evidence.length===2 && evidence.every(item=>!item.open),'evidence should be collapsed initially');
    assert(evidence[0].textContent.includes('Matrice di confronto'),'complete source evidence must remain accessible');
    evidence[0].open=true;
    assert(evidence[0].open,'evidence disclosure should open');
    evidence[0].open=false;
    assert(panel.textContent.includes('Riferimento curricolare locale proposto'),'curricolo reference terminology must be precise');
    assert(!panel.textContent.includes('Nucleo del curricolo locale'),'do not mislabel a local competence as a foundational nucleus');
    assert(panel && (${zoom}===2 || panel.getBoundingClientRect().height<(${width}===390?540:600)),'compact layout height exceeded');
    checks[0].focus();
    assert(document.activeElement===checks[0],'criterion checkbox must be keyboard focusable');
    const before=box.scrollWidth-box.clientWidth;
    checks[0].click();
    await delay(40);
    assert(!button.disabled,'selection must enable confirmation');
    button.focus();
    assert(document.activeElement===button,'enabled confirmation button must be keyboard focusable');
    button.click();
    await delay(40);
    assert(button.disabled && status().includes('confermat'),'confirmation must change status');
    checks[1].click();
    await delay(40);
    assert(!button.disabled && status().includes('attesa'),'changing selection must revoke confirmation');
    button.click();
    await delay(40);
    assert(button.disabled && status().includes('2 criteri confermati'),'two selected criteria must confirm');
    checks[0].click();
    await delay(40);
    assert(!button.disabled,'deselection must revoke confirmation');
    const rect=box.getBoundingClientRect();
    const clipped=[...root.querySelectorAll('*')].filter(el=>{
      const style=getComputedStyle(el);
      if(style.display==='none')return false;
      const b=el.getBoundingClientRect();
      return b.width>0 && (b.right>rect.right+3 || b.left<rect.left-3);
    }).slice(0,8).map(el=>el.tagName+'.'+String(el.className).slice(0,60));
    assert(box.scrollWidth-box.clientWidth<=2, 'horizontal overflow: '+JSON.stringify({before,after:box.scrollWidth-box.clientWidth,clipped}));
    assert(clipped.length===0,'elements outside mobile viewport: '+clipped.join(','));
    document.body.dataset.g04Status='PASS';
    document.body.dataset.g04Details=JSON.stringify({width:${width},zoom:${zoom},before,overflow:box.scrollWidth-box.clientWidth,selection:'OK',focusableControls:'OK'});
  } catch(error){
    document.body.dataset.g04Status='FAIL';
    document.body.dataset.g04Details=String(error.message || error);
  }
})()
</script></body></html>`
      const page = path.join(dir, `g04-${width}-${zoom}.html`)
      writeFileSync(page, html)
      const result = execFileSync(chrome, [
        '--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
        '--no-first-run', '--no-default-browser-check', '--allow-file-access-from-files',
        '--window-size=500,900', '--virtual-time-budget=5000', '--dump-dom',
        pathToFileURL(page).href,
      ], { encoding: 'utf8', timeout: 30000, stdio: ['ignore','pipe','ignore'] })
      const status = /data-g04-status="([^"]+)"/.exec(result)?.[1]
      const details = /data-g04-details="([^"]*)"/.exec(result)?.[1] ?? ''
      assert.equal(status, 'PASS', `G04 viewport ${width}, zoom ${zoom}: ${details || result.slice(-400)}`)
      console.log(`G04 browser viewport=${width} zoom=${zoom} PASS`)
    }
  }
} finally {
  rmSync(dir, { recursive: true, force: true })
}
