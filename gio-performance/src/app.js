/* =========================================================
   GIO PERFORMANCE — application
   Vanilla JS, hash routing, LocalStorage persistence.
   ========================================================= */
(function(){
'use strict';

/* ---------------- utils ---------------- */
const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));
const esc = v => String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const uid = p => (p||'id')+'-'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const pad = n => String(n).padStart(2,'0');
const iso = d => d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parse = s => { const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); };
const todayISO = () => iso(new Date());
const addDays = (s,n) => { const d=parse(s); d.setDate(d.getDate()+n); return iso(d); };
const wd = s => (parse(s).getDay()+6)%7;           // Monday = 0
const mondayOf = s => addDays(s,-wd(s));
const daysBetween = (a,b) => Math.round((parse(b)-parse(a))/86400000);
const fmtLong = s => { const d=parse(s); return `${DAYS_KA[wd(s)]}, ${d.getDate()} ${MONTHS_KA[d.getMonth()]}`; };
const fmtShort = s => { const d=parse(s); return `${d.getDate()} ${MONTHS_KA[d.getMonth()].slice(0,3)}.`; };
const fmtNum = s => { const d=parse(s); return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}`; };
function isoWeek(s){ const d=parse(s); d.setDate(d.getDate()+3-((d.getDay()+6)%7)); const w1=new Date(d.getFullYear(),0,4); return 1+Math.round(((d-w1)/86400000-3+((w1.getDay()+6)%7))/7); }
function ageOn(dob,s){ const a=parse(dob), b=parse(s); let y=b.getFullYear()-a.getFullYear(); if(b.getMonth()<a.getMonth()||(b.getMonth()===a.getMonth()&&b.getDate()<a.getDate())) y--; return y; }
const nowHM = () => { const d=new Date(); return pad(d.getHours())+':'+pad(d.getMinutes()); };

/* ---------------- icons ---------------- */
const P = {
  home:'<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  bolt:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  layers:'<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  book:'<path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z"/><path d="M20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/>',
  chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  heart:'<path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 1 0-7.1 7.1L12 21.5l8.8-8.8a5 5 0 0 0 0-7.1z"/><path d="M6 12h3l1.5-3 2.5 6 1.5-3H18"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  timer:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M10 2h4"/>',
  alert:'<path d="M12 3l10 18H2z"/><path d="M12 10v4M12 17.5v.5"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  video:'<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3"/>',
  down:'<path d="M12 4v12M6 10l6 6 6-6M4 20h16"/>',
  up:'<path d="M12 20V8M6 14l6-6 6 6M4 4h16"/>',
  copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  left:'<path d="M15 5l-7 7 7 7"/>',
  right:'<path d="M9 5l7 7-7 7"/>',
  menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
  bell:'<path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
  lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  ext:'<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'
};
const ic = (n,cls='icon') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]||''}</svg>`;

/* ---------------- storage ---------------- */
const KEY = 'gio-performance:v1';
let storageOK = true;

function seed(){
  return {
    version:1,
    profile:{ name:'Gio', dob:'2011-05-05', sport:'კალათბურთი', height:'≈180 სმ', position:'', priority:'კალათბურთის მოედანზე სწრაფი და ეფექტური მოძრაობა', category:'ახალგაზრდული კალათბურთი', specialist:'შიო',
      health:'წარსულში Osgood-Schlatter და მუხლის დატვირთვასთან დაკავშირებული დისკომფორტი. ამჟამად თამაშობს და მუხლი არ აწუხებს.' },
    settings:{ programStart:null, parentMode:false, pin:'' },
    template: clone(SEED_TEMPLATE),
    dateEvents:{},
    blocks:{},
    exercises: clone(SEED_EXERCISES),
    program: clone(SEED_PROGRAM),
    checkins:{},
    sessions:[],
    tests:[],
    dismissed:{},
    meta:{ created:new Date().toISOString(), savedAt:null }
  };
}
function migrate(d){
  const base = seed();
  for(const k of Object.keys(base)) if(d[k]===undefined) d[k]=base[k];
  d.settings = Object.assign({}, base.settings, d.settings);
  d.profile = Object.assign({}, base.profile, d.profile);
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
  catch(e){ storageOK = false; }
  paintSaveDot();
  if(msg) toast(msg);
}
if(!S.meta.savedAt) save();

/* ---------------- domain ---------------- */
const exById = id => S.exercises.find(e=>e.id===id);
const isParent = () => !!S.settings.parentMode;

function programWeek(date){
  if(!S.settings.programStart) return null;
  const n = Math.floor(daysBetween(S.settings.programStart, date)/7)+1;
  return n;
}
function weekLabel(n){
  if(n==null) return 'პროგრამა არ არის დაწყებული';
  if(n<1) return 'პროგრამა იწყება '+fmtShort(S.settings.programStart);
  if(n>6) return 'ციკლი დასრულებულია';
  return `Week ${n} / 6`;
}
const byTime = (a,b)=> (a.time||'99').localeCompare(b.time||'99');
function eventsFor(date){
  const d = S.dateEvents[date];
  const list = d ? d : S.template.filter(e=>e.day===wd(date));
  return list.map(e=>({...e})).sort(byTime);
}
function materialize(date){
  if(!S.dateEvents[date]) S.dateEvents[date] = S.template.filter(e=>e.day===wd(date)).map(e=>({id:e.id,time:e.time,type:e.type,note:e.note||'',day:e.day}));
  return S.dateEvents[date];
}
const evKey = (date,id) => date+'|'+id;
const sessionForEvent = (date,id) => S.sessions.find(s=>s.eventKey===evKey(date,id));
const sessionById = id => S.sessions.find(s=>s.id===id);
const blockSession = b => b && b.sessionId ? sessionById(b.sessionId) : null;

function dayLoad(date){
  const evs = eventsFor(date).filter(e=>e.type!=='REC');
  const missed = evs.filter(e=>{ const s=sessionForEvent(date,e.id); return s && s.status==='skipped'; }).length;
  return { count: evs.length - missed, game: evs.some(e=>e.type==='GAME'), late: evs.some(e=>(e.time||'')>='20:00') };
}

function readiness(ci){
  if(!ci) return { level:'NONE', reasons:['დღევანდელი Check-in ჯერ არ არის შევსებული.'] };
  const r=[]; let pts=0, red=false;
  if(ci.knee==='pain'){ red=true; r.push('მუხლი აწუხებს'); }
  if(ci.knee==='mild'){ pts+=2; r.push('მსუბუქი დისკომფორტი მუხლში'); }
  const h=parseFloat(ci.sleepHours);
  if(!isNaN(h)){ if(h<6){pts+=2; r.push(`ძილი ${h} სთ`);} else if(h<7){pts+=1; r.push(`ძილი ${h} სთ — ცოტაა`);} }
  if(ci.sleepQuality<=2){ pts+=1; r.push('ძილის დაბალი ხარისხი'); }
  if(ci.energy===1){ pts+=2; r.push('ენერგია ძალიან დაბალია'); } else if(ci.energy===2){ pts+=1; r.push('დაბალი ენერგია'); }
  if(ci.fatigue===5){ pts+=2; r.push('ძლიერი დაღლილობა'); } else if(ci.fatigue===4){ pts+=1; r.push('მომატებული დაღლილობა'); }
  if(ci.legs===5){ pts+=2; r.push('ფეხები ძალიან მძიმეა'); } else if(ci.legs===4){ pts+=1; r.push('ფეხების სიმძიმე'); }
  let level='GREEN';
  if(red || pts>=5) level='RED';
  else if(pts>=2 || ci.knee==='mild') level='YELLOW';
  if(level==='GREEN' && !r.length) r.push('ყველა მაჩვენებელი ნორმაშია');
  return { level, reasons:r, pts };
}
const LEVEL_TXT = {
  GREEN:{ t:'GREEN', d:'ჩვეულებრივი დაგეგმილი აქტივობა, თუ სხვა შეზღუდვა არ არის.' },
  YELLOW:{ t:'YELLOW', d:'შეამცირე დატვირთვა — მხოლოდ ტექნიკური ვერსია. შეუთანხმე შიოს.' },
  RED:{ t:'RED', d:'სისწრაფის, ხტომისა და მუხლზე დატვირთვის ვარჯიში შეჩერებულია. დაელაპარაკე ზრდასრულს; საჭიროებისას — სამედიცინო სპეციალისტს.' },
  NONE:{ t:'—', d:'შეავსე Check-in, რომ ნახო დღევანდელი მდგომარეობა.' }
};
const lvlChip = l => `<span class="chip ${l==='NONE'?'none':l.toLowerCase()}">${l==='NONE'?'Check-in არ არის':l}</span>`;

function blockMode(date){
  const lv = readiness(S.checkins[date]).level, ld = dayLoad(date);
  if(lv==='NONE') return { mode:'locked', lv, why:['დაწყებამდე შეავსე დღევანდელი Check-in.'] };
  if(lv==='RED') return { mode:'stop', lv, why:['RED მდგომარეობა — ბლოკი არ სრულდება.'] };
  const why=[];
  if(lv==='YELLOW') why.push('YELLOW მდგომარეობა');
  if(ld.game) why.push('დღეს თამაშია');
  if(ld.count>=3) why.push(`დღეს ${ld.count} ვარჯიშია`);
  if(why.length) return { mode:'technical', lv, why };
  return { mode:'full', lv, why:[] };
}
function blockItems(b, mode){
  return b.items.map(it=>{
    const ex = exById(it.id); if(!ex) return null;
    let sets = +(it.sets ?? ex.sets) || 1;
    if(mode==='technical') sets = Math.max(1, sets-1);
    return { ex, sets, reps: it.reps ?? ex.reps, rest: it.rest ?? ex.rest };
  }).filter(Boolean);
}
const weekItems = w => (S.program[w-1]?.items||[]).map(it=>({ ...it, ex:exById(it.id) })).filter(x=>x.ex);

function weekStats(mon, upto){
  upto = upto || todayISO();
  let planned=0, score=0, done=0, partial=0, skipped=0, open=0;
  for(let i=0;i<7;i++){
    const d = addDays(mon,i); if(d>upto) break;
    const add = s => { planned++; if(!s){ open++; return; } if(s.status==='done'){score+=1;done++;} else if(s.status==='partial'){score+=.5;partial++;} else {skipped++;} };
    eventsFor(d).filter(e=>e.type!=='REC').forEach(e=>add(sessionForEvent(d,e.id)));
    const b=S.blocks[d]; if(b) add(blockSession(b));
  }
  return { planned, done, partial, skipped, open, pct: planned? Math.round(score/planned*100) : null };
}
function nextEvent(){
  const t=todayISO(), now=nowHM();
  for(let i=0;i<8;i++){
    const d=addDays(t,i);
    const evs=eventsFor(d).filter(e=>e.time && (i>0 || e.time>now));
    const b=S.blocks[d];
    if(evs.length) return { date:d, ev:evs[0], block: b && !b.sessionId ? b : null };
  }
  return null;
}
function lastSession(){
  return S.sessions.filter(s=>s.status!=='skipped').sort((a,b)=>(b.date+(b.updatedAt||'')).localeCompare(a.date+(a.updatedAt||'')))[0];
}
function typeName(s){
  if(s.kind==='speed') return 'სისწრაფის ბლოკი';
  return (EVENT_TYPES[s.type]||EVENT_TYPES.OTHER).name;
}
const STATUS = { done:{t:'შესრულდა',c:'green'}, partial:{t:'ნაწილობრივ',c:'yellow'}, skipped:{t:'გამოტოვა',c:'red'} };
const KNEE = { none:'არ მაწუხებს', mild:'მსუბუქი დისკომფორტი', pain:'მაწუხებს' };
const DISC = { none:'არა', mild:'მსუბუქი', yes:'კი' };

/* ---------------- diagrams ---------------- */
let dgN=0;
function poseSVG(p){
  const L = (pts,c='#f3f4f6') => `<polyline points="${pts}" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
  const H = (x,y) => `<circle cx="${x}" cy="${y}" r="2.6" fill="#f3f4f6"/>`;
  const map = {
    stance: H(17,5)+L('16,9 11,18')+L('11,18 16,23 13,29 17,29')+L('11,18 13,23 9,29 13,29','#9097a2')+L('15,10 19,15 22,13'),
    split:  H(20,5)+L('18,9 13,17')+L('13,17 19,22 19,29 22,29')+L('13,17 9,23 5,28 7,29','#9097a2')+L('17,10 21,14')+L('17,10 13,14','#9097a2'),
    fall:   H(21,5)+L('20,8 12,27')+L('12,27 11,29 15,29')+L('18,12 20,18')+L('17,12 15,18','#9097a2'),
    slide:  H(15,5)+L('15,8 15,18')+L('9,11 21,11')+L('9,11 4,15')+L('21,11 26,15')+L('15,18 8,23 5,29')+L('15,18 22,23 25,29'),
    stop:   H(15,8)+L('14,11 10,20')+L('10,20 17,24 14,29 18,29')+L('10,20 12,25 8,29 12,29','#9097a2')+L('13,13 18,16'),
    ball:   H(17,5)+L('16,9 11,18')+L('11,18 16,23 13,29 17,29')+L('11,18 13,23 9,29 13,29','#9097a2')+L('15,10 19,15 21,16')+'<circle cx="23" cy="17" r="3" fill="#ff6b1f"/>'
  };
  return map[p] || '';
}
function diagramSVG(spec, cls='diagram'){
  spec = spec || {};
  const id = 'dg'+(++dgN);
  const C = { run:'#ff6b1f', slide:'#3ee27e', walk:'#9097a2', back:'#5aa9ff' };
  let g = '';
  // floor + court
  g += `<rect width="120" height="70" fill="#101215"/>`;
  for(let x=10;x<120;x+=10) g+=`<line x1="${x}" y1="0" x2="${x}" y2="70" stroke="#1b1e22" stroke-width=".4"/>`;
  if(spec.court){
    g += `<path d="M18 0 V22 A42 42 0 0 0 102 22 V0" fill="none" stroke="#3a3f47" stroke-width=".8"/>`;
    g += `<rect x="45" y="0" width="30" height="36" fill="rgba(255,107,31,.06)" stroke="#3a3f47" stroke-width=".8"/>`;
    g += `<circle cx="60" cy="5" r="2.2" fill="none" stroke="#ff6b1f" stroke-width=".8"/>`;
  }
  (spec.paths||[]).forEach(p=>{
    const c = C[p.s]||C.run;
    const dash = p.s==='slide'?'3 2':p.s==='walk'?'1 2':p.s==='back'?'4 2':'';
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
    const [x,y,a]=spec.start; const r=a*Math.PI/180;
    g += `<circle cx="${x}" cy="${y}" r="3.4" fill="#f3f4f6"/><line x1="${x}" y1="${y}" x2="${(x+Math.cos(r)*5.5).toFixed(1)}" y2="${(y+Math.sin(r)*5.5).toFixed(1)}" stroke="#f3f4f6" stroke-width="1.4" stroke-linecap="round"/><text x="${x}" y="${y+1.3}" font-size="3.4" text-anchor="middle" fill="#0c0d0f" font-family="sans-serif" font-weight="700">G</text>`;
  }
  if(spec.pose){
    g += `<g transform="translate(2,38)"><rect x="0" y="0" width="30" height="31" rx="3" fill="#15171a" stroke="#2a2e34" stroke-width=".5"/>${poseSVG(spec.pose)}</g>`;
  }
  const mk = Object.entries(C).map(([k,c])=>`<marker id="${id}-${k}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="${c}"/></marker>`).join('');
  return `<svg class="${cls}" viewBox="0 0 120 70" role="img" aria-label="სავარჯიშოს სქემა"><defs>${mk}</defs>${g}</svg>`;
}
const DIAG_LEGEND = `<div class="legend"><span><i class="dotc" style="--c:#ff6b1f"></i>აჩქარება / სირბილი</span><span><i class="dotc" style="--c:#3ee27e"></i>სრიალი (გვერდით)</span><span><i class="dotc" style="--c:#9097a2"></i>შენელება / სიარული</span><span><i class="dotc" style="--c:#ffc53d"></i>გაჩერება და დაჭერა</span><span><i class="dotc" style="--c:#5aa9ff"></i>სიგნალი (მწვრთნელი/თვალი)</span><span><b>G</b> — გიოს საწყისი წერტილი</span></div>`;

/* ---------------- UI helpers ---------------- */
let toastT;
function toast(msg){
  let t=$('#toast'); if(t) t.remove();
  t=document.createElement('div'); t.id='toast'; t.className='toast'; t.textContent=msg; document.body.appendChild(t);
  clearTimeout(toastT); toastT=setTimeout(()=>t.remove(),2200);
}
function paintSaveDot(){
  const el=$('#saveDot'); if(!el) return;
  el.classList.toggle('err',!storageOK);
  el.querySelector('span').textContent = storageOK ? 'შენახულია ამ მოწყობილობაზე' : 'შენახვა ვერ ხერხდება';
}
let M = {};          // modal form state
let modalSave = null;
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
  const first = bg.querySelector('input,select,textarea'); if(first && window.innerWidth>800) first.focus();
}
function closeModal(){ const m=$('#modalBg'); if(m) m.remove(); modalSave=null; }
function confirmBox(title, text, okText, fn){
  openModal(title, `<p class="muted">${text}</p>`, { saveText:okText, onSave:()=>{ fn(); return true; } });
}
const seg = (field, vals, cur, cls='') => `<div class="seg ${cls}" data-field="${field}">${vals.map(v=>{ const [val,lab]=Array.isArray(v)?v:[v,v]; return `<button type="button" data-seg="${field}" data-v="${esc(val)}" class="${String(cur)===String(val)?'on':''}">${esc(lab)}</button>`; }).join('')}</div>`;
const scale = (field,label,cur,lo,hi) => `<div class="field"><span class="lbl">${label}</span>${seg(field,[1,2,3,4,5],cur)}<div class="scale-hint"><span>1 — ${lo}</span><span>5 — ${hi}</span></div></div>`;
const sv = f => { const b=document.querySelector(`#modalBg [data-seg="${f}"].on`) || document.querySelector(`[data-seg="${f}"].on`); return b? b.dataset.v : (M[f]??null); };
const val = id => { const el=document.getElementById(id); return el? el.value.trim() : ''; };

