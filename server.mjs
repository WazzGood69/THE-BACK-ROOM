import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '0.0.0.0';
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'backroom-data.json');
const DIST = path.join(__dirname, 'dist');

const empty = { users: [], requests: [], conversations: [], messages: {} };
let db = load();
function load(){ try { return { ...empty, ...JSON.parse(fs.readFileSync(DATA_FILE,'utf8')) }; } catch { return structuredClone(empty); } }
function save(){ fs.writeFileSync(DATA_FILE, JSON.stringify(db,null,2)); }
function json(res, code, body){ const out=JSON.stringify(body); res.writeHead(code, {'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'}); res.end(out); }
function body(req){ return new Promise((resolve,reject)=>{let s=''; req.on('data',c=>s+=c); req.on('end',()=>{try{resolve(s?JSON.parse(s):{})}catch(e){reject(e)}});}); }
function id(){return crypto.randomBytes(5).toString('hex')}
function publicUser(u){ const {passwordHash,...safe}=u; return safe; }
function syncFor(userId){
  const user=db.users.find(u=>u.id===userId); if(!user) return null;
  const requests=db.requests;
  const conversations=db.conversations.filter(c=>c.memberIds.includes(userId));
  const messages={}; for(const c of conversations) messages[c.id]=db.messages[c.id]||[];
  return { users: db.users.map(publicUser), requests, conversations, messages };
}
async function api(req,res,url){
  if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'});return res.end();}
  try {
    if(req.method==='POST' && url.pathname==='/api/register'){
      const b=await body(req); const username=String(b.username||'').trim();
      if(!/^[a-zA-Z0-9_-]{3,24}$/.test(username)) return json(res,400,{error:'Invalid username'});
      if(db.users.some(u=>u.username.toLowerCase()===username.toLowerCase())) return json(res,409,{error:'That username is taken.'});
      const u={id:id(),username,passwordHash:b.passwordHash||null,createdAt:Date.now(),avatar:b.avatar||'🦊'};
      db.users.push(u); save(); return json(res,201,{user:publicUser(u),serverVersion:Date.now()});
    }
    if(req.method==='POST' && url.pathname==='/api/login'){
      const b=await body(req); const u=db.users.find(x=>x.username.toLowerCase()===String(b.username||'').toLowerCase() && x.passwordHash===(b.passwordHash||null));
      if(!u) return json(res,401,{error:'Invalid username or password.'});
      return json(res,200,{user:publicUser(u)});
    }
    if(req.method==='GET' && url.pathname==='/api/sync'){
      const s=syncFor(url.searchParams.get('userId')); if(!s) return json(res,404,{error:'User not found'}); return json(res,200,s);
    }
    if(req.method==='POST' && url.pathname==='/api/friend-request'){
      const b=await body(req); const from=db.users.find(u=>u.id===b.fromId), to=db.users.find(u=>u.id===b.toId);
      if(!from||!to) return json(res,404,{error:'User not found'});
      if(db.requests.some(r=>r.status==='pending'&&((r.fromId===from.id&&r.toId===to.id)||(r.fromId===to.id&&r.toId===from.id)))) return json(res,409,{error:'Request already pending'});
      const r={id:id(),fromId:from.id,fromUsername:from.username,toId:to.id,toUsername:to.username,status:'pending',createdAt:Date.now()}; db.requests.push(r); save(); return json(res,201,{request:r});
    }
    if(req.method==='POST' && url.pathname==='/api/friend-request/respond'){
      const b=await body(req); const r=db.requests.find(x=>x.id===b.id); if(!r)return json(res,404,{error:'Request not found'}); if(b.status!=='accepted'&&b.status!=='declined')return json(res,400,{error:'Invalid status'}); r.status=b.status; save(); return json(res,200,{ok:true});
    }
    if(req.method==='POST' && url.pathname==='/api/conversation'){
      const b=await body(req); const members=Array.isArray(b.memberIds)?b.memberIds:[]; if(!members.length)return json(res,400,{error:'No members'});
      if(!b.name && members.length===2){ const existing=db.conversations.find(c=>!c.name&&c.memberIds.length===2&&members.every(x=>c.memberIds.includes(x))); if(existing)return json(res,200,{conversation:existing}); }
      const users=members.map(x=>db.users.find(u=>u.id===x)).filter(Boolean); const c={id:id(),name:b.name||null,memberIds:members,memberUsernames:users.map(u=>u.username),createdAt:Date.now(),lastMessage:'',lastAt:Date.now()}; db.conversations.push(c); save(); return json(res,201,{conversation:c});
    }
    if(req.method==='POST' && url.pathname==='/api/message'){
      const b=await body(req); const c=db.conversations.find(x=>x.id===b.conversationId); const u=db.users.find(x=>x.id===b.fromId); if(!c||!u)return json(res,404,{error:'Conversation or user not found'}); if(!c.memberIds.includes(u.id))return json(res,403,{error:'Not a member'});
      const m={id:id(),conversationId:c.id,fromId:u.id,fromUsername:u.username,text:String(b.text||'').slice(0,4000),createdAt:Date.now()}; db.messages[c.id]=[...(db.messages[c.id]||[]),m]; c.lastMessage=m.text;c.lastAt=m.createdAt;save();return json(res,201,{message:m});
    }
    return json(res,404,{error:'Not found'});
  } catch(e){ console.error(e); return json(res,500,{error:'Server error'}); }
}
function serve(req,res){
  let p=decodeURIComponent(new URL(req.url,'http://x').pathname); if(p==='/')p='/index.html'; const file=path.normalize(path.join(DIST,p));
  if(!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { const f=path.join(DIST,'index.html'); if(fs.existsSync(f)){res.writeHead(200,{'Content-Type':'text/html'});return fs.createReadStream(f).pipe(res);} res.writeHead(404);return res.end('Build the app first: pnpm build'); }
  const ext=path.extname(file); const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.webmanifest':'application/manifest+json'}; res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
}
http.createServer(async(req,res)=>{const url=new URL(req.url,'http://localhost');if(url.pathname.startsWith('/api/'))return api(req,res,url);serve(req,res)}).listen(PORT,HOST,()=>console.log(`The Back Room server: http://localhost:${PORT}`));
