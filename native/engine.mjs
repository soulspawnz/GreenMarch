// Deterministic native gameplay. Terrain and actors are owned by this engine.
export const TICKS_PER_SECOND=10;
export const SKILLS=['Climber','Floater','Bomber','Blocker','Builder','Basher','Miner','Digger'];
const ACTIVE=new Set(['walk','fall','float','climb','hoist','block','build','bash','mine','dig','shrug']);
const GROUND=new Set(['walk','block','build','bash','mine','dig','shrug']);

export class Game {
 constructor(level,terrain){
  if(!/^(fun|tricky|taxing|mayhem)-\d{2}$/.test(level.id)||terrain.length!==level.width*level.height)throw Error('Unsupported native level');
  this.level=level;this.original=new Uint8Array(terrain);this.restart();
 }
 restart(){
  this.terrain=new Uint8Array(this.original);this.actors=[];this.tick=0;this.spawned=0;this.rescued=0;this.dead=0;
  this.skills=[...this.level.skills];this.release=0;this.releaseRate=this.level.releaseRate;this.entranceClosed=false;
  this.status='playing';this.endedEarly=false;this.events=[];this.inputs=[];this.changed=true;
 }
 solid(x,y){x=Math.floor(x);y=Math.floor(y);if(y<0)return false;if(x<0||x>=this.level.width)return true;if(y>=this.level.height)return false;return this.terrain[y*this.level.width+x]!==0}
 supported(a,y=a.y){return this.level.physicsVersion===2?(this.solid(a.x-2,y)||this.solid(a.x-2+a.dir,y)):this.solid(a.x,y)}
 center(a){return a.x-(this.level.physicsVersion===2?2:0)}
 attribute(x,y){
  y-=this.level.attributeOffsetY||0;
  const map=this.level.attributes;if(!map||x<0||y<0||x>=this.level.width||y>=160)return 0;
  const column=Math.floor(x/4),index=Math.floor(y/8)*20+Math.floor(column/4);
  return (map[index]>>(6-(column%4)*2))&3;
 }
 protected(x,y,dir=0){const value=this.attribute(x,y);return value===1||this.level.attributeMode==='oneway'&&dir!==0&&value===(dir>0?2:3)}
 setPixel(x,y,value){
  x=Math.floor(x);y=Math.floor(y);if(x<0||y<0||x>=this.level.width||y>=this.level.height)return false;
  const i=y*this.level.width+x;if(this.terrain[i]===value)return false;this.terrain[i]=value;this.changed=true;return true;
 }
 clearRow(center,y){let count=0;for(let x=center-4;x<=center+4;x++)if(!this.protected(x,y)&&this.setPixel(x,y,0))count++;return count}
 cutRectangle(x0,y0,x1,y1,dir=0){
  let removed=0,blocked=false;
  for(let y=Math.floor(y0);y<=y1;y++)for(let x=Math.floor(x0);x<=x1;x++){
   if(!this.solid(x,y))continue;
   if(this.protected(x,y,dir)){blocked=true;continue}
   if(this.setPixel(x,y,0))removed++;
  }
  return {removed,blocked};
 }
 canAssign(id,skill=7){
  if(this.status!=='playing'||!Number.isInteger(skill)||skill<0||skill>7||!this.skills[skill])return false;
  const actor=this.actors.find(a=>a.id===id);if(!actor||!ACTIVE.has(actor.state))return false;
  if(skill===0)return !actor.climber;
  if(skill===1)return !actor.floater;
  if(skill===2)return !(actor.bomb>0);
  if(!GROUND.has(actor.state)||!this.supported(actor))return false;
  const state=['','','','block','build','bash','mine','dig'][skill];return actor.state!==state||state==='build';
 }
 assign(id,skill=7){
  if(!this.canAssign(id,skill))return false;const actor=this.actors.find(a=>a.id===id);
  if(skill===0){if(actor.climber)return false;actor.climber=true}
  else if(skill===1){if(actor.floater)return false;actor.floater=true}
  else if(skill===2){if(actor.bomb>0)return false;actor.bomb=5*TICKS_PER_SECOND}
  else{
   if(!GROUND.has(actor.state)||!this.supported(actor))return false;
   const state=['','','','block','build','bash','mine','dig'][skill];
   if(actor.state===state&&state!=='build')return false;
   actor.state=state;actor.phase=0;
   actor.steps=0;actor.empty=0;
  }
  this.skills[skill]--;this.inputs.push({tick:this.tick,id,skill});this.events.push('assign');return true;
 }
 pick(x,y,skill){
  let best=null,distance=Infinity;
  for(const a of this.actors){if(!ACTIVE.has(a.state)||skill!==undefined&&!this.canAssign(a.id,skill))continue;const d=Math.abs(a.x-x)*2+Math.abs(a.y-5-y);
   if(Math.abs(a.x-x)<=5&&y>=a.y-14&&y<=a.y+3&&d<distance){best=a;distance=d}}
  return best;
 }
 kill(a,state='splat'){
  if(!ACTIVE.has(a.state))return;a.state=state;a.phase=0;this.dead++;this.events.push('death');
 }
 explode(a){
  for(let y=a.y-22;y<=a.y+8;y++)for(let x=a.x-9;x<=a.x+9;x++){
   if(((x-a.x)/9)**2+((y-(a.y-7))/16)**2<=1&&!this.protected(x,y))this.setPixel(x,y,0);
  }
  this.kill(a,'explode');this.events.push('explosion');
 }
 nuke(){
  if(this.status!=='playing')return;this.entranceClosed=true;let delay=0;
  for(const actor of this.actors)if(ACTIVE.has(actor.state)&&!actor.bomb){actor.bomb=50+delay;delay+=3}
  this.inputs.push({tick:this.tick,command:'nuke'});
 }
 changeRelease(value){
  if(this.status!=='playing')return;this.releaseRate=Math.max(this.level.releaseRate,Math.min(99,Math.round(value)));
  this.inputs.push({tick:this.tick,command:'release',value:this.releaseRate});
 }
 blockerAhead(a){return this.actors.some(b=>b.id!==a.id&&b.state==='block'&&Math.abs(a.y-b.y)<=6&&(b.x-a.x)*a.dir>0&&(b.x-a.x)*a.dir<=5)}
 startFall(a){a.state='fall';a.fallTicks=0;a.phase=0}
 walk(a){
  if(this.level.physicsVersion===2){
   if(this.blockerAhead(a)){a.dir=-a.dir;return}
   const near=a.x-2,front=near+a.dir;
   if(this.solid(near,a.y-1)||this.solid(front,a.y-1)){
    let rise=1;
    while(rise<=4&&(this.solid(front,a.y-1-rise)||(rise===1&&this.solid(near,a.y-1-rise))))rise++;
    if(rise>4){if(a.climber){a.state='climb';a.phase=0}else a.dir=-a.dir;return}
    a.y-=rise;a.x+=a.dir;return;
   }
   let drop=0;while(drop<3&&!this.supported(a,a.y+drop))drop++;
   a.x+=a.dir;a.y+=drop;if(drop===3)this.startFall(a);return;
  }
  if(!this.solid(a.x,a.y)){this.startFall(a);return}
  if(this.blockerAhead(a)){a.dir=-a.dir;return}
  const next=a.x+a.dir;let rise=0;while(rise<=4&&this.solid(next,a.y-1-rise))rise++;
  if(rise>4){if(a.climber){a.state='climb';a.phase=0}else a.dir=-a.dir;return}
  a.x=next;a.y-=rise;
  let drop=0;while(drop<3&&!this.solid(a.x,a.y+drop))drop++;a.y+=drop;
  if(drop===3&&!this.solid(a.x,a.y))this.startFall(a);
 }
 fall(a){
  if(a.floater&&a.fallTicks>=6&&a.state!=='float'){a.state='float';a.phase=0}
  let landed=false;for(let dy=0;dy<(a.state==='float'?1:3);dy++){if(this.supported(a)){landed=true;break}a.y++}
  if(landed){if(a.state!=='float'&&a.fallTicks>=21)this.kill(a);else{a.state='walk';a.phase=0;a.fallTicks=0}}
  else a.fallTicks++;
 }
 climb(a){
  if(a.phase%2)return;
  if(this.solid(this.center(a),a.y-17)){a.dir=-a.dir;this.startFall(a);return}
  if(!this.solid(this.center(a)+a.dir,a.y-8)){a.state='hoist';a.phase=0;return}
  a.y--;
 }
 build(a){
  if(this.blockerAhead(a)||this.solid(a.x+a.dir*3,a.y-7)){a.dir=-a.dir;a.state='walk';a.phase=0;return}
  if(a.phase%8)return;
  const y=a.y-1,x=a.x+a.dir*2,center=this.center(a);
  if(this.solid(x-(this.level.physicsVersion===2?2:0),y-1)){a.state='walk';a.phase=0;return}
  for(let d=-1;d<=4;d++)this.setPixel(center+d*a.dir,y,this.level.builderColor||3);
  a.x=x;a.y=y;a.steps=(a.steps||0)+1;
  if(a.steps>=9)this.events.push('build-warning');
  if(a.steps===12){a.state='shrug';a.phase=0}
 }
 bash(a){
  if(!this.supported(a)){this.startFall(a);return}
  if(this.blockerAhead(a)){a.dir=-a.dir;a.state='walk';a.phase=0;return}
  if(a.phase%4)return;
  const near=this.center(a)+a.dir,far=this.center(a)+a.dir*4;
  const result=this.cutRectangle(Math.min(near,far),a.y-10,Math.max(near,far),a.y-1,a.dir);
  if(result.blocked){a.state='walk';a.phase=0;return}
  if(!result.removed){a.empty=(a.empty||0)+1;if(a.empty>=2){a.state='walk';a.phase=0;return}}else a.empty=0;
  a.x+=a.dir;
 }
 mine(a){
  if(a.phase%8)return;
  if(this.blockerAhead(a)){a.dir=-a.dir;a.state='walk';a.phase=0;return}
  const near=this.center(a)-a.dir,far=this.center(a)+a.dir*3;
  const result=this.cutRectangle(Math.min(near,far),a.y-3,Math.max(near,far),a.y+1,a.dir);
  if(result.blocked){a.state='walk';a.phase=0;return}
  a.x+=a.dir*2;a.y++;
  if(!result.removed||!this.supported(a,a.y+1))this.startFall(a);
 }
 dig(a){
  if(a.phase%8)return;
  const center=this.center(a);
  if(Array.from({length:9},(_,i)=>center+i-4).some(x=>this.solid(x,a.y)&&this.protected(x,a.y))){a.state='walk';a.phase=0;return}
  const cut=this.clearRow(center,a.y);
  if(cut){a.y++;this.events.push('dig')}else this.startFall(a);
 }
 hazard(a){
  if(this.level.attributeMode==='hazard'&&this.attribute(this.center(a),a.y-4)===2){this.kill(a,'drown');return}
  for(const water of this.level.water||[])if(a.x>=water.x&&a.x<water.x+water.width&&a.y>=water.y&&a.y<water.y+water.height){this.kill(a,'drown');return}
 }
 step(actions=[]){
  if(this.status!=='playing')return this.status;this.events=[];
  for(const action of actions){if(action.command==='end')return this.finish();else if(action.command==='nuke')this.nuke();else if(action.command==='release')this.changeRelease(action.value);else this.assign(action.id,action.skill)}
  this.tick++;
  const rate=this.level.releaseIncrements?.[this.releaseRate]??Math.max(1,(this.level.releaseIncrement||18)+(this.releaseRate-this.level.releaseRate));
  this.release+=this.spawned?rate:(this.level.initialReleaseIncrement||8);
  if(!this.entranceClosed&&this.release>=256&&this.spawned<this.level.lemmings){
   this.release-=256;
   const point=this.level.physicsVersion===2?this.level.entrances?.[this.spawned%(this.level.entrances?.length||1)]:null;
   const spawnState=(this.level.spawnState||2)^((this.spawned+1)%2?(this.level.spawnToggle||0):0);
   this.actors.push({id:this.spawned++,x:point?.x??this.level.entrance.x+4,y:point?.y??this.level.entrance.y+16,dir:spawnState&128?-1:1,state:'fall',phase:0,fallTicks:0});this.events.push('spawn');
  }
  for(const a of this.actors){
   a.phase++;if(a.state==='gone')continue;
   if(a.state==='exit'){if(a.phase>=8)a.state='gone';continue}
   if(['splat','explode','drown'].includes(a.state)){if(a.phase>=16)a.state='gone';continue}
   if(a.bomb>0&&--a.bomb===0){this.explode(a);continue}
   if(a.y>=this.level.height+16||a.x<0||a.x>=this.level.width){this.kill(a);continue}
   if(a.state==='fall'||a.state==='float')this.fall(a);
   else if(a.state==='walk')this.walk(a);
   else if(a.state==='climb')this.climb(a);
   else if(a.state==='hoist'){if(a.phase>=8){a.x+=a.dir;a.y-=8;a.state='walk';a.phase=0}}
   else if(a.state==='block'){if(!this.supported(a))this.startFall(a)}
   else if(a.state==='build')this.build(a);
   else if(a.state==='bash')this.bash(a);
   else if(a.state==='mine')this.mine(a);
   else if(a.state==='dig')this.dig(a);
   else if(a.state==='shrug'&&a.phase>=8){a.state='walk';a.phase=0}
   if(ACTIVE.has(a.state))this.hazard(a);
   const exit=this.level.exit;
   if(a.state==='walk'&&Math.abs(a.x-(exit.x+4))<=3&&a.y>=exit.y+12&&a.y<=exit.y+25){a.state='exit';a.phase=0;this.rescued++;this.events.push('rescue')}
  }
  const accounted=this.rescued+this.dead===this.spawned&&(this.entranceClosed||this.spawned===this.level.lemmings);
  if(this.tick>=this.level.minutes*60*TICKS_PER_SECOND||accounted)this.status=this.rescued>=(this.level.saveCount??Math.ceil(this.level.lemmings*this.level.savePercent/100))?'won':'lost';
  return this.status;
 }
 finish(){
  if(this.status!=='playing')return this.status;
  this.endedEarly=true;this.inputs.push({tick:this.tick,command:'end'});
  this.status=this.rescued>=(this.level.saveCount??Math.ceil(this.level.lemmings*this.level.savePercent/100))?'won':'lost';
  return this.status;
 }
 snapshot(){return {version:2,level:this.level.id,tick:this.tick,spawned:this.spawned,rescued:this.rescued,dead:this.dead,skills:[...this.skills],release:this.release,releaseRate:this.releaseRate,entranceClosed:this.entranceClosed,status:this.status,endedEarly:this.endedEarly,actors:structuredClone(this.actors),terrain:Array.from(this.terrain),inputs:structuredClone(this.inputs)}}
 restore(s){
  if(![1,2].includes(s.version)||s.level&&s.level!==this.level.id||s.terrain.length!==this.original.length)throw Error('Incompatible native state');
  for(const key of ['tick','spawned','rescued','dead','release','status'])this[key]=s[key];
  this.releaseRate=s.releaseRate??this.level.releaseRate;this.entranceClosed=!!s.entranceClosed;
  this.endedEarly=!!s.endedEarly;
  this.skills=[...s.skills];this.actors=structuredClone(s.actors);this.terrain=new Uint8Array(s.terrain);this.inputs=structuredClone(s.inputs);this.events=[];this.changed=true;
 }
}