/* ---------------- routing ---------------- */
const ROUTES = ['dashboard','today','calendar','plan','library','progress','recovery','history','parent'];
const NAV = [
  ['dashboard','home','მთავარი'],['today','bolt','Today'],['calendar','cal','კალენდარი'],['plan','layers','Plan'],
  ['library','book','Library'],['progress','chart','Progress'],['recovery','heart','Recovery'],['history','clock','History'],['parent','shield','მშობელი']
];
function route(){
  const h = (location.hash||'').replace('#','');
  if(h.startsWith('ex-') && exById(h.slice(3))) return h;
  return ROUTES.includes(h) ? h : 'dashboard';
}
const ui = { calWeek: mondayOf(todayISO()), planWeek:null, libCat:'all', libQ:'', histTab:'sessions', histType:'all', histStatus:'all' };
let charts = [];
function render(){
  charts.forEach(c=>{ try{c.destroy();}catch(e){} }); charts=[];
  const r = route();
  const view = $('#view');
  let html;
  if(r.startsWith('ex-')) html = pageExercise(r.slice(3));
  else html = ({ dashboard:pageDashboard, today:pageToday, calendar:pageCalendar, plan:pagePlan, library:pageLibrary, progress:pageProgress, recovery:pageRecovery, history:pageHistory, parent:pageParent })[r]();
  view.innerHTML = `<div class="page view-in">${html}</div>`;
  const navKey = r.startsWith('ex-') ? 'library' : r;
  $$('[data-nav]').forEach(a=>a.classList.toggle('active', a.dataset.nav===navKey));
  $('#modeBtn').classList.toggle('on', isParent());
  $('#modeBtn span').textContent = isParent() ? 'მშობლის რეჟიმი' : 'გიოს რეჟიმი';
  if(r==='progress') drawProgressCharts();
  if(r==='dashboard') drawDashSpark();
}
function go(r){ if(location.hash==='#'+r) render(); else location.hash = r; window.scrollTo({top:0}); }

/* ---------------- reminders ---------------- */
function reminders(){
  const t=todayISO(), out=[], dis=S.dismissed[t]||[];
  if(!S.checkins[t]) out.push({ k:'checkin', icon:'heart', txt:'დღევანდელი Check-in არ არის შევსებული.', act:'recovery', btn:'შევსება' });
  const n=nextEvent();
  if(n && n.date===t) out.push({ k:'next', icon:'clock', txt:`შემდეგი: ${(EVENT_TYPES[n.ev.type]||EVENT_TYPES.OTHER).name} — ${n.ev.time}`, act:'today', btn:'Today' });
  const b=S.blocks[t];
  if(b && !b.sessionId) out.push({ k:'block', icon:'bolt', txt: b.agreed ? 'დღეს დაგეგმილია სისწრაფის ბლოკი — დასრულების შემდეგ აღრიცხე.' : 'დღეს დაგეგმილი ბლოკი ჯერ არ არის შეთანხმებული შიოსთან.', act:'today', btn:'გახსნა' });
  // yesterday unlogged
  const y=addDays(t,-1);
  const open = eventsFor(y).filter(e=>e.type!=='REC' && !sessionForEvent(y,e.id)).length + (S.blocks[y] && !S.blocks[y].sessionId ? 1:0);
  if(open) out.push({ k:'yday', icon:'check', txt:`გუშინ ${open} აქტივობა არ არის აღრიცხული.`, act:'calendar', btn:'აღრიცხვა' });
  if(wd(t)===6 || wd(t)===0){
    const mon = wd(t)===6 ? mondayOf(t) : addDays(mondayOf(t),-7);
    const st = weekStats(mon, addDays(mon,6));
    out.push({ k:'week', icon:'chart', txt:`კვირის შეჯამება: ${st.done} შესრულდა, ${st.partial} ნაწილობრივ, ${st.skipped} გამოტოვა${st.pct!=null?` — ${st.pct}%`:''}.`, act:'calendar', btn:'ნახვა' });
  }
  if(!S.settings.programStart) out.push({ k:'start', icon:'layers', txt:'6-კვირიანი ციკლის დაწყების თარიღი არ არის მითითებული.', act:'plan', btn:'დაყენება' });
  return out.filter(r=>!dis.includes(r.k));
}

/* =========================================================
   PAGES
   ========================================================= */
const COURT_ART = `<svg class="hero-court" viewBox="0 0 200 160" fill="none" stroke="#ff6b1f" stroke-width="2"><path d="M10 0 V60 A90 90 0 0 0 190 60 V0"/><rect x="70" y="0" width="60" height="90"/><circle cx="100" cy="90" r="30"/><circle cx="100" cy="16" r="7"/><path d="M85 8 h30"/></svg>`;

function pageDashboard(){
  const t=todayISO(), p=S.profile, w=programWeek(t);
  const rd=readiness(S.checkins[t]);
  const ws=weekStats(mondayOf(t));
  const evs=eventsFor(t), b=S.blocks[t], n=nextEvent(), last=lastSession();
  const rems=reminders();
  const ci7=[]; for(let i=6;i>=0;i--){ const c=S.checkins[addDays(t,-i)]; if(c) ci7.push(c); }
  const avg=(k)=> ci7.length? (ci7.reduce((s,c)=>s+(+c[k]||0),0)/ci7.length) : null;
  const sl=avg('sleepHours'), fa=avg('fatigue');
  const lastTests = Object.keys(TESTS).map(k=>{ const r=S.tests.filter(x=>x.test===k).sort((a,b)=>b.date.localeCompare(a.date))[0]; return r?{k,r}:null; }).filter(Boolean);
  const wkTrack = [1,2,3,4,5,6].map(i=>`<i class="${w===i?'cur':(w>i?'done':'')}"></i>`).join('');
  const completedTotal = S.sessions.filter(s=>s.status==='done').length;

  return `
  <section class="hero">${COURT_ART}
    <div class="hero-in">
      <div>
        <div class="eyebrow">Performance Center · ${esc(p.sport)}</div>
        <div class="name">${esc(p.name).toUpperCase()}</div>
        <div class="meta">${fmtLong(t)} · კვირა ${isoWeek(t)} · ${ageOn(p.dob,t)} წლის · ${esc(p.height)}</div>
      </div>
      <div class="week-badge">
        <div class="eyebrow">განვითარების ციკლი</div>
        <div class="big">${w>=1&&w<=6?`W${w}<small> / 6</small>`:'—'}</div>
        <div class="wk-track">${wkTrack}</div>
        <div class="small muted" style="margin-top:6px">${esc(weekLabel(w))}${w>=1&&w<=6?' · '+esc(S.program[w-1].title):''}</div>
      </div>
    </div>
  </section>

  ${rems.length?`<section class="reminders" aria-label="შეხსენებები">${rems.map(r=>`<div class="rem">${ic(r.icon)}<p>${esc(r.txt)}</p><button class="btn sm" data-a="go" data-x="${r.act}">${esc(r.btn)}</button><button class="x" data-a="dismiss" data-x="${r.k}" aria-label="დამალვა">${ic('x')}</button></div>`).join('')}</section>`:''}

  <nav class="launch" aria-label="მთავარი მენიუ">
    <a href="#today" class="primary">${ic('bolt')}<div><b>TODAY</b><span>დღევანდელი გეგმა</span></div></a>
    <a href="#plan">${ic('layers')}<div><b>TRAINING PLAN</b><span>6 კვირა</span></div></a>
    <a href="#library">${ic('book')}<div><b>EXERCISE LIBRARY</b><span>${S.exercises.length} სავარჯიშო</span></div></a>
    <a href="#progress">${ic('chart')}<div><b>PROGRESS</b><span>გრაფიკები და ტესტები</span></div></a>
    <a href="#recovery">${ic('heart')}<div><b>RECOVERY</b><span>Check-in</span></div></a>
    <a href="#history">${ic('clock')}<div><b>HISTORY</b><span>${S.sessions.length} ჩანაწერი</span></div></a>
  </nav>

  <div class="grid g4">
    <div class="card stat">
      <div class="label">დღევანდელი მზადყოფნა</div>
      <div class="ready" style="margin-top:8px"><div class="ready-dot ${rd.level}">${rd.level==='NONE'?'?':rd.level}</div><div class="small muted">${esc(rd.reasons.slice(0,2).join(' · '))}</div></div>
      ${rd.level==='NONE'?`<button class="btn sm primary" style="margin-top:10px" data-a="go" data-x="recovery">Check-in</button>`:''}
    </div>
    <div class="card stat">
      <div class="label">კვირის შესრულება</div>
      <div class="value">${ws.pct==null?'—':ws.pct}<small>${ws.pct==null?'':'%'}</small></div>
      <div class="bar"><i style="width:${ws.pct||0}%"></i></div>
      <div class="sub">${ws.done} შესრ. · ${ws.partial} ნაწ. · ${ws.skipped} გამ. · ${ws.open} აღურიცხავი</div>
    </div>
    <div class="card stat">
      <div class="label">აღდგენა · 7 დღე</div>
      <div class="value">${sl==null?'—':sl.toFixed(1)}<small>${sl==null?'':' სთ ძილი'}</small></div>
      <div class="sub">${ci7.length? `საშ. დაღლილობა ${fa.toFixed(1)}/5 · ${ci7.length} Check-in`:'ჯერ არ არის Check-in მონაცემები'}</div>
      <div id="dashSparkBox" style="position:relative;height:40px;margin-top:6px"><canvas id="dashSpark" aria-label="ძილის ტენდენცია"></canvas></div>
    </div>
    <div class="card stat">
      <div class="label">ბოლო შესრულებული</div>
      ${last?`<div style="margin-top:8px"><b>${esc(last.title||typeName(last))}</b><div class="sub">${fmtShort(last.date)} · ${STATUS[last.status].t}${last.difficulty?` · სირთულე ${last.difficulty}/10`:''}</div></div>
        <button class="btn sm ghost" style="margin-top:10px" data-a="editSession" data-x="${last.id}">დეტალები</button>`
        :`<div class="sub" style="margin-top:8px">ჯერ არცერთი ვარჯიში არ არის აღრიცხული.</div>`}
    </div>
  </div>

  <div class="grid g2">
    <div class="card">
      <div class="card-h"><h2>დღევანდელი კალენდარი</h2><a class="btn sm ghost" href="#calendar">კვირა ${ic('right')}</a></div>
      <div class="stack">
        ${evs.length? evs.map(e=>eventRow(t,e,true)).join('') : `<div class="empty">დღეს ვარჯიში არ არის დაგეგმილი.</div>`}
        ${b? speedRowMini(t,b):''}
      </div>
    </div>
    <div class="stack" style="gap:14px">
      <div class="card">
        <div class="card-h"><h2>შემდეგი ვარჯიში</h2></div>
        ${n?`<div class="ev ${(EVENT_TYPES[n.ev.type]||EVENT_TYPES.OTHER).cls}"><div class="time">${esc(n.ev.time)}</div><div class="what"><b>${esc((EVENT_TYPES[n.ev.type]||EVENT_TYPES.OTHER).name)}</b><span>${n.date===t?'დღეს':esc(fmtLong(n.date))}${n.ev.note?' · '+esc(n.ev.note):''}</span></div></div>`
          :`<div class="empty">მომავალი 7 დღის განმავლობაში დროიანი ვარჯიში არ არის.</div>`}
      </div>
      <div class="card">
        <div class="card-h"><h2>დღევანდელი დავალებები</h2></div>
        <div class="stack">
          ${taskLine(!!S.checkins[t],'Readiness Check-in','recovery')}
          ${b? taskLine(!!b.sessionId, b.agreed?'სისწრაფის ბლოკი (შეთანხმებული)':'სისწრაფის ბლოკი — საჭიროებს შიოს თანხმობას','today') : `<div class="small muted">დამატებითი სისწრაფის ბლოკი დღეს დაგეგმილი არ არის.</div>`}
          ${taskLine(evs.filter(e=>e.type!=='REC').every(e=>sessionForEvent(t,e.id)) && evs.some(e=>e.type!=='REC'), 'გუნდური ვარჯიშების აღრიცხვა','today')}
        </div>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="card-h"><h2>ბოლო პროგრესის მაჩვენებლები</h2><a class="btn sm ghost" href="#progress">ყველა ${ic('right')}</a></div>
    <div class="grid g4">
      <div class="stat"><div class="label">შესრულებული ვარჯიშები</div><div class="value">${completedTotal}</div><div class="sub">სულ აღრიცხული: ${S.sessions.length}</div></div>
      ${lastTests.length? lastTests.slice(0,3).map(({k,r})=>`<div class="stat"><div class="label">${esc(TESTS[k].ka)}</div><div class="value">${esc(r.value)}<small> ${esc(TESTS[k].unit)}</small></div><div class="sub">${fmtShort(r.date)} · ${esc(phaseName(r.phase))}</div></div>`).join('')
        : `<div class="stat" style="grid-column:span 3"><div class="label">ტესტები</div><div class="sub" style="margin-top:8px">ტესტის შედეგები ჯერ არ არის შეყვანილი. საწყისი ტესტები ტარდება Week 1-ში, მხოლოდ შიოსთან შეთანხმებით.</div><button class="btn sm" style="margin-top:10px" data-a="addTest">${ic('plus')} შედეგის დამატება</button></div>`}
    </div>
  </div>`;
}
const taskLine = (ok,txt,r) => `<a href="#${r}" class="row" style="text-decoration:none;color:inherit;gap:10px"><span class="chip ${ok?'green':'none'}" style="width:28px;justify-content:center;padding:3px 0">${ok?'✓':'•'}</span><span style="flex:1">${esc(txt)}</span></a>`;
function speedRowMini(date,b){
  const s=blockSession(b);
  return `<div class="ev tspeed"><div class="time">${ic('bolt')}</div><div class="what"><b>სისწრაფის ბლოკი · W${b.week}</b><span>${b.agreed?'შეთანხმებულია შიოსთან':'ელოდება შიოს თანხმობას'}${s?' · '+STATUS[s.status].t:''}</span></div><div class="actions"><a class="btn sm" href="#today">გახსნა</a></div></div>`;
}
function eventRow(date,e,actions){
  const T=EVENT_TYPES[e.type]||EVENT_TYPES.OTHER, s=sessionForEvent(date,e.id);
  const st = s? `<span class="chip ${STATUS[s.status].c}">${STATUS[s.status].t}</span>` : '';
  let act='';
  if(actions && e.type!=='REC'){
    act = s ? `${st}<button class="btn sm ghost" data-a="editSession" data-x="${s.id}" aria-label="რედაქტირება">${ic('edit')}</button>`
            : `<button class="btn sm" data-a="quickMark" data-x="${date}" data-y="${e.id}" data-z="done">${ic('check')} შესრულდა</button><button class="btn sm ghost" data-a="quickMark" data-x="${date}" data-y="${e.id}" data-z="skipped">გამოტოვა</button>`;
  } else if(actions && e.type==='REC'){
    act = `<button class="btn sm ghost" data-a="editEvent" data-x="${date}" data-y="${e.id}">${ic('edit')}</button>`;
  }
  return `<div class="ev ${T.cls} ${s&&s.status==='skipped'?'missed':''}"><div class="time">${esc(e.time||'—')}</div><div class="what"><b>${esc(T.name)}</b><span>${esc(e.note||T.note)}</span></div>${act?`<div class="actions">${act}</div>`:''}</div>`;
}

