/* =========================================================
   GIO PERFORMANCE — V1
   01 Training Journal · 02 Speed Training
   Vanilla JS, hash routing, LocalStorage persistence.
   ========================================================= */
(function(){
'use strict';

/* ---------------- utils ---------------- */
const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));
const esc = v => String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const uid = p => (p||'id')+'-'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const pad = n => String(n).padStart(2,'0');
const iso = d => d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parse = s => { const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); };
const todayISO = () => iso(new Date());
const addDays = (s,n) => { const d=parse(s); d.setDate(d.getDate()+n); return iso(d); };
const wd = s => (parse(s).getDay()+6)%7;
const mondayOf = s => addDays(s,-wd(s));
const monthStart = s => s.slice(0,8)+'01';
const monthEnd = s => { const d=parse(s); return iso(new Date(d.getFullYear(), d.getMonth()+1, 0)); };
const fmtLong = s => { const d=parse(s); return `${DAYS_KA[wd(s)]}, ${d.getDate()} ${MONTHS_KA[d.getMonth()]}`; };
const fmtShort = s => { const d=parse(s); return `${d.getDate()} ${MONTHS_KA[d.getMonth()].slice(0,3)}.`; };
const fmtNum = s => { const d=parse(s); return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}`; };
const fmtMonth = s => { const d=parse(s); return `${MONTHS_KA[d.getMonth()]} ${d.getFullYear()}`; };
const minD = (a,b) => a<b?a:b, maxD = (a,b) => a>b?a:b;

/* ---------------- icons ---------------- */
const P = {
  home:'<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  bolt:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  journal:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 3v18M11 8h6M11 12h6M11 16h4"/>',
  cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  timer:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M10 2h4"/>',
  alert:'<path d="M12 3l10 18H2z"/><path d="M12 10v4M12 17.5v.5"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  video:'<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3"/>',
  image:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 9"/>',
  down:'<path d="M12 4v12M6 10l6 6 6-6M4 20h16"/>',
  up:'<path d="M12 20V8M6 14l6-6 6 6M4 4h16"/>',
  copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  left:'<path d="M15 5l-7 7 7 7"/>',
  right:'<path d="M9 5l7 7-7 7"/>',
  save:'<path d="M5 3h11l4 4v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M8 3v5h7M8 21v-7h8v7"/>',
  ext:'<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'
};
const ic = (n,cls='icon') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]||''}</svg>`;

/* ---------------- storage ---------------- */
const KEY = 'gio-performance:v1-core';
let storageOK = true;
function seed(){
  return {
    version: 1,
    athlete: { name:'გიორგი', short:'Gio', specialist:'შიო' },
    schedule: clone(SEED_SCHEDULE),
    dayEdits: {},          // date -> { removed:[id], times:{id:'HH:MM'}, extras:[{id,time,type,note}] }
    attendance: {},        // 'date|id' -> { status, duration, rating, comment, time, type, date, id, updatedAt }
    journalStart: todayISO(),
    exercises: clone(SEED_EXERCISES),
    speedLogs: [],         // { id, exId, date, status, sets, reps, notes }
    meta: { created: new Date().toISOString(), savedAt: null }
  };
}
function migrate(d){
  const b = seed();
  for(const k of Object.keys(b)) if(d[k]===undefined) d[k]=b[k];
  return d;
}
function load(){
  try{ const raw = localStorage.getItem(KEY); return raw ? migrate(JSON.parse(raw)) : null; }
  catch(e){ storageOK=false; return null; }
}
let S = load() || seed();
function save(msg){
  S.meta.savedAt = new Date().toISOString();
  try{ localStorage.setItem(KEY, JSON.stringify(S)); storageOK = true; }
  catch(e){ storageOK = false; toast('შენახვა ვერ მოხერხდა — ბრაუზერის მეხსიერება სავსეა ან დაბლოკილია.'); }
  paintSaveDot();
  if(msg && storageOK) toast(msg);
}
if(!S.meta.savedAt) save();

/* ---------------- schedule domain ---------------- */
const T = t => TYPES[t] || TYPES.OTHER;
const activeOn = (e,date) => e.day===wd(date) && (!e.from || date>=e.from) && (!e.until || date<=e.until);
const edits = date => S.dayEdits[date] || { removed:[], times:{}, extras:[] };
function editsW(date){
  if(!S.dayEdits[date]) S.dayEdits[date] = { removed:[], times:{}, extras:[] };
  return S.dayEdits[date];
}
/** All planned sessions of a date (weekly schedule + one-off changes). */
function sessionsFor(date){
  const ed = edits(date);
  const list = S.schedule.filter(e=>activeOn(e,date) && !ed.removed.includes(e.id))
    .map(e=>({ id:e.id, date, time: ed.times[e.id] || e.time, type:e.type, note:e.note, extra:false }));
  ed.extras.forEach(x=>list.push({ ...x, date, extra:true }));
  return list.sort((a,b)=>(a.time||'99').localeCompare(b.time||'99'));
}
const aKey = (date,id) => date+'|'+id;
const attOf = (date,id) => S.attendance[aKey(date,id)] || null;

const STATUS = {
  attended:{ t:'დაესწრო',    c:'green'  },
  partial: { t:'ნაწილობრივ', c:'yellow' },
  missed:  { t:'გააცდინა',   c:'red'    }
};

/** Journal statistics for an inclusive date range, counted only up to today and from the journal start. */
function stats(from, to){
  const end = minD(to, todayISO()), start = maxD(from, S.journalStart);
  const g = {}; STAT_GROUPS.forEach(([k])=>g[k]={planned:0,attended:0,partial:0,missed:0,open:0});
  const tot = {planned:0,attended:0,partial:0,missed:0,open:0};
  for(let d=start; d<=end; d=addDays(d,1)){
    sessionsFor(d).forEach(s=>{
      const a = attOf(d,s.id), k = T(s.type).group, st = a ? a.status : 'open';
      [g[k],tot].forEach(o=>{ o.planned++; o[st]++; });
    });
  }
  const pct = o => { const m=o.attended+o.partial+o.missed; return m? Math.round((o.attended+o.partial*.5)/m*100) : null; };
  Object.values(g).forEach(o=>o.pct=pct(o)); tot.pct=pct(tot);
  return { tot, g, start, end, empty: start>end };
}

/* ---------------- speed domain ---------------- */
const exById = id => S.exercises.find(e=>e.id===id);
const logsOf = id => S.speedLogs.filter(l=>l.exId===id).sort((a,b)=>b.date.localeCompare(a.date) || (b.createdAt||'').localeCompare(a.createdAt||''));
const LOG_STATUS = { done:{t:'შესრულდა',c:'green'}, partial:{t:'ნაწილობრივ',c:'yellow'} };

