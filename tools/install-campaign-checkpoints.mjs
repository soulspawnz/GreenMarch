import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const [evidence,selection]=process.argv.slice(2);
if(!evidence)throw Error('Usage: install-campaign-checkpoints.mjs PRIVATE_VALIDATION_DIR [COMMA_SEPARATED_LEVEL_IDS]');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),catalogPath=path.join(root,'media/campaign.json');
const catalog=JSON.parse(await readFile(catalogPath,'utf8')),levels=catalog.ratings.flatMap(r=>r.levels),ids=selection?selection.split(','):levels.map(l=>l.id);
await mkdir(path.join(root,'media/levels'),{recursive:true});
for(const id of ids){
 if(!/^(fun|tricky|taxing|mayhem)-\d{2}$/.test(id))throw Error('Invalid level identity');
 const level=levels.find(l=>l.id===id);if(!level)throw Error('Unknown original level');
 const receipt=JSON.parse(await readFile(path.join(path.resolve(evidence),id+'.json'),'utf8'));
 if(receipt.id!==id||receipt.native.id!==id||receipt.native.kind!=='briefing'||receipt.originalSha256!==level.sha256||receipt.disks!==3)throw Error('Validation receipt identity mismatch: '+id);
 for(const field of ['lemmings','save','release','minutes'])if(!Number.isFinite(receipt.native[field]))throw Error('Invalid original briefing field: '+id+' '+field);
 const bytes=await readFile(path.join(path.resolve(evidence),id+'.bin')),sha256=createHash('sha256').update(bytes).digest('hex');
 if(sha256!==receipt.checkpointSha256||bytes.length!==receipt.checkpointBytes||bytes.indexOf(Buffer.from('C64MEM'))<0)throw Error('Validation checkpoint identity mismatch: '+id);
 await writeFile(path.join(root,'media/levels',id+'.bin'),bytes);
 level.title=receipt.native.title;level.lemmings=receipt.native.lemmings;level.save=receipt.native.save;level.release=receipt.native.release;level.minutes=receipt.native.minutes;
 level.checkpoint={sha256,bytes:bytes.length,source:'original-menu-and-disk-loading'};
}
await writeFile(catalogPath+'.tmp',JSON.stringify(catalog,null,2)+'\n');await rename(catalogPath+'.tmp',catalogPath);
console.log('[OK]',ids.length,'verified original level checkpoints installed. Private screenshots and logs remain outside the project.');
