import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const [playwright,executablePath,out,selection,base='http://127.0.0.1:8768/']=process.argv.slice(2);
if(!out)throw Error('Usage: campaign.mjs PLAYWRIGHT_ENTRY CHROMIUM_EXE PRIVATE_OUTPUT_DIR [COMMA_SEPARATED_LEVEL_IDS] [BASE_URL]');
const {chromium}=await import(pathToFileURL(playwright).href);
await mkdir(out,{recursive:true});
const catalog=await(await fetch(new URL('media/campaign.json',base))).json();
const all=catalog.ratings.flatMap(r=>r.levels),chosen=selection?selection.split(','):all.map(l=>l.id);
assert(chosen.every(id=>all.some(l=>l.id===id)),'known original levels');
const results=[],failures=[];
async function worker(ids){
 const browser=await chromium.launch({executablePath,headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1180}}),errors=[],remote=[],bad=[],loadedCheckpoints=new Set();
 page.on('pageerror',error=>errors.push(error.message));
 page.on('request',request=>{if(/^https?:/.test(request.url())&&new URL(request.url()).origin!==new URL(base).origin)remote.push(request.url());const match=request.url().match(/\/media\/levels\/([a-z]+-\d{2})\.bin$/);if(match)loadedCheckpoints.add(match[1])});
 page.on('response',response=>{if(response.status()>=400)bad.push([response.status(),response.url()])});
 try{
  await page.goto(base);await page.waitForFunction(()=>window.lemmings?.ready,null,{timeout:45000});
  for(const id of ids){
   const expected=all.find(l=>l.id===id);console.log('[LOAD]',id);
   await page.locator('#rating').selectOption(expected.rating);await page.locator('#level-select').selectOption(id);await page.locator('#load-level').click();
   await page.waitForFunction(id=>{if(document.querySelector('#status').textContent==='Unable to load')throw Error(document.querySelector('#campaign-note').textContent);return lemmings.ready&&lemmings.activeLevel===id},id,{timeout:85000});
   const native=await page.evaluate(()=>lemmings.core().inspect());assert.equal(native.id,id);assert.equal(native.kind,'briefing');for(const field of ['lemmings','save','release','minutes'])assert(Number.isFinite(native[field]),'original briefing field '+field);
   const disks=await page.frame({url:/machine.html/}).evaluate(()=>EJS_emulator.gameManager.getDiskCount());assert.equal(disks,3);
   await page.locator('#pause').click();
   const bytes=Buffer.from(await page.evaluate(()=>Array.from(lemmings.core().getState()))),sha256=createHash('sha256').update(bytes).digest('hex');
   await writeFile(path.join(out,id+'.bin'),bytes);await page.locator('#machine').screenshot({path:path.join(out,id+'-briefing.png')});
   await page.locator('#pause').click();await page.keyboard.press('Space',{delay:150});
   await page.waitForFunction(()=>lemmings.core().inspect().kind!=='briefing',null,{timeout:12000});
   const startFrame=await page.evaluate(()=>lemmings.core().getFrame());await page.waitForTimeout(650);
   assert(await page.evaluate(()=>lemmings.core().getFrame())>startFrame,'original gameplay advances');
   const audioStart=await page.evaluate(()=>lemmings.core().getFrame());
   const observed=await page.waitForFunction(start=>{const audio=lemmings.core().audio();if(audio.ac>.001)return audio;if(lemmings.core().getFrame()-start>600)throw Error('No SID output after 600 emulated frames');return false},audioStart,{timeout:30000});
   const audio=await observed.jsonValue();await observed.dispose();
   await page.locator('#machine').screenshot({path:path.join(out,id+'-playing.png')});
   assert.equal(errors.length,0,errors.join('\n'));assert.equal(remote.length,0,'local-only requests');assert.equal(bad.length,0,JSON.stringify(bad));
   if(expected.checkpoint)assert(loadedCheckpoints.has(id),'verified quick-start checkpoint requested');
   const result={id,originalFile:expected.file,originalSha256:expected.sha256,native,checkpointSha256:sha256,checkpointBytes:bytes.length,sidAC:audio.ac,sidObservedAbove:.001,disks,quickStart:loadedCheckpoints.has(id)};
   results.push(result);await writeFile(path.join(out,id+'.json'),JSON.stringify(result,null,2)+'\n');
   console.log('[PASS]',id,native.title,'SID',audio.ac.toFixed(5));
  }
 }catch(error){const id=ids.find(id=>!results.some(r=>r.id===id));await page.screenshot({path:path.join(out,(id||'startup')+'-failure.png'),fullPage:true}).catch(()=>{});const state=await page.evaluate(()=>({audio:lemmings.core().audio(),frame:lemmings.core().getFrame(),screen:lemmings.core().inspect(),playing:lemmings.playing})).catch(()=>null);await writeFile(path.join(out,(id||'startup')+'-failure.json'),JSON.stringify({error:error.stack,state},null,2));failures.push({id,error:error.stack,state});console.log('[FAIL]',id,error.stack,state)}
 finally{await browser.close()}
}
await Promise.all([chosen.filter((_,i)=>i%2===0),chosen.filter((_,i)=>i%2===1)].filter(ids=>ids.length).map(worker));
await writeFile(path.join(out,'campaign-results.json'),JSON.stringify({results,failures},null,2)+'\n');
assert.equal(failures.length,0,JSON.stringify(failures));assert.equal(results.length,chosen.length);
console.log('[OK]',results.length,'original briefings, running levels, three disks and measured SID output verified.');