/* ---------- TODAY ---------- */
function pageToday(){
  const t=todayISO(), ci=S.checkins[t], rd=readiness(ci), evs=eventsFor(t), b=S.blocks[t], w=programWeek(t);
  return `
  <div class="page-head"><div><div class="eyebrow">Today's Training · ${esc(weekLabel(w))}</div><h1>${esc(fmtLong(t))}</h1></div>
    <div class="row">${lvlChip(rd.level)}</div></div>

  <div class="card">
    <div class="card-h"><h2>1 · Readiness Check-in</h2>${ci?`<button class="btn sm ghost" data-a="checkinModal" data-x="${t}">${ic('edit')} შეცვლა</button>`:''}</div>
    ${ci? readinessBlock(rd) : checkinForm(t, null, true)}
  </div>

  <div class="card">
    <div class="card-h"><h2>2 · დღევანდელი გრაფიკი</h2><button class="btn sm ghost" data-a="addEvent" data-x="${t}">${ic('plus')} დამატება</button></div>
    <div class="stack">${evs.length? evs.map(e=>eventRow(t,e,true)).join('') : '<div class="empty">დღეს გუნდური ვარჯიში არ არის.</div>'}</div>
  </div>

  <div class="card">
    <div class="card-h"><h2>3 · სისწრაფის / ტექნიკის ბლოკი</h2>${b?`<span class="chip accent">W${b.week} · ${esc(S.program[b.week-1]?.title||'')}</span>`:''}</div>
    ${b? speedBlockView(t,b) : `<div class="empty">დღეს დამატებითი ბლოკი დაგეგმილი არ არის.<span class="small">ბლოკები ავტომატურად არ იგეგმება. დაგეგმე მხოლოდ შიოსთან შეთანხმებით — კვირაში მაქსიმუმ 2.</span><button class="btn sm" data-a="planBlock" data-x="${t}">${ic('plus')} ბლოკის დაგეგმვა</button></div>`}
  </div>`;
}
function readinessBlock(rd){
  const cls = rd.level==='GREEN'?'ok':rd.level==='YELLOW'?'warn':'stop';
  return `<div class="ready"><div class="ready-dot ${rd.level}">${rd.level}</div><div style="flex:1;min-width:0"><b>${esc(LEVEL_TXT[rd.level].d)}</b><div class="small muted" style="margin-top:4px">${esc(rd.reasons.join(' · '))}</div></div></div>
  ${rd.level!=='GREEN'?`<div class="notice ${cls}" style="margin-top:12px">${ic('alert')}<div>${rd.level==='RED'?'<b>დღეს სისწრაფე, ხტომები და მუხლზე დატვირთვა არ სრულდება.</b> უთხარი მშობელს ან მწვრთნელს. ტკივილი არ უნდა დაიგნორო.':'<b>შემცირებული დატვირთვა.</b> ბლოკი მხოლოდ ტექნიკური ვერსიით, შიოსთან შეთანხმებით.'}</div></div>`:''}
  <p class="small muted" style="margin-top:10px">ფერი არ არის სამედიცინო დიაგნოზი. ის რამდენიმე მაჩვენებლის ერთობლივ შეფასებას აჩვენებს.</p>`;
}
function speedBlockView(date,b){
  const bm = blockMode(date), s = blockSession(b);
  const items = blockItems(b, bm.mode==='technical'?'technical':'full');
  const doneN = items.filter(it=>b.doneIds.includes(it.ex.id)).length;
  let gate='';
  if(!b.agreed) gate += `<div class="notice warn">${ic('lock')}<div><b>ბლოკი ჯერ არ არის შეთანხმებული შიოსთან.</b> სანამ შეასრულებ, დარწმუნდი, რომ შიომ დაადასტურა.<div class="row" style="margin-top:8px"><button class="btn sm" data-a="agreeBlock" data-x="${date}">${ic('check')} შიოსთან შეთანხმებულია</button></div></div></div>`;
  if(bm.mode==='locked') gate += `<div class="notice">${ic('info')}<div>${esc(bm.why[0])}</div></div>`;
  if(bm.mode==='stop') gate += `<div class="notice stop">${ic('alert')}<div><b>RED — ბლოკი დღეს არ სრულდება.</b> ნუ შეასრულებ სისწრაფის, ხტომის ან მუხლზე დატვირთვის სავარჯიშოებს. დაელაპარაკე ზრდასრულს. გამოტოვებული ბლოკი მომდევნო დღეზე არ გადადის.</div></div>`;
  if(bm.mode==='technical') gate += `<div class="notice warn">${ic('alert')}<div><b>ტექნიკური ვერსია:</b> ${esc(bm.why.join(', '))}. სეტები შემცირებულია, ინტენსივობა — დაბალი. გამოიყენე გამარტივებული ვერსია.</div></div>`;
  if(s) return `${gate}<div class="notice ok">${ic('check')}<div><b>ბლოკი აღრიცხულია: ${STATUS[s.status].t}</b>${s.duration?` · ${s.duration} წთ`:''}${s.difficulty?` · სირთულე ${s.difficulty}/10`:''}<div class="row" style="margin-top:8px"><button class="btn sm" data-a="editSession" data-x="${s.id}">${ic('edit')} რედაქტირება</button></div></div></div>`;
  const canRun = b.agreed && (bm.mode==='full'||bm.mode==='technical');
  return `<div class="stack" style="gap:14px">
    <div class="small muted"><b style="color:var(--fg)">მიზანი:</b> ${esc(S.program[b.week-1]?.goal||'')}</div>
    ${gate}
    <div class="row"><div class="progress-ring"><span class="num" style="font-size:1.8rem;font-weight:700">${doneN}/${items.length}</span><span class="small muted">სავარჯიშო შესრულდა</span></div></div>
    <div class="bar" style="margin:0"><i style="width:${items.length?doneN/items.length*100:0}%"></i></div>
    ${items.map(it=>exCard(date,b,it,canRun,bm.mode)).join('')}
    ${DIAG_LEGEND}
    <div class="row" style="justify-content:flex-end">
      <button class="btn ghost" data-a="finishBlock" data-x="${date}" data-y="skipped">გამოტოვება</button>
      <button class="btn lg primary" data-a="finishBlock" data-x="${date}" ${canRun?'':'disabled'}>${ic('check')} ვარჯიშის დასრულება</button>
    </div>
    <p class="small muted">გამოტოვებული ბლოკი ავტომატურად არ გადადის მომდევნო დღეზე.</p>
  </div>`;
}
function exCard(date,b,it,canRun,mode){
  const ex=it.ex, on=b.doneIds.includes(ex.id);
  return `<article class="ex-card ${on?'done':''}">
    <div class="stack">${diagramSVG(ex.diagram)}
      ${ex.videoUrl?`<a class="btn sm" href="${esc(ex.videoUrl)}" target="_blank" rel="noopener">${ic('video')} ვიდეოს ნახვა</a>`:`<div class="small muted">${ic('video')} ვიდეო ჯერ არ არის დამატებული</div>`}
    </div>
    <div style="min-width:0">
      <div class="eyebrow">${esc(CATEGORIES[ex.cat]?.name||'')}</div>
      <h3 style="margin-top:2px">${esc(ex.name)} <span class="muted" style="font-weight:500">· ${esc(ex.ka)}</span></h3>
      <div class="ex-meta"><div><small>სეტები</small><b>${it.sets}</b></div><div><small>გამეორება</small><b>${esc(it.reps)}</b></div><div><small>დასვენება</small><b>${esc(it.rest)}</b></div></div>
      <div class="focus"><b>აქცენტი:</b> ${esc(ex.focus)}</div>
      ${mode==='technical'?`<div class="small" style="margin-top:8px;color:var(--yellow)"><b>გამარტივებული ვერსია:</b> ${esc(ex.easier)}</div>`:''}
      <details class="more"><summary>${ic('info')} ინსტრუქცია და უსაფრთხოება</summary>
        <p class="small muted" style="margin-top:8px"><b style="color:var(--fg)">საწყისი პოზიცია:</b> ${esc(ex.start)}</p>
        <ol class="steps">${ex.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol>
        <p class="small" style="margin-top:8px;color:var(--yellow)">${ic('alert')} ${esc(ex.safety.join(' '))}</p>
        <p class="small muted" style="margin-top:6px"><b style="color:var(--fg)">დასრულების კრიტერიუმი:</b> ${esc(ex.done)}</p>
      </details>
      <div class="row" style="margin-top:12px">
        <button class="check-big ${on?'on':''}" data-a="toggleEx" data-x="${date}" data-y="${ex.id}" ${canRun?'':'disabled'} aria-pressed="${on}"><span class="box">${on?ic('check'):''}</span>${on?'შესრულებულია':'მონიშვნა შესრულებულად'}</button>
        <button class="btn sm ghost" data-a="timer" data-x="${esc(it.rest)}">${ic('timer')} დასვენება</button>
        <a class="btn sm ghost" href="#ex-${ex.id}">სრულად</a>
      </div>
    </div>
  </article>`;
}

/* ---------- CHECK-IN ---------- */
function checkinForm(date, ci, inline){
  M = ci ? { ...ci } : { sleepQuality:null, energy:null, fatigue:null, legs:null, knee:null };
  M._date = date;
  return `<div class="stack" style="gap:14px" id="ciForm">
    ${inline?'':`<div class="field"><label for="ciDate">თარიღი</label><input class="inp" type="date" id="ciDate" value="${date}" max="${todayISO()}"></div>`}
    <div class="grid g2">
      <div class="field"><label for="ciSleep">ძილის ხანგრძლივობა (სთ)</label><input class="inp" id="ciSleep" type="number" inputmode="decimal" min="0" max="16" step="0.5" placeholder="მაგ. 8.5" value="${ci&&ci.sleepHours!=null?esc(ci.sleepHours):''}"></div>
      ${scale('sleepQuality','ძილის ხარისხი',M.sleepQuality,'ცუდი','შესანიშნავი')}
    </div>
    <div class="grid g3">
      ${scale('energy','ენერგია',M.energy,'ძალიან დაბალი','ძალიან მაღალი')}
      ${scale('fatigue','დაღლილობა',M.fatigue,'არ ვარ დაღლილი','ძალიან დაღლილი')}
      ${scale('legs','ფეხების სიმძიმე',M.legs,'მსუბუქი','ძალიან მძიმე')}
    </div>
    <div class="field"><span class="lbl">მუხლის მდგომარეობა</span>${seg('knee',[['none','არ მაწუხებს'],['mild','მსუბუქი დისკომფორტი'],['pain','მაწუხებს']],M.knee,'text kneeseg')}</div>
    <div class="field"><label for="ciNote">შენიშვნა (არასავალდებულო)</label><input class="inp" id="ciNote" value="${ci?esc(ci.note||''):''}" placeholder="მაგ. გუშინ თამაში იყო"></div>
    ${inline?`<div class="row" style="justify-content:flex-end"><button class="btn lg primary" data-a="saveCheckin">${ic('check')} Check-in შენახვა</button></div>`:''}
  </div>`;
}
function saveCheckinFromForm(){
  const date = $('#ciDate') ? val('ciDate') : M._date;
  const sh = val('ciSleep');
  const miss=[];
  if(sh==='' || isNaN(+sh)) miss.push('ძილის ხანგრძლივობა');
  ['sleepQuality','energy','fatigue','legs','knee'].forEach(k=>M[k]=sv(k));
  ['sleepQuality','energy','fatigue','legs'].forEach(k=>{ if(!M[k]) miss.push({sleepQuality:'ძილის ხარისხი',energy:'ენერგია',fatigue:'დაღლილობა',legs:'ფეხების სიმძიმე'}[k]); });
  if(!M.knee) miss.push('მუხლის მდგომარეობა');
  if(!date) miss.push('თარიღი');
  if(miss.length){ toast('შეავსე: '+miss.join(', ')); return false; }
  const ci = { date, sleepHours:+sh, sleepQuality:+M.sleepQuality, energy:+M.energy, fatigue:+M.fatigue, legs:+M.legs, knee:M.knee, note:val('ciNote'), savedAt:new Date().toISOString() };
  ci.level = readiness(ci).level;
  S.checkins[date] = ci;
  save('Check-in შენახულია — '+ci.level);
  return true;
}

/* ---------- RECOVERY ---------- */
function pageRecovery(){
  const t=todayISO(), ci=S.checkins[t], rd=readiness(ci);
  const days=[]; for(let i=0;i<14;i++){ const d=addDays(t,-i); days.push([d,S.checkins[d]]); }
  return `
  <div class="page-head"><div><div class="eyebrow">Recovery · Readiness</div><h1>მზადყოფნა და აღდგენა</h1><p class="lead">მოკლე ყოველდღიური Check-in. სტატუსი გამოითვლება რამდენიმე მაჩვენებლის ერთობლივად — არა ერთი ციფრით.</p></div></div>
  <div class="grid g2" style="align-items:start">
    <div class="card">
      <div class="card-h"><h2>დღევანდელი Check-in</h2>${ci?`<button class="btn sm ghost" data-a="checkinModal" data-x="${t}">${ic('edit')} შეცვლა</button>`:''}</div>
      ${ci? readinessBlock(rd) : checkinForm(t,null,true)}
    </div>
    <div class="stack" style="gap:10px">
      ${['GREEN','YELLOW','RED'].map(l=>`<div class="card" style="padding:14px"><div class="row" style="gap:12px;flex-wrap:nowrap"><div class="ready-dot ${l}" style="width:46px;height:46px">${l[0]}</div><div><b>${l}</b><div class="small muted">${esc(LEVEL_TXT[l].d)}</div></div></div></div>`).join('')}
      <div class="notice">${ic('info')}<div>მუხლის ტკივილი → RED (სისწრაფე და ხტომა ჩერდება). მსუბუქი დისკომფორტი → მინიმუმ YELLOW. ცალკეული მაჩვენებელი (მაგ. მხოლოდ ცუდი ძილი) RED-ს არ იძლევა. <b>ეს არ არის სამედიცინო დიაგნოზი.</b></div></div>
    </div>
  </div>
  <div class="card">
    <div class="card-h"><h2>ბოლო 14 დღე</h2><button class="btn sm" data-a="checkinModal" data-x="">${ic('plus')} სხვა დღის Check-in</button></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>თარიღი</th><th>სტატუსი</th><th>ძილი</th><th>ხარისხი</th><th>ენერგია</th><th>დაღლ.</th><th>ფეხები</th><th>მუხლი</th><th>შენიშვნა</th></tr></thead><tbody>
    ${days.map(([d,c])=> c?`<tr class="click" data-a="checkinModal" data-x="${d}"><td>${fmtShort(d)}</td><td>${lvlChip(readiness(c).level)}</td><td class="n">${c.sleepHours} სთ</td><td class="n">${c.sleepQuality}</td><td class="n">${c.energy}</td><td class="n">${c.fatigue}</td><td class="n">${c.legs}</td><td>${KNEE[c.knee]}</td><td class="muted">${esc(c.note||'')}</td></tr>`
      :`<tr class="click" data-a="checkinModal" data-x="${d}"><td>${fmtShort(d)}</td><td colspan="8" class="muted">არ არის შევსებული — დააჭირე დასამატებლად</td></tr>`).join('')}
    </tbody></table></div>
  </div>`;
}

/* ---------- CALENDAR ---------- */
function pageCalendar(){
  const mon=ui.calWeek, t=todayISO(), ws=weekStats(mon, addDays(mon,6)<t?addDays(mon,6):t);
  const days=[0,1,2,3,4,5,6].map(i=>addDays(mon,i));
  const counts={}; let total=0, blocks=0, heavy=0, games=0;
  days.forEach(d=>{ const e=eventsFor(d); e.forEach(x=>{ counts[x.type]=(counts[x.type]||0)+1; if(x.type!=='REC') total++; if(x.type==='GAME') games++; }); if(S.blocks[d]) blocks++; if(dayLoad(d).count>=3) heavy++; });
  return `
  <div class="page-head"><div><div class="eyebrow">Weekly Calendar · ${esc(weekLabel(programWeek(mon)))}</div><h1>${fmtShort(mon)} – ${fmtShort(addDays(mon,6))}</h1></div>
    <div class="week-nav"><button class="btn sm" data-a="calWeek" data-x="-7" aria-label="წინა კვირა">${ic('left')}</button><button class="btn sm" data-a="calWeek" data-x="0">ეს კვირა</button><button class="btn sm" data-a="calWeek" data-x="7" aria-label="შემდეგი კვირა">${ic('right')}</button></div></div>
  <div class="legend">${Object.entries(EVENT_TYPES).map(([k,v])=>`<span class="${v.cls}"><i class="dotc"></i>${esc(v.name)}</span>`).join('')}<span class="tspeed"><i class="dotc"></i>სისწრაფის ბლოკი</span></div>
  <div class="cal">
    ${days.map(d=>{ const evs=eventsFor(d), b=S.blocks[d], bs=blockSession(b);
      return `<div class="cal-day ${d===t?'today':''}"><div class="dh"><b>${DAYS_SHORT[wd(d)]}</b><span class="num">${parse(d).getDate()}</span></div>
      <div class="evs stack" style="gap:6px">
      ${evs.map(e=>{ const T=EVENT_TYPES[e.type]||EVENT_TYPES.OTHER, s=sessionForEvent(d,e.id); return `<button class="cev ${T.cls} ${s?(s.status==='skipped'?'missed':'done'):''}" data-a="editEvent" data-x="${d}" data-y="${e.id}"><b>${esc(e.time||'—')} · ${esc(T.short)}</b>${esc(e.note||(e.type==='SP'?'შიო':T.note))}</button>`; }).join('')}
      ${b?`<button class="cev tspeed ${bs?(bs.status==='skipped'?'missed':'done'):''}" data-a="blockMenu" data-x="${d}"><b>⚡ ბლოკი W${b.week}</b>${b.agreed?'შეთანხმებული':'ელოდება თანხმობას'}</button>`:''}
      </div>
      <button class="add" data-a="addEvent" data-x="${d}">+ დამატება</button></div>`; }).join('')}
  </div>
  <div class="grid g2">
    <div class="card">
      <div class="card-h"><h2>კვირის მიმოხილვა</h2>${ws.pct!=null?`<span class="chip accent">${ws.pct}% შესრულება</span>`:''}</div>
      <div class="grid g3">
        <div class="stat"><div class="label">ვარჯიშები</div><div class="value">${total}</div><div class="sub">${games} თამაში</div></div>
        <div class="stat"><div class="label">ბლოკები</div><div class="value">${blocks}<small> / 2</small></div><div class="sub">დამატებითი</div></div>
        <div class="stat"><div class="label">დატვირთული დღე</div><div class="value">${heavy}</div><div class="sub">3+ ვარჯიში</div></div>
      </div>
      <div class="hr" style="margin:12px 0"></div>
      <div class="small muted">${Object.entries(counts).map(([k,v])=>`${esc((EVENT_TYPES[k]||EVENT_TYPES.OTHER).short)}: ${v}`).join(' · ')}</div>
      <div class="small muted" style="margin-top:6px">აღრიცხული: ${ws.done} შესრულდა · ${ws.partial} ნაწილობრივ · ${ws.skipped} გამოტოვა · ${ws.open} აღურიცხავი (დღემდე)</div>
      ${blocks>2?`<div class="notice warn" style="margin-top:10px">${ic('alert')}<div>ამ კვირაში 2-ზე მეტი დამატებითი ბლოკია. შეამოწმე შიოსთან.</div></div>`:''}
    </div>
    <div class="card">
      <div class="card-h"><h2>სწრაფი მოქმედებები</h2></div>
      <div class="row">
        <button class="btn" data-a="addEventType" data-x="GAME">${ic('plus')} თამაში</button>
        <button class="btn" data-a="addEventType" data-x="S360">${ic('plus')} Shoot360</button>
        <button class="btn" data-a="planBlock" data-x="">${ic('bolt')} სისწრაფის ბლოკი</button>
      </div>
      <p class="small muted" style="margin-top:12px">დააჭირე ნებისმიერ ვარჯიშს: დროის/ტიპის შეცვლა, წაშლა, შესრულებულად ან გამოტოვებულად მონიშვნა. ცვლილება შეიძლება მოხდეს მხოლოდ ამ დღისთვის ან ყოველკვირეულად (მშობლის რეჟიმი).</p>
    </div>
  </div>`;
}

