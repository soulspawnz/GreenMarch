import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const [playwright,executablePath,out,base='http://127.0.0.1:8768/']=process.argv.slice(2);
if(!out)throw Error('Usage: campaign-flow.mjs PLAYWRIGHT_ENTRY CHROMIUM_EXE PRIVATE_OUTPUT_DIR [BASE_URL]');
const {chromium}=await import(pathToFileURL(playwright).href);await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath,headless:true}),page=await browser.newPage({viewport:{width:1440,height:1180}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
const summary={};
try{
 await page.goto(base);await page.waitForFunction(()=>window.lemmings?.ready,null,{timeout:45000});
 await page.locator('[data-screen="success"]').click();await page.waitForFunction(()=>lemmings.ready,null,{timeout:45000});
 await page.keyboard.press('Space',{delay:150});
 await page.waitForFunction(()=>lemmings.core().inspect().id==='fun-02',null,{timeout:45000});
 summary.nativeProgression=await page.evaluate(()=>lemmings.core().inspect());assert.equal(summary.nativeProgression.title,'Only floaters can survive this');
 await page.waitForFunction(()=>lemmings.activeLevel==='fun-02');
 await page.locator('#restart').click();await page.waitForFunction(()=>lemmings.ready&&lemmings.core().inspect().id==='fun-02',null,{timeout:85000});summary.restart='fun-02';
 await page.locator('#next-level').click();await page.waitForFunction(()=>lemmings.ready&&lemmings.core().inspect().id==='fun-03',null,{timeout:85000});summary.next='fun-03';
 await page.locator('[data-screen="title"]').click();await page.waitForFunction(()=>lemmings.ready,null,{timeout:45000});
 await page.keyboard.press('3');await page.waitForTimeout(400);await page.keyboard.type('gedgilbfie');await page.keyboard.press('Enter');
 await page.waitForFunction(()=>{const f=lemmings.core().inspect();return f.kind==='other'},null,{timeout:10000});await page.waitForTimeout(3600);
 assert.equal(await page.evaluate(()=>Boolean(document.fullscreenElement)),false,'F in an original password does not trigger fullscreen');
 await page.keyboard.press('1');await page.waitForFunction(()=>lemmings.core().inspect().id==='fun-02',null,{timeout:45000});summary.manualPassword=true;
 await page.screenshot({path:path.join(out,'campaign-desktop.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('#rating').selectOption('Mayhem');assert.equal(await page.locator('#level-select option').count(),25);summary.mobile=true;
 await page.screenshot({path:path.join(out,'campaign-mobile.png'),fullPage:true});
 assert.deepEqual(errors,[]);summary.errors=errors;await writeFile(path.join(out,'flow-results.json'),JSON.stringify(summary,null,2)+'\n');console.log('[OK] Native next-level progression, selected-level restart, Next level, physical password input and mobile campaign controls.');
}finally{await browser.close()}
