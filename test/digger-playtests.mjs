import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';

const [pw,executablePath,out,base='http://127.0.0.1:8768/']=process.argv.slice(2);
const {chromium}=await import(pathToFileURL(pw).href);
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath,headless:true});
const cases=[132,134,136,138,139,142].flatMap((x,i)=>[
 {name:'desktop-'+x,x,input:i===2?'keyboard':i===3?'button':'mouse',width:1366,height:1000},
 {name:'touch-'+x,x,input:'touch',width:i%2?412:390,height:i%2?915:844}
]);
async function play(spec){
 const mobile=spec.input==='touch',context=await browser.newContext({viewport:{width:spec.width,height:spec.height},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:mobile?2:1});
 const page=await context.newPage(),errors=[],bad=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)bad.push(r.url())});
 const press=async selector=>mobile?page.locator(selector).tap():page.locator(selector).click();
 try{
  await page.goto(base);await page.waitForFunction(()=>window.greenmarch?.ready&&!document.querySelector('#train').disabled);
  assert.equal(await page.locator('[data-skill="3"]').isDisabled(),true,'Level one has no Blockers');
  await page.evaluate(()=>{const r=greenmarch.renderer,original=r.ctx.drawImage.bind(r.ctx),lookup=new Map(r.atlas.map((sprite,i)=>[sprite,i]));window.drawnPoses=new Set();r.ctx.drawImage=(...args)=>{const index=lookup.get(args[0]);if(index!==undefined)drawnPoses.add(index);return original(...args)}});
  if(spec.input==='keyboard')await page.keyboard.press('8');else await press('#digger');
  await press('#play');
  await page.waitForFunction(x=>greenmarch.game.actors.some(a=>a.id===0&&a.state==='walk'&&a.x>=x),spec.x,{polling:'raf',timeout:20000});
  await press('#pause');await page.locator('#game').scrollIntoViewIfNeeded();
  const before=await page.evaluate(()=>{const a=greenmarch.game.actors.find(a=>a.id===0),b=document.querySelector('#game').getBoundingClientRect();return {actor:{...a},skills:[...greenmarch.game.skills],x:b.x+(a.x-greenmarch.renderer.camera)/160*b.width,y:b.y+(a.y-5)/168*b.height}});
  assert.equal(before.actor.state,'walk');
  await press('#pause');
  if(mobile)await page.touchscreen.tap(before.x,before.y);
  else if(spec.input==='keyboard'||spec.input==='button'){
   await page.mouse.move(before.x,before.y);
   if(spec.input==='keyboard')await page.keyboard.press('Space');else await press('#assign');
  }else await page.mouse.click(before.x,before.y);
  await page.waitForFunction(()=>greenmarch.game.skills[7]===9,null,{timeout:3000});
  const assigned=await page.evaluate(()=>({actor:{...greenmarch.game.actors[0]},skills:[...greenmarch.game.skills],inputs:[...greenmarch.game.inputs]}));
  assert.equal(assigned.actor.state,'dig');assert.equal(assigned.inputs.length,1);assert.equal(assigned.inputs[0].skill,7);
  assert.deepEqual(assigned.skills.slice(0,7),before.skills.slice(0,7));
  await page.waitForFunction(y=>greenmarch.game.actors[0].y>y&&greenmarch.game.terrain.some((v,i)=>v!==greenmarch.game.original[i]),assigned.actor.y,{timeout:5000});
  await page.waitForFunction(()=>drawnPoses.has(84)&&drawnPoses.has(98),null,{timeout:5000});
  await press('#pause');
  const digging=await page.evaluate(()=>({actor:{...greenmarch.game.actors[0]},removed:greenmarch.game.terrain.reduce((n,v,i)=>n+(v!==greenmarch.game.original[i]?1:0),0),poses:[...drawnPoses].filter(n=>n>=52&&n<=99)}));
  assert(digging.removed>0);assert(digging.actor.y>assigned.actor.y);assert(!digging.poses.some(n=>n>=52&&n<=67),'Digger must not draw Blocker poses');
  await page.locator('#game').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,spec.name+'-digging.png'),fullPage:true});
  await press('#speed');await press('#pause');
  console.log('[OK] '+spec.name+' '+spec.input+' assigned Digger, descended and removed '+digging.removed+' pixels; no Blocker poses.');
  await page.waitForFunction(()=>greenmarch.game.status!=='playing',null,{timeout:120000});
  const result=await page.evaluate(()=>({outcome:greenmarch.game.status,rescued:greenmarch.game.rescued,dead:greenmarch.game.dead,ticks:greenmarch.game.tick,inputs:greenmarch.game.inputs,removed:greenmarch.game.terrain.reduce((n,v,i)=>n+(v!==greenmarch.game.original[i]?1:0),0),poses:[...drawnPoses].filter(n=>n>=52&&n<=99)}));
  assert(['won','lost'].includes(result.outcome));assert.equal(result.inputs.length,1);assert(!result.poses.some(n=>n>=52&&n<=67));assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
  await page.locator('#game').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,spec.name+'-result.png'),fullPage:true});
  console.log('[OK] '+spec.name+' full run: '+result.outcome+', '+result.rescued+'/10 rescued.');
  const record={...spec,assigned,digging,result,errors,bad};await writeFile(path.join(out,spec.name+'.json'),JSON.stringify(record,null,2));return record;
 }finally{await context.close()}
}
try{const records=[];for(let i=0;i<cases.length;i+=4)records.push(...await Promise.all(cases.slice(i,i+4).map(play)));assert.equal(records.length,12);await writeFile(path.join(out,'results.json'),JSON.stringify({base,completed:12,desktop:6,touch:6,records},null,2));console.log('[OK] Twelve complete rendered gameplay runs; Digger logic and animation verified.')}finally{await browser.close()}