/* ---------- PLAN ---------- */
function pagePlan(){
  const cw = programWeek(todayISO());
  if(ui.planWeek==null) ui.planWeek = (cw>=1&&cw<=6)?cw:1;
  const W = S.program[ui.planWeek-1];
  const mon = S.settings.programStart ? addDays(S.settings.programStart,(ui.planWeek-1)*7) : null;
  const wkBlocks = mon ? Object.values(S.blocks).filter(b=>b.date>=mon && b.date<=addDays(mon,6)) : [];
  return `
  <div class="page-head"><div><div class="eyebrow">Training Plan · 6 კვირა</div><h1>განვითარების ციკლი</h1><p class="lead">ეტაპები თემატური მიმართულებებია და არა დატვირთვის ავტომატური ზრდის ვალდებულება. ბლოკები ერთვება შიოს არსებულ მომზადებაში, მისი თანხმობით.</p></div>
    <div class="row">${S.settings.programStart?`<span class="chip">დაწყება: ${fmtNum(S.settings.programStart)}</span>`:''}<button class="btn sm" data-a="startProgram">${ic('cal')} ${S.settings.programStart?'შეცვლა':'ციკლის დაწყება'}</button></div></div>

  <div class="notice">${ic('shield')}<div><b>დატვირთვის წესები:</b> კვირაში მაქსიმუმ 2 მოკლე ბლოკი (10–15 წთ), როგორც შიოს სესიის ნაწილი · არა თამაშის დღეს · არა დაღლილ მდგომარეობაში · ხტომების მოცულობა არ იზრდება · მძიმე ფეხის ვარჯიში არ ემატება · დაღლილობა ან მუხლის დისკომფორტი → შემცირებული ან ტექნიკური ვერსია, ან სპეციალისტთან შეთანხმება.</div></div>

  <div class="week-tabs" role="tablist">${S.program.map(p=>`<button role="tab" class="${p.week===ui.planWeek?'on':''} ${p.week===cw?'cur':''}" data-a="planWeek" data-x="${p.week}"><b>WEEK ${p.week}</b><span>${esc(p.title.split(' ').slice(0,3).join(' '))}…</span></button>`).join('')}</div>

  <div class="grid g2" style="align-items:start">
    <div class="card">
      <div class="eyebrow">Week ${W.week}${mon?` · ${fmtShort(mon)} – ${fmtShort(addDays(mon,6))}`:''}</div>
      <h2 style="margin-top:4px">${esc(W.title)}</h2>
      <div class="stack" style="margin-top:14px">
        <div><div class="eyebrow">მიზანი</div><p>${esc(W.goal)}</p></div>
        <div><div class="eyebrow">კვირის მთავარი აქცენტი</div><p>${esc(W.focus)}</p></div>
        <div><div class="eyebrow">შესრულების კრიტერიუმები</div><ul class="ul">${W.criteria.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
        <div><div class="eyebrow">პროგრესის საზომები</div><ul class="ul">${W.measures.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
        <div><div class="eyebrow">დატვირთვის მართვა</div><ul class="ul">${W.load.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
        ${isParent()?`<button class="btn sm ghost" data-a="editWeekText" data-x="${W.week}">${ic('edit')} ტექსტის რედაქტირება</button>`:''}
      </div>
    </div>
    <div class="card">
      <div class="card-h"><h2>სავარჯიშოები</h2>${isParent()?`<button class="btn sm" data-a="addWeekItem" data-x="${W.week}">${ic('plus')} დამატება</button>`:''}</div>
      <div class="stack">
        ${weekItems(W.week).map((it,i)=>`<div class="plan-ex">${diagramSVG(it.ex.diagram)}<div class="info"><a href="#ex-${it.ex.id}" style="color:inherit;text-decoration:none"><b>${esc(it.ex.name)}</b></a><span>${esc(it.ex.ka)} · ${it.sets??it.ex.sets} × ${esc(it.reps??it.ex.reps)} · დასვ. ${esc(it.rest??it.ex.rest)}</span></div>
          ${isParent()?`<button class="btn sm ghost" data-a="editWeekItem" data-x="${W.week}" data-y="${i}" aria-label="რედაქტირება">${ic('edit')}</button>`:''}</div>`).join('') || '<div class="empty">სავარჯიშოები არ არის.</div>'}
      </div>
      <div class="hr" style="margin:14px 0"></div>
      <div class="card-h" style="margin-bottom:8px"><h3>ამ კვირის ბლოკები</h3><button class="btn sm primary" data-a="planBlock" data-x="" data-y="${W.week}">${ic('bolt')} ბლოკის დაგეგმვა</button></div>
      ${mon? (wkBlocks.length? `<div class="stack">${wkBlocks.sort((a,b)=>a.date.localeCompare(b.date)).map(b=>{ const s=blockSession(b); return `<div class="row" style="justify-content:space-between"><span>${esc(fmtLong(b.date))}</span><span class="row">${b.agreed?'<span class="chip green">შეთანხმებული</span>':'<span class="chip yellow">თანხმობის მოლოდინში</span>'}${s?`<span class="chip ${STATUS[s.status].c}">${STATUS[s.status].t}</span>`:''}<button class="btn sm ghost" data-a="blockMenu" data-x="${b.date}">${ic('edit')}</button></span></div>`; }).join('')}</div>`
        : '<p class="small muted">ამ კვირაში ბლოკი ჯერ არ არის დაგეგმილი.</p>') : '<p class="small muted">დაიწყე ციკლი, რომ კვირები კალენდარს დაუკავშირდეს.</p>'}
    </div>
  </div>`;
}

/* ---------- LIBRARY ---------- */
function pageLibrary(){
  const q=ui.libQ.toLowerCase();
  const list=S.exercises.filter(e=>(ui.libCat==='all'||e.cat===ui.libCat) && (!q || (e.name+' '+e.ka+' '+e.skill).toLowerCase().includes(q)));
  return `
  <div class="page-head"><div><div class="eyebrow">Exercise Library</div><h1>სავარჯიშოების ბიბლიოთეკა</h1><p class="lead">${S.exercises.length} სავარჯიშო, 6 კატეგორია. სქემები აჩვენებს მოძრაობის მიმართულებას; ვიდეოს სლოტი ივსება მოგვიანებით, რეალური დემონსტრაციით.</p></div>
    ${isParent()?`<button class="btn primary" data-a="editExercise" data-x="">${ic('plus')} ახალი სავარჯიშო</button>`:''}</div>
  <div class="row" style="justify-content:space-between">
    <div class="filters">${[['all','ყველა'],...Object.entries(CATEGORIES).map(([k,v])=>[k,v.ka])].map(([k,l])=>`<button class="${ui.libCat===k?'on':''}" data-a="libCat" data-x="${k}">${esc(l)}</button>`).join('')}</div>
    <input class="inp" id="libSearch" type="search" placeholder="ძებნა…" value="${esc(ui.libQ)}" style="max-width:260px">
  </div>
  ${ui.libCat!=='all'?`<div class="notice">${ic('info')}<div><b>${esc(CATEGORIES[ui.libCat].name)}:</b> ${esc(CATEGORIES[ui.libCat].goal)}</div></div>`:''}
  <div class="lib">${list.map(e=>`<a href="#ex-${e.id}">${diagramSVG(e.diagram)}<div><div class="eyebrow">${esc(CATEGORIES[e.cat]?.ka||'')}</div><b>${esc(e.name)}</b><span style="display:block">${esc(e.ka)}</span><span>${e.sets} × ${esc(e.reps)} · დასვ. ${esc(e.rest)}</span></div></a>`).join('') || '<div class="empty">ვერაფერი მოიძებნა.</div>'}</div>`;
}
function pageExercise(id){
  const e=exById(id), C=CATEGORIES[e.cat]||{};
  const inWeeks = S.program.filter(w=>w.items.some(i=>i.id===id)).map(w=>w.week);
  const sec=(n,t,b)=>`<div><div class="eyebrow">${n} · ${t}</div><div style="margin-top:4px">${b}</div></div>`;
  return `
  <div class="row"><a class="btn sm ghost" href="#library">${ic('left')} ბიბლიოთეკა</a>${isParent()?`<button class="btn sm" data-a="editExercise" data-x="${e.id}">${ic('edit')} რედაქტირება</button><button class="btn sm danger" data-a="deleteExercise" data-x="${e.id}">${ic('trash')} წაშლა</button>`:''}</div>
  <div class="page-head"><div><div class="eyebrow">${esc(C.name||'')} · ${esc(C.ka||'')}</div><h1>${esc(e.name)}</h1><p class="lead">${esc(e.ka)}${inWeeks.length?` · პროგრამაში: Week ${inWeeks.join(', ')}`:''}</p></div></div>
  <div class="detail-grid">
    <div class="stack" style="gap:14px">
      <div class="card">${diagramSVG(e.diagram)}<div style="margin-top:10px">${DIAG_LEGEND}</div></div>
      <div class="card"><div class="eyebrow">2 · ვიდეო დემონსტრაცია</div>
        <div class="video-slot" style="margin-top:8px">${ic('video')}${e.videoUrl?`<a class="btn sm" href="${esc(e.videoUrl)}" target="_blank" rel="noopener">${ic('ext')} ვიდეოს გახსნა</a><span class="small" style="word-break:break-all">${esc(e.videoUrl)}</span>`:'<span>ვიდეო ჯერ არ არის დამატებული. მშობელს ან შიოს შეუძლია დაამატოს რეალური დემონსტრაციის ბმული.</span>'}${isParent()?`<button class="btn sm" data-a="editVideo" data-x="${e.id}">${e.videoUrl?'შეცვლა':'ბმულის დამატება'}</button>`:''}</div>
      </div>
      <div class="kv"><div><small>6 · სეტები</small><b>${e.sets}</b></div><div><small>7 · გამეორება / დრო</small><b>${esc(e.reps)}</b></div><div><small>8 · დასვენება</small><b>${esc(e.rest)}</b></div></div>
    </div>
    <div class="card stack" style="gap:16px">
      ${sec(3,'რა უნარს ავითარებს',esc(e.skill))}
      ${sec(4,'საწყისი პოზიცია',esc(e.start))}
      ${sec(5,'შესრულება ნაბიჯ-ნაბიჯ',`<ol class="steps">${e.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol>`)}
      <div class="focus"><b>ტექნიკური აქცენტი:</b> ${esc(e.focus)}</div>
      ${sec(9,'გავრცელებული შეცდომები',`<ul class="ul">${e.mistakes.map(s=>`<li>${esc(s)}</li>`).join('')}</ul>`)}
      ${sec(10,'უსაფრთხოება',`<div class="notice warn">${ic('alert')}<div>${e.safety.map(esc).join('<br>')}<br>ნებისმიერი ტკივილი → შეწყვიტე და უთხარი ზრდასრულს.</div></div>`)}
      <div class="grid g2">${sec(11,'გამარტივებული ვერსია',esc(e.easier))}${sec(12,'გართულებული ვერსია',esc(e.harder)+'<div class="small muted" style="margin-top:4px">მხოლოდ შიოსთან შეთანხმებით.</div>')}</div>
      ${sec(13,'დასრულების კრიტერიუმი',`<b>${esc(e.done)}</b>`)}
    </div>
  </div>`;
}

/* ---------- PROGRESS ---------- */
function phaseName(p){ return ({baseline:'საწყისი',mid:'შუალედური',final:'საბოლოო',other:'სხვა'})[p]||p; }
function pageProgress(){
  const all=S.sessions, done=all.filter(s=>s.status==='done').length, part=all.filter(s=>s.status==='partial').length, skip=all.filter(s=>s.status==='skipped').length;
  const pct = all.length? Math.round((done+part*.5)/all.length*100) : null;
  const speed=all.filter(s=>s.kind==='speed');
  return `
  <div class="page-head"><div><div class="eyebrow">Progress Tracking</div><h1>პროგრესი</h1><p class="lead">ყველა გრაფიკი იყენებს მხოლოდ შენ მიერ შეყვანილ მონაცემებს.</p></div></div>
  <div class="grid g4">
    <div class="card stat"><div class="label">შესრულებული</div><div class="value">${done}</div><div class="sub">+ ${part} ნაწილობრივ</div></div>
    <div class="card stat"><div class="label">გამოტოვებული</div><div class="value">${skip}</div><div class="sub">ჩანაწერებიდან</div></div>
    <div class="card stat"><div class="label">შესრულების %</div><div class="value">${pct==null?'—':pct}<small>${pct==null?'':'%'}</small></div><div class="sub">აღრიცხულ აქტივობებზე</div></div>
    <div class="card stat"><div class="label">სისწრაფის ბლოკები</div><div class="value">${speed.filter(s=>s.status!=='skipped').length}</div><div class="sub">${Object.keys(S.checkins).length} Check-in სულ</div></div>
  </div>
  <div class="grid g2">
    <div class="card"><div class="card-h"><h2>აქტივობა კვირების მიხედვით</h2></div>${chartSlot('cWeeks', all.length)}</div>
    <div class="card"><div class="card-h"><h2>შესრულების % კვირაში</h2></div>${chartSlot('cPct', all.length)}</div>
    <div class="card"><div class="card-h"><h2>ძილის ისტორია</h2></div>${chartSlot('cSleep', Object.keys(S.checkins).length)}</div>
    <div class="card"><div class="card-h"><h2>ენერგია · დაღლილობა · ფეხები</h2></div>${chartSlot('cWell', Object.keys(S.checkins).length)}</div>
    <div class="card"><div class="card-h"><h2>მუხლის მდგომარეობა</h2></div>${chartSlot('cKnee', Object.keys(S.checkins).length)}</div>
    <div class="card"><div class="card-h"><h2>სესიების სირთულე (1–10)</h2></div>${chartSlot('cRpe', all.filter(s=>s.difficulty).length)}</div>
  </div>
  ${testsSection()}`;
}
const chartSlot = (id,n) => n? `<div class="chart-box"><canvas id="${id}"></canvas></div>` : `<div class="empty">მონაცემები ჯერ არ არის. ${id==='cSleep'||id==='cWell'||id==='cKnee'?'შეავსე Check-in.':'აღრიცხე ვარჯიში.'}</div>`;
function testsSection(){
  const rows=[...S.tests].sort((a,b)=>b.date.localeCompare(a.date));
  const cmp = Object.entries(TESTS).map(([k,T])=>{
    const r=S.tests.filter(x=>x.test===k).sort((a,b)=>a.date.localeCompare(b.date));
    const base=r.find(x=>x.phase==='baseline'), fin=[...r].reverse().find(x=>x.phase==='final');
    let delta='—';
    if(base&&fin){ const d=(+fin.value)-(+base.value); const good = T.better==='lower'? d<0 : d>0; delta=`<span class="chip ${d===0?'none':good?'green':'red'}">${d>0?'+':''}${d.toFixed(2)} ${esc(T.unit)}</span>`; }
    return `<tr><td><b>${esc(T.ka)}</b><div class="small muted">${esc(T.name)} · ${T.better==='lower'?'ნაკლები = უკეთესი':'მეტი = უკეთესი'}</div></td><td class="n">${base?esc(base.value):'—'}</td><td class="n">${fin?esc(fin.value):'—'}</td><td>${delta}</td><td class="n">${r.length}</td></tr>`;
  }).join('');
  return `
  <div class="card">
    <div class="card-h"><div><h2>სისწრაფის შეფასება — ტესტები</h2><p class="small muted" style="margin-top:4px">საწყისი და საბოლოო ტესტები ტარდება მხოლოდ მწვრთნელთან შეთანხმებით, ერთნაირ პირობებში და უსაფრთხო ზედაპირზე.</p></div><button class="btn primary" data-a="addTest">${ic('plus')} შედეგის დამატება</button></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>ტესტი</th><th>საწყისი</th><th>საბოლოო</th><th>ცვლილება</th><th>ჩანაწერი</th></tr></thead><tbody>${cmp}</tbody></table></div>
    ${S.tests.length?`<div class="grid g2" style="margin-top:14px">${Object.keys(TESTS).filter(k=>S.tests.some(x=>x.test===k)).map(k=>`<div><div class="eyebrow">${esc(TESTS[k].ka)} (${esc(TESTS[k].unit)})</div><div class="chart-box" style="height:200px"><canvas id="cT-${k}"></canvas></div></div>`).join('')}</div>
      <h3 style="margin:16px 0 8px">ყველა შედეგი</h3>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>თარიღი</th><th>ტესტი</th><th>შედეგი</th><th>ეტაპი</th><th>პირობები</th><th>შენიშვნა</th></tr></thead><tbody>
      ${rows.map(r=>`<tr class="click" data-a="addTest" data-x="${r.id}"><td>${fmtNum(r.date)}</td><td>${esc(TESTS[r.test]?.ka||r.test)}</td><td class="n">${esc(r.value)} ${esc(TESTS[r.test]?.unit||'')}</td><td>${esc(phaseName(r.phase))}</td><td class="muted">${esc(r.conditions||'')}</td><td class="muted">${esc(r.notes||'')}</td></tr>`).join('')}
      </tbody></table></div>`
      :`<div class="empty" style="margin-top:14px">შედეგები ჯერ არ არის შეყვანილი. საწყისი მონაცემები არ არის გამოგონილი — შეიყვანე პირველი რეალური ტესტის შემდეგ.</div>`}
  </div>`;
}
function chartDefaults(){
  if(!window.Chart) return false;
  Chart.defaults.color='#9097a2'; Chart.defaults.borderColor='#23272d';
  Chart.defaults.font.family="'Noto Sans Georgian', system-ui, sans-serif"; Chart.defaults.font.size=11;
  Chart.defaults.plugins.legend.labels.boxWidth=10; Chart.defaults.plugins.legend.labels.boxHeight=10;
  Chart.defaults.animation.duration = matchMedia('(prefers-reduced-motion: reduce)').matches?0:500;
  return true;
}
function mk(id,cfg){ const el=document.getElementById(id); if(!el) return; cfg.options=Object.assign({responsive:true,maintainAspectRatio:false},cfg.options||{}); charts.push(new Chart(el,cfg)); }
function lastNWeeks(n){ const m=mondayOf(todayISO()); const out=[]; for(let i=n-1;i>=0;i--) out.push(addDays(m,-7*i)); return out; }
function drawProgressCharts(){
  if(!chartDefaults()){ $$('.chart-box').forEach(b=>b.innerHTML='<div class="empty">გრაფიკების ბიბლიოთეკა ვერ ჩაიტვირთა (საჭიროა ინტერნეტი).</div>'); return; }
  const weeks=lastNWeeks(8);
  const inW = (s,m)=> s.date>=m && s.date<=addDays(m,6);
  const lab = weeks.map(m=>{ const w=programWeek(m); return (w>=1&&w<=6?`W${w} · `:'')+fmtShort(m); });
  mk('cWeeks',{ type:'bar', data:{ labels:lab, datasets:[
    {label:'შესრულდა',data:weeks.map(m=>S.sessions.filter(s=>inW(s,m)&&s.status==='done').length),backgroundColor:'#3ee27e',borderRadius:4},
    {label:'ნაწილობრივ',data:weeks.map(m=>S.sessions.filter(s=>inW(s,m)&&s.status==='partial').length),backgroundColor:'#ffc53d',borderRadius:4},
    {label:'გამოტოვა',data:weeks.map(m=>S.sessions.filter(s=>inW(s,m)&&s.status==='skipped').length),backgroundColor:'#ff5252',borderRadius:4}]},
    options:{ scales:{ x:{stacked:true,grid:{display:false}}, y:{stacked:true,beginAtZero:true,ticks:{precision:0}} } } });
  mk('cPct',{ type:'line', data:{ labels:lab, datasets:[{label:'შესრულება %',data:weeks.map(m=>weekStats(m, addDays(m,6)<todayISO()?addDays(m,6):todayISO()).pct),borderColor:'#ff6b1f',backgroundColor:'rgba(255,107,31,.15)',fill:true,tension:.3,pointRadius:3,spanGaps:true}]},
    options:{ plugins:{legend:{display:false}}, scales:{ y:{min:0,max:100,ticks:{callback:v=>v+'%'}}, x:{grid:{display:false}} } } });
  const cis=Object.values(S.checkins).sort((a,b)=>a.date.localeCompare(b.date)).slice(-28);
  const cl=cis.map(c=>fmtShort(c.date));
  mk('cSleep',{ type:'bar', data:{ labels:cl, datasets:[
    {type:'bar',label:'ძილი (სთ)',data:cis.map(c=>c.sleepHours),backgroundColor:'rgba(90,169,255,.55)',borderRadius:3,yAxisID:'y'},
    {type:'line',label:'ხარისხი (1–5)',data:cis.map(c=>c.sleepQuality),borderColor:'#3ee27e',pointRadius:2,tension:.3,yAxisID:'y1'}]},
    options:{ scales:{ y:{beginAtZero:true,suggestedMax:10,title:{display:true,text:'სთ'}}, y1:{position:'right',min:0,max:5,grid:{display:false}}, x:{grid:{display:false}} } } });
  mk('cWell',{ type:'line', data:{ labels:cl, datasets:[
    {label:'ენერგია',data:cis.map(c=>c.energy),borderColor:'#3ee27e',tension:.3,pointRadius:2},
    {label:'დაღლილობა',data:cis.map(c=>c.fatigue),borderColor:'#ff6b1f',tension:.3,pointRadius:2},
    {label:'ფეხების სიმძიმე',data:cis.map(c=>c.legs),borderColor:'#b58cff',tension:.3,pointRadius:2}]},
    options:{ scales:{ y:{min:0,max:5,ticks:{stepSize:1}}, x:{grid:{display:false}} } } });
  const kv={none:1,mild:2,pain:3}, kc={none:'#3ee27e',mild:'#ffc53d',pain:'#ff5252'};
  mk('cKnee',{ type:'bar', data:{ labels:cl, datasets:[{label:'მუხლი',data:cis.map(c=>kv[c.knee]),backgroundColor:cis.map(c=>kc[c.knee]),borderRadius:3}]},
    options:{ plugins:{legend:{display:false},tooltip:{callbacks:{label:(c)=>KNEE[cis[c.dataIndex].knee]}}}, scales:{ y:{min:0,max:3,ticks:{stepSize:1,callback:v=>({1:'არა',2:'მსუბ.',3:'აწუხებს'})[v]||''}}, x:{grid:{display:false}} } } });
  const rp=S.sessions.filter(s=>s.difficulty).sort((a,b)=>a.date.localeCompare(b.date)).slice(-30);
  mk('cRpe',{ type:'line', data:{ labels:rp.map(s=>fmtShort(s.date)), datasets:[{label:'სირთულე',data:rp.map(s=>s.difficulty),borderColor:'#ff6b1f',backgroundColor:rp.map(s=>s.kind==='speed'?'#ff6b1f':'#5aa9ff'),pointRadius:4,tension:.25}]},
    options:{ plugins:{legend:{display:false},tooltip:{callbacks:{afterLabel:(c)=>typeName(rp[c.dataIndex])}}}, scales:{ y:{min:0,max:10}, x:{grid:{display:false}} } } });
  Object.keys(TESTS).forEach(k=>{
    const r=S.tests.filter(x=>x.test===k).sort((a,b)=>a.date.localeCompare(b.date)); if(!r.length) return;
    mk('cT-'+k,{ type:'line', data:{ labels:r.map(x=>fmtShort(x.date)), datasets:[{label:TESTS[k].ka,data:r.map(x=>+x.value),borderColor:'#ff6b1f',backgroundColor:r.map(x=>x.phase==='baseline'?'#5aa9ff':x.phase==='final'?'#3ee27e':'#ff6b1f'),pointRadius:5,tension:.2}]},
      options:{ plugins:{legend:{display:false},tooltip:{callbacks:{afterLabel:(c)=>phaseName(r[c.dataIndex].phase)}}}, scales:{ y:{ reverse:false }, x:{grid:{display:false}} } } });
  });
}
function drawDashSpark(){
  const el=$('#dashSpark'), box=$('#dashSparkBox'); if(!el || !chartDefaults()) { if(box) box.remove(); return; }
  const t=todayISO(), d=[], l=[]; for(let i=13;i>=0;i--){ const x=addDays(t,-i); l.push(fmtShort(x)); d.push(S.checkins[x]?S.checkins[x].sleepHours:null); }
  if(!d.some(v=>v!=null)){ box.remove(); return; }
  charts.push(new Chart(el,{ type:'line', data:{labels:l,datasets:[{data:d,borderColor:'#5aa9ff',backgroundColor:'rgba(90,169,255,.15)',fill:true,pointRadius:0,tension:.35,spanGaps:true}]},
    options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false},tooltip:{enabled:false}}, scales:{x:{display:false},y:{display:false,suggestedMin:4,suggestedMax:11}} } }));
}

