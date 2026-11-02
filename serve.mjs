import http from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root = path.dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT)||8768;
const audioTypes={'.mp3':'audio/mpeg','.wav':'audio/wav','.ogg':'audio/ogg'};
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.wasm':'application/wasm','.json':'application/json','.bin':'application/octet-stream','.data':'application/octet-stream','.zip':'application/octet-stream','.txt':'text/plain; charset=utf-8','.md':'text/plain; charset=utf-8','.d64':'application/octet-stream','.prg':'application/octet-stream','.vc64':'application/octet-stream','.png':'image/png','.svg':'image/svg+xml'};
http.createServer(async(req,res)=>{
  try {
    if (!['GET','HEAD'].includes(req.method)) {res.writeHead(405).end();return;}
    const name = decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
    const filename = path.resolve(root, '.'+(name==='/'?'/index.html':name));
    if(!filename.startsWith(root+path.sep) || !(types[path.extname(filename)]||audioTypes[path.extname(filename)]) || name.split('/').some(x=>x.startsWith('.'))) {res.writeHead(404).end();return;}
    const data = await readFile(filename);
    res.writeHead(200,{'Content-Type':types[path.extname(filename)]||audioTypes[path.extname(filename)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp'});
    res.end(req.method==='HEAD'?undefined:data);
  } catch {res.writeHead(404).end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log('[OK] GreenMarch: http://127.0.0.1:'+port+'/'));