/* ---------------- drill diagram (top-down court view) ---------------- */
let dgN=0;
function poseSVG(p){
  const L = (pts,c='#f3f4f6') => `<polyline points="${pts}" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
  const H = (x,y) => `<circle cx="${x}" cy="${y}" r="2.6" fill="#f3f4f6"/>`;
  return ({
    stance: H(17,5)+L('16,9 11,18')+L('11,18 16,23 13,29 17,29')+L('11,18 13,23 9,29 13,29','#9097a2')+L('15,10 19,15 22,13'),
    split:  H(20,5)+L('18,9 13,17')+L('13,17 19,22 19,29 22,29')+L('13,17 9,23 5,28 7,29','#9097a2')+L('17,10 21,14')+L('17,10 13,14','#9097a2'),
    fall:   H(21,5)+L('20,8 12,27')+L('12,27 11,29 15,29')+L('18,12 20,18')+L('17,12 15,18','#9097a2'),
    slide:  H(15,5)+L('15,8 15,18')+L('9,11 21,11')+L('9,11 4,15')+L('21,11 26,15')+L('15,18 8,23 5,29')+L('15,18 22,23 25,29'),
    stop:   H(15,8)+L('14,11 10,20')+L('10,20 17,24 14,29 18,29')+L('10,20 12,25 8,29 12,29','#9097a2')+L('13,13 18,16')
  })[p] || '';
}
function diagramSVG(spec, cls='diagram'){
  spec = spec || {};
  const id = 'dg'+(++dgN);
  const C = { run:'#ff6b1f', slide:'#3ee27e', walk:'#9097a2', back:'#5aa9ff' };
  let g = `<rect width="120" height="70" fill="#101215"/>`;
  for(let x=10;x<120;x+=10) g+=`<line x1="${x}" y1="0" x2="${x}" y2="70" stroke="#1b1e22" stroke-width=".4"/>`;
  if(spec.court){
    g += `<path d="M18 0 V22 A42 42 0 0 0 102 22 V0" fill="none" stroke="#3a3f47" stroke-width=".8"/><rect x="45" y="0" width="30" height="36" fill="rgba(255,107,31,.06)" stroke="#3a3f47" stroke-width=".8"/><circle cx="60" cy="5" r="2.2" fill="none" stroke="#ff6b1f" stroke-width=".8"/>`;
  }
  (spec.paths||[]).forEach(p=>{
    const c = C[p.s]||C.run, dash = p.s==='slide'?'3 2':p.s==='walk'?'1 2':p.s==='back'?'4 2':'';
    g += `<polyline points="${p.p.map(q=>q.join(',')).join(' ')}" fill="none" stroke="${c}" stroke-width="1.4" ${dash?`stroke-dasharray="${dash}"`:''} marker-end="url(#${id}-${p.s||'run'})" stroke-linecap="round"/>`;
  });
  (spec.cones||[]).forEach(([x,y])=> g+=`<path d="M${x} ${y-3.2} L${x+2.8} ${y+2} L${x-2.8} ${y+2} Z" fill="#ff6b1f" stroke="#ffb084" stroke-width=".4"/>`);
  (spec.stop||[]).forEach(([x,y])=> g+=`<rect x="${x-3}" y="${y-3}" width="6" height="6" rx="1" fill="none" stroke="#ffc53d" stroke-width="1"/><path d="M${x-1.6} ${y} h3.2" stroke="#ffc53d" stroke-width="1"/>`);
  if(spec.cue){
    const [x,y,t]=spec.cue;
    if(t==='ball') g+=`<circle cx="${x}" cy="${y}" r="3.6" fill="#ff6b1f"/><path d="M${x-3.6} ${y} h7.2 M${x} ${y-3.6} v7.2" stroke="#1a0d05" stroke-width=".5"/>`;
    else if(t==='eye') g+=`<path d="M${x-5} ${y} Q${x} ${y-4} ${x+5} ${y} Q${x} ${y+4} ${x-5} ${y}Z" fill="none" stroke="#5aa9ff" stroke-width="1"/><circle cx="${x}" cy="${y}" r="1.4" fill="#5aa9ff"/>`;
    else g+=`<circle cx="${x}" cy="${y}" r="4" fill="#1d2024" stroke="#5aa9ff" stroke-width="1"/><text x="${x}" y="${y+1.6}" font-size="4.6" text-anchor="middle" fill="#5aa9ff" font-family="sans-serif" font-weight="700">C</text>`;
  }
  if(spec.start){
    const [x,y,a]=spec.start, r=a*Math.PI/180;
    g += `<circle cx="${x}" cy="${y}" r="3.4" fill="#f3f4f6"/><line x1="${x}" y1="${y}" x2="${(x+Math.cos(r)*5.5).toFixed(1)}" y2="${(y+Math.sin(r)*5.5).toFixed(1)}" stroke="#f3f4f6" stroke-width="1.4" stroke-linecap="round"/><text x="${x}" y="${y+1.3}" font-size="3.4" text-anchor="middle" fill="#0c0d0f" font-family="sans-serif" font-weight="700">G</text>`;
  }
  if(spec.pose) g += `<g transform="translate(2,38)"><rect x="0" y="0" width="30" height="31" rx="3" fill="#15171a" stroke="#2a2e34" stroke-width=".5"/>${poseSVG(spec.pose)}</g>`;
  const mk = Object.entries(C).map(([k,c])=>`<marker id="${id}-${k}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="${c}"/></marker>`).join('');
  return `<svg class="${cls}" viewBox="0 0 120 70" role="img" aria-label="სავარჯიშოს სქემა"><defs>${mk}</defs>${g}</svg>`;
}
const DIAG_LEGEND = `<div class="legend"><span><i class="dotc" style="--c:#ff6b1f"></i>აჩქარება</span><span><i class="dotc" style="--c:#3ee27e"></i>გვერდითი სრიალი</span><span><i class="dotc" style="--c:#9097a2"></i>შენელება / სიარული</span><span><i class="dotc" style="--c:#ffc53d"></i>გაჩერება</span><span><i class="dotc" style="--c:#5aa9ff"></i>სიგნალი</span><span><b>G</b> — გიორგი</span></div>`;
const exMedia = (e, cls='diagram') => e.photo ? `<img class="${cls} photo" src="${esc(e.photo)}" alt="${esc(e.name)}">` : diagramSVG(e.diagram, cls);

