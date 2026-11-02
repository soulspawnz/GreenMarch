import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Game} from '../native/engine.mjs';
import {animationFrame} from '../native/render.mjs';
const root=new URL('../native/assets/',import.meta.url),catalogue=JSON.parse(await readFile(new URL('campaign.json',root),'utf8'));
const original=JSON.parse(await readFile(new URL('../media/campaign.json',import.meta.url),'utf8'));
const originalEntries=new Map(original.ratings.flatMap(rating=>rating.levels.map(level=>[level.id,level])));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const identities=new Set(),results=[];
assert.equal(catalogue.ratings.length,4);
for(const rating of catalogue.ratings){
 assert.equal(rating.levels.length,25);
 for(const entry of rating.levels){
  assert(!identities.has(entry.id));identities.add(entry.id);
  const url=new URL(entry.path,root),bytes=await readFile(url);assert.equal(bytes.length,entry.bytes);assert.equal(hash(bytes),entry.sha256);
  const level=JSON.parse(bytes),source=originalEntries.get(entry.id);assert.equal(level.id,source.id);assert.equal(level.title,source.title);
  assert.equal(level.lemmings,source.lemmings);assert.equal(level.minutes,source.minutes);assert.equal(level.savePercent,source.save);assert.equal(level.releaseRate,source.release);
  assert.equal(level.provenance.originalLevelSha256,source.sha256);
  assert.equal(level.skills.length,8);assert(level.skills.every(value=>Number.isInteger(value)&&value>=0&&value<=99));
  assert(level.objects.length>0);assert.equal(level.attributes.length,420);assert(level.terrainColors.every(value=>value>=0&&value<16));
  for(const state of ['walk','climb','hoist','build','bash','mine','block','dig','float','explode','drown','splat','exit'])for(const dir of [-1,1])for(let phase=0;phase<40;phase++){
   const pose=animationFrame(level,{state,dir,phase});assert(pose>=0&&pose<300,state+' pose must be present in original atlas');
  }
  const binaries=await Promise.all(level.files.map(async file=>{const data=await readFile(new URL(file.path,url));assert.equal(data.length,file.bytes);assert.equal(hash(data),file.sha256);return new Uint8Array(data)}));
  const game=new Game(level,binaries[0]);while(game.status==='playing')game.step();
  assert(game.tick<=level.minutes*600);assert(game.spawned>0&&game.spawned<=level.lemmings);assert(game.rescued+game.dead<=game.spawned);
  assert.deepEqual(game.terrain,game.original,'Unassigned walkers cannot deform terrain');
  const checkpoint=game.snapshot(),restored=new Game(level,binaries[0]);restored.restore(checkpoint);assert.deepEqual(restored.snapshot(),checkpoint);
  results.push({id:level.id,baseline:game.status,rescued:game.rescued});
 }
}
assert.equal(identities.size,100);
console.log('[OK] 100 original native layouts, stats, asset identities, inventories, animation bounds, complete waiting-only simulations and snapshots.');
console.log('[INFO] Startup and baseline checks do not claim all puzzles were solved.');