/* ---------- HISTORY ---------- */
function pageHistory(){
  const tab=ui.histTab;
  let list=[...S.sessions].sort((a,b)=>(b.date+(b.time||'')).localeCompare(a.date+(a.time||'')));
  if(ui.histType!=='all') list=list.filter(s=> ui.histType==='SPEED'? s.kind==='speed' : s.type===ui.histType);
  if(ui.histStatus!=='all') list=list.filter(s=>s.status===ui.histStatus);
  const cis=Object.values(S.checkins).sort((a,b)=>b.date.localeCompare(a.date));
  return `
  <div class="page-head"><div><div class="eyebrow">Session History</div><h1>ვარჯიშების ისტორია</h1><p class="lead">გახსენი ნებისმიერი ჩანაწერი შესასწორებლად.</p></div>
    <button class="btn" data-a="newManual">${ic('plus')} ჩანაწერის დამატება</button></div>
  <div class="filters"><button class="${tab==='sessions'?'on':''}" data-a="histTab" data-x="sessions">სესიები (${S.sessions.length})</button><button class="${tab==='checkins'?'on':''}" data-a="histTab" data-x="checkins">Check-in (${cis.length})</button></div>
  ${tab==='sessions'?`
  <div class="row">
    <select class="inp" id="histType" style="max-width:240px" aria-label="ტიპი"><option value="all">ყველა ტიპი</option><option value="SPEED" ${ui.histType==='SPEED'?'selected':''}>სისწრაფის ბლოკი</option>${Object.entries(EVENT_TYPES).map(([k,v])=>`<option value="${k}" ${ui.histType===k?'selected':''}>${esc(v.name)}</option>`).join('')}</select>
    <select class="inp" id="histStatus" style="max-width:200px" aria-label="სტატუსი"><option value="all">ყველა სტატუსი</option>${Object.entries(STATUS).map(([k,v])=>`<option value="${k}" ${ui.histStatus===k?'selected':''}>${v.t}</option>`).join('')}</select>
  </div>
  ${list.length?`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>თარიღი</th><th>ტიპი</th><th>დაგეგმილი</th><th>რეალურად შესრულებული</th><th>სტატუსი</th><th>ხანგრძ.</th><th>სირთულე</th><th>მუხლი</th><th>კომენტარი</th></tr></thead><tbody>
    ${list.map(s=>`<tr class="click" data-a="editSession" data-x="${s.id}"><td>${fmtNum(s.date)}${s.time?`<div class="small muted">${esc(s.time)}</div>`:''}</td><td>${esc(typeName(s))}</td><td class="muted">${esc(s.planned||'')}</td><td>${esc(s.actual||'')}</td><td><span class="chip ${STATUS[s.status].c}">${STATUS[s.status].t}</span></td><td class="n">${s.duration?esc(s.duration)+' წთ':'—'}</td><td class="n">${s.difficulty?esc(s.difficulty)+'/10':'—'}</td><td>${s.knee?esc(KNEE[s.knee]):'—'}</td><td class="muted">${esc(s.comment||'')}</td></tr>`).join('')}
  </tbody></table></div>`:`<div class="empty">ჩანაწერები ჯერ არ არის. მონიშნე ვარჯიში შესრულებულად Today ან კალენდრის გვერდიდან.</div>`}`
  :`${cis.length?`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>თარიღი</th><th>სტატუსი</th><th>ძილი</th><th>ხარისხი</th><th>ენერგია</th><th>დაღლ.</th><th>ფეხები</th><th>მუხლი</th><th>შენიშვნა</th></tr></thead><tbody>
    ${cis.map(c=>`<tr class="click" data-a="checkinModal" data-x="${c.date}"><td>${fmtNum(c.date)}</td><td>${lvlChip(readiness(c).level)}</td><td class="n">${c.sleepHours} სთ</td><td class="n">${c.sleepQuality}</td><td class="n">${c.energy}</td><td class="n">${c.fatigue}</td><td class="n">${c.legs}</td><td>${KNEE[c.knee]}</td><td class="muted">${esc(c.note||'')}</td></tr>`).join('')}
  </tbody></table></div>`:'<div class="empty">Check-in ჩანაწერები ჯერ არ არის.</div>'}`}`;
}

