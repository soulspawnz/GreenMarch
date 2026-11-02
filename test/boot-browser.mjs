import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const [entry,executablePath,out]=process.argv.slice(2);
const {chromium}=await import(pathToFileURL(entry).href);await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath,headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1180}});const errors=[],remote=[],logs=[];
page.on('console',m=>{if(m.text().includes('AUTOSTART'))logs.push(m.text())});
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!=='http://127.0.0.1:8768')remote.push(r.url())});
try{
 await page.goto('http://127.0.0.1:8768/');await page.waitForFunction(()=>window.lemmings?.ready,null,{timeout:45000});
 await page.locator('[data-screen="boot"]').click();await page.waitForFunction(()=>lemmings.ready&&lemmings.current==='boot',null,{timeout:45000});
 await page.waitForTimeout(15000);const frame=await page.evaluate(()=>lemmings.core().getFrame());assert(frame>100);
 await page.screenshot({path:path.join(out,'full-boot.png'),fullPage:true});
 await page.waitForFunction(()=>lemmings.core().audio().ac>.001,null,{timeout:45000}).catch(async error=>{console.log('[BOOT]',await page.evaluate(()=>({frame:lemmings.core().getFrame(),audio:lemmings.core().audio()})),logs);await page.screenshot({path:path.join(out,'boot-timeout.png'),fullPage:true});throw error});
 const bootAudio=await page.evaluate(()=>lemmings.core().audio());await page.screenshot({path:path.join(out,'original-loader-intro.png'),fullPage:true});
 await page.keyboard.press('Space',{delay:160});await page.waitForTimeout(1500);await page.screenshot({path:path.join(out,'release-information.png'),fullPage:true});
 const audio=await page.evaluate(()=>lemmings.core().audio());assert(bootAudio.ac>.001,'original boot SID audio before advancing the intro');
 assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
 await writeFile(path.join(out,'boot-results.json'),JSON.stringify({frames:frame,bootAudio,afterAdvanceAudio:audio,errors,externalRequests:remote},null,2));
 console.log('[OK] Full original disk boot, release-screen Space input, SID output, fresh-core transition and local-only requests.');
}finally{await browser.close()}
