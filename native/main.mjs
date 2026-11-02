import {Game,SKILLS,TICKS_PER_SECOND} from './engine.mjs';
import {Renderer} from './render.mjs';
import {Audio} from './audio.mjs';
import {EnhancedRenderer} from './enhanced-render.mjs';
import {EnhancedAudio} from './enhanced-audio.mjs';
import {loadCatalogue,loadNativeLevel} from './campaign.mjs';
import {ID,blank,verify} from './learning-policy.mjs';

const $=id=>document.getElementById(id),canvas=$('game'),held=new Set();
let catalogue,entries=[],entry,game,renderer,audio,level,terrain,selected=7,running=false,loading=false,hasStarted=false;
let speed=1,cursor=null,last=0,accumulator=0,replay=null,replayAt=0,loadGeneration=0,nukeUntil=0,muted=false,volume=.35;
let db,model=blank(),records=[],archivedRecords=[],archivedModels=[],training=null;
let presentation='classic',actorFrames,sidBytes,switching=false,starting=false;
try{if(localStorage.getItem('greenmarch-presentation')==='enhanced')presentation='enhanced'}catch{}
function modeLabel(){
 $('presentation').value=presentation;document.body.dataset.presentation=presentation;
 $('presentation-copy').textContent=presentation==='enhanced'?'Woodland scenery · new soundtrack & effects':'Original pixels · original SID music';
 $('audio-edition').textContent=presentation==='enhanced'?'STUDIO':'SID 6581';
 canvas.setAttribute('aria-label',presentation==='enhanced'?'Enhanced terrain and lemmings':'Original C64 terrain and lemmings');
 document.querySelector('.curtain-note').textContent=presentation==='enhanced'?'Woodland edition · new artwork, music & effects':'Original C64 graphics & SID music';
 document.querySelector('.intro-note').textContent=presentation==='enhanced'?'A fresh look. A new soundtrack.':'Original graphics. Original SID.';
 document.querySelector('.edition').textContent=presentation==='enhanced'?'WOODLAND / ENHANCED EDITION':'C64 PIXELS / NATIVE BROWSER ENGINE';
}
function makeRenderer(){return new (presentation==='enhanced'?EnhancedRenderer:Renderer)(canvas,level,actorFrames)}
function makeAudio(){return presentation==='enhanced'?new EnhancedAudio():new Audio(sidBytes)}
async function switchPresentation(value){
 if(switching||starting||loading||training||!game||!['classic','enhanced'].includes(value)||value===presentation)return;
 switching=true;const resume=running,camera=renderer.camera,old=presentation;pause();$('presentation').disabled=true;
 try{
  await audio.close();presentation=value;renderer=makeRenderer();renderer.camera=camera;game.changed=true;audio=makeAudio();audio.muted=muted;audio.volume=volume;
  if(resume){await audio.start();running=true;last=performance.now();accumulator=0}
  try{localStorage.setItem('greenmarch-presentation',presentation)}catch{}
  notice((presentation==='enhanced'?'Enhanced':'Classic')+' presentation. Your game is preserved.');
 }catch(error){
  await audio?.close();presentation=old;renderer=makeRenderer();renderer.camera=camera;game.changed=true;audio=makeAudio();audio.muted=muted;audio.volume=volume;notice('Unable to change presentation: '+error.message);
 }finally{switching=false;$('presentation').disabled=false;modeLabel();configure();renderer.draw(game,cursor,selected)}
}
$('presentation').onchange=event=>void switchPresentation(event.target.value);
const progressKey='greenmarch-native-campaign-1';let completed=new Set();
try{completed=new Set(JSON.parse(localStorage.getItem(progressKey)||'[]'))}catch{}
const request=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
const complete=t=>new Promise((resolve,reject)=>{t.oncomplete=resolve;t.onabort=()=>reject(t.error||Error('Storage transaction aborted'));t.onerror=()=>reject(t.error)});
const notice=text=>{$('notice').textContent=text};
const nextEntry=()=>entries[entries.findIndex(item=>item.id===entry?.id)+1];
function configure(){
 if(audio){audio.paused=!running;audio.configure()}
 $('pause').textContent=running?'Pause  P':'Resume  P';
 $('status').textContent=loading?'LOADING':!game?'LOADING':game.status==='playing'?(running?'PLAYING':hasStarted?'PAUSED':'READY'):game.status.toUpperCase();
 for(const id of ['play','pause','restart','speed','release-up','release-down','nuke'])$(id).disabled=!game||loading||!!training||switching||starting;
 $('presentation').disabled=!game||loading||!!training||switching||starting;
 $('load-level').disabled=loading||!!training||!catalogue||switching||starting;
 $('next-level').disabled=loading||!!training||!nextEntry()||switching||starting;
}
function pause(){running=false;held.clear();configure()}
async function play(){
 if(!game||training||loading||switching||starting)return;
 starting=true;configure();
 try{
  await audio.start();if(game.status!=='playing'){game.restart();audio.reset();replay=null}
  hasStarted=true;running=true;$('curtain').style.display='none';last=performance.now();accumulator=0;
 }finally{starting=false;configure()}
}
function overlay(){
 $('overlay-kicker').textContent=entry.rating.toUpperCase()+' · LEVEL '+String(entry.number).padStart(2,'0');
 $('overlay-title').textContent=level.title;
 $('overlay-copy').textContent=`${level.lemmings} lemmings · save ${level.savePercent}% · ${level.minutes} minutes.`;
 $('play').textContent='Play level';$('continue-level').hidden=true;$('curtain').style.display='flex';
}
function restart(){if(!game||loading||training)return;pause();replay=null;game.restart();audio.reset();hasStarted=false;overlay();notice('');hud();renderer.draw(game,cursor,selected)}
function selectSkill(skill){
 if(!game||!game.skills[skill])return;selected=skill;
 $('assign').textContent='Assign '+SKILLS[skill];notice(SKILLS[skill]+' selected. Click or tap a lemming.');hud();
}
function assign(){
 if(!running||replay||!cursor)return;const actor=game.pick(cursor.x,cursor.y,selected);
 if(actor&&game.assign(actor.id,selected)){audio.effect('assign');notice(SKILLS[selected]+' assigned. '+game.skills[selected]+' remaining.');}
 else notice('Choose a suitable lemming for '+SKILLS[selected]+'.');hud();
}
function hud(){
 if(!game)return;
 $('out').textContent=String(game.spawned-game.rescued-game.dead).padStart(2,'0');
 $('saved').textContent=String(Math.round(game.rescued/level.lemmings*100)).padStart(3,'0')+'%';
 const remaining=Math.max(0,level.minutes*60-Math.floor(game.tick/TICKS_PER_SECOND));
 $('time').textContent=Math.floor(remaining/60)+':'+String(remaining%60).padStart(2,'0');
 $('release-rate').textContent=game.releaseRate;
 for(const button of document.querySelectorAll('[data-skill]')){
  const skill=Number(button.dataset.skill);button.querySelector('span').textContent=game.skills[skill];
  button.disabled=!game.skills[skill]||loading||!!training;button.classList.toggle('selected',skill===selected);button.setAttribute('aria-pressed',String(skill===selected));
 }
}
function result(){
 pause();$('overlay-title').textContent=game.status==='won'?'A way home!':'Try again.';
 const timedOut=game.tick>=level.minutes*60*TICKS_PER_SECOND;
 $('overlay-copy').textContent=`${game.rescued} of ${level.lemmings} rescued · ${Math.round(game.rescued/level.lemmings*100)}%. ${timedOut?'Time is up.':'All lemmings accounted for.'}`;
 $('play').textContent='Play again';$('continue-level').hidden=game.status!=='won'||!nextEntry();$('curtain').style.display='flex';
 if(game.status==='won'){
  completed.add(entry.id);try{localStorage.setItem(progressKey,JSON.stringify([...completed]))}catch{}
  updateProgress();
 }
 if(replay)notice('Recorded native inputs reached their saved result.');replay=null;
}
function animate(now){
 requestAnimationFrame(animate);if(!game)return;
 const delta=Math.min(.25,(now-last)/1000);last=now;
 if(running){
  accumulator+=delta*speed;
  while(accumulator>=.1&&running){
   accumulator-=.1;
   if(cursor){
    if(held.has('ArrowLeft'))cursor.x-=2;if(held.has('ArrowRight'))cursor.x+=2;
    if(held.has('ArrowUp'))cursor.y-=2;if(held.has('ArrowDown'))cursor.y+=2;
    cursor.x=Math.max(0,Math.min(level.width-1,cursor.x));cursor.y=Math.max(0,Math.min(level.height-1,cursor.y));
   }
   const actions=[];
   if(replay)while(replayAt<replay.inputs.length&&replay.inputs[replayAt].tick===game.tick)actions.push(replay.inputs[replayAt++]);
   game.step(actions);for(const event of game.events)if(presentation==='enhanced'||['rescue','death'].includes(event))audio.effect(event);
   if(game.status!=='playing')result();
  }
  if(cursor){if(cursor.x<renderer.camera+3)renderer.scroll(-1);else if(cursor.x>renderer.camera+renderer.width-3)renderer.scroll(1)}
 }
 renderer.draw(game,cursor,selected);hud();$('audio-light').classList.toggle('active',running&&!audio.muted&&audio.measure()>.0002);
}
requestAnimationFrame(animate);