/* ---------------- UI helpers ---------------- */
let toastT;
function toast(msg){
  let t=$('#toast'); if(t) t.remove();
  t=document.createElement('div'); t.id='toast'; t.className='toast'; t.setAttribute('role','status'); t.textContent=msg; document.body.appendChild(t);
  clearTimeout(toastT); toastT=setTimeout(()=>t.remove(),2400);
}
function paintSaveDot(){
  const el=$('#saveDot'); if(!el) return;
  el.classList.toggle('err',!storageOK);
  el.querySelector('span').textContent = storageOK ? 'შენახულია ამ მოწყობილობაზე' : 'შენახვა ვერ ხერხდება';
}
let M = {}, modalSave = null;
function openModal(title, body, opts={}){
  closeModal();
  const bg=document.createElement('div'); bg.className='modal-bg'; bg.id='modalBg';
  bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="modal-h"><h2>${esc(title)}</h2><button class="modal-x" data-a="closeModal" aria-label="დახურვა">${ic('x')}</button></div>
    <div class="modal-b">${body}</div>
    ${opts.footer===false?'':`<div class="modal-f">${opts.left||''}<button class="btn ghost" data-a="closeModal">გაუქმება</button>${opts.save!==false?`<button class="btn primary" data-a="modalSave">${esc(opts.saveText||'შენახვა')}</button>`:''}</div>`}
  </div>`;
  bg.addEventListener('click',e=>{ if(e.target===bg) closeModal(); });
  document.body.appendChild(bg);
  modalSave = opts.onSave || null;
}
function closeModal(){ const m=$('#modalBg'); if(m) m.remove(); modalSave=null; }
function confirmBox(title, text, okText, fn){ openModal(title, `<p class="muted">${text}</p>`, { saveText:okText, onSave:()=>{ fn(); return true; } }); }
const seg = (field, vals, cur, cls='') => `<div class="seg ${cls}">${vals.map(v=>{ const [val,lab]=Array.isArray(v)?v:[v,v]; return `<button type="button" data-seg="${field}" data-v="${esc(val)}" class="${String(cur)===String(val)?'on':''}">${esc(lab)}</button>`; }).join('')}</div>`;
const val = id => { const el=document.getElementById(id); return el? el.value.trim() : ''; };
const typeOptions = cur => Object.entries(TYPES).map(([k,v])=>`<option value="${k}" ${cur===k?'selected':''}>${esc(v.full)}</option>`).join('');
const cleanUrl = u => /^https:\/\/\S+$/i.test(u) ? u : '';

/* ---------------- routing ---------------- */
const NAV = [['home','home','მთავარი'],['journal','journal','ჟურნალი'],['speed','bolt','Speed'],['backup','save','Backup']];
function route(){
  const h=(location.hash||'').replace('#','');
  if(h.startsWith('sx-') && exById(h.slice(3))) return h;
  return ['home','journal','speed','backup'].includes(h) ? h : 'home';
}
const ui = { week: mondayOf(todayISO()), jTab:'week', range:'week', hist:'week', cat:'all', q:'' };
function render(){
  const r = route();
  const html = r.startsWith('sx-') ? pageExercise(r.slice(3)) : ({ home:pageHome, journal:pageJournal, speed:pageSpeed, backup:pageBackup })[r]();
  $('#view').innerHTML = `<div class="page view-in">${html}</div>`;
  const nk = r.startsWith('sx-') ? 'speed' : r;
  $$('[data-nav]').forEach(a=>a.classList.toggle('active', a.dataset.nav===nk));
}
function go(r){ if(location.hash==='#'+r) render(); else location.hash=r; window.scrollTo({top:0}); }

/* =========================================================
   HOME
   ========================================================= */
function pageHome(){
  const t=todayISO(), today=sessionsFor(t), ws=stats(mondayOf(t), addDays(mondayOf(t),6));
  const weekLogs = S.speedLogs.filter(l=>l.date>=mondayOf(t) && l.date<=t).length;
  return `
  <section class="hero v1">
    <div class="hero-in">
      <div>
        <div class="eyebrow">Athlete Management System · Version 1</div>
        <div class="name">GIO PERFORMANCE</div>
        <div class="meta">${esc(S.athlete.name)} · ${esc(fmtLong(t))}</div>
      </div>
    </div>
  </section>

  <div class="sections">
    <a class="sec-card" href="#journal">
      <div class="sec-no">01</div>
      <div class="sec-body">
        <h2>TRAINING JOURNAL</h2>
        <p>გიორგის სრული განრიგი, დასწრება და ვარჯიშების ისტორია.</p>
        <div class="sec-stats"><span><b class="num">${ws.tot.attended}</b> დაესწრო ამ კვირაში</span><span><b class="num">${ws.tot.missed}</b> გააცდინა</span><span><b class="num">${ws.tot.pct==null?'—':ws.tot.pct+'%'}</b> დასწრება</span></div>
      </div>
      ${ic('right','icon sec-go')}
    </a>
    <a class="sec-card" href="#speed">
      <div class="sec-no">02</div>
      <div class="sec-body">
        <h2>SPEED TRAINING</h2>
        <p>სისწრაფის სავარჯიშოები, ინსტრუქციები და შესრულების აღრიცხვა.</p>
        <div class="sec-stats"><span><b class="num">${S.exercises.length}</b> სავარჯიშო</span><span><b class="num">5</b> კატეგორია</span><span><b class="num">${weekLogs}</b> აღრიცხვა ამ კვირაში</span></div>
      </div>
      ${ic('right','icon sec-go')}
    </a>
  </div>

  <div class="card">
    <div class="card-h"><div><div class="eyebrow">დღეს</div><h2>${esc(fmtLong(t))}</h2></div><a class="btn sm ghost" href="#journal">მთელი კვირა ${ic('right')}</a></div>
    <div class="stack">${today.length ? today.map(s=>sessionRow(s)).join('') : `<div class="empty">დღეს ვარჯიში არ არის დაგეგმილი.<button class="btn sm" data-a="addSession" data-x="${t}">${ic('plus')} ვარჯიშის დამატება</button></div>`}</div>
  </div>

  <p class="small muted">მესამე და სხვა სექციები დაემატება შემდეგ ვერსიებში.</p>`;
}

/* =========================================================
   01 — TRAINING JOURNAL
   ========================================================= */
function sessionRow(s){
  const a = attOf(s.date, s.id), Ty=T(s.type);
  const meta = [s.extra?'ერთჯერადი':'', s.note, a&&a.duration?a.duration+' წთ':'', a&&a.rating?'შეფასება '+a.rating+'/5':'', a&&a.comment?'„'+a.comment+'“':''].filter(Boolean).join(' · ');
  return `<div class="ev ${Ty.cls} ${a&&a.status==='missed'?'missed':''}">
    <div class="time">${esc(s.time||'—')}</div>
    <div class="what"><b>${esc(Ty.full)}</b><span>${esc(meta || 'დასწრება ჯერ არ არის მონიშნული')}</span></div>
    <div class="actions">
      <div class="att-seg" role="group" aria-label="დასწრება">
        ${Object.entries(STATUS).map(([k,v])=>`<button type="button" class="att ${k} ${a&&a.status===k?'on':''}" data-a="mark" data-x="${s.date}" data-y="${s.id}" data-z="${k}" aria-pressed="${!!(a&&a.status===k)}">${v.t}</button>`).join('')}
      </div>
      <button class="btn sm ghost" data-a="sessionModal" data-x="${s.date}" data-y="${s.id}" aria-label="დეტალები">${ic('edit')}</button>
    </div>
  </div>`;
}

function pageJournal(){
  const tabs = [['week','კვირა'],['stats','სტატისტიკა'],['history','ისტორია'],['schedule','განრიგი']];
  const body = ({ week:journalWeek, stats:journalStats, history:journalHistory, schedule:journalSchedule })[ui.jTab]();
  return `
  <div class="page-head"><div><div class="eyebrow">01 — Training Journal</div><h1>ვარჯიშების ჟურნალი</h1><p class="lead">განრიგი ყოველ კვირას თავისით მეორდება. შენ მხოლოდ დასწრებას ნიშნავ.</p></div></div>
  <div class="filters" role="tablist">${tabs.map(([k,l])=>`<button role="tab" class="${ui.jTab===k?'on':''}" data-a="jTab" data-x="${k}">${l}</button>`).join('')}</div>
  ${body}`;
}

function journalWeek(){
  const mon=ui.week, t=todayISO(), st=stats(mon, addDays(mon,6));
  const days=[0,1,2,3,4,5,6].map(i=>addDays(mon,i));
  return `
  <div class="row" style="justify-content:space-between">
    <h2>${fmtShort(mon)} – ${fmtShort(addDays(mon,6))}</h2>
    <div class="week-nav"><button class="btn sm" data-a="week" data-x="-7" aria-label="წინა კვირა">${ic('left')}</button><button class="btn sm" data-a="week" data-x="0">ეს კვირა</button><button class="btn sm" data-a="week" data-x="7" aria-label="შემდეგი კვირა">${ic('right')}</button></div>
  </div>
  ${st.empty?'':`<div class="mini-stats"><span>დაგეგმილი <b class="num">${st.tot.planned}</b></span><span class="g">დაესწრო <b class="num">${st.tot.attended}</b></span><span class="y">ნაწილობრივ <b class="num">${st.tot.partial}</b></span><span class="r">გააცდინა <b class="num">${st.tot.missed}</b></span><span>მოუნიშნავი <b class="num">${st.tot.open}</b></span><span>დასწრება <b class="num">${st.tot.pct==null?'—':st.tot.pct+'%'}</b></span></div>`}
  <div class="stack" style="gap:12px">
  ${days.map(d=>{ const ss=sessionsFor(d); return `
    <section class="day ${d===t?'today':''}">
      <div class="day-h"><div><b>${DAYS_KA[wd(d)]}</b> <span class="muted">${fmtShort(d)}</span>${d===t?' <span class="chip accent">დღეს</span>':''}</div>
        <button class="btn sm ghost" data-a="addSession" data-x="${d}">${ic('plus')} დამატება</button></div>
      <div class="stack">${ss.length? ss.map(s=>sessionRow(s)).join('') : `<div class="small muted" style="padding:4px 2px">${wd(d)===6?'დასვენება / შესაძლო თამაში':'ვარჯიში არ არის'}</div>`}</div>
    </section>`; }).join('')}
  </div>`;
}

function statCards(s){
  return `<div class="grid g4">
    <div class="card stat"><div class="label">დაგეგმილი</div><div class="value">${s.tot.planned}</div><div class="sub">მოუნიშნავი: ${s.tot.open}</div></div>
    <div class="card stat"><div class="label">დაესწრო</div><div class="value" style="color:var(--green)">${s.tot.attended}</div><div class="sub">ნაწილობრივ: ${s.tot.partial}</div></div>
    <div class="card stat"><div class="label">გააცდინა</div><div class="value" style="color:var(--red)">${s.tot.missed}</div><div class="sub">&nbsp;</div></div>
    <div class="card stat"><div class="label">დასწრება</div><div class="value">${s.tot.pct==null?'—':s.tot.pct}<small>${s.tot.pct==null?'':'%'}</small></div><div class="bar"><i style="width:${s.tot.pct||0}%"></i></div></div>
  </div>`;
}
function journalStats(){
  const t=todayISO();
  const R = { week:[mondayOf(t), addDays(mondayOf(t),6), 'ეს კვირა'], month:[monthStart(t), monthEnd(t), fmtMonth(t)], all:[S.journalStart, t, 'აღრიცხვის დაწყებიდან'] }[ui.range];
  const s = stats(R[0], R[1]);
  return `
  <div class="row" style="justify-content:space-between">${seg('range',[['week','ეს კვირა'],['month','ეს თვე'],['all','ყველა']],ui.range,'text compact')}<span class="small muted">${esc(R[2])} · ${s.empty?'—':fmtNum(s.start)+' – '+fmtNum(s.end)}</span></div>
  ${s.empty?`<div class="empty">ამ პერიოდში აღრიცხვა ჯერ არ დაწყებულა (დაწყება: ${fmtNum(S.journalStart)}).</div>`:`
  ${statCards(s)}
  <div class="card">
    <div class="card-h"><h2>გუნდების მიხედვით</h2></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>ვარჯიში</th><th>დაგეგმილი</th><th>დაესწრო</th><th>ნაწილობრივ</th><th>გააცდინა</th><th>მოუნიშნავი</th><th>დასწრება</th></tr></thead><tbody>
    ${STAT_GROUPS.map(([k,l])=>{ const o=s.g[k]; return `<tr><td><b>${esc(l)}</b></td><td class="n">${o.planned}</td><td class="n">${o.attended}</td><td class="n">${o.partial}</td><td class="n">${o.missed}</td><td class="n">${o.open}</td><td class="n">${o.pct==null?'—':o.pct+'%'}</td></tr>`; }).join('')}
    </tbody></table></div>
    <p class="small muted" style="margin-top:10px">დასწრება % = (დაესწრო + ნაწილობრივ × ½) ÷ მონიშნული ვარჯიშები. მოუნიშნავი ვარჯიში პროცენტში არ ითვლება. ითვლება მხოლოდ დღევანდელ დღემდე.</p>
  </div>`}`;
}

function journalHistory(){
  const t=todayISO(), periods=[];
  if(ui.hist==='week'){ for(let m=mondayOf(t); m>=mondayOf(S.journalStart); m=addDays(m,-7)) periods.push([m, addDays(m,6), `${fmtShort(m)} – ${fmtShort(addDays(m,6))}`]); }
  else { let d=monthStart(t); while(d>=monthStart(S.journalStart)){ periods.push([d, monthEnd(d), fmtMonth(d)]); d=monthStart(addDays(d,-1)); } }
  return `
  <div class="row" style="justify-content:space-between">${seg('hist',[['week','კვირების მიხედვით'],['month','თვეების მიხედვით']],ui.hist,'text compact')}
    <span class="small muted">აღრიცხვა დაიწყო: ${fmtNum(S.journalStart)}</span></div>
  <div class="stack">
  ${periods.map(([a,b,l],i)=>{ const s=stats(a,b); const rows=[]; for(let d=maxD(a,S.journalStart); d<=minD(b,t); d=addDays(d,1)) sessionsFor(d).forEach(x=>rows.push(x));
    return `<details class="period" ${i===0?'open':''}>
      <summary><b>${esc(l)}</b><span class="mini-stats inline"><span>${s.tot.planned} დაგეგმ.</span><span class="g">${s.tot.attended} დაესწრო</span><span class="y">${s.tot.partial} ნაწ.</span><span class="r">${s.tot.missed} გააცდ.</span>${s.tot.open?`<span>${s.tot.open} მოუნიშნ.</span>`:''}<span><b>${s.tot.pct==null?'—':s.tot.pct+'%'}</b></span></span></summary>
      ${rows.length?`<div class="tbl-wrap" style="margin-top:10px"><table class="tbl"><thead><tr><th>თარიღი</th><th>დრო</th><th>ვარჯიში</th><th>სტატუსი</th><th>ხანგრძ.</th><th>შეფასება</th><th>კომენტარი</th></tr></thead><tbody>
      ${rows.reverse().map(x=>{ const at=attOf(x.date,x.id); return `<tr class="click" data-a="sessionModal" data-x="${x.date}" data-y="${x.id}"><td>${fmtNum(x.date)}<div class="small muted">${DAYS_SHORT[wd(x.date)]}</div></td><td class="n">${esc(x.time||'—')}</td><td>${esc(T(x.type).full)}</td><td>${at?`<span class="chip ${STATUS[at.status].c}">${STATUS[at.status].t}</span>`:'<span class="chip none">მოუნიშნავი</span>'}</td><td class="n">${at&&at.duration?esc(at.duration)+' წთ':'—'}</td><td class="n">${at&&at.rating?esc(at.rating)+'/5':'—'}</td><td class="muted">${esc(at&&at.comment||'')}</td></tr>`; }).join('')}
      </tbody></table></div>`:'<p class="small muted" style="margin-top:8px">ამ პერიოდში ჯერ ვარჯიში არ ყოფილა.</p>'}
    </details>`; }).join('')}
  </div>`;
}

function journalSchedule(){
  const t=todayISO(), act=S.schedule.filter(e=>!e.until || e.until>=t);
  return `
  <div class="card">
    <div class="card-h"><div><h2>ყოველკვირეული განრიგი</h2><p class="small muted" style="margin-top:4px">ეს განრიგი ავტომატურად მეორდება ყოველ კვირას. ცვლილება მოქმედებს დღეიდან და ძველ ისტორიას არ ცვლის.</p></div><button class="btn primary" data-a="schedModal" data-x="">${ic('plus')} დამატება</button></div>
    <div class="sched">${DAYS_KA.map((dn,i)=>{ const evs=act.filter(e=>e.day===i).sort((a,b)=>(a.time||'').localeCompare(b.time||'')); return `
      <div class="sched-day"><div class="eyebrow">${dn}</div>
      ${evs.map(e=>`<button class="ev ${T(e.type).cls} sched-ev" data-a="schedModal" data-x="${e.id}"><span class="time">${esc(e.time||'—')}</span><span class="what"><b>${esc(T(e.type).full)}</b>${e.note?`<span>${esc(e.note)}</span>`:''}${e.from&&e.from>t?`<span>${fmtShort(e.from)}-დან</span>`:''}</span>${ic('edit')}</button>`).join('') || '<span class="small muted">—</span>'}
      </div>`; }).join('')}</div>
  </div>
  <div class="card">
    <div class="card-h"><h2>აღრიცხვის დაწყების თარიღი</h2></div>
    <p class="small muted">სტატისტიკა და ისტორია ითვლება ამ თარიღიდან. თუ გინდა ძველი ვარჯიშების შეყვანა, დააყენე ადრეული თარიღი.</p>
    <div class="row" style="margin-top:10px"><input class="inp" type="date" id="jStart" value="${S.journalStart}" max="${t}" style="max-width:220px"><button class="btn sm" data-a="setJStart">შენახვა</button></div>
  </div>`;
}

/* ---------- journal modals ---------- */
function sessionModal(date, id){
  const s = sessionsFor(date).find(x=>x.id===id);
  if(!s){ toast('ვარჯიში ვერ მოიძებნა'); return; }
  const a = attOf(date,id) || {};
  M = { status:a.status||null, rating:a.rating||null };
  openModal(T(s.type).full, `
  <div class="stack" style="gap:14px">
    <p class="muted small">${esc(fmtLong(date))}${s.extra?' · ერთჯერადი ვარჯიში':' · ყოველკვირეული განრიგიდან'}</p>
    <div class="field"><span class="lbl">დასწრება</span>${seg('status',[['attended','დაესწრო'],['partial','ნაწილობრივ'],['missed','გააცდინა']],M.status,'text attseg')}</div>
    <div class="grid g2">
      <div class="field"><label for="sTime">დრო (ამ დღეს)</label><input class="inp" type="time" id="sTime" value="${esc(s.time||'')}"></div>
      <div class="field"><label for="sDur">ხანგრძლივობა (წთ)</label><input class="inp" type="number" inputmode="numeric" min="0" max="400" id="sDur" value="${esc(a.duration||'')}" placeholder="მაგ. 90"></div>
    </div>
    ${s.extra?`<div class="field"><label for="sType">ტიპი</label><select class="inp" id="sType">${typeOptions(s.type)}</select></div>`:''}
    <div class="field"><span class="lbl">შეფასება (არასავალდებულო)</span>${seg('rating',[1,2,3,4,5],M.rating)}<div class="scale-hint"><span>1 — ცუდი</span><span>5 — შესანიშნავი</span></div></div>
    <div class="field"><label for="sComment">კომენტარი</label><textarea class="inp" id="sComment" placeholder="რატომ გააცდინა ან რა მოხდა ვარჯიშზე">${esc(a.comment||'')}</textarea></div>
    ${a.status?`<button class="btn sm ghost" data-a="clearAtt" data-x="${date}" data-y="${id}" style="align-self:flex-start">მონიშვნის მოხსნა</button>`:''}
  </div>`, {
    left:`<button class="btn danger" data-a="removeSession" data-x="${date}" data-y="${id}" style="margin-right:auto">${ic('trash')} ${s.extra?'წაშლა':'ამ დღეს არ არის'}</button>`,
    onSave:()=>{
      const time=val('sTime'), ed=editsW(date);
      if(s.extra){ const x=ed.extras.find(y=>y.id===id); x.time=time; x.type=val('sType')||x.type; }
      else if(time && time!==S.schedule.find(e=>e.id===id).time) ed.times[id]=time; else delete ed.times[id];
      const has = M.status || val('sDur') || val('sComment') || M.rating;
      if(has){
        if(!M.status){ toast('აირჩიე დასწრების სტატუსი'); return false; }
        S.attendance[aKey(date,id)] = { date, id, type: s.extra ? (val('sType')||s.type) : s.type, time, status:M.status, duration: val('sDur')?+val('sDur'):null, rating: M.rating?+M.rating:null, comment: val('sComment'), updatedAt:new Date().toISOString() };
      }
      save('შენახულია'); return true;
    }
  });
}
function addSessionModal(date){
  openModal('ვარჯიშის დამატება', `
  <div class="stack" style="gap:14px">
    <div class="grid g2">
      <div class="field"><label for="nDate">თარიღი</label><input class="inp" type="date" id="nDate" value="${date}"></div>
      <div class="field"><label for="nTime">დრო</label><input class="inp" type="time" id="nTime"></div>
    </div>
    <div class="field"><label for="nType">ტიპი</label><select class="inp" id="nType">${typeOptions('GAME')}</select></div>
    <div class="field"><label for="nNote">შენიშვნა</label><input class="inp" id="nNote" placeholder="მაგ. მოწინააღმდეგე, ადგილი"></div>
    <p class="small muted">ერთჯერადი ვარჯიში ემატება მხოლოდ ამ დღეს. ყოველკვირეული ვარჯიშისთვის გამოიყენე „განრიგი“.</p>
  </div>`, { saveText:'დამატება', onSave:()=>{
    const d=val('nDate'); if(!d){ toast('აირჩიე თარიღი'); return false; }
    editsW(d).extras.push({ id:uid('x'), time:val('nTime'), type:val('nType'), note:val('nNote') });
    ui.week=mondayOf(d); save('დაემატა'); return true; } });
}
function schedModal(id){
  const e = id ? S.schedule.find(x=>x.id===id) : { day:0, time:'', type:'16A', note:'' };
  openModal(id?'განრიგის შეცვლა':'განრიგში დამატება', `
  <div class="stack" style="gap:14px">
    <div class="grid g2">
      <div class="field"><label for="gDay">დღე</label><select class="inp" id="gDay">${DAYS_KA.map((d,i)=>`<option value="${i}" ${e.day===i?'selected':''}>${d}</option>`).join('')}</select></div>
      <div class="field"><label for="gTime">დრო</label><input class="inp" type="time" id="gTime" value="${esc(e.time)}"></div>
    </div>
    <div class="field"><label for="gType">გუნდი / ვარჯიში</label><select class="inp" id="gType">${typeOptions(e.type)}</select></div>
    <div class="field"><label for="gNote">შენიშვნა</label><input class="inp" id="gNote" value="${esc(e.note||'')}"></div>
    <p class="small muted">ცვლილება მოქმედებს დღეიდან. უკვე აღრიცხული ისტორია უცვლელი რჩება.</p>
  </div>`, {
    left: id?`<button class="btn danger" data-a="deleteSched" data-x="${id}" style="margin-right:auto">${ic('trash')} წაშლა</button>`:'',
    onSave:()=>{
      const d={ day:+val('gDay'), time:val('gTime'), type:val('gType'), note:val('gNote') };
      if(!d.time){ toast('მიუთითე დრო'); return false; }
      if(!id){ S.schedule.push({ id:uid('w'), ...d, from:todayISO(), until:null }); }
      else retireSched(e, d);
      save('განრიგი შენახულია'); return true;
    }
  });
}
/** Change/delete a weekly entry from today on, keeping past history intact. */
function retireSched(e, replacement){
  const t=todayISO();
  const used = Object.values(S.attendance).some(a=>a.id===e.id);
  if(!used){
    if(replacement) Object.assign(e, replacement);
    else S.schedule = S.schedule.filter(x=>x.id!==e.id);
    return;
  }
  const usedToday = !!S.attendance[aKey(t,e.id)];
  const cut = usedToday ? addDays(t,1) : t;
  e.until = addDays(cut,-1);
  if(replacement) S.schedule.push({ id:uid('w'), ...replacement, from:cut, until:null });
}

/* =========================================================
   02 — SPEED TRAINING
   ========================================================= */
function pageSpeed(){
  const q=ui.q.toLowerCase();
  const list=S.exercises.filter(e=>(ui.cat==='all'||e.cat===ui.cat) && (!q || (e.name+' '+e.ka+' '+e.skill).toLowerCase().includes(q)));
  const recent=[...S.speedLogs].sort((a,b)=>b.date.localeCompare(a.date)||(b.createdAt||'').localeCompare(a.createdAt||'')).slice(0,12);
  const cats = ui.cat==='all' ? Object.keys(SPEED_CATS) : [ui.cat];
  return `
  <div class="page-head"><div><div class="eyebrow">02 — Speed Training</div><h1>სისწრაფის განვითარება</h1><p class="lead">სავარჯიშოების ბიბლიოთეკა და შესრულების აღრიცხვა.</p></div>
    <button class="btn primary" data-a="exModal" data-x="">${ic('plus')} ახალი სავარჯიშო</button></div>
  <div class="notice warn">${ic('info')}<div><b>დოზები და დამატებითი დატვირთვა უნდა შეთანხმდეს ${esc(S.athlete.specialist)}სთან</b>, გიორგის არსებული ვარჯიშების გათვალისწინებით. მითითებული სეტები საწყისი შეთავაზებაა და შეგიძლია შეცვალო.</div></div>
  <div class="row" style="justify-content:space-between">
    <div class="filters">${[['all','ყველა'],...Object.entries(SPEED_CATS).map(([k,v])=>[k,v.no+' '+v.name])].map(([k,l])=>`<button class="${ui.cat===k?'on':''}" data-a="cat" data-x="${k}">${esc(l)}</button>`).join('')}</div>
    <input class="inp" id="exSearch" type="search" placeholder="ძებნა…" value="${esc(ui.q)}" style="max-width:240px" aria-label="ძებნა">
  </div>
  ${cats.map(c=>{ const items=list.filter(e=>e.cat===c); if(!items.length && q) return ''; return `
    <section class="stack" style="gap:10px">
      <div class="cat-h"><span class="sec-no small">${SPEED_CATS[c].no}</span><div><h2>${esc(SPEED_CATS[c].name)}</h2><p class="small muted">${esc(SPEED_CATS[c].ka)}</p></div></div>
      <div class="lib">${items.map(e=>{ const n=logsOf(e.id), last=n[0]; return `<a href="#sx-${e.id}">${exMedia(e)}<div><b>${esc(e.name)}</b><span style="display:block">${esc(e.ka)}</span><span>${e.sets} × ${esc(e.reps)} · დასვ. ${esc(e.rest)}</span><span style="display:block;margin-top:4px">${n.length?`<span class="chip green">${n.length} აღრიცხვა</span> ბოლო: ${fmtShort(last.date)}`:'<span class="chip none">ჯერ არ შესრულებულა</span>'}</span></div></a>`; }).join('') || '<div class="empty">ამ კატეგორიაში სავარჯიშო არ არის.</div>'}</div>
    </section>`; }).join('')}
  <div class="card">
    <div class="card-h"><h2>ბოლო შესრულებები</h2></div>
    ${recent.length? logTable(recent, true) : '<div class="empty">ჯერ არცერთი შესრულება არ არის აღრიცხული. გახსენი სავარჯიშო და დააჭირე „შესრულების აღრიცხვა“.</div>'}
  </div>`;
}
function logTable(logs, withEx){
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>თარიღი</th>${withEx?'<th>სავარჯიშო</th>':''}<th>სტატუსი</th><th>სეტები</th><th>გამეორება / დრო</th><th>შენიშვნა</th></tr></thead><tbody>
  ${logs.map(l=>{ const e=exById(l.exId); return `<tr class="click" data-a="logModal" data-x="${l.exId}" data-y="${l.id}"><td>${fmtNum(l.date)}</td>${withEx?`<td>${e?esc(e.name):'<span class="muted">წაშლილი სავარჯიშო</span>'}</td>`:''}<td><span class="chip ${LOG_STATUS[l.status].c}">${LOG_STATUS[l.status].t}</span></td><td class="n">${esc(l.sets??'—')}</td><td>${esc(l.reps||'—')}</td><td class="muted">${esc(l.notes||'')}</td></tr>`; }).join('')}
  </tbody></table></div>`;
}
function pageExercise(id){
  const e=exById(id), C=SPEED_CATS[e.cat]||{}, logs=logsOf(id);
  const sec=(t,b)=>`<div><div class="eyebrow">${t}</div><div style="margin-top:4px">${b}</div></div>`;
  return `
  <div class="row"><a class="btn sm ghost" href="#speed">${ic('left')} Speed Training</a><span class="spacer" style="flex:1"></span><button class="btn sm" data-a="exModal" data-x="${e.id}">${ic('edit')} რედაქტირება</button><button class="btn sm danger" data-a="deleteEx" data-x="${e.id}">${ic('trash')} წაშლა</button></div>
  <div class="page-head"><div><div class="eyebrow">${esc(C.no||'')} · ${esc(C.name||'')}</div><h1>${esc(e.name)}</h1><p class="lead">${esc(e.ka)}</p></div>
    <button class="btn lg primary" data-a="logModal" data-x="${e.id}" data-y="">${ic('check')} შესრულების აღრიცხვა</button></div>
  <div class="detail-grid">
    <div class="stack" style="gap:14px">
      <div class="card">
        ${exMedia(e)}
        ${e.photo?'':`<div style="margin-top:10px">${DIAG_LEGEND}</div>`}
        <div class="row" style="margin-top:12px">
          <label class="btn sm" for="photoIn" style="cursor:pointer">${ic('image')} ${e.photo?'ფოტოს შეცვლა':'ფოტოს ატვირთვა'}</label><input type="file" id="photoIn" accept="image/*" hidden data-ex="${e.id}">
          ${e.photo?`<button class="btn sm ghost" data-a="removePhoto" data-x="${e.id}">ფოტოს წაშლა</button>`:''}
          ${e.videoUrl?`<a class="btn sm" href="${esc(e.videoUrl)}" target="_blank" rel="noopener">${ic('video')} ვიდეოს ნახვა</a>`:''}
          <button class="btn sm ghost" data-a="videoModal" data-x="${e.id}">${ic('video')} ${e.videoUrl?'ვიდეოს ბმულის შეცვლა':'ვიდეოს ბმულის დამატება'}</button>
        </div>
        ${e.videoUrl?'':'<p class="small muted" style="margin-top:8px">ვიდეო ჯერ არ არის დამატებული. ჩასვი რეალური დემონსტრაციის ბმული (YouTube, Instagram, Drive…).</p>'}
      </div>
      <div class="kv"><div><small>სეტები</small><b>${e.sets}</b></div><div><small>გამეორება / დრო</small><b>${esc(e.reps)}</b></div><div><small>დასვენება</small><b>${esc(e.rest)}</b></div></div>
      <p class="small muted">დოზა შეათანხმე ${esc(S.athlete.specialist)}სთან. შესაცვლელად დააჭირე „რედაქტირება“.</p>
      <div class="card">
        <div class="card-h"><h2>შენიშვნები</h2></div>
        <textarea class="inp" id="exNotes" placeholder="მაგ. შიოს მითითებები, რაზე გავამახვილოთ ყურადღება">${esc(e.notes||'')}</textarea>
        <div class="row" style="justify-content:flex-end;margin-top:8px"><button class="btn sm" data-a="saveNotes" data-x="${e.id}">შენიშვნის შენახვა</button></div>
      </div>
    </div>
    <div class="card stack" style="gap:16px">
      ${sec('რა უნარს ავითარებს',esc(e.skill))}
      ${e.start?sec('საწყისი პოზიცია',esc(e.start)):''}
      ${sec('შესრულების ინსტრუქცია',`<ol class="steps">${e.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol>`)}
      ${e.focus?`<div class="focus"><b>ტექნიკური აქცენტი:</b> ${esc(e.focus)}</div>`:''}
      ${e.mistakes&&e.mistakes.length?sec('გავრცელებული შეცდომები',`<ul class="ul">${e.mistakes.map(s=>`<li>${esc(s)}</li>`).join('')}</ul>`):''}
      ${e.safety&&e.safety.length?`<div class="notice warn">${ic('alert')}<div>${e.safety.map(esc).join('<br>')}<br>ტკივილის შემთხვევაში შეწყვიტე.</div></div>`:''}
      ${e.easier||e.harder?`<div class="grid g2">${e.easier?sec('გამარტივებული ვერსია',esc(e.easier)):''}${e.harder?sec('გართულებული ვერსია',esc(e.harder)+'<div class="small muted" style="margin-top:4px">მხოლოდ შიოსთან შეთანხმებით.</div>'):''}</div>`:''}
    </div>
  </div>
  <div class="card">
    <div class="card-h"><h2>შესრულების ისტორია</h2><span class="chip">${logs.length} ჩანაწერი</span></div>
    ${logs.length? logTable(logs,false) : '<div class="empty">ჯერ არ შესრულებულა.</div>'}
  </div>`;
}

/* ---------- speed modals ---------- */
function logModal(exId, logId){
  const e=exById(exId), l = logId ? S.speedLogs.find(x=>x.id===logId) : { date:todayISO(), status:'done', sets:e?e.sets:'', reps:e?e.reps:'', notes:'' };
  M = { lstatus:l.status };
  openModal(logId?'აღრიცხვის შესწორება':'შესრულების აღრიცხვა', `
  <div class="stack" style="gap:14px">
    <p class="muted small">${e?esc(e.name)+' · '+esc(e.ka):''}</p>
    <div class="field"><span class="lbl">სტატუსი</span>${seg('lstatus',[['done','შესრულდა'],['partial','ნაწილობრივ']],M.lstatus,'text')}</div>
    <div class="grid g3">
      <div class="field"><label for="lDate">თარიღი</label><input class="inp" type="date" id="lDate" value="${l.date}" max="${todayISO()}"></div>
      <div class="field"><label for="lSets">სეტები</label><input class="inp" type="number" inputmode="numeric" min="0" max="20" id="lSets" value="${esc(l.sets)}"></div>
      <div class="field"><label for="lReps">გამეორება / დრო</label><input class="inp" id="lReps" value="${esc(l.reps)}"></div>
    </div>
    <div class="field"><label for="lNotes">შენიშვნა</label><textarea class="inp" id="lNotes" placeholder="როგორ შესრულდა, რა იყო რთული">${esc(l.notes||'')}</textarea></div>
  </div>`, {
    left: logId?`<button class="btn danger" data-a="deleteLog" data-x="${logId}" style="margin-right:auto">${ic('trash')} წაშლა</button>`:'',
    onSave:()=>{
      if(!val('lDate')){ toast('აირჩიე თარიღი'); return false; }
      const d={ date:val('lDate'), status:M.lstatus||'done', sets:val('lSets')===''?null:+val('lSets'), reps:val('lReps'), notes:val('lNotes'), updatedAt:new Date().toISOString() };
      if(logId) Object.assign(l,d); else S.speedLogs.push({ id:uid('l'), exId, createdAt:new Date().toISOString(), ...d });
      save('აღრიცხულია'); return true; } });
}
function exModal(id){
  const e = id ? exById(id) : { cat: ui.cat!=='all'?ui.cat:'first', name:'', ka:'', skill:'', start:'', steps:[], sets:2, reps:'3', rest:'60 წმ', focus:'', mistakes:[], safety:[], easier:'', harder:'', notes:'', videoUrl:'', photo:'', diagram:{ pose:'stance', start:[60,40,-90] } };
  const ta=(i,l,v,ph='')=>`<div class="field"><label for="${i}">${l}</label><textarea class="inp" id="${i}" placeholder="${ph}">${esc(v)}</textarea></div>`;
  const tx=(i,l,v,ph='')=>`<div class="field"><label for="${i}">${l}</label><input class="inp" id="${i}" value="${esc(v)}" placeholder="${ph}"></div>`;
  openModal(id?'სავარჯიშოს რედაქტირება':'ახალი სავარჯიშო', `
  <div class="stack" style="gap:12px">
    <div class="grid g2">${tx('xName','სახელი',e.name,'მაგ. Drop Step Start')}${tx('xKa','ქართული სახელი',e.ka)}</div>
    <div class="field"><label for="xCat">კატეგორია</label><select class="inp" id="xCat">${Object.entries(SPEED_CATS).map(([k,v])=>`<option value="${k}" ${e.cat===k?'selected':''}>${v.no} · ${esc(v.name)}</option>`).join('')}</select></div>
    <div class="grid g3">${tx('xSets','სეტები',e.sets)}${tx('xReps','გამეორება / დრო',e.reps)}${tx('xRest','დასვენება',e.rest)}</div>
    ${tx('xSkill','რა უნარს ავითარებს',e.skill)}
    ${tx('xStart','საწყისი პოზიცია',e.start)}
    ${ta('xSteps','შესრულების ინსტრუქცია (თითო ნაბიჯი ახალ ხაზზე)',e.steps.join('\n'))}
    ${tx('xFocus','ტექნიკური აქცენტი',e.focus)}
    ${ta('xMist','გავრცელებული შეცდომები (თითო ხაზზე)',(e.mistakes||[]).join('\n'))}
    ${ta('xSafe','უსაფრთხოება (თითო ხაზზე)',(e.safety||[]).join('\n'))}
    <div class="grid g2">${tx('xEasy','გამარტივებული ვერსია',e.easier)}${tx('xHard','გართულებული ვერსია',e.harder)}</div>
    ${tx('xVideo','ვიდეოს ბმული (არასავალდებულო)',e.videoUrl,'https://…')}
    <p class="small muted">ფოტოს ატვირთვა შეგიძლია სავარჯიშოს გვერდზე.</p>
  </div>`, { onSave:()=>{
    const lines=k=>val(k).split('\n').map(s=>s.trim()).filter(Boolean);
    const d={ name:val('xName'), ka:val('xKa'), cat:val('xCat'), sets:Math.max(1,parseInt(val('xSets'))||1), reps:val('xReps'), rest:val('xRest'), skill:val('xSkill'), start:val('xStart'), steps:lines('xSteps'), focus:val('xFocus'), mistakes:lines('xMist'), safety:lines('xSafe'), easier:val('xEasy'), harder:val('xHard'), videoUrl:cleanUrl(val('xVideo')) };
    if(!d.name){ toast('შეიყვანე სახელი'); return false; }
    if(!d.steps.length){ toast('დაამატე შესრულების ინსტრუქცია'); return false; }
    if(val('xVideo') && !d.videoUrl){ toast('ბმული უნდა იწყებოდეს https://-ით'); return false; }
    if(id) Object.assign(e,d);
    else { const nid=(d.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'ex')+'-'+Math.random().toString(36).slice(2,5);
      S.exercises.push({ id:nid, notes:'', photo:'', diagram:e.diagram, ...d }); setTimeout(()=>go('sx-'+nid),0); }
    save('სავარჯიშო შენახულია'); return true; } });
}
function resizeImage(file){
  return new Promise((res,rej)=>{
    const fr=new FileReader();
    fr.onerror=()=>rej(new Error('read'));
    fr.onload=()=>{ const img=new Image(); img.onerror=()=>rej(new Error('img'));
      img.onload=()=>{ const max=900, k=Math.min(1, max/Math.max(img.width,img.height)); const c=document.createElement('canvas'); c.width=Math.round(img.width*k); c.height=Math.round(img.height*k);
        c.getContext('2d').drawImage(img,0,0,c.width,c.height); res(c.toDataURL('image/jpeg',0.78)); };
      img.src=fr.result; };
    fr.readAsDataURL(file);
  });
}

/* ---------------- BACKUP ---------------- */
function pageBackup(){
  const kb=(JSON.stringify(S).length/1024).toFixed(1);
  return `
  <div class="page-head"><div><div class="eyebrow">Backup</div><h1>მონაცემები და სარეზერვო ასლი</h1></div></div>
  <div class="notice warn">${ic('info')}<div><b>მონაცემები ინახება მხოლოდ ამ მოწყობილობასა და ამ ბრაუზერში.</b> სხვა მოწყობილობაზე ისინი არ ჩანს და ბრაუზერის მონაცემების წაშლისას იკარგება. რეგულარულად გადმოწერე JSON ასლი. სხვა მოწყობილობაზე გადასატანად იქ გააკეთე იმპორტი.</div></div>
  <div class="grid g3">
    <div class="card stat"><div class="label">დასწრების ჩანაწერი</div><div class="value">${Object.keys(S.attendance).length}</div></div>
    <div class="card stat"><div class="label">სისწრაფის აღრიცხვა</div><div class="value">${S.speedLogs.length}</div></div>
    <div class="card stat"><div class="label">ზომა</div><div class="value">${kb}<small> KB</small></div><div class="sub">ბოლო შენახვა: ${S.meta.savedAt?new Date(S.meta.savedAt).toLocaleString('ka-GE'):'—'}</div></div>
  </div>
  <div class="card">
    <div class="card-h"><h2>ექსპორტი</h2></div>
    <div class="row"><button class="btn primary" data-a="exportJSON">${ic('down')} JSON ფაილის გადმოწერა</button><button class="btn" data-a="copyJSON">${ic('copy')} JSON-ის კოპირება</button></div>
  </div>
  <div class="card">
    <div class="card-h"><h2>იმპორტი</h2></div>
    <p class="small muted">იმპორტი ჩაანაცვლებს ამ მოწყობილობაზე არსებულ ყველა მონაცემს.</p>
    <div class="row" style="margin-top:10px"><label class="btn" for="importFile" style="cursor:pointer">${ic('up')} JSON ფაილის არჩევა</label><input type="file" id="importFile" accept="application/json,.json" hidden><button class="btn ghost" data-a="pasteImport">${ic('up')} ტექსტის ჩასმა</button></div>
  </div>
  <div class="card">
    <div class="card-h"><h2>გასუფთავება</h2></div>
    <p class="small muted">წაიშლება დასწრება, აღრიცხვები და ცვლილებები. დარჩება გიორგის საწყისი განრიგი და სავარჯიშოები.</p>
    <button class="btn danger" style="margin-top:10px" data-a="resetAll">${ic('trash')} ყველა მონაცემის წაშლა</button>
  </div>`;
}
let DL=null;
try{ if(window.claude && window.claude.use) window.claude.use('downloads').then(d=>{ DL=d; }).catch(()=>{}); }catch(e){}
const exportText = () => JSON.stringify({ app:'gio-performance', version:1, exportedAt:new Date().toISOString(), data:S }, null, 2);
function exportJSON(){
  const data=exportText(), filename=`gio-performance-${todayISO()}.json`;
  const showText = lead => openModal('სარეზერვო ასლი', `<div class="stack" style="gap:10px"><p class="small muted">${lead}</p><textarea class="inp" id="expText" readonly style="min-height:220px;font-family:ui-monospace,monospace;font-size:.75rem">${esc(data)}</textarea></div>`, { saveText:'კოპირება', onSave:()=>{ copyText(data); return false; } });
  if(DL){ DL.save({ filename, data }).then(()=>toast('ფაილი შენახულია')).catch(err=>{ if(err && err.code==='declined') return; showText('ფაილის შენახვა ვერ მოხერხდა. დააკოპირე ტექსტი და შეინახე <b>.json</b> ფაილად.'); }); return; }
  try{ const blob=new Blob([data],{type:'application/json'}), url=URL.createObjectURL(blob), a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),4000); toast('ფაილი გადმოიწერა'); }
  catch(e){ showText('დააკოპირე ტექსტი და შეინახე <b>.json</b> ფაილად.'); }
}
function copyText(txt){
  const fb=()=>{ const t=$('#expText'); if(t){ t.focus(); t.select(); toast('მონიშნე და დააკოპირე ხელით'); } else openModal('JSON', `<textarea class="inp" id="expText" readonly style="min-height:220px;font-family:ui-monospace,monospace;font-size:.75rem">${esc(txt)}</textarea>`, { save:false }); };
  try{ navigator.clipboard.writeText(txt).then(()=>toast('დაკოპირდა'), fb); }catch(e){ fb(); }
}
function doImport(text){
  let d;
  try{ const o=JSON.parse(text); d=o&&o.data?o.data:o;
    if(!d || !Array.isArray(d.schedule) || !Array.isArray(d.exercises) || typeof d.attendance!=='object') throw new Error('x');
    d=migrate(d); }
  catch(e){ toast('ფაილი არ არის GIO PERFORMANCE V1-ის სარეზერვო ასლი'); return; }
  confirmBox('იმპორტის დადასტურება', `ჩანაცვლდება ამ მოწყობილობის მონაცემები (${Object.keys(S.attendance).length} დასწრება, ${S.speedLogs.length} აღრიცხვა). ფაილში: ${Object.keys(d.attendance).length} დასწრება, ${(d.speedLogs||[]).length} აღრიცხვა.`, 'ჩანაცვლება', ()=>{ S=d; save('მონაცემები აღდგენილია'); });
}

