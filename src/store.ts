import { User, Conversation, Message, FriendRequest, Theme } from "./types"

export function hashPw(pw: string): string { let h=0; for(let i=0;i<pw.length;i++) h=(Math.imul(31,h)+pw.charCodeAt(i))|0; return h.toString(36) }
const K={me:"tbr_me",theme:"tbr_theme",booted:"tbr_booted",server:"tbr_server"}
function get<T>(k:string,f:T):T{try{const v=localStorage.getItem(k);return v?JSON.parse(v):f}catch{return f}}
function set(k:string,v:unknown){localStorage.setItem(k,JSON.stringify(v))}
export function getServerUrl(){return get<string>(K.server, window.location.origin).replace(/\/$/,"")}
export function setServerUrl(v:string){set(K.server,v.trim().replace(/\/$/,""))}
export function getMe(){return get<User|null>(K.me,null)} export function setMe(u:User|null){set(K.me,u)}
export function getTheme():Theme{return get<Theme>(K.theme,"black")} export function setTheme(t:Theme){set(K.theme,t)}
export function hasBooted(){return get<boolean>(K.booted,false)} export function markBooted(){set(K.booted,true)}
let users:User[]=[]; let reqs:FriendRequest[]=[]; let convos:Conversation[]=[]; let msgs:Record<string,Message[]>={}
async function api(path:string, options:RequestInit={}){const r=await fetch(getServerUrl()+path,{...options,headers:{"Content-Type":"application/json",...(options.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`HTTP ${r.status}`);return d}
export async function registerUser(u:User){const d=await api('/api/register',{method:'POST',body:JSON.stringify(u)});u=d.user;users.push(u);setMe(u);return u}
export async function login(username:string,passwordHash:string|null){const d=await api('/api/login',{method:'POST',body:JSON.stringify({username,passwordHash})});setMe(d.user);return d.user as User}
export async function sync(meId:string){const d=await api('/api/sync?userId='+encodeURIComponent(meId));users=d.users;reqs=d.requests;convos=d.conversations;msgs=d.messages;return d}
export function getAllUsers(){return users} export function findUserByUsername(name:string){return users.find(u=>u.username.toLowerCase()===name.toLowerCase())??null}
export async function sendFriendRequest(from:User,to:User){await api('/api/friend-request',{method:'POST',body:JSON.stringify({fromId:from.id,toId:to.id})});await sync(from.id)}
export async function acceptRequest(id:string){const me=getMe();await api('/api/friend-request/respond',{method:'POST',body:JSON.stringify({id,status:'accepted'})});if(me)await sync(me.id)}
export async function declineRequest(id:string){const me=getMe();await api('/api/friend-request/respond',{method:'POST',body:JSON.stringify({id,status:'declined'})});if(me)await sync(me.id)}
export function getRequests(){return reqs}
export function getFriendsOf(id:string){return reqs.filter(r=>r.status==='accepted'&&(r.fromId===id||r.toId===id)).map(r=>users.find(u=>u.id===(r.fromId===id?r.toId:r.fromId))).filter(Boolean) as User[]}
export async function getOrCreateDM(me:User,other:User){const d=await api('/api/conversation',{method:'POST',body:JSON.stringify({memberIds:[me.id,other.id]})});await sync(me.id);return d.conversation as Conversation}
export async function createGroup(me:User,name:string,members:User[]){const d=await api('/api/conversation',{method:'POST',body:JSON.stringify({name,memberIds:[me.id,...members.map(x=>x.id)]})});await sync(me.id);return d.conversation as Conversation}
export function getConvos(){return convos} export function getConvosFor(id:string){return convos.filter(c=>c.memberIds.includes(id)).sort((a,b)=>b.lastAt-a.lastAt)}
export function getMsgs(id:string){return msgs[id]??[]}
export async function sendMsg(id:string,from:User,text:string){const d=await api('/api/message',{method:'POST',body:JSON.stringify({conversationId:id,fromId:from.id,text})});await sync(from.id);return d.message as Message}
const AVATARS=["🦊","🐺","🐻","🐼","🦁","🐯","🐨","🐸","🦋","🦄","🐙","🦑","🦅","🦉","🐬","🐧","🦝","🦨","🦡"]
export function pickAvatar(){return AVATARS[Math.floor(Math.random()*AVATARS.length)]}
