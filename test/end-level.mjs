import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Game} from '../native/engine.mjs';
const url=new URL('../native/assets/levels/fun-03.json',import.meta.url),level=JSON.parse(await readFile(url)),terrain=new Uint8Array(await readFile(new URL(level.files[0].path,url)));
const game=new Game(level,terrain);
while(game.status==='playing'){
 for(const a of game.actors)if(a.state==='walk'){
  const x=game.center(a)+a.dir*8;let y=a.y;while(y<level.height&&!game.solid(x,y))y++;
  if(y>=level.height||y-a.y>60)game.assign(a.id,3);
 }
 game.step();
 if(game.spawned===level.lemmings&&game.rescued>=level.saveCount&&game.actors.every(a=>['gone','exit','block'].includes(a.state)))break;
}
assert.equal(game.status,'playing');assert(game.actors.some(a=>a.state==='block'));
const before=game.snapshot();assert.equal(game.finish(),'won');assert.equal(game.tick,before.tick);assert(game.tick<level.minutes*600);
assert.equal(game.rescued,22);assert.deepEqual(game.actors,before.actors);assert.equal(game.dead,before.dead);assert.deepEqual(game.terrain,new Uint8Array(before.terrain));
assert.deepEqual(game.inputs.at(-1),{tick:before.tick,command:'end'});const saved=game.snapshot();game.finish();game.step();assert.deepEqual(game.snapshot(),saved);
const replay=new Game(level,terrain);let at=0;
while(replay.status==='playing'){const actions=[];while(at<game.inputs.length&&game.inputs[at].tick===replay.tick)actions.push(game.inputs[at++]);replay.step(actions)}
assert.deepEqual(replay.snapshot(),saved);replay.restart();replay.restore(saved);assert.deepEqual(replay.snapshot(),saved);
replay.restart();assert.equal(replay.endedEarly,false);assert.equal(replay.finish(),'lost');assert.equal(replay.rescued,0);assert.equal(replay.tick,0);
console.log('[OK] Fun 3 ends immediately with 22/25 rescued and surviving Blockers; loss, idempotency, frozen state, snapshots and exact input replay checked.');