function fillLevels(rating,id){
 $('native-level').replaceChildren();
 for(const item of catalogue.ratings.find(item=>item.name===rating).levels){const option=document.createElement('option');option.value=item.id;option.textContent=String(item.number).padStart(2,'0')+' · '+item.title;$('native-level').append(option)}
 if(id)$('native-level').value=id;
}
function updateProgress(){
 $('campaign-progress').textContent=`${entries.filter(item=>completed.has(item.id)).length} of 100 completed in this browser. All levels are available.`;
}
function mission(){
 $('screen-label').textContent=`${entry.rating.toUpperCase()} ${String(entry.number).padStart(2,'0')} / ${level.title.toUpperCase()}`;
 $('mission-kicker').textContent=entry.rating.toUpperCase()+' / LEVEL '+String(entry.number).padStart(2,'0');
 $('level-title').textContent=level.title;$('save-target').textContent=level.savePercent+'%';
 $('level-facts').textContent=`${level.lemmings} lemmings · save ${level.savePercent}% · ${level.minutes} minutes.`;
 const available=level.skills.map((count,i)=>count?SKILLS[i]:null).filter(Boolean);
 $('mission-copy').textContent='Available: '+available.join(', ')+'.';
}
async function loadLevel(id){
 const chosen=entries.find(item=>item.id===id);if(!chosen||training||switching||starting)return;
 const generation=++loadGeneration;pause();loading=true;configure();notice('Loading '+chosen.title+'…');
 try{
  const data=await loadNativeLevel(chosen);if(generation!==loadGeneration)return;
  const retainedAudio=presentation==='enhanced'&&audio instanceof EnhancedAudio?audio:null;
  if(retainedAudio)retainedAudio.reset();else await audio?.close();
  if(generation!==loadGeneration)return;entry=chosen;({level,terrain}=data);actorFrames=data.actors;sidBytes=data.sid;game=new Game(level,terrain);renderer=makeRenderer();
  audio=retainedAudio||makeAudio();audio.muted=muted;audio.volume=volume;cursor=null;replay=null;hasStarted=false;modeLabel();
  selected=level.skills[7]?7:Math.max(0,level.skills.findIndex(count=>count>0));$('assign').textContent='Assign '+SKILLS[selected];
  $('native-rating').value=entry.rating;fillLevels(entry.rating,entry.id);mission();overlay();notice('');updateProgress();
  history.replaceState(null,'','#'+entry.id);renderer.draw(game,cursor,selected);renderHistory();
 }catch(error){notice(error.message);console.error(error)}finally{if(generation===loadGeneration){loading=false;configure();hud()}}
}
function changeLevel(){void loadLevel($('native-level').value)}
$('native-rating').onchange=()=>fillLevels($('native-rating').value);
$('load-level').onclick=changeLevel;
for(const id of ['next-level','continue-level'])$(id).onclick=()=>{const next=nextEntry();if(next)void loadLevel(next.id)};

