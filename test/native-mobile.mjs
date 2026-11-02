import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';

const [pw,executablePath,out,base='https://soulspawnz.github.io/GreenMarch/',presentation='classic']=process.argv.slice(2);
const {chromium}=await import(pathToFileURL(pw).href);
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath,headless:true});
async function exercise(name,width,height,deviceScaleFactor){
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor,isMobile:true,hasTouch:true});
 const page=await context.newPage(),errors=[],bad=[],events=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)bad.push(r.url())});
 try {
  await page.goto(base);
  await page.waitForFunction(()=>window.greenmarch?.ready&&!document.querySelector('#train').disabled);
  if(presentation!=='classic'){await page.locator('#presentation').selectOption(presentation);await page.waitForFunction(mode=>greenmarch.ready&&greenmarch.presentation===mode,presentation)}
  assert(await page.evaluate(()=>navigator.maxTouchPoints>0));
  await page.evaluate(()=>document.querySelector('#game').addEventListener('pointerdown',e=>{(window.mobilePointers??=[]).push(e.pointerType)}));
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('#scroll-right').tap();assert.equal(await page.evaluate(()=>greenmarch.renderer.camera),112);
  await page.locator('#scroll-left').tap();assert.equal(await page.evaluate(()=>greenmarch.renderer.camera),96);
  await page.locator('#digger').tap();
  await page.locator('#play').tap();
  await page.waitForFunction(()=>greenmarch.game.actors.some(a=>a.id===0&&a.state==='walk'&&a.x>=139),null,{polling:'raf',timeout:15000});
  await page.locator('#pause').tap();
  const frozen=await page.evaluate(()=>greenmarch.game.tick);
  await page.waitForTimeout(350);assert.equal(await page.evaluate(()=>greenmarch.game.tick),frozen);
  await page.locator('#game').scrollIntoViewIfNeeded();
  const before=await page.evaluate(()=>{const a=greenmarch.game.actors.find(a=>a.id===0),b=document.querySelector('#game').getBoundingClientRect();return {actor:a,x:b.x+(a.x-greenmarch.renderer.camera)/160*b.width,y:b.y+(a.y-5)/greenmarch.game.level.height*b.height}});
  assert(before.actor.x<=142,'Touch assignment must remain within a winning placement');
  await page.locator('#pause').tap();
  await page.touchscreen.tap(before.x,before.y);
  await page.waitForFunction(()=>greenmarch.game.skills[7]===9,null,{timeout:2000});
  assert.deepEqual(await page.evaluate(()=>window.mobilePointers),['touch']);
  await page.waitForFunction(()=>greenmarch.audio.measure()>.001,null,{timeout:15000});
  const sid=await page.evaluate(()=>greenmarch.audio.measure());
  await page.waitForFunction(()=>greenmarch.game.terrain.some((v,i)=>v!==greenmarch.game.original[i]));
  await page.screenshot({path:path.join(out,name+'-digging.png'),fullPage:true});
  await page.locator('#sound').tap();await page.waitForTimeout(300);assert(await page.evaluate(()=>greenmarch.audio.measure())<.0001);
  await page.locator('#sound').tap();await page.waitForFunction(()=>greenmarch.audio.measure()>.001);
  await page.locator('#pause').tap();const rotationTick=await page.evaluate(()=>greenmarch.game.tick);
  await page.setViewportSize({width:height,height:width});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.equal(await page.evaluate(()=>greenmarch.game.tick),rotationTick,'Rotation must preserve the paused game');
  await page.screenshot({path:path.join(out,name+'-landscape.png'),fullPage:true});
  await page.setViewportSize({width,height});
  await page.locator('#speed').tap();await page.locator('#pause').tap();
  console.log('[OK] '+name+' genuine touch assignment, terrain destruction, audio, mute, pause and rotation.');
  await page.waitForFunction(()=>greenmarch.game.status!=='playing',null,{timeout:100000});
  const result=await page.evaluate(()=>({status:greenmarch.game.status,rescued:greenmarch.game.rescued,dead:greenmarch.game.dead,tick:greenmarch.game.tick,inputs:greenmarch.game.inputs}));
  assert.equal(result.status,'won');assert(result.rescued>=8);
  await page.locator('#game').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(out,name+'-completed.png'),fullPage:true});
  await page.locator('#play').tap();await page.waitForFunction(()=>greenmarch.running&&greenmarch.game.tick<50);
  assert.equal(await page.evaluate(()=>greenmarch.game.skills[7]),10);
  assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
  console.log('[OK] '+name+' manual touch run won: '+result.rescued+'/10; restart passed.');
  return {name,viewport:{width,height},deviceScaleFactor,sid,result,errors,bad};
 }finally{await context.close()}
}
try {
 const results=await Promise.all([exercise('phone-390',390,844,3),exercise('phone-412',412,915,2.625)]);
 await writeFile(path.join(out,'results.json'),JSON.stringify({base,engine:'Chromium mobile touch emulation; not physical hardware or Safari',results},null,2));
 console.log('[OK] Both mobile touch profiles completed native gameplay.');
}finally{await browser.close()}
