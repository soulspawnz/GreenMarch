import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const [nativeDirectory,...quickDirectories]=process.argv.slice(2);
if(!nativeDirectory||!quickDirectories.length)throw Error('Usage: write-campaign-validation.mjs PRIVATE_NATIVE_DIR PRIVATE_QUICKSTART_DIR [...]');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),sha=data=>createHash('sha256').update(data).digest('hex');
const catalog=JSON.parse(await readFile(path.join(root,'media/campaign.json'),'utf8')),levels=catalog.ratings.flatMap(r=>r.levels),verified=[];
if(levels.length!==100)throw Error('Expected 100 original levels');
for(const level of levels){
 const native=JSON.parse(await readFile(path.join(path.resolve(nativeDirectory),level.id+'.json'),'utf8'));
 if(native.id!==level.id||native.native.id!==level.id||native.originalSha256!==level.sha256||native.disks!==3)throw Error('Original native validation mismatch: '+level.id);
 let quick;
 for(const directory of quickDirectories){try{const receipt=JSON.parse(await readFile(path.join(path.resolve(directory),level.id+'.json'),'utf8'));if(receipt.quickStart===true){quick=receipt;break}}catch(error){if(error.code!=='ENOENT')throw error}}
 if(!quick||quick.id!==level.id||quick.native.id!==level.id||quick.originalSha256!==level.sha256||quick.disks!==3||!(quick.sidAC>.001))throw Error('Quick-start validation missing or invalid: '+level.id);
 const asset=await readFile(path.join(root,'media/levels',level.id+'.bin'));if(sha(asset)!==level.checkpoint.sha256)throw Error('Installed checkpoint changed: '+level.id);
 verified.push({id:level.id,title:level.title,originalFile:level.file,originalSha256:level.sha256,checkpointSha256:level.checkpoint.sha256,sidAC:quick.sidAC,originalBriefing:true,gameplayStarted:true,quickStart:true});
}
const report={date:new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Berlin'}),originalLevelFiles:100,nativeEntriesVerified:100,quickStartsVerified:100,minimumSIDAC:Math.min(...verified.map(l=>l.sidAC)),checks:['Original level/rating displayed','Native gameplay frames advance','Post-mixer SID AC RMS exceeds 0.001','Three original disk images mounted','No external HTTP, failed HTTP or page errors'],limit:'Gameplay startup and audio checks are not a complete solution playthrough of every puzzle.',levels:verified};
await writeFile(path.join(root,'media/campaign-validation.json'),JSON.stringify(report,null,2)+'\n');
const manifestPath=path.join(root,'media/build-manifest.json'),manifest=JSON.parse(await readFile(manifestPath,'utf8'));
for(const assetPath of ['media/campaign.zip','media/campaign.json','media/campaign-validation.json']){const data=await readFile(path.join(root,assetPath));manifest.files=manifest.files.filter(f=>f.path!==assetPath);manifest.files.push({path:assetPath,bytes:data.length,sha256:sha(data)})}
await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
console.log('[OK] Public validation summary written for 100 original levels and 100 verified quick starts. Raw evidence stays private.');
