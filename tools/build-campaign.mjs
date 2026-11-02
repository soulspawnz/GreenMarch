import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {directory as readDirectory} from './d64.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const provenance=JSON.parse(await readFile(path.join(root,'media/provenance.json'),'utf8'));
const entries=[{name:'campaign.m3u',data:Buffer.from('side-a.d64\nside-b.d64\nside-c.d64\n')}];
const originals=new Map();
for(const [diskIndex,disk] of provenance.disks.entries()){const data=await readFile(path.join(root,disk.path));if(createHash('sha256').update(data).digest('hex')!==disk.sha256)throw Error('Original disk hash mismatch');entries.push({name:path.basename(disk.path),data});for(const f of readDirectory(data).filter(f=>/^[FTXM][A-Y]$/.test(f.name))){if(originals.has(f.name))throw Error('Duplicate level file');const bytes=f.read();originals.set(f.name,{disk:diskIndex,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')})}}
if(originals.size!==100)throw Error('Expected exactly 100 original level files');
const codes=JSON.parse(await readFile(path.join(root,'media/campaign-codes.json'),'utf8'));
let previous=[];try{previous=JSON.parse(await readFile(path.join(root,'media/campaign.json'),'utf8')).ratings.flatMap(r=>r.levels)}catch(error){if(error.code!=='ENOENT')throw error}
const ratings=codes.ratings.map(r=>{if(r.codes.length!==25)throw Error('Expected 25 levels per rating');return {name:r.name,levels:r.codes.map((code,i)=>{const file=r.prefix+String.fromCharCode(65+i),original=originals.get(file);if(!original||code!==null&&!/^[A-Z]{10}$/.test(code))throw Error('Invalid level catalogue entry');return {id:r.name.toLowerCase()+'-'+String(i+1).padStart(2,'0'),rating:r.name,number:i+1,code,file,...original}})}});
for(const level of ratings.flatMap(r=>r.levels)){const old=previous.find(l=>l.id===level.id&&l.sha256===level.sha256&&l.code===level.code);for(const key of ['title','lemmings','save','release','minutes'])if(old?.[key]!==undefined)level[key]=old[key];if(old?.checkpoint){const b=await readFile(path.join(root,'media/levels',level.id+'.bin'));if(createHash('sha256').update(b).digest('hex')!==old.checkpoint.sha256)throw Error('Existing campaign checkpoint changed');level.checkpoint=old.checkpoint}}
await writeFile(path.join(root,'media/campaign.json'),JSON.stringify({sources:codes.sources,ratings},null,2)+'\n');
function crc32(data){let crc=0xffffffff;for(const byte of data){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}return (crc^0xffffffff)>>>0}
const local=[],central=[];let offset=0;
for(const {name,data} of entries){const n=Buffer.from(name),header=Buffer.alloc(30),dir=Buffer.alloc(46),crc=crc32(data);
header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt16LE(33,12);header.writeUInt32LE(crc,14);header.writeUInt32LE(data.length,18);header.writeUInt32LE(data.length,22);header.writeUInt16LE(n.length,26);
dir.writeUInt32LE(0x02014b50);dir.writeUInt16LE(20,4);dir.writeUInt16LE(20,6);dir.writeUInt16LE(33,14);dir.writeUInt32LE(crc,16);dir.writeUInt32LE(data.length,20);dir.writeUInt32LE(data.length,24);dir.writeUInt16LE(n.length,28);dir.writeUInt32LE(offset,42);
local.push(header,n,data);central.push(dir,n);offset+=header.length+n.length+data.length}
const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
await writeFile(path.join(root,'media/campaign.zip'),Buffer.concat([...local,directory,end]));
console.log('[OK] 100 original level files catalogued; deterministic three-disk playlist built from verified bytes.');