/* ---------- PARENT ---------- */
function pageParent(){
  const p=S.profile, on=isParent(), t=todayISO(), cw=programWeek(t);
  const lockMsg = `<div class="notice">${ic('lock')}<div>ეს ფუნქცია ხელმისაწვდომია მშობლის რეჟიმში.</div></div>`;
  return `
  <div class="page-head"><div><div class="eyebrow">Admin · Parent Controls</div><h1>მშობლის პანელი</h1><p class="lead">გრაფიკის, პროგრამის, სავარჯიშოების და მონაცემების მართვა. გიოს ყოველდღიური ინტერფეისი რჩება მარტივი.</p></div>
    <button class="btn ${on?'':'primary'}" data-a="toggleMode">${ic(on?'user':'shield')} ${on?'გიოს რეჟიმზე დაბრუნება':'მშობლის რეჟიმის ჩართვა'}</button></div>

  <div class="grid g2" style="align-items:start">
    <div class="card">
      <div class="card-h"><h2>სპორტსმენის პროფილი</h2>${on?`<button class="btn sm" data-a="editProfile">${ic('edit')} რედაქტირება</button>`:''}</div>
      <div class="kv" style="grid-template-columns:repeat(2,minmax(0,1fr))">
        <div><small>სახელი</small><b>${esc(p.name)}</b></div>
        <div><small>დაბადება</small><b>${fmtNum(p.dob)}</b></div>
        <div><small>ასაკი</small><b>${ageOn(p.dob,t)}</b></div>
        <div><small>სიმაღლე</small><b>${esc(p.height)}</b></div>
        <div><small>პოზიცია</small><b>${p.position?esc(p.position):'<span class="muted" style="font-size:.9rem">არ არის განსაზღვრული</span>'}</b></div>
        <div><small>სპეციალისტი</small><b>${esc(p.specialist)}</b></div>
      </div>
      <p class="small muted" style="margin-top:12px"><b style="color:var(--fg)">ჯანმრთელობის კონტექსტი:</b> ${esc(p.health)}</p>
      <p class="small muted" style="margin-top:6px"><b style="color:var(--fg)">პრიორიტეტი:</b> ${esc(p.priority)} · ${esc(p.category)}</p>
    </div>

    <div class="card">
      <div class="card-h"><h2>პროგრამის კვირა</h2></div>
      <p class="small muted">${esc(weekLabel(cw))}${S.settings.programStart?` · დაწყება ${fmtNum(S.settings.programStart)}`:''}</p>
      ${on?`<div class="field" style="margin-top:12px"><span class="lbl">მიმდინარე კვირის დაყენება</span>${seg('setWeek',[1,2,3,4,5,6],cw)}</div>
      <div class="row" style="margin-top:12px"><button class="btn sm" data-a="startProgram">${ic('cal')} დაწყების თარიღი</button>${S.settings.programStart?`<button class="btn sm ghost" data-a="clearProgram">ციკლის გაუქმება</button>`:''}</div>`:lockMsg}
    </div>
  </div>

  <div class="card">
    <div class="card-h"><h2>ყოველკვირეული გრაფიკი (შაბლონი)</h2>${on?`<button class="btn sm" data-a="addTemplate">${ic('plus')} დამატება</button>`:''}</div>
    <p class="small muted" style="margin-bottom:12px">შაბლონი ვრცელდება ყველა კვირაზე. კონკრეტული დღის ცვლილებები (თამაში, გაცდენა) კეთდება კალენდარში.</p>
    <div class="grid g4">${DAYS_KA.map((dn,i)=>{ const evs=S.template.filter(e=>e.day===i).sort(byTime); return `<div class="stack" style="gap:6px"><div class="eyebrow">${dn}</div>${evs.map(e=>{ const T=EVENT_TYPES[e.type]||EVENT_TYPES.OTHER; return `<div class="ev ${T.cls}" style="padding:8px 10px"><div class="time" style="width:auto;font-size:1rem">${esc(e.time||'—')}</div><div class="what"><b style="font-size:.85rem">${esc(T.short)}</b></div>${on?`<div class="actions"><button class="btn sm ghost" data-a="editTemplate" data-x="${e.id}" aria-label="რედაქტირება">${ic('edit')}</button></div>`:''}</div>`; }).join('')||'<span class="small muted">—</span>'}</div>`; }).join('')}</div>
  </div>

  <div class="grid g2" style="align-items:start">
    <div class="card">
      <div class="card-h"><h2>სავარჯიშოები და პროგრამა</h2></div>
      ${on?`<div class="row"><button class="btn" data-a="editExercise" data-x="">${ic('plus')} ახალი სავარჯიშო</button><a class="btn ghost" href="#library">${ic('book')} ბიბლიოთეკა</a><a class="btn ghost" href="#plan">${ic('layers')} სეტები/გამეორებები</a></div>
        <p class="small muted" style="margin-top:10px">სავარჯიშოს რედაქტირება ან წაშლა — ბიბლიოთეკაში, სავარჯიშოს გვერდზე. სეტები და გამეორებები კონკრეტული კვირისთვის — Training Plan-ში.</p>`:lockMsg}
      <div class="hr" style="margin:14px 0"></div>
      <div class="row"><a class="btn ghost" href="#history">${ic('clock')} ჩანაწერები</a><a class="btn ghost" href="#progress">${ic('chart')} პროგრესი</a></div>
    </div>
    <div class="card">
      <div class="card-h"><h2>PIN კოდი</h2></div>
      ${on?`<p class="small muted">არასავალდებულო 4-ნიშნა PIN მშობლის რეჟიმის ჩასართავად. ეს მოხერხებულობისთვისაა და არა უსაფრთხოების სისტემა.</p>
      <div class="row" style="margin-top:10px"><input class="inp" id="pinNew" inputmode="numeric" maxlength="4" placeholder="${S.settings.pin?'PIN დაყენებულია':'ახალი PIN'}" style="max-width:160px"><button class="btn sm" data-a="setPin">შენახვა</button>${S.settings.pin?`<button class="btn sm ghost" data-a="clearPin">PIN-ის მოხსნა</button>`:''}</div>`:lockMsg}
    </div>
  </div>

  <div class="card">
    <div class="card-h"><h2>მონაცემები: Export / Import / Backup</h2><span class="chip">${(JSON.stringify(S).length/1024).toFixed(1)} KB</span></div>
    <div class="notice warn">${ic('info')}<div><b>მონაცემები ინახება მხოლოდ ამ მოწყობილობასა და ამ ბრაუზერში (LocalStorage).</b> სხვა ტელეფონზე ან ბრაუზერში ისინი არ გამოჩნდება. ბრაუზერის მონაცემების წაშლისას ისინი იკარგება — რეგულარულად გააკეთე სარეზერვო ასლი. მოწყობილობებს შორის სინქრონიზაციისთვის საჭიროა ცალკე Backend, რომელიც ამ ვერსიაში არ არის.</div></div>
    <div class="row" style="margin-top:14px">
      <button class="btn primary" data-a="exportJSON">${ic('down')} JSON ფაილის ჩამოტვირთვა</button>
      <button class="btn" data-a="copyJSON">${ic('copy')} JSON-ის კოპირება</button>
      <label class="btn" for="importFile" style="cursor:pointer">${ic('up')} JSON ფაილის იმპორტი</label><input type="file" id="importFile" accept="application/json,.json" hidden>
      <button class="btn ghost" data-a="pasteImport">${ic('up')} ტექსტით იმპორტი</button>
    </div>
    <p class="small muted" style="margin-top:10px">ბოლო შენახვა: ${S.meta.savedAt?new Date(S.meta.savedAt).toLocaleString('ka-GE'):'—'}. მონაცემები ინახება ავტომატურად ყოველი ცვლილებისას.</p>
    ${on?`<div class="hr" style="margin:14px 0"></div><button class="btn danger" data-a="resetAll">${ic('trash')} ყველა მონაცემის წაშლა</button>`:''}
  </div>`;
}

/* =========================================================
   MODALS & ACTIONS
   ========================================================= */
