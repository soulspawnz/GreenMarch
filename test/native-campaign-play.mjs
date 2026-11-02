import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const [pw,executablePath,out,base='http://127.0.0.1:8768/']=process.argv.slice(2);
const {chromium}=await import(pathToFileURL(pw).href);await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath,headless:true});
async function play(id,mobile){
 const context=await browser.newContext({viewport:{width:mobile?390:1366,height:mobile?844:1000},isMobile:mobile,hasTouch:mobile}),page=await context.newPage(),errors=[],bad=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)bad.push(r.url())});
 const press=selector=>mobile?page.locator(selector).tap():page.locator(selector).click();
 try{
  await page.goto(base+'#'+id);await page.waitForFunction(()=>greenmarch?.ready);
  await press('#play');await page.waitForFunction(()=>greenmarch.audio.measure()>.001);await press('#speed');
  const deadline=Date.now()+180000;
  while(await page.evaluate(()=>greenmarch.game.status==='playing')){
   assert(Date.now()<deadline,'A complete tutorial must finish within its browser budget');
   const candidate=await page.evaluate(()=>{
    const g=greenmarch.game;
    if(g.level.id==='fun-02'){const a=g.actors.find(a=>!a.floater&&['walk','fall','float'].includes(a.state));return a?{id:a.id,skill:1}:null}
    const a=g.actors.find(a=>['walk','bash','fall'].includes(a.state));
    return a?.state==='walk'&&a.dir===1&&(g.solid(g.center(a)+3,a.y-4)||g.solid(g.center(a)+1,a.y-5))?{id:a.id,skill:5}:null;
   });
   if(!candidate){await page.waitForTimeout(20);continue}
   await press('#pause');await press('[data-skill="'+candidate.skill+'"]');
   const actor=await page.evaluate(id=>greenmarch.game.actors.find(a=>a.id===id),candidate.id);
   let camera=await page.evaluate(()=>greenmarch.renderer.camera);
   while(actor.x<camera+12||actor.x>camera+148){await press(actor.x<camera+12?'#scroll-left':'#scroll-right');const moved=await page.evaluate(()=>greenmarch.renderer.camera);if(moved===camera)break;camera=moved}
   await page.locator('#game').scrollIntoViewIfNeeded();
   const hit=await page.evaluate(id=>{const a=greenmarch.game.actors.find(a=>a.id===id),b=document.querySelector('#game').getBoundingClientRect();return {x:b.x+(a.x-greenmarch.renderer.camera)/160*b.width,y:b.y+(a.y-5)/greenmarch.game.level.height*b.height}},candidate.id);
   const before=await page.evaluate(()=>greenmarch.game.inputs.length);
   // Set the crosshair while paused so an old target cannot pan the camera
   // between Resume and the new canvas click.
   await page.mouse.move(hit.x,hit.y);
   await press('#pause');if(mobile)await page.touchscreen.tap(hit.x,hit.y);else await page.mouse.click(hit.x,hit.y);
   const inputs=await page.evaluate(()=>greenmarch.game.inputs);
   assert(inputs.length>before,'UI assignment must consume the selected skill: '+JSON.stringify(await page.evaluate(id=>({actor:greenmarch.game.actors.find(a=>a.id===id),camera:greenmarch.renderer.camera,notice:document.querySelector('#notice').textContent}),candidate.id)));assert.equal(inputs.at(-1).skill,candidate.skill);
  }
  const result=await page.evaluate(()=>({id:greenmarch.game.level.id,status:greenmarch.game.status,rescued:greenmarch.game.rescued,total:greenmarch.game.level.lemmings,inputs:greenmarch.game.inputs}));
  assert.equal(result.status,'won');assert.equal(result.rescued,result.total);assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
  await page.screenshot({path:path.join(out,id+'-'+(mobile?'touch':'mouse')+'.png'),fullPage:true});
  console.log('[OK] Complete UI '+id+' '+(mobile?'touch':'mouse')+' '+result.rescued+'/'+result.total);return result;
 }finally{await context.close()}
}
try{const results=await Promise.all([play('fun-02',true),play('fun-05',false)]);await writeFile(path.join(out,'results.json'),JSON.stringify(results,null,2))}finally{await browser.close()}