$('play').onclick=()=>void play().catch(error=>notice('Unable to start audio: '+error.message));
$('pause').onclick=()=>running?pause():void play().catch(error=>notice(error.message));$('restart').onclick=restart;
$('speed').onclick=()=>{speed=speed===1?4:1;$('speed').textContent='Speed ×'+speed;$('speed').setAttribute('aria-pressed',String(speed!==1))};
$('sound').onclick=()=>{muted=!muted;if(audio){audio.muted=muted;audio.configure()}$('sound').textContent=muted?'Sound off':'Sound on';$('sound').setAttribute('aria-pressed',String(!muted))};
$('volume').oninput=event=>{volume=Number(event.target.value)/100;if(audio){audio.volume=volume;audio.configure()}};
for(const button of document.querySelectorAll('[data-skill]'))button.onclick=()=>selectSkill(Number(button.dataset.skill));
$('assign').onclick=assign;canvas.onpointermove=event=>{if(renderer)cursor=renderer.point(event)};
canvas.onpointerdown=event=>{if(!renderer)return;event.preventDefault();canvas.focus();cursor=renderer.point(event);assign()};
$('scroll-left').onclick=()=>renderer?.scroll(-16);$('scroll-right').onclick=()=>renderer?.scroll(16);
for(const [id,delta]of [['release-down',-5],['release-up',5]])$(id).onclick=()=>{if(game&&!replay)game.changeRelease(game.releaseRate+delta);hud()};
function nuke(){if(!running||replay)return;if(performance.now()<nukeUntil){game.nuke();nukeUntil=0;notice('Nuke started. Restart to try another route.')}else{nukeUntil=performance.now()+2500;notice('Tap Nuke again to end this attempt.')}}
$('nuke').onclick=nuke;
async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await $('native-stage').requestFullscreen()}catch{notice('Fullscreen is unavailable in this browser.')}}
$('fullscreen').onclick=()=>void fullscreen();
window.addEventListener('keydown',event=>{
 if(event.target.matches('input,select,textarea')||event.ctrlKey||event.metaKey||event.altKey||!game)return;
 if(/^Digit[1-8]$/.test(event.code)){event.preventDefault();selectSkill(Number(event.code.slice(-1))-1)}
 else if(event.code==='KeyF'){event.preventDefault();void fullscreen()}
 else if(event.code==='KeyP'){event.preventDefault();running?pause():void play().catch(error=>notice(error.message))}
 else if(event.code==='KeyN'){event.preventDefault();if(!event.repeat)nuke()}
 else if(event.code==='Space'){event.preventDefault();if(!event.repeat)assign()}
 else if(event.code.startsWith('Arrow')){event.preventDefault();if(!cursor)cursor={x:renderer.camera+40,y:80};held.add(event.code)}
});
window.addEventListener('keyup',event=>held.delete(event.code));window.addEventListener('blur',()=>held.clear());
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});

