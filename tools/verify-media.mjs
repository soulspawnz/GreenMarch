import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {directory} from './d64.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha=b=>createHash('sha256').update(b).digest('hex');
const provenance=JSON.parse(await readFile(path.join(root,'media/provenance.json'),'utf8'));
assert.equal(provenance.archiveSha256,'e5a386aeab2f3922bb1a56333f3cea695cf5de61f076ad491ee420da89ae99fd');
const originals=new Map();
for(const [index,disk] of provenance.disks.entries()){const b=await readFile(path.join(root,disk.path));assert.equal(b.length,174848);assert.equal(sha(b),disk.sha256);for(const file of directory(b).filter(f=>/^[FTXM][A-Y]$/.test(f.name)))originals.set(file.name,{disk:index,sha256:sha(file.read())})}
const vendor=path.join(root,'vendor/emulatorjs');
const source=JSON.parse(await readFile(path.join(vendor,'provenance.json'),'utf8'));
const local=JSON.parse(await readFile(path.join(vendor,'LOCAL_PATCHES.json'),'utf8'));
for(const f of source.files){const patch=local.patches.find(p=>p.path===f.path);assert.equal(sha(await readFile(path.join(vendor,f.path))),patch?.sha256||f.sha256,f.path)}
const bundle=JSON.parse(await readFile(path.join(root,'media/build-manifest.json'),'utf8'));
for(const f of bundle.files)assert.equal(sha(await readFile(path.join(root,f.path))),f.sha256,f.path);
const campaign=JSON.parse(await readFile(path.join(root,'media/campaign.json'),'utf8')),levels=campaign.ratings.flatMap(r=>r.levels);
assert.equal(levels.length,100);assert.equal(new Set(levels.map(l=>l.id)).size,100);assert.equal(originals.size,100);
let checkpoints=0;
for(const rating of campaign.ratings){assert.equal(rating.levels.length,25);for(const level of rating.levels){assert.match(level.id,/^(fun|tricky|taxing|mayhem)-\d{2}$/);const original=originals.get(level.file);assert(original);assert.equal(level.sha256,original.sha256);assert.equal(level.disk,original.disk);if(level.checkpoint){assert.equal(sha(await readFile(path.join(root,'media/levels',level.id+'.bin'))),level.checkpoint.sha256);checkpoints++}}}
console.log(`[OK] Three original disks, ${source.files.length} pinned frontend sources, ${bundle.files.length} runtime assets, 100 original levels and ${checkpoints} campaign checkpoints verified.`);
const native=JSON.parse(await readFile(path.join(root,'native/assets/level.json'),'utf8'));
for(const f of native.files){const bytes=await readFile(path.join(root,'native/assets',f.path));assert.equal(bytes.length,f.bytes);assert.equal(sha(bytes),f.sha256,f.path)}
const nativeManifest=JSON.parse(await readFile(path.join(root,'native/provenance.json'),'utf8'));
for(const f of nativeManifest.files)assert.equal(sha(await readFile(path.join(root,f.path))),f.sha256,f.path);
const nativeCampaign=JSON.parse(await readFile(path.join(root,'native/assets/campaign.json'),'utf8'));
const nativeEntries=nativeCampaign.ratings.flatMap(r=>r.levels);
assert.equal(nativeEntries.length,100);assert.equal(new Set(nativeEntries.map(l=>l.id)).size,100);
for(const entry of nativeEntries){
 const configPath=path.resolve(root,'native/assets',entry.path),bytes=await readFile(configPath);
 assert.equal(bytes.length,entry.bytes);assert.equal(sha(bytes),entry.sha256,entry.id);
 const config=JSON.parse(bytes);assert.equal(config.id,entry.id);
 for(const f of config.files){const data=await readFile(path.resolve(path.dirname(configPath),f.path));assert.equal(data.length,f.bytes);assert.equal(sha(data),f.sha256,entry.id+':'+f.path)}
}
console.log(`[OK] All 100 native configurations, assets and standalone SID source identities verified.`);