/* ---------------- actions ---------------- */
const A = {
  closeModal: ()=>closeModal(),
  modalSave: ()=>{ if(modalSave){ const ok=modalSave(); if(ok!==false){ closeModal(); render(); } } },
  jTab: el=>{ ui.jTab=el.dataset.x; render(); },
  week: el=>{ const n=+el.dataset.x; ui.week = n===0? mondayOf(todayISO()) : addDays(ui.week,n); render(); },
  mark: el=>{
    const {x:date,y:id,z:st}=el.dataset, k=aKey(date,id), cur=S.attendance[k];
    const s=sessionsFor(date).find(v=>v.id===id); if(!s) return;
    if(cur && cur.status===st){
      if(!cur.duration && !cur.comment && !cur.rating){ delete S.attendance[k]; save('მონიშვნა მოიხსნა'); }
      else toast('ჩანაწერს აქვს დეტალები — მოსახსნელად გახსენი ✎');
      render(); return;
    }
    else S.attendance[k] = Object.assign(cur||{ date, id, duration:null, rating:null, comment:'' }, { type:s.type, time:s.time, status:st, updatedAt:new Date().toISOString() });
    save(STATUS[st].t);
    if(st!=='attended' && !S.attendance[k].comment){ render(); sessionModal(date,id); setTimeout(()=>{ const c=$('#sComment'); if(c) c.focus(); },50); return; }
    render();
  },
  clearAtt: el=>{ delete S.attendance[aKey(el.dataset.x, el.dataset.y)]; save('მონიშვნა მოიხსნა'); closeModal(); render(); },
  sessionModal: el=>sessionModal(el.dataset.x, el.dataset.y),
  addSession: el=>addSessionModal(el.dataset.x||todayISO()),
  removeSession: el=>{ const {x:date,y:id}=el.dataset; const s=sessionsFor(date).find(v=>v.id===id);
    confirmBox(s.extra?'ვარჯიშის წაშლა':'ამ დღეს ვარჯიში არ არის', s.extra?'წაიშალოს ეს ერთჯერადი ვარჯიში?':`${esc(T(s.type).full)} ${esc(s.time)} მოიხსნება მხოლოდ ${esc(fmtShort(date))}-ს (მაგ. ვარჯიში გაუქმდა). ყოველკვირეული განრიგი არ იცვლება.`, 'დადასტურება', ()=>{
      const ed=editsW(date); if(s.extra) ed.extras=ed.extras.filter(x=>x.id!==id); else ed.removed.push(id);
      delete S.attendance[aKey(date,id)]; save('შესრულდა'); }); },
  schedModal: el=>schedModal(el.dataset.x||null),
  deleteSched: el=>{ const e=S.schedule.find(x=>x.id===el.dataset.x);
    confirmBox('განრიგიდან წაშლა', `${esc(DAYS_KA[e.day])} ${esc(e.time)} — ${esc(T(e.type).full)} ამოიშლება დღეიდან. უკვე აღრიცხული ისტორია დარჩება.`, 'წაშლა', ()=>{ retireSched(e,null); save('წაიშალა'); }); },
  setJStart: ()=>{ const d=val('jStart'); if(!d || d>todayISO()){ toast('აირჩიე სწორი თარიღი'); return; } S.journalStart=d; save('შენახულია'); render(); },
  cat: el=>{ ui.cat=el.dataset.x; render(); },
  exModal: el=>exModal(el.dataset.x||null),
  deleteEx: el=>{ const id=el.dataset.x, n=logsOf(id).length;
    confirmBox('სავარჯიშოს წაშლა', `წაიშალოს „${esc(exById(id).name)}“?${n?` მისი ${n} აღრიცხვა ისტორიაში დარჩება.`:''}`, 'წაშლა', ()=>{ S.exercises=S.exercises.filter(e=>e.id!==id); save('წაიშალა'); setTimeout(()=>go('speed'),0); }); },
  logModal: el=>logModal(el.dataset.x, el.dataset.y||null),
  deleteLog: el=>{ S.speedLogs=S.speedLogs.filter(l=>l.id!==el.dataset.x); save('წაიშალა'); closeModal(); render(); },
  saveNotes: el=>{ const e=exById(el.dataset.x); e.notes=val('exNotes'); save('შენიშვნა შენახულია'); },
  removePhoto: el=>{ exById(el.dataset.x).photo=''; save('ფოტო წაიშალა'); render(); },
  videoModal: el=>{ const e=exById(el.dataset.x);
    openModal('ვიდეოს ბმული', `<div class="field"><label for="vUrl">რეალური დემონსტრაციის ბმული</label><input class="inp" id="vUrl" value="${esc(e.videoUrl)}" placeholder="https://"></div><p class="small muted" style="margin-top:8px">ცარიელი ველი = ბმულის მოხსნა.</p>`,
      { onSave:()=>{ const u=val('vUrl'); if(u && !cleanUrl(u)){ toast('ბმული უნდა იწყებოდეს https://-ით'); return false; } e.videoUrl=cleanUrl(u); save('შენახულია'); return true; } }); },
  exportJSON: ()=>exportJSON(),
  copyJSON: ()=>copyText(exportText()),
  pasteImport: ()=>openModal('ტექსტით იმპორტი', `<div class="field"><label for="impText">ჩასვი სარეზერვო ასლის JSON</label><textarea class="inp" id="impText" style="min-height:200px;font-family:ui-monospace,monospace;font-size:.75rem"></textarea></div>`,
    { saveText:'იმპორტი', onSave:()=>{ const t=val('impText'); if(!t){ toast('ჩასვი JSON'); return false; } setTimeout(()=>doImport(t),0); return true; } }),
  resetAll: ()=>confirmBox('ყველა მონაცემის წაშლა','წაიშლება დასწრება, სისწრაფის აღრიცხვები და ყველა ცვლილება ამ მოწყობილობაზე. ჯერ გადმოწერე სარეზერვო ასლი.','ყველაფრის წაშლა',()=>{ S=seed(); save('მონაცემები წაიშალა'); })
};

