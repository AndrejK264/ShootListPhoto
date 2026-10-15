const $=s=>document.querySelector(s), app=$('#app');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Math.random().toString(36).slice(2,10);
let db={projects:[]};
const idb=()=>new Promise((ok,no)=>{const r=indexedDB.open('shoots',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
async function load(){try{const d=await idb();return await new Promise(ok=>{const q=d.transaction('kv').objectStore('kv').get('db');q.onsuccess=()=>ok(q.result||{projects:[]});q.onerror=()=>ok({projects:[]})})}catch{return{projects:[]}}}
async function save(){const d=await idb();d.transaction('kv','readwrite').objectStore('kv').put(db,'db')}
const proj=id=>db.projects.find(p=>p.id===id);

function modal(html){const m=document.createElement('div');m.className='modal';m.innerHTML=`<div class="sheet">${html}</div>`;m.onclick=e=>{if(e.target===m)m.remove()};document.body.appendChild(m);return m}

function home(){
  app.innerHTML=`<header><h1>Shoot Lists</h1></header><div class="list">${
    db.projects.length?db.projects.map(p=>{const n=p.shots.length,d=p.shots.filter(s=>s.done).length;
      return `<div class="card" data-id="${p.id}"><div class="body"><div class="t">${esc(p.name)}</div><div class="s">${d}/${n} shots done</div></div><button class="del" data-del="${p.id}">🗑</button></div>`}).join('')
    :'<div class="empty">No projects yet.<br>Tap “+ New project”.</div>'}</div><button class="fab" id="new">+ New project</button>`;
  app.querySelectorAll('.card').forEach(c=>c.onclick=e=>{if(e.target.closest('[data-del]'))return;location.hash='#/p/'+c.dataset.id});
  app.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{const p=proj(b.dataset.del);if(confirm(`Delete “${p.name}” and all its shots?`)){db.projects=db.projects.filter(x=>x!==p);await save();home()}});
  $('#new').onclick=()=>{const m=modal(`<label>Project name<input id="pn" placeholder="e.g. Wedding – Ana & Luka"></label><div class="row"><button class="btn g" id="c">Cancel</button><button class="btn" id="o">Create</button></div>`);
    const go=async()=>{const v=m.querySelector('#pn').value.trim();if(!v)return;db.projects.unshift({id:uid(),name:v,shots:[]});await save();m.remove();home()};
    m.querySelector('#c').onclick=()=>m.remove();m.querySelector('#o').onclick=go;m.querySelector('#pn').focus()};
}

function project(id){
  const p=proj(id);if(!p){location.hash='#/';return}
  const shots=[...p.shots].sort((a,b)=>(a.time||'99:99').localeCompare(b.time||'99:99'));
  app.innerHTML=`<header><button class="back" id="b">‹</button><h1 id="ttl">${esc(p.name)}</h1></header><div class="list">${
    shots.length?shots.map(s=>`<div class="card ${s.done?'done':''}" data-s="${s.id}"><button class="chk" data-c="${s.id}">✓</button><div class="body"><div class="t">${esc(s.title||'Untitled shot')}</div>${s.time?`<div class="time">🕒 ${esc(s.time)}</div>`:''}${s.desc?`<div class="s">${esc(s.desc.slice(0,90))}</div>`:''}${s.photos.length?`<div class="s">📷 ${s.photos.length}</div>`:''}</div></div>`).join('')
    :'<div class="empty">No shots yet.<br>Tap “+ Add shot”.</div>'}</div><button class="fab" id="add">+ Add shot</button>`;
  $('#b').onclick=()=>history.length>1?history.back():location.hash='#/';
  $('#ttl').onclick=()=>{const m=modal(`<label>Rename project<input id="pn" value="${esc(p.name)}"></label><div class="row"><button class="btn g" id="c">Cancel</button><button class="btn" id="o">Save</button></div>`);
    m.querySelector('#c').onclick=()=>m.remove();m.querySelector('#o').onclick=async()=>{const v=m.querySelector('#pn').value.trim();if(v){p.name=v;await save();m.remove();project(id)}}};
  app.querySelectorAll('[data-c]').forEach(b=>b.onclick=async e=>{e.stopPropagation();const s=p.shots.find(x=>x.id===b.dataset.c);s.done=!s.done;await save();project(id)});
  app.querySelectorAll('.card').forEach(c=>c.onclick=()=>shotEditor(p,p.shots.find(x=>x.id===c.dataset.s)));
  $('#add').onclick=()=>shotEditor(p,null);
}

function resize(file){return new Promise(ok=>{const r=new FileReader();r.onload=()=>{const i=new Image();i.onload=()=>{const k=Math.min(1,1280/Math.max(i.width,i.height)),c=document.createElement('canvas');c.width=i.width*k;c.height=i.height*k;c.getContext('2d').drawImage(i,0,0,c.width,c.height);ok(c.toDataURL('image/jpeg',.8))};i.src=r.result};r.readAsDataURL(file)})}

function shotEditor(p,s){
  const d=s?{...s,photos:[...s.photos]}:{id:uid(),title:'',time:'',desc:'',photos:[],done:false};
  const m=modal(`<label>Title<input id="t" value="${esc(d.title)}" placeholder="e.g. First kiss"></label>
  <label>Time<input id="tm" type="time" value="${esc(d.time)}"></label>
  <label>Description<textarea id="ds">${esc(d.desc)}</textarea></label>
  <label>Example photos</label><div class="photos" id="ph"></div>
  <input id="f" type="file" accept="image/*" multiple hidden>
  <div class="row"><button class="btn g" id="c">Cancel</button><button class="btn" id="o">Save</button></div>
  ${s?'<button class="btn r" id="x">Delete shot</button>':''}`);
  const q=x=>m.querySelector(x);
  const draw=()=>{q('#ph').innerHTML=d.photos.map((u,i)=>`<div class="ph"><img src="${u}" data-v="${i}"><b data-r="${i}">✕</b></div>`).join('')+'<button class="add" id="a">+</button>';
    q('#a').onclick=()=>q('#f').click();
    q('#ph').querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{d.photos.splice(+b.dataset.r,1);draw()});
    q('#ph').querySelectorAll('[data-v]').forEach(im=>im.onclick=()=>{const v=document.createElement('div');v.className='big';v.innerHTML=`<img src="${d.photos[+im.dataset.v]}">`;v.onclick=()=>v.remove();document.body.appendChild(v)})};
  draw();
  q('#f').onchange=async e=>{for(const f of e.target.files)d.photos.push(await resize(f));draw()};
  q('#c').onclick=()=>m.remove();
  q('#o').onclick=async()=>{d.title=q('#t').value.trim();d.time=q('#tm').value;d.desc=q('#ds').value.trim();
    if(!d.title&&!d.desc&&!d.photos.length){q('#t').focus();return}
    if(s)Object.assign(s,d);else p.shots.push(d);await save();m.remove();project(p.id)};
  if(s)q('#x').onclick=async()=>{if(confirm('Delete this shot?')){p.shots=p.shots.filter(x=>x!==s);await save();m.remove();project(p.id)}};
}

function route(){const h=location.hash;document.querySelectorAll('.modal,.big').forEach(e=>e.remove());h.startsWith('#/p/')?project(h.slice(4)):home()}
window.onhashchange=route;
load().then(d=>{db=d;route()});
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');