function sessionModal(s, isNew){
  M = { status:s.status, difficulty:s.difficulty||null, discomfort:s.discomfort||null, knee:s.knee||null };
  const typeOpts = `<option value="SPEED" ${s.kind==='speed'?'selected':''}>სისწრაფის ბლოკი</option>`+Object.entries(EVENT_TYPES).map(([k,v])=>`<option value="${k}" ${s.kind!=='speed'&&s.type===k?'selected':''}>${esc(v.name)}</option>`).join('');
  openModal(isNew?'ახალი ჩანაწერი':'ჩანაწერის რედაქტირება', `
  <div class="stack" style="gap:14px">
    <div class="grid g2"><div class="field"><label for="sDate">თარიღი</label><input class="inp" type="date" id="sDate" value="${s.date}" ${s.eventKey||s.blockDate?'disabled':''}></div>
      <div class="field"><label for="sType">ვარჯიშის ტიპი</label><select class="inp" id="sType" ${s.eventKey||s.blockDate?'disabled':''}>${typeOpts}</select></div></div>
    <div class="field"><span class="lbl">სტატუსი</span>${seg('status',[['done','შესრულდა'],['partial','ნაწილობრივ'],['skipped','გამოტოვა']],M.status,'text')}</div>
    <div class="field"><label for="sPlanned">დაგეგმილი აქტივობა</label><input class="inp" id="sPlanned" value="${esc(s.planned||'')}"></div>
    <div class="field"><label for="sActual">რეალურად შესრულებული</label><input class="inp" id="sActual" value="${esc(s.actual||'')}" placeholder="მაგ. სრული ვარჯიში / მხოლოდ ტექნიკური ნაწილი"></div>
    <div class="field"><label for="sDur">ხანგრძლივობა (წთ)</label><input class="inp" type="number" inputmode="numeric" min="0" max="300" id="sDur" value="${esc(s.duration||'')}"></div>
    <div class="field"><span class="lbl">რამდენად რთული იყო (1–10)</span>${seg('difficulty',[1,2,3,4,5,6,7,8,9,10],M.difficulty)}<div class="scale-hint"><span>1 — ძალიან მსუბუქი</span><span>10 — მაქსიმალური</span></div></div>
    <div class="field"><span class="lbl">ჰქონდა დისკომფორტი?</span>${seg('discomfort',[['none','არა'],['mild','მსუბუქი'],['yes','კი']],M.discomfort,'text')}</div>
    <div class="field"><span class="lbl">მუხლის მდგომარეობა</span>${seg('knee',[['none','არ მაწუხებს'],['mild','მსუბუქი დისკომფორტი'],['pain','მაწუხებს']],M.knee,'text kneeseg')}</div>
    <div class="field"><label for="sComment">კომენტარი</label><textarea class="inp" id="sComment">${esc(s.comment||'')}</textarea></div>
  </div>`, {
    left: isNew?'':`<button class="btn danger" data-a="deleteSession" data-x="${s.id}" style="margin-right:auto">${ic('trash')} წაშლა</button>`,
    onSave:()=>{
      if(!M.status){ toast('აირჩიე სტატუსი'); return false; }
      const o = isNew ? { id:uid('s'), createdAt:new Date().toISOString() } : sessionById(s.id) || s;
      if(!s.eventKey && !s.blockDate){
        o.date = val('sDate') || todayISO();
        const ty = val('sType'); o.kind = ty==='SPEED'?'speed':'manual'; o.type = ty==='SPEED'?'SPEED':ty;
      }
      Object.assign(o,{ status:M.status, planned:val('sPlanned'), actual:val('sActual'), duration:val('sDur')?+val('sDur'):null, difficulty:M.difficulty?+M.difficulty:null, discomfort:M.discomfort, knee:M.knee, comment:val('sComment'), updatedAt:new Date().toISOString() });
      if(!o.title) o.title = typeName(o);
      if(isNew) S.sessions.push(o);
      if(M.discomfort==='yes' || M.knee==='pain') setTimeout(()=>toast('დისკომფორტი აღრიცხულია — უთხარი მშობელს/შიოს.'),2300);
      save('შენახულია'); return true;
    }
  });
}
function eventModal(date, ev){
  const isNew=!ev; ev = ev || { type:'GAME', time:'', note:'' };
  const s = !isNew ? sessionForEvent(date, ev.id) : null;
  const isTpl = !isNew && S.template.some(t=>t.id===ev.id);
  M = { scope:'date' };
  openModal(isNew?'ვარჯიშის დამატება':'ვარჯიშის შეცვლა', `
  <div class="stack" style="gap:14px">
    <p class="muted small">${esc(fmtLong(date))}</p>
    <div class="grid g2">
      <div class="field"><label for="eType">ტიპი</label><select class="inp" id="eType">${Object.entries(EVENT_TYPES).map(([k,v])=>`<option value="${k}" ${ev.type===k?'selected':''}>${esc(v.name)}</option>`).join('')}</select></div>
      <div class="field"><label for="eTime">დრო</label><input class="inp" type="time" id="eTime" value="${esc(ev.time||'')}"></div>
    </div>
    <div class="field"><label for="eNote">შენიშვნა</label><input class="inp" id="eNote" value="${esc(ev.note||'')}" placeholder="მაგ. მოწინააღმდეგე, ადგილი"></div>
    ${isParent() && (isNew || isTpl) ? `<div class="field"><span class="lbl">ცვლილების მასშტაბი</span>${seg('scope',[['date','მხოლოდ ამ დღეს'],['all','ყოველ კვირას']],'date','text')}</div>`:''}
    ${!isNew && ev.type!=='REC'?`<div class="hr"></div><div class="field"><span class="lbl">აღრიცხვა</span><div class="row">${s?`<span class="chip ${STATUS[s.status].c}">${STATUS[s.status].t}</span><button class="btn sm" data-a="editSession" data-x="${s.id}">დეტალები</button><button class="btn sm ghost" data-a="unmark" data-x="${s.id}">გაუქმება</button>`
      :`<button class="btn sm" data-a="quickMark" data-x="${date}" data-y="${ev.id}" data-z="done">${ic('check')} შესრულდა</button><button class="btn sm" data-a="quickMark" data-x="${date}" data-y="${ev.id}" data-z="partial">ნაწილობრივ</button><button class="btn sm ghost" data-a="quickMark" data-x="${date}" data-y="${ev.id}" data-z="skipped">გამოტოვა</button>`}</div></div>`:''}
  </div>`, {
    left: isNew?'':`<button class="btn danger" data-a="deleteEvent" data-x="${date}" data-y="${ev.id}" style="margin-right:auto">${ic('trash')} წაშლა</button>`,
    onSave:()=>{
      const data={ type:val('eType'), time:val('eTime'), note:val('eNote') };
      if(M.scope==='all'){
        if(isNew){ const id=uid('t'); S.template.push({ id, day:wd(date), ...data }); if(S.dateEvents[date]) S.dateEvents[date].push({ id, day:wd(date), ...data }); }
        else { const t=S.template.find(x=>x.id===ev.id); Object.assign(t,data); const d=S.dateEvents[date]; if(d){ const x=d.find(y=>y.id===ev.id); if(x) Object.assign(x,data); } }
      } else {
        const list=materialize(date);
        if(isNew) list.push({ id:uid('e'), day:wd(date), ...data });
        else { const x=list.find(y=>y.id===ev.id); if(x) Object.assign(x,data); }
      }
      save(isNew?'დაემატა':'შეიცვალა'); return true;
    }
  });
}
function templateModal(id){
  const e = id ? S.template.find(x=>x.id===id) : { day:0, time:'', type:'16A', note:'' };
  openModal(id?'შაბლონის რედაქტირება':'შაბლონში დამატება', `
  <div class="stack" style="gap:14px">
    <div class="grid g2">
      <div class="field"><label for="tDay">დღე</label><select class="inp" id="tDay">${DAYS_KA.map((d,i)=>`<option value="${i}" ${e.day===i?'selected':''}>${d}</option>`).join('')}</select></div>
      <div class="field"><label for="tTime">დრო</label><input class="inp" type="time" id="tTime" value="${esc(e.time)}"></div>
    </div>
    <div class="field"><label for="tType">ტიპი</label><select class="inp" id="tType">${Object.entries(EVENT_TYPES).map(([k,v])=>`<option value="${k}" ${e.type===k?'selected':''}>${esc(v.name)}</option>`).join('')}</select></div>
    <div class="field"><label for="tNote">შენიშვნა</label><input class="inp" id="tNote" value="${esc(e.note||'')}"></div>
    <p class="small muted">ცვლილება აისახება ყველა კვირაზე, გარდა იმ დღეებისა, რომლებიც კალენდარში ცალკე შეიცვალა.</p>
  </div>`, {
    left: id?`<button class="btn danger" data-a="deleteTemplate" data-x="${id}" style="margin-right:auto">${ic('trash')} წაშლა</button>`:'',
    onSave:()=>{ const d={ day:+val('tDay'), time:val('tTime'), type:val('tType'), note:val('tNote') };
      if(id) Object.assign(e,d); else S.template.push({ id:uid('t'), ...d }); save('შაბლონი შენახულია'); return true; }
  });
}
function planBlockModal(date, week){
  const t=todayISO();
  date = date || t;
  const cw = programWeek(date);
  const defW = week || ((cw>=1&&cw<=6)?cw:1);
  M = { agreed:'no' };
  const opts=[]; for(let i=0;i<14;i++){ const d=addDays(t,i); opts.push(d); }
  if(!opts.includes(date)) opts.unshift(date);
  openModal('სისწრაფის ბლოკის დაგეგმვა', `
  <div class="stack" style="gap:14px">
    <div class="notice">${ic('info')}<div>ბლოკი 10–15 წუთიანია და შიოს სესიის ნაწილად ტარდება. კვირაში მაქსიმუმ 2. ავტომატურად არ იგეგმება.</div></div>
    <div class="grid g2">
      <div class="field"><label for="bDate">თარიღი</label><select class="inp" id="bDate">${opts.map(d=>{ const l=dayLoad(d); return `<option value="${d}" ${d===date?'selected':''}>${esc(fmtLong(d))} — ${l.count} ვარჯ.${l.game?' · თამაში':''}${eventsFor(d).some(e=>e.type==='SP')?' · შიო':''}${S.blocks[d]?' · უკვე არის ბლოკი':''}</option>`; }).join('')}</select></div>
      <div class="field"><label for="bWeek">პროგრამის კვირა</label><select class="inp" id="bWeek">${S.program.map(p=>`<option value="${p.week}" ${p.week===defW?'selected':''}>Week ${p.week} — ${esc(p.title)}</option>`).join('')}</select></div>
    </div>
    <div id="bWarn"></div>
    <div class="field"><span class="lbl">შეთანხმებულია შიოსთან?</span>${seg('agreed',[['yes','კი, შეთანხმებულია'],['no','ჯერ არა']],'no','text')}</div>
    <div class="field"><label for="bNote">შენიშვნა</label><input class="inp" id="bNote" placeholder="მაგ. შიოს სესიის დასაწყისში"></div>
  </div>`, { saveText:'დაგეგმვა', onSave:()=>{
    const d=val('bDate'), w=+val('bWeek');
    if(S.blocks[d]){ toast('ამ დღეს ბლოკი უკვე დაგეგმილია'); return false; }
    S.blocks[d] = { date:d, week:w, agreed:M.agreed==='yes', note:val('bNote'), items:clone(S.program[w-1].items), doneIds:[], sessionId:null, createdAt:new Date().toISOString() };
    save('ბლოკი დაგეგმილია'); return true; } });
  const warn=()=>{ const d=val('bDate'), l=dayLoad(d), mon=mondayOf(d); const n=Object.keys(S.blocks).filter(x=>x>=mon&&x<=addDays(mon,6)).length; const w=[];
    if(n>=2) w.push(`ამ კვირაში უკვე ${n} ბლოკია — ლიმიტი 2.`); if(l.game) w.push('ამ დღეს თამაშია — ბლოკი არ არის რეკომენდებული.'); if(l.count>=3) w.push(`ამ დღეს ${l.count} ვარჯიშია — მხოლოდ ტექნიკური ვერსია.`);
    if(eventsFor(addDays(d,1)).some(e=>e.type==='GAME')) w.push('მეორე დღეს თამაშია — მხოლოდ მსუბუქი ვერსია ან გადადე.');
    const c=S.checkins[d]; if(c && readiness(c).level==='RED') w.push('ამ დღის Check-in არის RED.');
    $('#bWarn').innerHTML = w.length? `<div class="notice warn">${ic('alert')}<div>${w.map(esc).join('<br>')}</div></div>`:''; };
  $('#bDate').addEventListener('change',warn); warn();
}
function blockMenu(date){
  const b=S.blocks[date], s=blockSession(b);
  openModal('სისწრაფის ბლოკი', `<div class="stack">
    <p><b>${esc(fmtLong(date))}</b> · Week ${b.week} — ${esc(S.program[b.week-1]?.title||'')}</p>
    <p class="small muted">${b.agreed?'შეთანხმებულია შიოსთან':'ელოდება შიოს თანხმობას'}${b.note?' · '+esc(b.note):''}${s?' · '+STATUS[s.status].t:''}</p>
    <div class="row">${date===todayISO()?`<a class="btn primary" href="#today" data-a="closeModal">Today-ში გახსნა</a>`:''}${!b.agreed?`<button class="btn" data-a="agreeBlock" data-x="${date}">${ic('check')} შეთანხმებულია</button>`:''}${s?`<button class="btn" data-a="editSession" data-x="${s.id}">ჩანაწერი</button>`:`<button class="btn" data-a="finishBlock" data-x="${date}">აღრიცხვა</button>`}<button class="btn danger" data-a="removeBlock" data-x="${date}">${ic('trash')} წაშლა</button></div>
  </div>`, { save:false });
}
function finishBlockModal(date, forceStatus){
  const b=S.blocks[date], bm=blockMode(date), items=blockItems(b, bm.mode==='technical'?'technical':'full');
  const n=items.filter(i=>b.doneIds.includes(i.ex.id)).length;
  const suggested = forceStatus || (n===items.length?'done': n>0?'partial':'skipped');
  M = { status:suggested, difficulty:null, discomfort:null, knee:S.checkins[date]?.knee||null };
  openModal('ვარჯიშის შეფასება', `
  <div class="stack" style="gap:14px">
    <p class="muted small">${n}/${items.length} სავარჯიშო მონიშნულია შესრულებულად${bm.mode==='technical'?' · ტექნიკური ვერსია':''}.</p>
    <div class="field"><span class="lbl">სტატუსი</span>${seg('status',[['done','შესრულებულია'],['partial','ნაწილობრივ'],['skipped','გამოტოვებულია']],M.status,'text')}</div>
    <div class="field"><label for="fDur">რამდენი დრო დასჭირდა (წთ)</label><input class="inp" type="number" inputmode="numeric" id="fDur" min="0" max="120" placeholder="მაგ. 12"></div>
    <div class="field"><span class="lbl">რამდენად რთული იყო (1–10)</span>${seg('difficulty',[1,2,3,4,5,6,7,8,9,10],null)}<div class="scale-hint"><span>1 — ძალიან მსუბუქი</span><span>10 — მაქსიმალური</span></div></div>
    <div class="field"><span class="lbl">ჰქონდა დისკომფორტი?</span>${seg('discomfort',[['none','არა'],['mild','მსუბუქი'],['yes','კი']],null,'text')}</div>
    <div class="field"><span class="lbl">მუხლი ახლა</span>${seg('knee',[['none','არ მაწუხებს'],['mild','მსუბუქი დისკომფორტი'],['pain','მაწუხებს']],M.knee,'text kneeseg')}</div>
    <div class="field"><label for="fComment">კომენტარი</label><textarea class="inp" id="fComment" placeholder="რა გამოვიდა კარგად, რა იყო რთული"></textarea></div>
    <p class="small muted">გამოტოვებული ბლოკი მომდევნო დღეზე არ გადადის და ახალ დატვირთვას არ ამატებს.</p>
  </div>`, { saveText:'შენახვა', onSave:()=>{
    if(!M.status){ toast('აირჩიე სტატუსი'); return false; }
    const s = { id:uid('s'), kind:'speed', type:'SPEED', date, blockDate:date, title:`სისწრაფის ბლოკი · W${b.week}`,
      planned: items.map(i=>`${i.ex.name} ${i.sets}×${i.reps}`).join('; '),
      actual: items.filter(i=>b.doneIds.includes(i.ex.id)).map(i=>i.ex.name).join('; ') + (bm.mode==='technical'?' (ტექნიკური ვერსია)':''),
      exDone:[...b.doneIds], version:bm.mode, status:M.status, duration:val('fDur')?+val('fDur'):null, difficulty:M.difficulty?+M.difficulty:null,
      discomfort:M.discomfort, knee:M.knee, comment:val('fComment'), createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() };
    S.sessions.push(s); b.sessionId=s.id;
    save('ვარჯიში აღრიცხულია');
    if(M.discomfort==='yes'||M.knee==='pain') setTimeout(()=>toast('დისკომფორტი აღრიცხულია — უთხარი მშობელს/შიოს.'),2300);
    return true; } });
}
function testModal(id){
  const r = id ? S.tests.find(x=>x.id===id) : { test:'5m', date:todayISO(), value:'', phase:'baseline', conditions:'', notes:'', attempts:'' };
  M = { phase:r.phase, agreed: id?'yes':null };
  openModal(id?'ტესტის რედაქტირება':'ტესტის შედეგი', `
  <div class="stack" style="gap:14px">
    <div class="notice warn">${ic('shield')}<div>ტესტი ტარდება მხოლოდ მწვრთნელთან შეთანხმებით, ერთნაირ პირობებში (ზედაპირი, ფეხსაცმელი, დროის აღრიცხვის მეთოდი) და უსაფრთხო ზედაპირზე. GREEN მდგომარეობაში.</div></div>
    <div class="grid g2">
      <div class="field"><label for="xTest">ტესტი</label><select class="inp" id="xTest">${Object.entries(TESTS).map(([k,v])=>`<option value="${k}" ${r.test===k?'selected':''}>${esc(v.ka)} (${esc(v.unit)})</option>`).join('')}</select></div>
      <div class="field"><label for="xDate">თარიღი</label><input class="inp" type="date" id="xDate" value="${r.date}" max="${todayISO()}"></div>
    </div>
    <div class="grid g2">
      <div class="field"><label for="xVal">საუკეთესო შედეგი</label><input class="inp" type="number" step="0.01" inputmode="decimal" id="xVal" value="${esc(r.value)}" placeholder="მაგ. 1.25"></div>
      <div class="field"><label for="xAtt">ყველა ცდა (არასავალდ.)</label><input class="inp" id="xAtt" value="${esc(r.attempts||'')}" placeholder="მაგ. 1.31, 1.27, 1.25"></div>
    </div>
    <div class="field"><span class="lbl">ეტაპი</span>${seg('phase',[['baseline','საწყისი'],['mid','შუალედური'],['final','საბოლოო'],['other','სხვა']],M.phase,'text')}</div>
    <div class="field"><label for="xCond">პირობები</label><input class="inp" id="xCond" value="${esc(r.conditions||'')}" placeholder="მაგ. დარბაზი, პარკეტი, ხელის წამზომი"></div>
    <div class="field"><label for="xNotes">შენიშვნა / ტესტის აღწერა</label><textarea class="inp" id="xNotes" placeholder="მაგ. გვერდითი ტესტის პროტოკოლი შიოს მიხედვით">${esc(r.notes||'')}</textarea></div>
    ${id?'':`<div class="field"><span class="lbl">ტესტი შეთანხმებული და ჩატარებულია მწვრთნელთან?</span>${seg('agreed',[['yes','კი'],['no','არა']],null,'text')}</div>`}
  </div>`, { left: id?`<button class="btn danger" data-a="deleteTest" data-x="${id}" style="margin-right:auto">${ic('trash')} წაშლა</button>`:'',
    onSave:()=>{
      const v=val('xVal'); if(v===''||isNaN(+v)){ toast('შეიყვანე შედეგი რიცხვით'); return false; }
      if(M.agreed!=='yes'){ toast('ტესტი უნდა ჩატარდეს მწვრთნელთან შეთანხმებით'); return false; }
      const d={ test:val('xTest'), date:val('xDate')||todayISO(), value:+v, attempts:val('xAtt'), phase:M.phase||'other', conditions:val('xCond'), notes:val('xNotes') };
      if(id) Object.assign(r,d); else S.tests.push({ id:uid('x'), ...d, createdAt:new Date().toISOString() });
      save('შედეგი შენახულია'); return true; } });
}
function exerciseModal(id){
  const e = id ? exById(id) : { id:'', cat:'first', name:'', ka:'', skill:'', start:'', steps:[], sets:2, reps:'3', rest:'60 წმ', focus:'', mistakes:[], safety:[], easier:'', harder:'', done:'', diagram:{pose:'stance',start:[60,40,-90]}, videoUrl:'' };
  const ta=(id,l,v,ph='')=>`<div class="field"><label for="${id}">${l}</label><textarea class="inp" id="${id}" placeholder="${ph}">${esc(v)}</textarea></div>`;
  const tx=(id,l,v,ph='')=>`<div class="field"><label for="${id}">${l}</label><input class="inp" id="${id}" value="${esc(v)}" placeholder="${ph}"></div>`;
  openModal(id?'სავარჯიშოს რედაქტირება':'ახალი სავარჯიშო', `
  <div class="stack" style="gap:12px">
    <div class="grid g2">${tx('xName','სახელი (EN)',e.name)}${tx('xKa','სახელი (ქართ.)',e.ka)}</div>
    <div class="field"><label for="xCat">კატეგორია</label><select class="inp" id="xCat">${Object.entries(CATEGORIES).map(([k,v])=>`<option value="${k}" ${e.cat===k?'selected':''}>${esc(v.name)} · ${esc(v.ka)}</option>`).join('')}</select></div>
    <div class="grid g3">${tx('xSets','სეტები',e.sets)}${tx('xReps','გამეორება / დრო',e.reps)}${tx('xRest','დასვენება',e.rest)}</div>
    ${tx('xSkill','რა უნარს ავითარებს',e.skill)}
    ${tx('xStart','საწყისი პოზიცია',e.start)}
    ${ta('xSteps','ინსტრუქცია (თითო ნაბიჯი ახალ ხაზზე)',e.steps.join('\n'))}
    ${tx('xFocus','ტექნიკური აქცენტი',e.focus)}
    ${ta('xMist','გავრცელებული შეცდომები (თითო ხაზზე)',e.mistakes.join('\n'))}
    ${ta('xSafe','უსაფრთხოება (თითო ხაზზე)',e.safety.join('\n'))}
    <div class="grid g2">${tx('xEasy','გამარტივებული ვერსია',e.easier)}${tx('xHard','გართულებული ვერსია',e.harder)}</div>
    ${tx('xDone','დასრულების კრიტერიუმი',e.done)}
    ${tx('xVideo','ვიდეოს ბმული (არასავალდ.)',e.videoUrl,'https://…')}
  </div>`, { onSave:()=>{
    const lines=k=>val(k).split('\n').map(s=>s.trim()).filter(Boolean);
    const d={ name:val('xName'), ka:val('xKa'), cat:val('xCat'), sets:Math.max(1,parseInt(val('xSets'))||1), reps:val('xReps'), rest:val('xRest'), skill:val('xSkill'), start:val('xStart'), steps:lines('xSteps'), focus:val('xFocus'), mistakes:lines('xMist'), safety:lines('xSafe'), easier:val('xEasy'), harder:val('xHard'), done:val('xDone'), videoUrl:cleanUrl(val('xVideo')) };
    if(!d.name){ toast('შეიყვანე სახელი'); return false; }
    if(val('xVideo') && !d.videoUrl){ toast('ვიდეოს ბმული უნდა იწყებოდეს https://-ით'); return false; }
    if(id) Object.assign(e,d); else { const nid=(d.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'ex')+'-'+Math.random().toString(36).slice(2,5); S.exercises.push({ id:nid, diagram:e.diagram, ...d }); setTimeout(()=>go('ex-'+nid),0); }
    save('სავარჯიშო შენახულია'); return true; } });
}
const cleanUrl = u => /^https?:\/\/\S+$/i.test(u) ? u : '';
function weekItemModal(w, idx){
  const isNew = idx==null; const it = isNew ? { id:S.exercises[0].id } : S.program[w-1].items[idx];
  const ex = exById(it.id) || S.exercises[0];
  openModal(isNew?`Week ${w} — სავარჯიშოს დამატება`:`Week ${w} — სეტები და გამეორებები`, `
  <div class="stack" style="gap:12px">
    <div class="field"><label for="wEx">სავარჯიშო</label><select class="inp" id="wEx">${S.exercises.map(e=>`<option value="${e.id}" ${e.id===it.id?'selected':''}>${esc(e.name)} · ${esc(e.ka)}</option>`).join('')}</select></div>
    <div class="grid g3">
      <div class="field"><label for="wSets">სეტები</label><input class="inp" id="wSets" type="number" min="1" max="6" value="${esc(it.sets??ex.sets)}"></div>
      <div class="field"><label for="wReps">გამეორება</label><input class="inp" id="wReps" value="${esc(it.reps??ex.reps)}"></div>
      <div class="field"><label for="wRest">დასვენება</label><input class="inp" id="wRest" value="${esc(it.rest??ex.rest)}"></div>
    </div>
    <p class="small muted">ცვლილება მოქმედებს ახლად დაგეგმილ ბლოკებზე. დატვირთვის გაზრდა — მხოლოდ შიოსთან შეთანხმებით.</p>
  </div>`, { left: isNew?'':`<button class="btn danger" data-a="removeWeekItem" data-x="${w}" data-y="${idx}" style="margin-right:auto">${ic('trash')} პროგრამიდან ამოღება</button>`,
    onSave:()=>{ const d={ id:val('wEx'), sets:Math.max(1,parseInt(val('wSets'))||1), reps:val('wReps'), rest:val('wRest') };
      if(isNew) S.program[w-1].items.push(d); else S.program[w-1].items[idx]=d; save('პროგრამა განახლდა'); return true; } });
}
function weekTextModal(w){
  const W=S.program[w-1];
  openModal(`Week ${w} — ტექსტი`, `<div class="stack" style="gap:12px">
    <div class="field"><label for="pTitle">სათაური</label><input class="inp" id="pTitle" value="${esc(W.title)}"></div>
    <div class="field"><label for="pGoal">მიზანი</label><textarea class="inp" id="pGoal">${esc(W.goal)}</textarea></div>
    <div class="field"><label for="pFocus">აქცენტი</label><input class="inp" id="pFocus" value="${esc(W.focus)}"></div>
    <div class="field"><label for="pCrit">კრიტერიუმები (ხაზებად)</label><textarea class="inp" id="pCrit">${esc(W.criteria.join('\n'))}</textarea></div>
    <div class="field"><label for="pMeas">საზომები (ხაზებად)</label><textarea class="inp" id="pMeas">${esc(W.measures.join('\n'))}</textarea></div>
    <div class="field"><label for="pLoad">დატვირთვის შენიშვნები (ხაზებად)</label><textarea class="inp" id="pLoad">${esc(W.load.join('\n'))}</textarea></div>
  </div>`, { onSave:()=>{ const l=k=>val(k).split('\n').map(s=>s.trim()).filter(Boolean);
    Object.assign(W,{ title:val('pTitle')||W.title, goal:val('pGoal'), focus:val('pFocus'), criteria:l('pCrit'), measures:l('pMeas'), load:l('pLoad') }); save('შენახულია'); return true; } });
}
function startProgramModal(){
  const def = S.settings.programStart || mondayOf(todayISO());
  openModal('ციკლის დაწყების თარიღი', `<div class="stack" style="gap:12px">
    <p class="muted small">Week 1 იწყება ამ თარიღიდან. რეკომენდებულია ორშაბათი. თარიღი შეგიძლია შეცვალო ნებისმიერ დროს — ჩანაწერები არ იკარგება.</p>
    <div class="field"><label for="psDate">Week 1-ის პირველი დღე</label><input class="inp" type="date" id="psDate" value="${def}"></div>
  </div>`, { onSave:()=>{ const d=val('psDate'); if(!d){ toast('აირჩიე თარიღი'); return false; } S.settings.programStart=d; ui.planWeek=null; save('ციკლის თარიღი შენახულია'); return true; } });
}
function profileModal(){
  const p=S.profile;
  openModal('პროფილის რედაქტირება', `<div class="stack" style="gap:12px">
    <div class="grid g2"><div class="field"><label for="prName">სახელი</label><input class="inp" id="prName" value="${esc(p.name)}"></div><div class="field"><label for="prDob">დაბადების თარიღი</label><input class="inp" type="date" id="prDob" value="${esc(p.dob)}"></div></div>
    <div class="grid g2"><div class="field"><label for="prH">სიმაღლე</label><input class="inp" id="prH" value="${esc(p.height)}"></div><div class="field"><label for="prPos">პოზიცია</label><input class="inp" id="prPos" value="${esc(p.position)}" placeholder="არ არის განსაზღვრული"></div></div>
    <div class="field"><label for="prSp">ფიზ. მომზადების სპეციალისტი</label><input class="inp" id="prSp" value="${esc(p.specialist)}"></div>
    <div class="field"><label for="prHe">ჯანმრთელობის კონტექსტი</label><textarea class="inp" id="prHe">${esc(p.health)}</textarea></div>
  </div>`, { onSave:()=>{ Object.assign(p,{ name:val('prName')||p.name, dob:val('prDob')||p.dob, height:val('prH'), position:val('prPos'), specialist:val('prSp'), health:val('prHe') }); save('პროფილი შენახულია'); return true; } });
}

