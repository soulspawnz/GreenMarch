import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const [pw,executablePath,out,base='http://127.0.0.1:8769/']=process.argv.slice(2);
const {chromium}=await import(pathToFileURL(pw).href);await mkdir(out,{recursive:true});const browser=await chromium.launch({executablePath,headless:true});
async function exercise(mobile){
 const context=await browser.newContext({viewport:{width:mobile?390:1440,height:mobile?844:1200},isMobile:mobile,hasTouch:mobile}),page=await context.newPage(),errors=[],bad=[];
 await context.addInitScript(()=>{const Native=window.AudioContext;window.AudioContext=class extends Native{constructor(options={}){super({...options,sinkId:{type:'none'}})}}});
 const press=selector=>mobile?page.locator(selector).tap():page.locator(selector).click();
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)bad.push(r.url())});
 try{
  await page.goto(base+'#fun-03');await page.waitForFunction(()=>greenmarch?.ready);assert(await page.locator('#end-level').isDisabled());
  if(mobile){await page.locator('#presentation').selectOption('enhanced');await page.waitForFunction(()=>greenmarch.ready&&greenmarch.presentation==='enhanced')}
  await press('#play');await page.waitForFunction(()=>greenmarch.running);
  if(mobile){
   // Exercise the player's decision to finish before meeting the target.
   // The desktop route below separately covers a completed rescue with Blockers.
   await page.waitForFunction(()=>greenmarch.game.actors.some(a=>a.state==='walk'));
   await press('#pause');await press('[data-skill="3"]');await page.locator('#game').scrollIntoViewIfNeeded();await press('#pause');await page.waitForFunction(()=>greenmarch.running);
   const hit=await page.evaluate(()=>{const a=greenmarch.game.actors.find(a=>a.state==='walk'),b=document.querySelector('#game').getBoundingClientRect();return {x:b.x+(a.x-greenmarch.renderer.camera)/160*b.width,y:b.y+(a.y-5)/greenmarch.game.level.height*b.height}});
   await page.touchscreen.tap(hit.x,hit.y);await page.waitForFunction(()=>greenmarch.game.actors.some(a=>a.state==='block'));await press('#pause');
   const before=await page.evaluate(()=>greenmarch.game.snapshot());await press('#end-level');const after=await page.evaluate(()=>greenmarch.game.snapshot());
   assert.equal(after.status,'lost');assert(after.endedEarly);assert.equal(after.rescued,before.rescued);assert.equal(after.tick,before.tick);assert.deepEqual(after.actors,before.actors);assert.deepEqual(after.terrain,before.terrain);
   assert((await page.locator('#overlay-copy').textContent()).includes('Level ended by player.'));assert(await page.locator('#continue-level').isHidden());assert(await page.locator('#end-level').isDisabled());assert(!await page.evaluate(()=>greenmarch.campaign.completed.includes('fun-03')));
   await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>greenmarch.game.tick),before.tick);await page.screenshot({path:path.join(out,'touch-early-end.png'),fullPage:true});
   await press('#restart');assert(await page.locator('#end-level').isDisabled());assert.equal(await page.evaluate(()=>greenmarch.game.endedEarly),false);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
   console.log('[OK] Enhanced touch End level preserves Blocker/counts, records early loss, freezes gameplay and restarts.');return {mobile:true,rescued:after.rescued,tick:after.tick,blockers:after.actors.filter(a=>a.state==='block').length,lossChecked:true,errors,bad};
  }
  await press('#speed');
  const deadline=Date.now()+150000;
  while(!await page.evaluate(()=>{const g=greenmarch.game;return g.spawned===g.level.lemmings&&g.rescued>=g.level.saveCount&&g.actors.every(a=>['gone','exit','block'].includes(a.state))})){
   assert(Date.now()<deadline,'Blocker route must finish within its test budget');
   assert.equal(await page.evaluate(()=>greenmarch.game.status),'playing');
   const candidate=await page.evaluate(()=>{const g=greenmarch.game;for(const a of g.actors)if(a.state==='walk'){let y=a.y;const x=g.center(a)+a.dir*8;while(y<g.level.height&&!g.solid(x,y))y++;if(y>=g.level.height||y-a.y>60)return a.id}return null});
   if(candidate===null){await page.waitForTimeout(20);continue}
   await press('#pause');
   if(!await page.evaluate(id=>greenmarch.game.canAssign(id,3),candidate)){await press('#pause');continue}
   // Place skills at normal speed; at x4 the walker can reach the drop while
   // the browser is resuming and moving between controls.
   await press('#speed');
   await press('[data-skill="3"]');
   const actor=await page.evaluate(id=>greenmarch.game.actors.find(a=>a.id===id),candidate);let camera=await page.evaluate(()=>greenmarch.renderer.camera);
   while(actor.x<camera+12||actor.x>camera+148){await press(actor.x<camera+12?'#scroll-left':'#scroll-right');const moved=await page.evaluate(()=>greenmarch.renderer.camera);if(moved===camera)break;camera=moved}
   await page.locator('#game').scrollIntoViewIfNeeded();
   const hit=await page.evaluate(id=>{const a=greenmarch.game.actors.find(a=>a.id===id),b=document.querySelector('#game').getBoundingClientRect();return {x:b.x+(a.x-greenmarch.renderer.camera)/160*b.width,y:b.y+(a.y-5)/greenmarch.game.level.height*b.height}},candidate);
   await page.mouse.move(hit.x,hit.y);const before=await page.evaluate(()=>greenmarch.game.inputs.length);await press('#pause');await page.waitForFunction(()=>greenmarch.running);
   // Resume can scroll the page to the transport; use current viewport coordinates.
   const currentHit=await page.evaluate(id=>{const a=greenmarch.game.actors.find(a=>a.id===id),b=document.querySelector('#game').getBoundingClientRect();return {x:b.x+(a.x-greenmarch.renderer.camera)/160*b.width,y:b.y+(a.y-5)/greenmarch.game.level.height*b.height}},candidate);
   if(mobile)await page.touchscreen.tap(currentHit.x,currentHit.y);else await page.mouse.click(currentHit.x,currentHit.y);
   assert(await page.evaluate(n=>greenmarch.game.inputs.length>n,before),'Normal canvas input must assign Blocker: '+JSON.stringify(await page.evaluate(id=>({actor:greenmarch.game.actors.find(a=>a.id===id),camera:greenmarch.renderer.camera,notice:document.querySelector('#notice').textContent}),candidate)));
   await press('#speed');
  }
  await press('#pause');const before=await page.evaluate(()=>greenmarch.game.snapshot());assert(before.actors.some(a=>a.state==='block'));
  assert(before.tick<3000);await press('#end-level');
  const finished=await page.evaluate(()=>greenmarch.game.snapshot());assert.equal(finished.status,'won');assert(finished.endedEarly);assert.equal(finished.tick,before.tick);assert.equal(finished.rescued,before.rescued);assert.equal(finished.dead,before.dead);assert.deepEqual(finished.actors,before.actors);assert.deepEqual(finished.terrain,before.terrain);
  assert((await page.locator('#overlay-copy').textContent()).includes('Level ended by player.'));assert(await page.locator('#continue-level').isVisible());assert(await page.locator('#end-level').isDisabled());
  await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>greenmarch.game.tick),before.tick);assert(await page.evaluate(()=>!greenmarch.running&&greenmarch.campaign.completed.includes('fun-03')));
  await page.screenshot({path:path.join(out,mobile?'touch-win.png':'desktop-win.png'),fullPage:true});await press('#continue-level');await page.waitForFunction(()=>greenmarch.ready&&greenmarch.game.level.id==='fun-04');assert(await page.locator('#end-level').isDisabled());
  await press('#play');await page.waitForFunction(()=>greenmarch.running);await press('#end-level');assert.equal(await page.evaluate(()=>greenmarch.game.status),'lost');assert(await page.locator('#continue-level').isHidden());assert(!await page.evaluate(()=>greenmarch.campaign.completed.includes('fun-04')));
  await press('#restart');assert(await page.locator('#end-level').isDisabled());assert.equal(await page.evaluate(()=>greenmarch.game.endedEarly),false);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);const result={mobile,rescued:finished.rescued,tick:finished.tick,blockers:finished.actors.filter(a=>a.state==='block').length,lossChecked:true,nextChecked:true,errors,bad};console.log('[OK] '+(mobile?'Enhanced touch':'Classic mouse')+' Fun3 End level, rescue target, frozen blockers, next level, early loss and restart.');return result;
 }finally{await context.close()}
}
try{await writeFile(path.join(out,'results.json'),JSON.stringify(await Promise.all([exercise(false),exercise(true)]),null,2))}finally{await browser.close()}
