const $=selector=>document.querySelector(selector),frame=$('#machine');
let ready=false,playing=false,sound=true,current='play',instance=0;
let loadResolve=null,loadReject=null,loadTimer=null,catalog=[],activeLevel='fun-01';
const held=new Map(),core=()=>frame.contentWindow.machine;
const gameplay=()=>current==='play'||current==='campaign';
function controls(){
 $('#play').disabled=!ready;$('#pause').disabled=!ready;$('#restart').disabled=!ready;
 for(const id of ['rating','level-select','load-level'])$('#'+id).disabled=!ready||!catalog.length;
 $('#next-level').disabled=!ready||!catalog.length||catalog.findIndex(l=>l.id===activeLevel)===catalog.length-1;
 $('#insert-disk').disabled=!ready;
}
function displayRunning(value){playing=value;$('#status').textContent=value?'PLAYING':'PAUSED';$('#pause').textContent=value?'Pause  P':'Resume  P'}
function release(){held.clear();try{core()?.release()}catch{}}
async function resume(){if(!ready)return;await core().resume();displayRunning(true)}
function pause(){if(!ready)return;core().pause();displayRunning(false)}
function failure(error){release();$('#status').textContent='Unable to load';$('#campaign-note').textContent=error.message;clearTimeout(loadTimer);loadReject?.(error);loadResolve=loadReject=null}
function fillLevels(rating,id){
 const select=$('#level-select');select.replaceChildren();
 for(const level of catalog.filter(l=>l.rating===rating)){const option=document.createElement('option');option.value=level.id;option.textContent=String(level.number).padStart(2,'0')+(level.title?' · '+level.title:'');select.append(option)}
 if(id)select.value=id;
}
function showLevel(info){
 const level=catalog.find(l=>l.id===info.id);if(!level)return;
 activeLevel=info.id;level.title=info.title;$('#rating').value=info.rating;fillLevels(info.rating,info.id);
 $('#screen-label').textContent=info.rating.toUpperCase()+' '+String(info.number).padStart(2,'0')+' / '+info.title.toUpperCase();
 $('#level-title').textContent=info.title;$('#save-target').textContent=info.save+'%';$('#time-target').textContent=info.minutes+':00';
 $('#campaign-note').textContent=info.rating+' '+info.number+' · '+info.lemmings+' lemmings · Release rate '+info.release+'. Space or Assign skill starts the original level.';
 $('.mission .hint').textContent=info.id==='fun-01'?'Dig a route to the lower path. A second digger can free anyone trapped in the right-hand hollow.':'Choose skills from the original inventory and guide the lemmings to the exit.';
 $('.mission .eyebrow').textContent=info.rating.toUpperCase()+' / LEVEL '+String(info.number).padStart(2,'0');
 const firstStep=$('.mission li');firstStep.replaceChildren();
 if(info.id==='fun-01'){firstStep.append('Select Digger with 8.')}else firstStep.append('Choose a skill with keys 1–8.');
 document.querySelector('[data-skill="8"]').classList.toggle('recommended',info.id==='fun-01');
 controls();
}
async function screen(name,levelId){
 if(!ready)return;
 pause();release();ready=false;current=levelId?'campaign':name;controls();
 $('#curtain').style.display='none';$('#status').textContent='LOADING';
 $('#screen-label').textContent=levelId?'LOADING ORIGINAL LEVEL':({'play':'FUN 01 / JUST DIG!','level-one':'LEVEL-ONE BRIEFING','title':'ORIGINAL TITLE / MAIN MENU','manual-code':'ORIGINAL MANUAL-CODE SCREEN','success':'ORIGINAL LEVEL-COMPLETE SCREEN','failure':'ORIGINAL TRY-AGAIN SCREEN','boot':'ORIGINAL BOOT / LOADING'})[name]||'ORIGINAL SCREENS';
 document.querySelectorAll('[data-skill]').forEach(button=>button.classList.remove('selected'));
 instance++;
 const result=new Promise((resolve,reject)=>{loadResolve=resolve;loadReject=reject;loadTimer=setTimeout(()=>failure(new Error('Original level loading timed out. Reload to try again.')),90000)});
 const params=new URLSearchParams({instance:String(instance)});
 if(levelId)params.set('level',levelId);else if(name==='boot')params.set('mode','boot');else{params.set('screen',name);params.set('autoplay','1')}
 frame.src='machine.html?'+params;
 return result;
}
async function loadLevel(id){if(!catalog.some(l=>l.id===id))throw Error('Unknown level');return screen('campaign',id)}
window.addEventListener('message',async event=>{
 if(event.origin!==location.origin||event.source!==frame.contentWindow||event.data?.source!=='lemmings-c64'||event.data.instance!==String(instance))return;
 const message=event.data;
 if(message.type==='ready'){
  ready=true;clearTimeout(loadTimer);$('#play').textContent='Play level one';
  core().setSound(sound);core().setVolume(+$('#volume').value/100);
  $('#status').textContent=message.running?'PLAYING':'READY';
  if(message.mode==='campaign'){current='campaign';showLevel(message.level)}
  if(message.running){await resume();if(message.mode==='boot')current='boot'}
  controls();loadResolve?.();loadResolve=loadReject=null;
 }else if(message.type==='error'){failure(new Error(message.message));console.error(message.message)}
 else if(message.type==='loading'){$('#status').textContent='LOADING';$('#campaign-note').textContent=message.message}
 else if(message.type==='disk'){$('#disk-select').value=String(message.disk)}
 else if(message.type==='level'){showLevel(message.level);if(ready&&current!=='play')current='campaign'}
});
$('#play').onclick=async()=>{if(!ready)return;$('#curtain').style.display='none';await resume()};
$('#pause').onclick=()=>playing?pause():resume();
$('#restart').onclick=()=>{void (activeLevel==='fun-01'?screen('play'):loadLevel(activeLevel)).catch(failure)};
$('#sound').onclick=()=>{sound=!sound;core()?.setSound(sound);$('#sound').textContent=sound?'Sound on':'Sound off';$('#sound').setAttribute('aria-pressed',String(sound))};
$('#volume').oninput=event=>core()?.setVolume(+event.target.value/100);
$('#rating').onchange=()=>fillLevels($('#rating').value);
$('#load-level').onclick=()=>{void loadLevel($('#level-select').value).catch(failure)};
$('#next-level').onclick=()=>{const next=catalog[catalog.findIndex(l=>l.id===activeLevel)+1];if(next)void loadLevel(next.id).catch(failure)};
$('#insert-disk').onclick=async()=>{try{if(ready)await core().disk(Number($('#disk-select').value))}catch(error){failure(error)}};
document.querySelectorAll('[data-skill]').forEach(button=>button.onclick=()=>{if(!ready||!playing)return;core().skill(+button.dataset.skill);document.querySelectorAll('[data-skill]').forEach(other=>other.classList.toggle('selected',other===button))});
document.querySelectorAll('[data-screen]').forEach(button=>button.onclick=()=>{void screen(button.dataset.screen).catch(failure)});
document.querySelectorAll('[data-key]').forEach(button=>button.onclick=async()=>{if(!ready)return;if(!playing)await resume();core().tapKey(button.dataset.key)});
document.querySelectorAll('[data-pad]').forEach(button=>{button.onpointerdown=event=>{if(!ready||!playing)return;event.preventDefault();button.setPointerCapture(event.pointerId);core().pad(+button.dataset.pad,true)};for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,()=>core()?.pad(+button.dataset.pad,false))});
const pads={ArrowUp:4,ArrowDown:5,ArrowLeft:6,ArrowRight:7,Space:0};
window.addEventListener('keydown',event=>{
 if(event.target.matches('input,textarea,select')||event.ctrlKey||event.metaKey||event.altKey)return;
 if(ready&&playing&&!gameplay()){
  let key=/^[a-z0-9]$/i.test(event.key)?event.key.toLowerCase():({Enter:'RETURN',ArrowUp:'UP',ArrowDown:'DOWN',Escape:'ESCAPE',Backspace:'BACKSPACE'})[event.code];
  if(key){event.preventDefault();if(!event.repeat)core().tapKey(key);return}
 }
 if(event.code==='KeyF'){event.preventDefault();void toggleFullscreen();return}
 if(event.code==='KeyP'){event.preventDefault();playing?pause():resume();return}
 if(!ready||!playing||event.repeat)return;
 if(event.code in pads){event.preventDefault();if(event.code==='Space'&&current==='boot')core().tapKey('SPACE');held.set(event.code,pads[event.code]);core().pad(pads[event.code],true)}
 else if(/^Digit[1-8]$/.test(event.code)){event.preventDefault();document.querySelector('[data-skill="'+event.code.slice(-1)+'"]').click()}
 else {const key=({Enter:'RETURN',Escape:'ESCAPE',Backspace:'BACKSPACE',Minus:'MINUS',Equal:'EQUALS'})[event.code];if(key){event.preventDefault();core().tapKey(key)}}
});
window.addEventListener('keyup',event=>{if(held.has(event.code)){event.preventDefault();core()?.pad(held.get(event.code),false);held.delete(event.code)}});
const pointer=document.createElement('div');pointer.id='pointer-layer';pointer.style.cssText='position:absolute;inset:0;cursor:crosshair;touch-action:none';$('#stage').insertBefore(pointer,$('#curtain'));
function pointerCoordinates(event){const box=frame.getBoundingClientRect();return {x:((event.clientX-box.left)/box.width*384-100)/2,y:(event.clientY-box.top)/box.height*272-32}}
pointer.onpointermove=event=>{if(!ready||!playing||!gameplay())return;const point=pointerCoordinates(event);if(point.x>=4&&point.x<=83&&point.y>=17&&point.y<=167)core().movePointer(point.x,point.y)};
pointer.onpointerdown=async event=>{if(!ready||!playing)return;event.preventDefault();if(gameplay()&&core().inspect().kind==='other'){const point=pointerCoordinates(event);if(point.x<4||point.x>83||point.y<17||point.y>167)return;await core().movePointer(point.x,point.y)}core().pad(0,true);setTimeout(()=>core()?.pad(0,false),130)};
pointer.onpointerleave=()=>{if(!held.size)core()?.release()};
window.addEventListener('blur',release);document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing)pause()});
async function toggleFullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await $('#stage').requestFullscreen()}catch{}}
$('#fullscreen').onclick=toggleFullscreen;
setInterval(()=>{if(!ready)return;const audio=core().audio();$('#audio-light').classList.toggle('active',sound&&playing&&audio.ac>.0002)},200);
window.lemmings={get ready(){return ready},get playing(){return playing},get current(){return current},get activeLevel(){return activeLevel},screen,loadLevel,pause,resume,core};
try{const response=await fetch('media/campaign.json');if(!response.ok)throw Error('Campaign catalogue unavailable');const data=await response.json();catalog=data.ratings.flatMap(r=>r.levels);for(const rating of data.ratings){const option=document.createElement('option');option.value=rating.name;option.textContent=rating.name;$('#rating').append(option)}fillLevels('Fun','fun-01');controls()}catch(error){$('#campaign-note').textContent=error.message}
