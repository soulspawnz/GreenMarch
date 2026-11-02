import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Game} from '../native/engine.mjs';

// Feedback policies use ordinary skills and terrain observations. No state edits.
const results=[];
for(let number=1;number<=7;number++){
 const id='fun-'+String(number).padStart(2,'0');
 const url=new URL(number===1?'../native/assets/level.json':'../native/assets/levels/'+id+'.json',import.meta.url);
 const level=JSON.parse(await readFile(url)),game=new Game(level,new Uint8Array(await readFile(new URL(level.files[0].path,url))));
 let assigned=false,opened=false;const tried=new Set();
 while(game.status==='playing'){
  if(number===1&&!assigned){const a=game.actors.find(a=>a.state==='walk'&&a.x===136&&a.dir===1);if(a)assigned=game.assign(a.id,7)}
  if(number===2)for(const a of game.actors)if(!a.floater)game.assign(a.id,1);
  if(number===3)for(const a of game.actors)if(a.state==='walk'){
   const x=game.center(a)+a.dir*8;let y=a.y;while(y<level.height&&!game.solid(x,y))y++;
   if(y>=level.height||y-a.y>60)game.assign(a.id,3);
  }
  if(number===4){
   for(const a of game.actors)if(!a.climber)game.assign(a.id,0);
   if(!assigned){const a=game.actors.find(a=>a.state==='walk'&&a.x===128&&a.dir===1&&a.y>=60&&a.y<85);if(a)assigned=game.assign(a.id,6)}
  }
  if(number===5){const a=game.actors.find(a=>['walk','bash','fall'].includes(a.state));if(a?.state==='walk'&&a.dir===1&&(game.solid(game.center(a)+3,a.y-4)||game.solid(game.center(a)+1,a.y-5)))game.assign(a.id,5)}
  if(number===6&&!game.actors.some(a=>a.bomb>0))for(const a of game.actors){
   if(a.state!=='walk'||a.dir!==1)continue;
   const bridge=!opened&&a.x===114&&a.y<80,wall=opened&&a.y>=90&&game.solid(game.center(a)+2,a.y-5);
   if((bridge||wall)&&game.skills[2]&&game.assign(a.id,3)){assert(game.assign(a.id,2));opened=true;break}
  }
  if(number===7){
   const a=game.actors.find(a=>!['gone','exit','splat'].includes(a.state));
   if(a&&a.dir===1&&['walk','shrug'].includes(a.state)){
    let needed=false;
    if(a.state==='shrug'){let down=0;while(down<=4&&!game.solid(game.center(a)+4,a.y+down))down++;needed=down>4}
    else for(let d=4;d<=32;d++){let y=a.y-20;while(y<a.y+20&&!game.solid(game.center(a)+d,y))y++;const rise=a.y-y;if(rise>4&&d<=rise*2||d<=5&&y-a.y>8){needed=true;break}}
    const key=a.id+':'+a.x+':'+a.y;if(needed&&!tried.has(key)&&game.assign(a.id,4))tried.add(key);
   }
  }
  game.step();
 }
 assert.equal(game.status,'won',id+' must meet its original rescue count');
 assert(game.rescued>=level.saveCount);assert(game.inputs.length>0);
 const replay=new Game(level,game.original);let at=0;
 while(replay.status==='playing'){const actions=[];while(at<game.inputs.length&&game.inputs[at].tick===replay.tick)actions.push(game.inputs[at++]);replay.step(actions)}
 assert.equal(replay.rescued,game.rescued);assert.equal(replay.status,'won');
 results.push({id,rescued:game.rescued,total:level.lemmings,skills:[...new Set(game.inputs.map(a=>a.skill))]});
}
assert.equal(new Set(results.flatMap(r=>r.skills)).size,8);
console.log('[OK] Seven native tutorial solutions and deterministic input replays: '+JSON.stringify(results));