async function refreshHistory(){
 if(!db)return;const transaction=db.transaction(['model','attempts']),end=complete(transaction);
 const [current,all,models]=await Promise.all([request(transaction.objectStore('model').get(ID)),request(transaction.objectStore('attempts').getAll()),request(transaction.objectStore('model').getAll())]);
 await end;model=current||blank();records=all.filter(record=>record.version===ID);archivedRecords=all.filter(record=>record.version!==ID);archivedModels=models.filter(item=>item.version!==ID);
 records.sort((a,b)=>a.date-b.date);renderHistory();
}
function renderHistory(){
 const busy=!!training,supported=level?.id==='fun-01';
 $('train').disabled=busy||!db||!supported;$('stop-training').disabled=!busy;$('replay-best').disabled=busy||!model.champion;
 $('training-summary').textContent=`${records.length} completed attempts · ${records.filter(record=>record.outcome==='won').length} wins · best ${Math.max(0,...records.map(record=>record.rescued))*10}% rescued`;
 const archive=$('archive-notice');if(archive){archive.hidden=!archivedRecords.length;archive.textContent=`${archivedRecords.length} earlier attempts are preserved. Export experience includes them. Training uses the updated game movement.`}
 if(!busy&&!supported)$('training-status').textContent='Adaptive training currently supports Fun 1. Other levels support manual play.';
 else if(!busy&&db)$('training-status').textContent='Ready. Native training preserves your manual game.';
 $('native-history').replaceChildren();
 for(const [i,record]of records.slice(-100).reverse().entries()){
  const row=document.createElement('tr');for(const value of [String(records.length-i),record.pattern,record.outcome,String(record.rescued*10)+'%',String(record.ticks)]){const cell=document.createElement('td');cell.textContent=value;row.append(cell)}
  const cell=document.createElement('td'),button=document.createElement('button');button.textContent='Replay';button.disabled=busy;button.onclick=()=>void playback(record);cell.append(button);row.append(cell);$('native-history').append(row);
 }
}
async function saveAttempt(record,next){const transaction=db.transaction(['model','attempts'],'readwrite'),end=complete(transaction);transaction.objectStore('attempts').add(record);transaction.objectStore('model').put(next,ID);await end}
function stopTraining(){if(!training)return;training.cancelled=true;training.worker?.terminate();training.reject?.(new DOMException('Stopped','AbortError'));$('training-status').textContent='Stopping…'}
async function train(){
 if(training||loading||switching||starting||!db||level.id!=='fun-01')return;
 if(records.length+archivedRecords.length+Number($('training-count').value)>2000){$('training-status').textContent='Archive limit reached. Export your experience.';return}
 pause();const owner={id:crypto.randomUUID(),cancelled:false},attempts=Number($('training-count').value);let failure=null;training=owner;configure();renderHistory();
 try{
  for(let i=0;i<attempts;i++){
   if(owner.cancelled)break;$('training-status').textContent=`Training attempt ${i+1}…`;
   const message=await new Promise((resolve,reject)=>{
    owner.reject=reject;const worker=new Worker(new URL('./learning-worker.mjs',import.meta.url),{type:'module'});owner.worker=worker;
    worker.onmessage=({data})=>{worker.terminate();if(data.job!==owner.id)return reject(Error('Obsolete native result'));if(data.error)reject(Error(data.error));else resolve(data)};
    worker.onerror=()=>{worker.terminate();reject(Error('Native training worker failed'))};worker.postMessage({op:'attempt',job:owner.id,level,terrain,model});
   });
   if(owner.cancelled)break;
   const record={...message.record,id:crypto.randomUUID(),date:Date.now(),version:ID};
   if(message.model.champion&&!message.model.champion.id)message.model.champion.id=record.id;
   await saveAttempt(record,message.model);await refreshHistory();await new Promise(resolve=>setTimeout(resolve,25));
  }
 }catch(error){if(error.name!=='AbortError')failure=error.message}
 finally{
  owner.worker?.terminate();if(training===owner)training=null;await refreshHistory();configure();hud();
  $('training-status').textContent=failure|| (owner.cancelled?'Stopped. Completed attempts remain saved.':'Training complete. Replay best uses the actual recorded tick inputs.');
 }
}
async function playback(record){
 if(training)return;if(level?.id!=='fun-01')await loadLevel('fun-01');
 if(!verify(level,terrain,record)){notice('That recording failed native replay verification.');return}
 restart();replay=record;replayAt=0;await play();notice('Replaying saved native tick inputs.');
}
$('train').onclick=()=>void train();$('stop-training').onclick=stopTraining;$('replay-best').onclick=()=>{if(model.champion)void playback(model.champion)};
$('export-training').onclick=()=>{
 const url=URL.createObjectURL(new Blob([JSON.stringify({version:ID,model,records,archive:{records:archivedRecords,models:archivedModels}},null,2)],{type:'application/json'})),link=document.createElement('a');
 link.href=url;link.download='greenmarch-native-experience.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
window.addEventListener('pagehide',()=>{stopTraining();audio?.close();db?.close()});
window.greenmarch={get ready(){return !!game&&!loading&&!switching},get presentation(){return presentation},get game(){return game},get running(){return running},get audio(){return audio},get renderer(){return renderer},get learning(){return {model,records,busy:!!training}},get campaign(){return {entry,entries,completed:[...completed]}},pause,play,restart};

try{
 catalogue=await loadCatalogue();entries=catalogue.ratings.flatMap(rating=>rating.levels);
 for(const rating of catalogue.ratings){const option=document.createElement('option');option.value=rating.name;option.textContent=rating.name;$('native-rating').append(option)}
 $('native-rating').disabled=false;$('native-level').disabled=false;
 const requested=location.hash.slice(1),initial=entries.some(item=>item.id===requested)?requested:'fun-01';await loadLevel(initial);
 try{
  const opening=indexedDB.open('greenmarch-native-adaptive-1',1);opening.onupgradeneeded=()=>{opening.result.createObjectStore('model');opening.result.createObjectStore('attempts',{keyPath:'id'})};
  db=await request(opening);await refreshHistory();
 }catch(error){$('training-status').textContent='Local learning is unavailable: '+error.message}
}catch(error){notice(error.message);$('status').textContent='Unable to load';console.error(error)}
