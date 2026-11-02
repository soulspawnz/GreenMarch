// Prepare original game assets; no emulator is bundled in
// the native runtime. Inputs are read-only original state/RAM artifacts.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
import {directory} from './d64.mjs';
const [startPath,referencePath,rightPath,out]=process.argv.slice(2);
if(!out)throw Error('Usage: build-native.mjs ORIGINAL_PLAY_STATE INITIALIZED_ORIGINAL_RAM SCROLLED_ORIGINAL_RAM OUTPUT_DIRECTORY');
const sha=b=>createHash('sha256').update(b).digest('hex');
const state=await readFile(startPath),offset=state.indexOf('C64MEM')+26,ram=state.subarray(offset,offset+65536);
assert.equal(sha(state),'cb196a86b0a4845dcd2981fa66e67339a70d1edf5d714d5c5132390d576ded83');assert.equal(ram.length,65536);
const reference=await readFile(referencePath),right=await readFile(rightPath);assert.equal(reference.length,65536);assert.equal(right.length,65536);
const disk=await readFile(new URL('../media/side-a.d64',import.meta.url)),level=directory(disk).find(f=>f.name==='FA').read();assert.equal(sha(level),'983fa8eeed5b0e08e25f03aa10f8193cb58d6c3ec9d9487c26ed11940cd0c3a5');
const packedStart=ram[0xe1a0]*256+ram[0xe1a1],packedEnd=ram[0xe1a4]*256+ram[0xe1a5],destination=ram[0xe1a2]*256+ram[0xe1a3];
const decoded=[];let pointer=packedStart,escaped=0;
const byte=()=>{if(pointer>=packedEnd)throw Error('Truncated original level stream');return ram[pointer++]};
const emit=(value,count)=>{if(count<1||decoded.length+count>13104)throw Error('Original terrain extent exceeded');while(count--)decoded.push(value)};
while(pointer<packedEnd){let value=byte();if(value<0xe0){emit(value,1);continue}if(escaped){escaped--;emit(value,1);continue}if(value>=0xf0){escaped=byte();if(!escaped)escaped=byte()*256+byte()}const command=value&15;if(command<2){const target=byte()*256+(command?byte():0);value=byte();emit(value,target-destination-decoded.length)}else{const count=command===2?byte():command;emit(byte(),count||256)}}
assert.equal(decoded.length,13104);
const width=312,height=168,terrain=new Uint8Array(width*height);
for(let y=0;y<height;y++)for(let col=0;col<78;col++)for(let x=0;x<4;x++)terrain[y*width+col*4+x]=(decoded[col*height+y]>>(6-x*2))&3;
const frames=new Uint8Array(300*128);
for(let frame=0;frame<300;frame++){const lo=frame&255,hi=frame>>8,a=(ram[0x3c00+lo+hi*256]|ram[0x3d2c+lo+hi*256]<<8)+16,b=(ram[0x3e58+lo+hi*256]|ram[0x2ea0+lo+hi*256]<<8)+16;for(let y=0;y<16;y++)for(let x=0;x<8;x++)frames[frame*128+y*8+x]=(ram[((x<4?a:b)+y)&65535]>>(6-(x%4)*2))&3}
// Original portals are composited into the C64 sprite buffer, separate from the
// collision bitmap. Decode those source bitplanes and retain only the difference.
function viewport(memory){const raw=new Uint8Array(96*168);for(let y=0;y<168;y++)for(let x=0;x<96;x++)raw[y*96+x]=(memory[0x6000+(x/12|0)*512+(y/21|0)*64+(y%21)*3+((x%12)/4|0)]>>(6-(x%4)*2))&3;let best={score:-1};for(let rotation=0;rotation<8;rotation++)for(let camera=0;camera<=216;camera++){let score=0;for(let y=0;y<168;y++)for(let x=4;x<92;x++)if(raw[y*96+(x+rotation*12)%96]===terrain[y*width+x+camera])score++;if(score>best.score)best={score,camera,rotation}}console.log('[REGISTER]',best,'terrain',sha(terrain));assert(best.score>13000,'Original viewport registration failed');const pixels=new Uint8Array(96*168);for(let y=0;y<168;y++)for(let x=0;x<96;x++)pixels[y*96+x]=raw[y*96+(x+best.rotation*12)%96];return {pixels,...best}}
const views=[viewport(reference),viewport(right)];
const portals=[];
for(const [name,x0,y0,x1,y1] of [['entrance',ram[0xe06d]-14,ram[0xe06e]-4,ram[0xe06d]+14,ram[0xe06e]+24],['exit',ram[0xe076]-12,ram[0xe077]-12,ram[0xe076]+20,ram[0xe077]+28]]){
 const view=views.find(v=>x0>=v.camera+4&&x1<=v.camera+92);assert(view,'Original '+name+' must be fully visible in one source');const pixels=[];for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const color=view.pixels[y*96+x-view.camera];pixels.push(color===terrain[y*width+x]?255:color)}assert(pixels.some(c=>c!==255),'Missing original '+name+' pixels');portals.push({name,x:x0,y:y0,width:x1-x0,height:y1-y0,pixels});
}
const music=new Uint8Array(0xc00);music.set(reference.subarray(0x3000,0x3c00));
await mkdir(out,{recursive:true});const files=[];for(const [name,data] of [['terrain.bin',terrain],['actors.bin',frames],['sid.bin',music]]){await writeFile(path.join(out,name),data);files.push({path:name,bytes:data.length,sha256:sha(data)})}
const data={version:1,id:'fun-01',title:'Just dig!',width,height,lemmings:ram[0xe039],savePercent:ram[0xe040]*10,minutes:ram[0xe041],releaseRate:50,releaseIncrement:ram[0x4fe8+ram[0xe03c]],initialReleaseIncrement:8,skills:Array.from({length:8},(_,i)=>ram[0xe044+i]*10+ram[0xe04c+i]),entrance:{x:(ram[0xe06c]*256+ram[0xe06d])+2,y:ram[0xe06e]+5},exit:{x:ram[0xe075]*256+ram[0xe076],y:ram[0xe077]},camera:96,palette:['#000000','#ffffff','#b87f70','#6bbfc3','#8b3f96','#67ab62','#4436a9','#d0de6b','#8c662b','#5b4e00','#d98b7c','#505050','#868686','#a9ef9f','#8274e8','#b9b9b9'],terrainColors:[0,9,5,8],actorColors:[0,14,5,1],animation:{walkRight:{start:8,count:8},walkLeft:{start:0,count:8},fall:{start:16,count:4},dig:{start:84,count:8,stride:2},exit:{start:204,count:8},splat:{start:212,count:16}},portals,files,provenance:{originalDiskSha256:sha(disk),originalLevelFile:'FA',originalLevelSha256:sha(level),originalStartSha256:sha(state),initializedOriginalRamSha256:sha(reference),scrolledOriginalRamSha256:sha(right),packedRange:[packedStart,packedEnd],decoder:'terrain-layout-v1',actorTables:['3c00','3d2c','3e58','2ea0'],actorCompositor:'actor-atlas-v1',music:{load:0x3000,init:0x3000,select:0x3003,play:0x3006,sequences:[1,2,0],hz:50}}};
assert.equal(data.lemmings,10);assert.equal(data.savePercent,10);assert.equal(data.skills[7],10);
await writeFile(path.join(out,'level.json'),JSON.stringify(data,null,2)+'\n');console.log('[OK] Original terrain, 300 actor poses, complete entrance/exit bitplanes and SID player prepared.',views.map(v=>({camera:v.camera,score:v.score})),files);
