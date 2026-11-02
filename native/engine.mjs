// Native, deterministic browser gameplay. This module does not execute C64 code.
export const TICKS_PER_SECOND=10;
export class Game {
 constructor(level,terrain){if(level.id!=='fun-01'||terrain.length!==level.width*level.height)throw Error('Unsupported native level');this.level=level;this.original=new Uint8Array(terrain);this.restart()}
 restart(){this.terrain=new Uint8Array(this.original);this.actors=[];this.tick=0;this.spawned=0;this.rescued=0;this.dead=0;this.skills=[...this.level.skills];this.release=0;this.status='playing';this.events=[];this.inputs=[];this.changed=true}
 solid(x,y){x=Math.floor(x);y=Math.floor(y);if(y<0)return false;if(x<0||x>=this.level.width)return true;if(y>=this.level.height)return false;return this.terrain[y*this.level.width+x]!==0}
 assign(id,skill=7){if(this.status!=='playing'||skill!==7||!this.skills[7])return false;const actor=this.actors.find(a=>a.id===id);if(!actor||actor.state!=='walk'||!this.solid(actor.x,actor.y))return false;actor.state='dig';actor.phase=0;this.skills[7]--;this.inputs.push({tick:this.tick,id,skill});this.events.push('assign');return true}
 pick(x,y){let best=null,distance=Infinity;for(const a of this.actors){if(!['walk','dig','fall'].includes(a.state))continue;const d=Math.abs(a.x-x)*2+Math.abs((a.y-5)-y);if(Math.abs(a.x-x)<=5&&y>=a.y-14&&y<=a.y+3&&d<distance){best=a;distance=d}}return best}
 kill(a){a.state='splat';a.phase=0;this.dead++;this.events.push('death')}
 clearRow(center,y){let count=0;for(let x=center-4;x<=center+4;x++){if(x<0||x>=this.level.width||y<0||y>=this.level.height)continue;const pos=y*this.level.width+x;if(this.terrain[pos]){this.terrain[pos]=0;count++}}if(count)this.changed=true;return count}
 step(actions=[]){if(this.status!=='playing')return this.status;this.events=[];for(const action of actions)this.assign(action.id,action.skill);this.tick++;
  this.release+=this.spawned?this.level.releaseIncrement:this.level.initialReleaseIncrement;
  if(this.release>=256&&this.spawned<this.level.lemmings){this.release-=256;this.actors.push({id:this.spawned++,x:this.level.entrance.x+4,y:this.level.entrance.y+16,dir:1,state:'fall',phase:0,fallTicks:0});this.events.push('spawn')}
  for(const a of this.actors){a.phase++;
   if(a.state==='gone')continue;if(a.state==='exit'){if(a.phase>=8)a.state='gone';continue}if(a.state==='splat'){if(a.phase>=16)a.state='gone';continue}
   if(a.y>=this.level.height+16||a.x<0||a.x>=this.level.width){this.kill(a);continue}
   if(a.state==='fall'){
    let landed=false;for(let dy=0;dy<3;dy++){if(this.solid(a.x,a.y)){landed=true;break}a.y++}
    if(landed){if(a.fallTicks>=21)this.kill(a);else{a.state='walk';a.phase=0;a.fallTicks=0}}else a.fallTicks++;
   }else if(a.state==='dig'){
    if(a.phase%8===0){const cut=this.clearRow(a.x,a.y);if(cut){a.y++;this.events.push('dig')}else{a.state='fall';a.phase=0;a.fallTicks=0}}
   }else if(a.state==='walk'){
    if(!this.solid(a.x,a.y)){a.state='fall';a.fallTicks=0;a.phase=0;continue}
    const next=a.x+a.dir;let rise=0;while(rise<=4&&this.solid(next,a.y-1-rise))rise++;
    if(rise>4){a.dir=-a.dir;continue}a.x=next;a.y-=rise;
    // Small downward steps follow the ground; larger drops become falls.
    let drop=0;while(drop<3&&!this.solid(a.x,a.y+drop))drop++;a.y+=drop;if(drop===3&&!this.solid(a.x,a.y)){a.state='fall';a.phase=0;a.fallTicks=0}
   }
   const exit=this.level.exit;if(a.state==='walk'&&Math.abs(a.x-(exit.x+4))<=3&&a.y>=exit.y+12&&a.y<=exit.y+25){a.state='exit';a.phase=0;this.rescued++;this.events.push('rescue')}
  }
  if(this.tick>=this.level.minutes*60*TICKS_PER_SECOND||this.spawned===this.level.lemmings&&this.rescued+this.dead===this.level.lemmings)this.status=this.rescued*100>=this.level.lemmings*this.level.savePercent?'won':'lost';return this.status;
 }
 snapshot(){return {version:1,tick:this.tick,spawned:this.spawned,rescued:this.rescued,dead:this.dead,skills:[...this.skills],release:this.release,status:this.status,actors:structuredClone(this.actors),terrain:Array.from(this.terrain),inputs:structuredClone(this.inputs)}}
 restore(s){if(s.version!==1||s.terrain.length!==this.original.length)throw Error('Incompatible native state');for(const key of ['tick','spawned','rescued','dead','release','status'])this[key]=s[key];this.skills=[...s.skills];this.actors=structuredClone(s.actors);this.terrain=new Uint8Array(s.terrain);this.inputs=structuredClone(s.inputs);this.events=[];this.changed=true}
}
