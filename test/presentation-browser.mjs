import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const [pw,executablePath,out,base='http://127.0.0.1:8768/']=process.argv.slice(2);
const {chromium}=await import(pathToFileURL(pw).href);await mkdir(out,{recursive:true});const browser=await chromium.launch({executablePath,headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1100}}),page=await context.newPage(),errors=[],bad=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)bad.push(r.url())});
const state=()=>page.evaluate(()=>JSON.stringify(greenmarch.game.snapshot()));
async function mode(value){await page.locator('#presentation').selectOption(value);await page.waitForFunction(v=>greenmarch.ready&&greenmarch.presentation===v,value)}
try{
 await page.goto(base);await page.waitForFunction(()=>greenmarch?.ready);const initial=await state();
 await mode('enhanced');assert.equal(await state(),initial);assert.equal(await page.locator('#game').getAttribute('width'),'1280');
 await page.screenshot({path:path.join(out,'enhanced-ready.png'),fullPage:true});
 await page.locator('#play').click();await page.waitForFunction(()=>greenmarch.audio.measure()>.001);
 const enhancedRMS=await page.evaluate(()=>greenmarch.audio.measure());
 await page.waitForFunction(()=>greenmarch.game.actors.some(a=>a.state==='walk'&&a.x>=136),null,{timeout:18000});await page.locator('#pause').click();
 const paused=await state(),camera=await page.evaluate(()=>greenmarch.renderer.camera);
 await mode('classic');assert.equal(await state(),paused);assert.equal(await page.evaluate(()=>greenmarch.renderer.camera),camera);assert.equal(await page.locator('#game').getAttribute('width'),'640');
 await mode('enhanced');assert.equal(await state(),paused);assert(await page.evaluate(()=>greenmarch.audio.measure())<.0001);
 await page.locator('#digger').click();await page.locator('#game').scrollIntoViewIfNeeded();
 const hit=await page.evaluate(()=>{const a=greenmarch.game.actors[0],b=document.querySelector('#game').getBoundingClientRect();return {x:b.x+(a.x-greenmarch.renderer.camera)/160*b.width,y:b.y+(a.y-5)/greenmarch.game.level.height*b.height}});
 await page.mouse.move(hit.x,hit.y);await page.locator('#pause').click();await page.waitForFunction(()=>greenmarch.running);
 const currentHit=await page.evaluate(()=>{const a=greenmarch.game.actors[0],b=document.querySelector('#game').getBoundingClientRect();return {x:b.x+(a.x-greenmarch.renderer.camera)/160*b.width,y:b.y+(a.y-5)/greenmarch.game.level.height*b.height}});
 await page.mouse.click(currentHit.x,currentHit.y);await page.waitForFunction(()=>greenmarch.game.skills[7]===9);
 await page.locator('#sound').click();await page.waitForTimeout(300);assert(await page.evaluate(()=>greenmarch.audio.measure())<.0001);await page.locator('#sound').click();await page.waitForFunction(()=>greenmarch.audio.measure()>.001);
 await page.screenshot({path:path.join(out,'enhanced-digging.png'),fullPage:true});
 // Switch while running: the game must stay active and retain its terrain and skills.
 const live=await page.evaluate(()=>({tick:greenmarch.game.tick,skills:greenmarch.game.skills,spawned:greenmarch.game.spawned}));await mode('classic');
 assert(await page.evaluate(()=>greenmarch.running));assert.equal(await page.evaluate(()=>greenmarch.game.skills[7]),live.skills[7]);assert(await page.evaluate(()=>greenmarch.game.tick)>=live.tick);await page.waitForFunction(()=>greenmarch.audio.measure()>.001);
 await mode('enhanced');await page.locator('#speed').click();await page.waitForFunction(()=>greenmarch.game.status!=='playing',null,{timeout:60000});
 const result=await page.evaluate(()=>({status:greenmarch.game.status,rescued:greenmarch.game.rescued,inputs:greenmarch.game.inputs}));assert.equal(result.status,'won');assert.equal(result.rescued,10);
 await page.screenshot({path:path.join(out,'enhanced-completed.png'),fullPage:true});await page.reload();await page.waitForFunction(()=>greenmarch?.ready);assert.equal(await page.evaluate(()=>greenmarch.presentation),'enhanced');
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);await writeFile(path.join(out,'results.json'),JSON.stringify({enhancedRMS,result,errors,bad,pausedStatePreserved:true,activeSwitch:true,persisted:true},null,2));console.log('[OK] Classic/enhanced switching preserves state, camera and active play; distinct audio, mute, exact paused state, 10/10 gameplay and saved preference passed.');
}finally{await context.close();await browser.close()}