/* ---------- import / export ---------- */
let DL = null;   // claude.ai artifact viewer download capability (null on normal hosting)
try{ if(window.claude && window.claude.use) window.claude.use('downloads').then(d=>{ DL=d; }).catch(()=>{}); }catch(e){}
function exportJSON(){
  const data = JSON.stringify({ app:'gio-performance', exportedAt:new Date().toISOString(), data:S }, null, 2);
  const filename = `gio-performance-backup-${todayISO()}.json`;
  const showText = (lead) => openModal('სარეზერვო ასლი', `<div class="stack" style="gap:10px"><p class="small muted">${lead}</p><textarea class="inp" id="expText" readonly style="min-height:220px;font-family:ui-monospace,monospace;font-size:.75rem">${esc(data)}</textarea></div>`,
    { saveText:'კოპირება', onSave:()=>{ copyText(data); return false; } });
  if(DL){
    DL.save({ filename, data }).then(()=>toast('ფაილი შენახულია')).catch(err=>{ if(err && err.code==='declined') return; showText('ფაილის შენახვა ვერ მოხერხდა. დააკოპირე ტექსტი და შეინახე <b>.json</b> ფაილად.'); });
    return;
  }
  try{
    const blob=new Blob([data],{type:'application/json'}); const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),4000);
  }catch(e){}
  showText('ფაილი ჩამოიტვირთა. თუ ვერ ხედავ, დააკოპირე ტექსტი და შეინახე <b>.json</b> გაფართოებით.');
}
function copyText(txt){
  const fallback=()=>{ const t=$('#expText'); if(t){ t.focus(); t.select(); } toast('მონიშნე და დააკოპირე ხელით'); };
  try{ navigator.clipboard.writeText(txt).then(()=>toast('დაკოპირდა'), fallback); }catch(e){ fallback(); }
}
function validateImport(obj){
  const d = obj && obj.data ? obj.data : obj;
  if(!d || typeof d!=='object' || !Array.isArray(d.template) || !Array.isArray(d.exercises) || !Array.isArray(d.program) || typeof d.checkins!=='object') throw new Error('ფაილი არ არის GIO PERFORMANCE-ის სარეზერვო ასლი.');
  return migrate(d);
}
function doImport(text){
  let d; try{ d=validateImport(JSON.parse(text)); }catch(e){ toast(e.message.startsWith('ფაილი')?e.message:'JSON ვერ წაიკითხა'); return; }
  confirmBox('იმპორტის დადასტურება', `იმპორტი ჩაანაცვლებს ამ მოწყობილობაზე არსებულ ყველა მონაცემს (${S.sessions.length} სესია, ${Object.keys(S.checkins).length} Check-in). ფაილში: ${(d.sessions||[]).length} სესია, ${Object.keys(d.checkins||{}).length} Check-in.`, 'ჩანაცვლება', ()=>{ S=d; save('მონაცემები იმპორტირებულია'); render(); });
}

/* ---------- timer ---------- */
let tmr=null;
function startTimer(restTxt){
  const m = String(restTxt).match(/(\d+)/g); let sec = m ? +m[m.length-1] : 60; if(/წთ/.test(restTxt)) sec*=60; sec=Math.min(sec,600);
  stopTimer();
  const el=document.createElement('div'); el.className='timer'; el.id='timer';
  el.innerHTML=`${ic('timer')}<span class="t" aria-live="polite"></span><button class="btn sm ghost" data-a="stopTimer">${ic('x')}</button>`;
  document.body.appendChild(el);
  let left=sec; const paint=()=>{ el.querySelector('.t').textContent=`${Math.floor(left/60)}:${pad(left%60)}`; };
  paint(); tmr=setInterval(()=>{ left--; paint(); if(left<=0){ clearInterval(tmr); el.querySelector('.t').textContent='GO'; el.style.borderColor='var(--green)'; setTimeout(stopTimer,2500); } },1000);
}
function stopTimer(){ clearInterval(tmr); const t=$('#timer'); if(t) t.remove(); }

/* ---------- action map ---------- */
const A = {
  closeModal: ()=>closeModal(),
  modalSave: ()=>{ if(modalSave){ const ok=modalSave(); if(ok!==false){ closeModal(); render(); } } },
  go: el=>go(el.dataset.x),
  dismiss: el=>{ const t=todayISO(); (S.dismissed[t]=S.dismissed[t]||[]).push(el.dataset.x); save(); render(); },
  toggleMode: ()=>{
    if(isParent()){ S.settings.parentMode=false; save('გიოს რეჟიმი'); render(); return; }
    if(!S.settings.pin){ S.settings.parentMode=true; save('მშობლის რეჟიმი ჩართულია'); render(); return; }
    openModal('მშობლის რეჟიმი', `<div class="field"><label for="pinIn">შეიყვანე PIN</label><input class="inp" id="pinIn" type="password" inputmode="numeric" maxlength="4" autocomplete="off"></div>`,
      { saveText:'ჩართვა', onSave:()=>{ if(val('pinIn')!==S.settings.pin){ toast('PIN არასწორია'); return false; } S.settings.parentMode=true; save('მშობლის რეჟიმი ჩართულია'); return true; } });
  },
  saveCheckin: ()=>{ if(saveCheckinFromForm()) render(); },
  checkinModal: el=>{ const d=el.dataset.x||''; const ci=d?S.checkins[d]:null;
    openModal(d?`Check-in · ${fmtShort(d)}`:'Check-in', checkinForm(d||todayISO(), ci, false), { left: ci?`<button class="btn danger" data-a="deleteCheckin" data-x="${d}" style="margin-right:auto">${ic('trash')} წაშლა</button>`:'', onSave:()=>saveCheckinFromForm() }); },
  deleteCheckin: el=>{ const d=el.dataset.x; confirmBox('Check-in-ის წაშლა', `წაიშალოს ${fmtShort(d)}-ის Check-in?`, 'წაშლა', ()=>{ delete S.checkins[d]; save('წაიშალა'); }); },
  quickMark: el=>{ const {x:date,y:id,z:status}=el.dataset; const ev=eventsFor(date).find(e=>e.id===id); if(!ev) return;
    const T=EVENT_TYPES[ev.type]||EVENT_TYPES.OTHER;
    S.sessions.push({ id:uid('s'), kind:'event', type:ev.type, eventKey:evKey(date,id), date, time:ev.time, title:T.name, planned:`${T.name}${ev.time?' '+ev.time:''}`, actual: status==='skipped'?'':T.name, status, duration:null, difficulty:null, discomfort:null, knee:null, comment:'', createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() });
    save(status==='skipped'?'გამოტოვებულად აღირიცხა':'აღირიცხა — დეტალებს დაამატებ რედაქტირებით'); closeModal(); render(); },
  unmark: el=>{ S.sessions=S.sessions.filter(s=>s.id!==el.dataset.x); save('აღრიცხვა გაუქმდა'); closeModal(); render(); },
  editSession: el=>{ const s=sessionById(el.dataset.x); if(s) sessionModal(s,false); },
  newManual: ()=>sessionModal({ date:todayISO(), kind:'manual', type:'OTHER', status:'done' }, true),
  deleteSession: el=>{ const id=el.dataset.x; confirmBox('ჩანაწერის წაშლა','წაიშალოს ეს ჩანაწერი?','წაშლა',()=>{ S.sessions=S.sessions.filter(s=>s.id!==id); Object.values(S.blocks).forEach(b=>{ if(b.sessionId===id) b.sessionId=null; }); save('წაიშალა'); }); },
  addEvent: el=>eventModal(el.dataset.x||todayISO(), null),
  addEventType: el=>{ eventModal(todayISO(), null); const s=$('#eType'); if(s) s.value=el.dataset.x; const d=$('.modal-b p.muted'); if(d) d.innerHTML=`<label for="eDatePick">თარიღი</label> <input class="inp" type="date" id="eDatePick" value="${todayISO()}" style="max-width:200px">`;
    const orig=modalSave; modalSave=()=>{ const dp=val('eDatePick')||todayISO(); const data={ type:val('eType'), time:val('eTime'), note:val('eNote') }; materialize(dp).push({ id:uid('e'), day:wd(dp), ...data }); save('დაემატა'); ui.calWeek=mondayOf(dp); return true; }; },
  editEvent: el=>{ const ev=eventsFor(el.dataset.x).find(e=>e.id===el.dataset.y); if(ev) eventModal(el.dataset.x, ev); },
  deleteEvent: el=>{ const {x:date,y:id}=el.dataset; const isTpl=S.template.some(t=>t.id===id);
    openModal('ვარჯიშის წაშლა', `<p class="muted">წაიშალოს ეს ვარჯიში ${esc(fmtShort(date))}-ს?</p>${isTpl&&isParent()?`<div class="field" style="margin-top:12px">${seg('delScope',[['date','მხოლოდ ამ დღეს'],['all','ყველა კვირიდან']],'date','text')}</div>`:''}`,
      { saveText:'წაშლა', onSave:()=>{ if(M.delScope==='all'){ S.template=S.template.filter(t=>t.id!==id); }
        const l=materialize(date); S.dateEvents[date]=l.filter(e=>e.id!==id); save('წაიშალა'); return true; } }); M.delScope='date'; },
  calWeek: el=>{ const n=+el.dataset.x; ui.calWeek = n===0? mondayOf(todayISO()) : addDays(ui.calWeek,n); render(); },
  planBlock: el=>planBlockModal(el.dataset.x||'', el.dataset.y?+el.dataset.y:null),
  blockMenu: el=>blockMenu(el.dataset.x),
  agreeBlock: el=>{ const b=S.blocks[el.dataset.x]; if(b){ b.agreed=true; save('შეთანხმებულად მოინიშნა'); closeModal(); render(); } },
  removeBlock: el=>{ const d=el.dataset.x; confirmBox('ბლოკის წაშლა','წაიშალოს დაგეგმილი ბლოკი? აღრიცხული ჩანაწერი ისტორიაში დარჩება.','წაშლა',()=>{ delete S.blocks[d]; save('ბლოკი წაიშალა'); }); },
  toggleEx: el=>{ const b=S.blocks[el.dataset.x]; if(!b) return; const id=el.dataset.y; const i=b.doneIds.indexOf(id); if(i>=0) b.doneIds.splice(i,1); else b.doneIds.push(id); save(); render(); },
  finishBlock: el=>finishBlockModal(el.dataset.x, el.dataset.y||null),
  timer: el=>startTimer(el.dataset.x),
  stopTimer: ()=>stopTimer(),
  planWeek: el=>{ ui.planWeek=+el.dataset.x; render(); },
  startProgram: ()=>startProgramModal(),
  clearProgram: ()=>confirmBox('ციკლის გაუქმება','დაწყების თარიღი წაიშლება. ჩანაწერები და ბლოკები დარჩება.','გაუქმება',()=>{ S.settings.programStart=null; save('გაუქმდა'); }),
  editWeekItem: el=>weekItemModal(+el.dataset.x, +el.dataset.y),
  addWeekItem: el=>weekItemModal(+el.dataset.x, null),
  removeWeekItem: el=>{ S.program[+el.dataset.x-1].items.splice(+el.dataset.y,1); save('ამოღებულია'); closeModal(); render(); },
  editWeekText: el=>weekTextModal(+el.dataset.x),
  libCat: el=>{ ui.libCat=el.dataset.x; render(); },
  editExercise: el=>exerciseModal(el.dataset.x||null),
  editVideo: el=>{ const e=exById(el.dataset.x); openModal('ვიდეოს ბმული', `<div class="field"><label for="vUrl">რეალური დემონსტრაციის ბმული (YouTube, Vimeo, Drive…)</label><input class="inp" id="vUrl" value="${esc(e.videoUrl)}" placeholder="https://"></div><p class="small muted" style="margin-top:8px">ცარიელი ველი = ბმულის მოხსნა.</p>`,
    { onSave:()=>{ const u=val('vUrl'); if(u && !cleanUrl(u)){ toast('ბმული უნდა იწყებოდეს https://-ით'); return false; } e.videoUrl=cleanUrl(u); save('შენახულია'); return true; } }); },
  deleteExercise: el=>{ const id=el.dataset.x; const used=S.program.filter(w=>w.items.some(i=>i.id===id)).map(w=>w.week);
    confirmBox('სავარჯიშოს წაშლა', `წაიშალოს „${esc(exById(id).name)}“?${used.length?` ის ამოიღება პროგრამიდანაც (Week ${used.join(', ')}).`:''}`, 'წაშლა', ()=>{ S.exercises=S.exercises.filter(e=>e.id!==id); S.program.forEach(w=>w.items=w.items.filter(i=>i.id!==id)); save('წაიშალა'); setTimeout(()=>go('library'),0); }); },
  addTest: el=>testModal(el.dataset.x||null),
  deleteTest: el=>{ const id=el.dataset.x; S.tests=S.tests.filter(t=>t.id!==id); save('წაიშალა'); closeModal(); render(); },
  histTab: el=>{ ui.histTab=el.dataset.x; render(); },
  editProfile: ()=>profileModal(),
  addTemplate: ()=>templateModal(null),
  editTemplate: el=>templateModal(el.dataset.x),
  deleteTemplate: el=>{ S.template=S.template.filter(t=>t.id!==el.dataset.x); save('წაიშალა'); closeModal(); render(); },
  setPin: ()=>{ const p=val('pinNew'); if(!/^\d{4}$/.test(p)){ toast('PIN — 4 ციფრი'); return; } S.settings.pin=p; save('PIN შენახულია'); render(); },
  clearPin: ()=>{ S.settings.pin=''; save('PIN მოხსნილია'); render(); },
  exportJSON: ()=>exportJSON(),
  copyJSON: ()=>{ const data=JSON.stringify({ app:'gio-performance', exportedAt:new Date().toISOString(), data:S }, null, 2); copyText(data); },
  pasteImport: ()=>openModal('ტექსტით იმპორტი', `<div class="field"><label for="impText">ჩასვი სარეზერვო ასლის JSON</label><textarea class="inp" id="impText" style="min-height:200px;font-family:ui-monospace,monospace;font-size:.75rem"></textarea></div>`,
    { saveText:'იმპორტი', onSave:()=>{ const t=val('impText'); if(!t){ toast('ჩასვი JSON'); return false; } setTimeout(()=>doImport(t),0); return true; } }),
  resetAll: ()=>confirmBox('ყველა მონაცემის წაშლა','წაიშლება ყველა ჩანაწერი, Check-in, ტესტი და ცვლილება ამ მოწყობილობაზე. აღდგება საწყისი გრაფიკი. ჯერ გააკეთე სარეზერვო ასლი.','ყველაფრის წაშლა',()=>{ S=seed(); save('მონაცემები წაიშალა'); }),
  more: ()=>openModal('მენიუ', `<div class="launch" style="grid-template-columns:repeat(2,minmax(0,1fr))">${NAV.map(([r,i,l])=>`<a href="#${r}" data-a="closeModal">${ic(i)}<div><b>${esc(l.toUpperCase())}</b></div></a>`).join('')}</div>`, { footer:false })
};

/* ---------- global events ---------- */
document.addEventListener('click', e=>{
  const sg = e.target.closest('[data-seg]');
  if(sg){
    const f=sg.dataset.seg; M[f]=sg.dataset.v;
    $$(`[data-seg="${f}"]`, sg.parentElement.parentElement).forEach(b=>b.classList.toggle('on', b===sg));
    if(f==='setWeek'){ const n=+sg.dataset.v; S.settings.programStart = addDays(mondayOf(todayISO()), -(n-1)*7); ui.planWeek=null; save(`მიმდინარე კვირა: Week ${n}`); render(); }
    return;
  }
  const el = e.target.closest('[data-a]');
  if(el && A[el.dataset.a]){
    if(el.tagName==='A' && el.dataset.a==='closeModal'){ closeModal(); return; }
    e.preventDefault(); A[el.dataset.a](el, e);
  }
});
document.addEventListener('input', e=>{
  if(e.target.id==='libSearch'){ ui.libQ=e.target.value; const pos=e.target.selectionStart; render(); const s=$('#libSearch'); if(s){ s.focus(); try{s.setSelectionRange(pos,pos);}catch(_){} } }
});
document.addEventListener('change', e=>{
  if(e.target.id==='histType'){ ui.histType=e.target.value; render(); }
  if(e.target.id==='histStatus'){ ui.histStatus=e.target.value; render(); }
  if(e.target.id==='importFile'){ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>doImport(String(r.result)); r.readAsText(f); e.target.value=''; }
});
document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeModal(); });
window.addEventListener('hashchange', ()=>{ closeModal(); render(); window.scrollTo({top:0}); });
window.addEventListener('storage', e=>{ if(e.key===KEY){ const d=load(); if(d){ S=d; render(); } } });
// refresh date-dependent views when the app is reopened on a new day
let lastDay=todayISO();
document.addEventListener('visibilitychange', ()=>{ if(!document.hidden && todayISO()!==lastDay){ lastDay=todayISO(); ui.calWeek=mondayOf(lastDay); render(); } });

/* ---------- shell ---------- */
function shell(){
  $('#rail').innerHTML = NAV.map(([r,i,l])=>`<a href="#${r}" data-nav="${r}">${ic(i)}<span>${esc(l)}</span></a>`).join('');
  $('#tabbar').innerHTML = [['dashboard','home','მთავარი'],['today','bolt','Today'],['calendar','cal','კალენდ.'],['recovery','heart','Check-in']].map(([r,i,l])=>`<a href="#${r}" data-nav="${r}">${ic(i)}<span>${esc(l)}</span></a>`).join('') + `<a href="#" data-a="more">${ic('menu')}<span>მეტი</span></a>`;
  $('#modeBtn').addEventListener('click', ()=>A.toggleMode());
  paintSaveDot();
}
shell();
render();
if(!storageOK) toast('ბრაუზერი არ იძლევა მონაცემების შენახვის საშუალებას (პრივატული რეჟიმი?)');

})();
