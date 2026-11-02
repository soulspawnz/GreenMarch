import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const [pw,executablePath,out,base='http://127.0.0.1:8768/',presentation='classic']=process.argv.slice(2);
const {chromium}=await import(pathToFileURL(pw).href);await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath,headless:true});
const ratings=['Fun','Tricky','Taxing','Mayhem'];
async function checkRating(rating,index){
 const mobile=index%2===1,context=await browser.newContext({viewport:{width:mobile?390:1366,height:mobile?844:1000},hasTouch:mobile,isMobile:mobile}),page=await context.newPage(),errors=[],bad=[],requests=[];
 // Render genuine PCM without depending on a physical output device shared by
 // four headless pages. Production audio still uses the normal device.
 await context.addInitScript(()=>{
  const NativeAudioContext=window.AudioContext;
  if(!('setSinkId' in NativeAudioContext.prototype))throw Error('Silent audio sink is required for headless PCM verification');
  window.AudioContext=class extends NativeAudioContext{constructor(options={}){super({...options,sinkId:{type:'none'}})}};
 });
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)bad.push(r.url())});page.on('request',r=>requests.push(r.url()));
 const press=selector=>mobile?page.locator(selector).tap():page.locator(selector).click();const records=[];
 try{
  await page.goto(base);await page.waitForFunction(()=>window.greenmarch?.ready);
  if(presentation!=='classic'){await page.locator('#presentation').selectOption(presentation);await page.waitForFunction(mode=>greenmarch.ready&&greenmarch.presentation===mode,presentation)}
  await page.locator('#native-rating').selectOption(rating);assert.equal(await page.locator('#native-level option').count(),25);
  const ids=await page.locator('#native-level option').evaluateAll(nodes=>nodes.map(node=>node.value));
  for(const id of ids){
   await page.locator('#native-rating').selectOption(rating);await page.locator('#native-level').selectOption(id);await press('#load-level');
   await page.waitForFunction(id=>greenmarch.ready&&greenmarch.game.level.id===id,id,{timeout:15000});
   assert.equal(await page.locator('iframe').count(),0);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   const before=await page.evaluate(()=>({id:greenmarch.game.level.id,title:greenmarch.game.level.title,skills:[...greenmarch.game.skills],terrain:greenmarch.game.terrain.length,required:greenmarch.game.level.saveCount}));
   // Capture audio at normal speed before short-lived levels can reach a result.
   if(await page.locator('#speed').getAttribute('aria-pressed')==='true')await press('#speed');
   await press('#play');
   const sample=await page.waitForFunction(()=>{const value=greenmarch.audio.measure();return value>.001?value:false},null,{timeout:10000});
   const sid=await sample.jsonValue();await sample.dispose();
   await press('#speed');
   await page.waitForFunction(()=>greenmarch.game.spawned>0&&greenmarch.game.tick>=45,null,{timeout:10000});
   await press('#pause');
   const current=await page.evaluate(()=>({tick:greenmarch.game.tick,spawned:greenmarch.game.spawned,actors:greenmarch.game.actors.map(a=>({state:a.state,x:a.x,y:a.y})),audio:greenmarch.audio.measure(),audioTime:greenmarch.audio.context.currentTime,audioSink:greenmarch.audio.context.sinkId?.type}));
   assert(current.audioTime>0);assert.equal(current.audioSink,'none');
   records.push({...before,...current,sid});
   if(id.endsWith('-01')||id.endsWith('-25')){await page.locator('#game').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,id+(mobile?'-touch':'-desktop')+'.png'),fullPage:true})}
   console.log('[OK] Native '+id+' '+(mobile?'touch':'desktop')+' original layout, inventory and running actors.');
  }
  assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);assert(!requests.some(url=>/\.wasm|\.d64|campaign\.zip|machine\.html|emulatorjs/i.test(url)));
  return {rating,mobile,records,errors,bad,noC64Runtime:true};
 }catch(error){console.log('[DIAGNOSTIC]',rating,JSON.stringify(await page.evaluate(()=>({level:greenmarch.game?.level.id,tick:greenmarch.game?.tick,running:greenmarch.running,context:greenmarch.audio?.context?.state,paused:greenmarch.audio?.paused,stats:greenmarch.audio?.stats,error:greenmarch.audio?.error,visibility:document.visibilityState})).catch(()=>({}))),errors);throw error}finally{await context.close()}
}
try{const results=await Promise.all(ratings.map(checkRating));assert.equal(results.flatMap(result=>result.records).length,100);await writeFile(path.join(out,'results.json'),JSON.stringify({base,presentation,audioVerification:'Rendered PCM through a silent Web Audio sink; not a speaker test',results},null,2));console.log('[OK] Every original level entered native browser gameplay.')}finally{await browser.close()}
