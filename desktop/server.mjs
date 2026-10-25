import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import https from 'node:https';
import crypto from 'node:crypto';
import {execFile} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import selfsigned from 'selfsigned';
import '../web/lan-protocol.js';

const P=globalThis.TreinoLanProtocol,uiPort=43127,lanPort=43128,origin='http://127.0.0.1:'+uiPort;
const folder=path.join(process.env.LOCALAPPDATA||os.homedir(),'TreinoAppPC'),web=path.join(path.dirname(fileURLToPath(import.meta.url)),'web'),limit=64*1024*1024;
fs.mkdirSync(folder,{recursive:true});
process.on('uncaughtException',error=>{fs.appendFileSync(path.join(folder,'erro.log'),new Date().toISOString()+' '+error.message+'\n');process.exit(1);});
function read(file,fallback){const target=path.join(folder,file);return fs.existsSync(target)?JSON.parse(fs.readFileSync(target,'utf8')):fallback;}
function write(file,data){const target=path.join(folder,file),temp=target+'.tmp';fs.writeFileSync(temp,JSON.stringify(data),{mode:0o600});const fd=fs.openSync(temp,'r');try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}fs.renameSync(temp,target);}
const secret=()=>crypto.randomBytes(32).toString('base64url');
let config=read('config.json',null),store=read('dados.json',{revision:0,snapshot:{}}),pairing=null,queue=Promise.resolve();
if(!config){const cert=await selfsigned.generate([{name:'commonName',value:'TreinoApp PC local'}],{keySize:2048,notBeforeDate:new Date(Date.now()-86400000),notAfterDate:new Date(Date.now()+3650*86400000),algorithm:'sha256'});config={id:crypto.randomUUID(),desktopToken:secret(),cert:cert.cert,key:cert.private,devices:[]};try{fs.writeFileSync(path.join(folder,'config.json'),JSON.stringify(config),{flag:'wx',mode:0o600});}catch(error){if(error.code==='EEXIST')config=read('config.json',null);else throw error;}}
P.validate(store.snapshot);
const fingerprint=new crypto.X509Certificate(config.cert).fingerprint256.replaceAll(':','').toLowerCase();
const same=(a,b)=>{if(typeof a!=='string'||typeof b!=='string')return false;const A=Buffer.from(a),B=Buffer.from(b);return A.length===B.length&&crypto.timingSafeEqual(A,B);};
const privateIP=ip=>/^10\./.test(ip)||/^192\.168\./.test(ip)||/^172\.(1[6-9]|2\d|3[01])\./.test(ip);
function addresses(){const rows=Object.entries(os.networkInterfaces()).flatMap(([name,items])=>(items||[]).filter(row=>row.family==='IPv4'&&!row.internal&&privateIP(row.address)).map(row=>({ip:row.address,rank:(/virtual|vethernet|vmware|docker|wsl|vpn/i.test(name)?10:0)+(/^192\.168\./.test(row.address)?0:1)}))).sort((a,b)=>a.rank-b.rank);return [...new Set(rows.map(row=>row.ip))];}
function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));}
async function body(req){let length=0;const chunks=[];for await(const chunk of req){length+=chunk.length;if(length>limit)throw Error('Dados excedem 64 MB.');chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');}
function desktopAuth(req){return (req.headers.cookie||'').split(';').some(v=>same(v.trim(),'treinoPC='+config.desktopToken));}
function safeOrigin(req){return req.headers.origin===origin;}
function launch(){execFile('rundll32.exe',['url.dll,FileProtocolHandler',origin+'/connect#'+config.desktopToken],{windowsHide:true},()=>{});}
function backup(){if(!store.revision)return;const dir=path.join(folder,'copias');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,Date.now()+'-'+store.revision+'.json'),JSON.stringify(store),{mode:0o600});const old=fs.readdirSync(dir).filter(f=>/^\d+-\d+\.json$/.test(f)).sort();for(const name of old.slice(0,-20))fs.unlinkSync(path.join(dir,name));}
function exchange(data,desktop){if(data.protocol!==P.version)throw Error('Versões incompatíveis. Atualize o APK e o programa do PC.');if(Object.keys(data.resolutions||{}).length&&data.revision!==store.revision)return {stale:true,revision:store.revision};const result=P.merge(data.base||{},data.local||{},store.snapshot,data.resolutions||{},desktop,store.tombstones||{});if(result.conflicts.length)return {conflicts:result.conflicts,revision:store.revision};if(!P.sameSnapshot(result.snapshot,store.snapshot)){backup();const oldTokens=P.tokens(store.snapshot),newTokens=P.tokens(result.snapshot),tombstones={...(store.tombstones||{})};for(const token of oldTokens)if(!newTokens.has(token))tombstones[token]=store.revision+1;for(const token of newTokens)delete tombstones[token];const next={revision:store.revision+1,snapshot:result.snapshot,tombstones,updatedAt:Date.now()};write('dados.json',next);store=next;}return {snapshot:store.snapshot,revision:store.revision,serverId:config.id};}
function enqueue(fn){const next=queue.then(fn);queue=next.catch(()=>{});return next;}
async function api(req,res,desktop){
  const url=new URL(req.url,desktop?origin:'https://local');
  if(req.method==='POST'&&url.pathname==='/api/session'&&desktop){if(!safeOrigin(req))return json(res,403,{error:'Origem não autorizada.'});const data=await body(req);if(!same(data.token,config.desktopToken))return json(res,401,{error:'Abra o TreinoApp-PC.exe para entrar.'});res.setHeader('Set-Cookie','treinoPC='+config.desktopToken+'; HttpOnly; SameSite=Strict; Path=/');return json(res,200,{ok:true});}
  const device=!desktop?config.devices.find(d=>same(req.headers.authorization,'Bearer '+d.token)):null;
  if(url.pathname==='/api/pair'&&!desktop&&req.method==='POST'){
    const data=await body(req);if(!pairing||pairing.expires<Date.now()||!same(data.secret,pairing.secret))return json(res,401,{error:'Código expirado. Gere outro no PC.'});const token=secret();config.devices=[{id:crypto.randomUUID(),name:String(data.name||'Meu Android').slice(0,80),token}];write('config.json',config);pairing=null;return json(res,200,{token,serverId:config.id,name:os.hostname(),protocol:P.version});
  }
  if(desktop?!desktopAuth(req):!device)return json(res,401,{error:'Dispositivo não autorizado. Faça o pareamento.'});
  if(req.method==='POST'&&desktop&&!safeOrigin(req))return json(res,403,{error:'Origem não autorizada.'});
  if(url.pathname==='/api/status'&&req.method==='GET')return json(res,200,{serverId:config.id,name:os.hostname(),revision:store.revision,updatedAt:store.updatedAt||null,devices:config.devices.map(({id,name})=>({id,name})),addresses:addresses(),dataFolder:desktop?folder:undefined});
  if(url.pathname==='/api/state'&&req.method==='GET')return json(res,200,{snapshot:store.snapshot,revision:store.revision,serverId:config.id});
  if(url.pathname==='/api/pair-code'&&req.method==='POST'&&desktop){pairing={secret:secret(),expires:Date.now()+10*60000};return json(res,200,{addresses:addresses(),port:lanPort,fingerprint,secret:pairing.secret,expires:pairing.expires,serverId:config.id});}
  if(url.pathname==='/api/revoke'&&req.method==='POST'&&desktop){config.devices=[];pairing=null;write('config.json',config);return json(res,200,{ok:true});}
  if(url.pathname==='/api/sync'&&req.method==='POST'){const data=await body(req);return json(res,200,await enqueue(()=>exchange(data,desktop)));}
  if(url.pathname==='/api/stop'&&req.method==='POST'&&desktop){json(res,200,{ok:true});setTimeout(()=>process.exit(0),250);return;}
  return json(res,404,{error:'Operação inexistente.'});
}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const login='<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TreinoApp PC</title><body style="background:#0f1117;color:#e8eaf6;font-family:system-ui;padding:32px"><h1>TreinoApp PC</h1><p id="status">Conectando ao programa local…</p><script>const token=location.hash.slice(1);history.replaceState(null,"","/connect");if(token)fetch("/api/session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token})}).then(r=>{if(!r.ok)throw Error();location.replace("/")}).catch(()=>document.getElementById("status").textContent="Não foi possível entrar. Abra novamente o TreinoApp-PC.exe.");else document.getElementById("status").textContent="Abra o TreinoApp-PC.exe para entrar.";</script></body></html>';
const ui=http.createServer(async(req,res)=>{try{
  if(req.headers.host!=='127.0.0.1:'+uiPort)return json(res,403,{error:'Endereço inválido.'});
  const url=new URL(req.url,origin);if(url.pathname==='/health')return json(res,200,{app:'TreinoAppPC',id:config.id});
  if(url.pathname.startsWith('/api/'))return await api(req,res,true);
  if(url.pathname==='/connect'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY'});return res.end(login);}
  if(!desktopAuth(req)){res.writeHead(302,{Location:'/connect'});return res.end();}
  if(req.method!=='GET')return json(res,405,{error:'Método inválido.'});
  const relative=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname),file=path.resolve(web,'.'+relative);if(!file.startsWith(web+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return json(res,404,{error:'Arquivo inexistente.'});
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https:; img-src 'self' data: blob: https:; object-src 'none'; frame-ancestors 'none'"});
  if(path.extname(file)==='.html'){const bootstrap=JSON.stringify({serverId:config.id,revision:store.revision}).replaceAll('<','\\u003c');return res.end(fs.readFileSync(file,'utf8').replace('<head>','<head><script>window.__TREINO_DESKTOP__='+bootstrap+';</script>'));}
  fs.createReadStream(file).pipe(res);
}catch(error){if(!res.headersSent)json(res,400,{error:error.message||'Não foi possível processar os dados.'});else res.end();}});
const lan=https.createServer({key:config.key,cert:config.cert,minVersion:'TLSv1.2'},async(req,res)=>{try{if(!(privateIP(req.socket.remoteAddress?.replace('::ffff:','')||'')||req.socket.remoteAddress==='127.0.0.1'))return json(res,403,{error:'Somente rede local.'});await api(req,res,false);}catch(error){if(!res.headersSent)json(res,400,{error:error.message||'Falha na sincronização.'});else res.end();}});
ui.maxConnections=lan.maxConnections=32;ui.requestTimeout=lan.requestTimeout=60000;ui.headersTimeout=lan.headersTimeout=15000;
ui.on('error',error=>{if(error.code==='EADDRINUSE'){http.get(origin+'/health',r=>{let text='';r.on('data',c=>text+=c);r.on('end',()=>{try{if(JSON.parse(text).id===config.id){launch();return process.exit(0);}}catch(_){}fs.appendFileSync(path.join(folder,'erro.log'),'Porta 43127 ocupada por outro programa.\n');process.exit(1);});}).on('error',()=>process.exit(1));}else throw error;});
lan.on('error',error=>{fs.appendFileSync(path.join(folder,'erro.log'),new Date().toISOString()+' '+error.message+'\n');ui.close();process.exit(1);});
ui.listen(uiPort,'127.0.0.1',()=>lan.listen(lanPort,'0.0.0.0',()=>{if(process.argv.includes('--open'))launch();}));