/* ---------------- events ---------------- */
document.addEventListener('click', e=>{
  const sg=e.target.closest('[data-seg]');
  if(sg){
    const f=sg.dataset.seg; M[f]=sg.dataset.v;
    $$(`[data-seg="${f}"]`, sg.parentElement).forEach(b=>b.classList.toggle('on', b===sg));
    if(f==='range'){ ui.range=sg.dataset.v; render(); }
    if(f==='hist'){ ui.hist=sg.dataset.v; render(); }
    return;
  }
  const el=e.target.closest('[data-a]');
  if(el && A[el.dataset.a]){ e.preventDefault(); A[el.dataset.a](el,e); }
});
document.addEventListener('input', e=>{
  if(e.target.id==='exSearch'){ ui.q=e.target.value; const p=e.target.selectionStart; render(); const s=$('#exSearch'); if(s){ s.focus(); try{s.setSelectionRange(p,p);}catch(_){} } }
});
document.addEventListener('change', e=>{
  if(e.target.id==='importFile'){ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>doImport(String(r.result)); r.readAsText(f); e.target.value=''; }
  if(e.target.id==='photoIn'){ const f=e.target.files[0], ex=exById(e.target.dataset.ex); if(!f||!ex) return;
    resizeImage(f).then(url=>{ const prev=ex.photo; ex.photo=url; save(); if(!storageOK){ ex.photo=prev; save(); toast('ფოტო ძალიან დიდია მეხსიერებისთვის'); } else toast('ფოტო შენახულია'); render(); }).catch(()=>toast('ფოტო ვერ წაიკითხა')); }
});
document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeModal(); });
window.addEventListener('hashchange', ()=>{ closeModal(); render(); window.scrollTo({top:0}); });
window.addEventListener('storage', e=>{ if(e.key===KEY){ const d=load(); if(d){ S=d; render(); } } });
let lastDay=todayISO();
document.addEventListener('visibilitychange', ()=>{ if(!document.hidden && todayISO()!==lastDay){ lastDay=todayISO(); ui.week=mondayOf(lastDay); render(); } });

/* ---------------- shell ---------------- */
$('#rail').innerHTML = NAV.map(([r,i,l])=>`<a href="#${r}" data-nav="${r}">${ic(i)}<span>${esc(l)}</span></a>`).join('');
$('#tabbar').innerHTML = NAV.map(([r,i,l])=>`<a href="#${r}" data-nav="${r}">${ic(i)}<span>${esc(l)}</span></a>`).join('');
paintSaveDot();
render();
if(!storageOK) toast('ბრაუზერი არ იძლევა მონაცემების შენახვის საშუალებას (პრივატული რეჟიმი?)');
})();
