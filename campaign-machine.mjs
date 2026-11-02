const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const ratings=['Fun','Tricky','Taxing','Mayhem'];
export function readOriginalScreen(ram){
 const glyph=n=>n<26?String.fromCharCode(97+n):n<52?String.fromCharCode(65+n-26):n<62?String(n-52):' ';
 return Array.from({length:25},(_,row)=>Array.from(ram.subarray(0x4000+row*40,0x4000+(row+1)*40),glyph).join('')).join('\n');
}
export function inspectOriginal(ram){
 const text=readOriginalScreen(ram),prompt=text.match(/Please insert disk (\d) side ([AB])/);
 if(prompt){const disk=prompt[1]==='1'&&prompt[2]==='A'?0:prompt[1]==='2'&&prompt[2]==='A'?1:prompt[1]==='2'&&prompt[2]==='B'?2:null;return {kind:'disk',disk,prompt:prompt[0]}}
 if(text.includes('All lemmings accounted for')||text.includes('Your time is up'))return {kind:'result'};
 if(!text.includes('Number of Lemmings'))return {kind:'other'};
 const level=text.match(/Level (\d+) +([^\n]+)/),rating=ratings.find(r=>new RegExp('Rating +'+r+'\\b').test(text));
 if(!level||!rating)return {kind:'other'};
 const source=Array.from(ram.subarray(0x5500,0x5b00),n=>String.fromCharCode(n>0&&n<27?n+96:n)).join('');
 const title=source.match(/Level \d+ +([^\xff]+)/)?.[1]?.trim()||level[2].trim();
 const number=Number(level[1]);
 return {kind:'briefing',id:rating.toLowerCase()+'-'+String(number).padStart(2,'0'),rating,number,title,
  lemmings:Number(text.match(/Number of Lemmings +(\d+)/)?.[1]),save:Number(text.match(/(\d+) +To Be Saved/)?.[1]),
  release:Number(text.match(/Release Rate +(\d+)/)?.[1]),minutes:Number(text.match(/Time +(\d+) +Minutes/)?.[1]),nextCode:source.match(/is ([A-Z]{10})/)?.[1]||null};
}
export function createCampaignController(machine,getRAM,getManager,notify){
 let swapping=false,lastSwap='',lastSwapAt=0,lastLevel='',closed=false;
 async function disk(index,automatic=false){if(!Number.isInteger(index)||index<0||index>2)throw Error('Unknown original disk');if(!automatic)lastSwap='';machine.release();getManager().setCurrentDisk(index);notify('disk',{disk:index});await sleep(250)}
 async function poll(){
  if(closed||swapping)return;if(!machine.running){lastSwap='';return}
  const info=inspectOriginal(getRAM());
  if(info.kind==='disk'){
   if(info.disk===null)throw Error('Unrecognised original disk prompt');
   if(info.prompt===lastSwap&&performance.now()-lastSwapAt<5000)return;
   if(info.prompt===lastSwap)throw Error('Original disk did not load; use Insert disk or restart');
   swapping=true;try{lastSwap=info.prompt;lastSwapAt=performance.now();notify('loading',{message:'Changing to '+info.prompt.replace('Please insert ','')});await disk(info.disk,true);machine.pad(0,true);await sleep(140);machine.pad(0,false);await sleep(750)}finally{swapping=false}
  }else{lastSwap='';if(info.kind==='briefing'&&info.id!==lastLevel){lastLevel=info.id;notify('level',{level:info})}}
  return info;
 }
 async function launch(level){
  if(!level||!ratings.includes(level.rating)||!Number.isInteger(level.number)||level.number<1||level.number>25||level.code!==null&&!/^[A-Z]{10}$/.test(level.code))throw Error('Invalid original level');
  machine.release();await disk(0);
  if(level.code){notify('loading',{message:'Opening '+level.rating+' '+level.number});await machine.tapKey('3');for(const key of level.code.toLowerCase())await machine.tapKey(key);await machine.tapKey('RETURN');await sleep(250)}
  await machine.tapKey('1');
  getManager().setFastForwardRatio(8);getManager().toggleFastForward(1);
  const deadline=performance.now()+60000;
  try{while(performance.now()<deadline&&!closed){await poll();const info=inspectOriginal(getRAM());if(info.kind==='briefing'){if(info.id!==level.id)throw Error('Original password selected '+info.id+' instead of '+level.id);await sleep(150);return info}await sleep(250)}}finally{getManager().toggleFastForward(0)}
  throw Error('The original level did not reach its briefing');
 }
 const timer=setInterval(()=>{void poll().catch(error=>{machine.pause();notify('error',{message:error.message})})},1000);
 return {launch,disk,inspect:()=>inspectOriginal(getRAM()),close(){closed=true;clearInterval(timer)}};
}
