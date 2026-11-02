import assert from 'node:assert/strict';
import {Game} from '../native/engine.mjs';

function fixture({floor=80,width=80,height=120}={}){
 const level={id:'fun-01',width,height,lemmings:2,savePercent:50,minutes:5,skills:Array(8).fill(3),releaseRate:50,releaseIncrement:18,initialReleaseIncrement:8,entrance:{x:0,y:0},exit:{x:width-8,y:0},attributes:Array(420).fill(0)};
 const terrain=new Uint8Array(width*height);for(let y=floor;y<height;y++)terrain.fill(3,y*width,(y+1)*width);
 const game=new Game(level,terrain);game.entranceClosed=true;game.spawned=1;game.actors=[{id:0,x:30,y:floor,dir:1,state:'walk',phase:0,fallTicks:0}];return game;
}
const advance=(game,ticks)=>{for(let i=0;i<ticks;i++)game.step()};
{
 const game=fixture(),first=game.actors[0];game.actors.push({...first,id:1});
 assert(game.assign(0,1));assert.equal(game.pick(first.x,first.y-5,1).id,1,'Crowd targeting skips an actor that already has the selected permanent skill');
 assert.equal(game.skills[1],2,'Target eligibility must not consume inventory');
}
const attr=(game,x,y,value)=>{const col=Math.floor(x/4),index=Math.floor(y/8)*20+Math.floor(col/4),shift=6-(col%4)*2;game.level.attributes[index]=(game.level.attributes[index]&~(3<<shift))|(value<<shift)};

{
 const game=fixture(),actor=game.actors[0];
 for(let y=45;y<80;y++)for(let x=31;x<=35;x++)game.setPixel(x,y,3);
 assert(game.assign(0,0));assert(!game.assign(0,0));let reachedTop=false;
 for(let i=0;i<85;i++){game.step();if(actor.y<60&&actor.x>30)reachedTop=true}
 assert(reachedTop,'A climber must reach the top of a tall wall');assert.equal(game.skills[0],2);
}
{
 for(const floater of [false,true]){const game=fixture({floor:110}),actor=game.actors[0];actor.y=5;actor.state='fall';if(floater)assert(game.assign(0,1));advance(game,120);assert.equal(game.dead,floater?0:1,'Floater must survive a fall that kills an ordinary walker')}
}
{
 const game=fixture(),blocker=game.actors[0];blocker.x=40;game.spawned=2;game.actors.push({id:1,x:32,y:80,dir:1,state:'walk',phase:0,fallTicks:0});
 assert(game.assign(0,3));advance(game,8);assert.equal(game.actors[1].dir,-1);assert.equal(blocker.x,40);
 game.setPixel(40,80,0);game.step();assert.equal(blocker.state,'fall','Removing support must release a blocker');
}
{
 const game=fixture(),actor=game.actors[0];actor.x=40;attr(game,32,80,1);
 assert(game.assign(0,2));assert(game.assign(0,3));advance(game,50);
 assert.equal(game.dead,1);assert(game.terrain.some((v,i)=>v!==game.original[i]));assert.equal(game.terrain[80*80+32],3,'Explosion must preserve steel');
}
{
 const game=fixture(),actor=game.actors[0];actor.x=20;const before=game.terrain.reduce((n,v)=>n+(v!==0),0);
 assert(game.assign(0,4));advance(game,96);assert.equal(actor.steps,12);assert(actor.y<=68);assert(game.terrain.reduce((n,v)=>n+(v!==0),0)>before,'Builder must add an ascending staircase');
}
{
 const game=fixture(),actor=game.actors[0];actor.x=24;for(let y=65;y<80;y++)for(let x=25;x<38;x++)game.setPixel(x,y,3);
 assert(game.assign(0,5));advance(game,24);assert(actor.x>24);assert(!game.solid(28,74));assert(game.solid(28,80),'Basher must retain floor beneath its tunnel');
}
{
 const game=fixture(),actor=game.actors[0];assert(game.assign(0,6));advance(game,24);assert(actor.x>30&&actor.y>80,'Miner must cut diagonally downward');
}
{
 const game=fixture(),actor=game.actors[0];assert(game.assign(0,7));assert(!game.assign(0,7));advance(game,16);assert(actor.y>80);assert.equal(game.skills[7],2);
}
{
 const game=fixture();game.level.attributeMode='oneway';attr(game,32,72,2);
 assert(game.protected(32,72,1));assert(!game.protected(32,72,-1));attr(game,36,72,3);assert(game.protected(36,72,-1));assert(!game.protected(36,72,1));
}
{
 const game=fixture();game.level.attributeMode='hazard';attr(game,30,76,2);game.step();assert.equal(game.dead,1);assert.equal(game.actors[0].state,'drown');
 const water=fixture();water.level.water=[{x:20,y:80,width:20,height:8}];water.step();assert.equal(water.dead,1);
}
{
 const game=fixture();game.nuke();advance(game,60);assert.equal(game.dead,1);assert.equal(game.status,'lost');assert.equal(game.inputs[0].command,'nuke');
}
console.log('[OK] Eight skills, independent permanent abilities, blocking/release, steel, directional walls, water, explosions and nuke.');
