const checked=new Map();
const root=new URL('./assets/',import.meta.url);
function safeURL(value,base){const url=new URL(value,base);if(url.origin!==root.origin||!url.href.startsWith(root.href))throw Error('Invalid native asset location');return url}
export async function readChecked(url,identity){
 const key=url.href+'#'+identity.sha256;
 if(checked.has(key))return checked.get(key).slice();
 const response=await fetch(url);if(!response.ok)throw Error('Native asset is unavailable: '+url.pathname);
 const bytes=new Uint8Array(await response.arrayBuffer());
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
 if(bytes.length!==identity.bytes||digest!==identity.sha256)throw Error('Native asset identity mismatch');
 checked.set(key,bytes);return bytes.slice();
}
export async function loadCatalogue(){
 const response=await fetch(new URL('campaign.json',root));if(!response.ok)throw Error('Native campaign catalogue is unavailable');
 const data=await response.json(),ids=new Set();
 if(data.version!==1||data.ratings.length!==4)throw Error('Unsupported native campaign catalogue');
 for(const rating of data.ratings){if(rating.levels.length!==25)throw Error('Incomplete native rating');for(const entry of rating.levels){
  if(!/^(fun|tricky|taxing|mayhem)-\d{2}$/.test(entry.id)||ids.has(entry.id))throw Error('Invalid native campaign entry');ids.add(entry.id);safeURL(entry.path,root);
 }}
 if(ids.size!==100)throw Error('Incomplete native campaign');return data;
}
export async function loadNativeLevel(entry){
 const url=safeURL(entry.path,root),bytes=await readChecked(url,entry),level=JSON.parse(new TextDecoder().decode(bytes));
 if(level.id!==entry.id||level.width!==312||![168,176].includes(level.height)||level.files.length!==3||level.skills.length!==8)throw Error('Incompatible native level');
 const binaries=await Promise.all(level.files.map(file=>readChecked(safeURL(file.path,url),file)));
 return {level,terrain:binaries[0],actors:binaries[1],sid:binaries[2]};
}
