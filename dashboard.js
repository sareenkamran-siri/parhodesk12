(()=>{'use strict';
const root=document.querySelector('#semester-app');if(!root)return;
const key='parhodesk.semester.v1', $=id=>document.getElementById(id), days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const blank=()=>({version:1,semester:{name:'',number:''},subjects:[],classes:[],tasks:[]});
let state=blank(),blocked=false;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const say=s=>$('dash-status').textContent=s;
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number(s.slice(0,4))>=1900&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
const str=(s,n)=>typeof s==='string'&&s.length<=n;
function validate(s){
if(!s||s.version!==1||!s.semester||!str(s.semester.name,80)||!['','1','2','3','4','5','6','7','8'].includes(s.semester.number))throw Error('Invalid semester backup.');
for(const k of ['subjects','classes','tasks'])if(!Array.isArray(s[k])||s[k].length>1000)throw Error('Invalid backup records.');
const ids=new Set();for(const row of [...s.subjects,...s.classes,...s.tasks]){if(!row||!str(row.id,100)||!row.id||ids.has(row.id))throw Error('Invalid record IDs.');ids.add(row.id)}
for(const r of s.subjects)if(!str(r.name,80)||!r.name.trim()||typeof r.credits!=='number'||!Number.isFinite(r.credits)||r.credits<0||r.credits>30||r.credits*2%1)throw Error('Invalid subject.');
const subject=id=>s.subjects.some(r=>r.id===id),time=s=>typeof s==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(s);
for(const r of s.classes)if(!subject(r.subject)||!Number.isInteger(r.day)||r.day<0||r.day>6||!time(r.start)||!time(r.end)||r.end<=r.start||!str(r.room,80))throw Error('Invalid timetable.');
for(const r of s.tasks)if(!subject(r.subject)||!str(r.title,120)||!r.title.trim()||!['Assignment','Exam'].includes(r.kind)||!validDate(r.date)||typeof r.done!=='boolean')throw Error('Invalid deadline.');
return s;
}
try{const saved=localStorage.getItem(key);if(saved)state=validate(JSON.parse(saved));}catch(e){blocked=true;say('Saved data could not be loaded. Download the existing data before clearing or importing a backup. Changes will not overwrite it.');}
function commit(next,message){try{validate(next);if(blocked)throw Error('Existing data is unreadable. Export it first, then clear the dashboard or import a valid backup.');localStorage.setItem(key,JSON.stringify(next));state=next;render();say(message);return true;}catch(e){say('Not saved: '+e.message+' Your form entries are still here.');return false;}}
const copy=()=>JSON.parse(JSON.stringify(state)),uid=()=>crypto.randomUUID(),subject=id=>state.subjects.find(s=>s.id===id)?.name||'Unknown subject';
const action=(type,id)=>`<button type="button" data-edit="${type}" data-id="${esc(id)}">Edit</button><button type="button" data-delete="${type}" data-id="${esc(id)}">Delete</button>`;
const cls=r=>`<strong>${esc(subject(r.subject))}</strong><p>${r.start}–${r.end}${r.room?' · '+esc(r.room):''}</p>`;
function render(){
const f=$('semester-form');f.elements.name.value=state.semester.name;f.elements.number.value=state.semester.number;
$('dash-stats').innerHTML=[[state.subjects.length,'Subjects'],[state.subjects.reduce((a,s)=>a+s.credits,0),'Credit hours'],[state.tasks.filter(t=>!t.done&&t.kind==='Assignment').length,'Pending assignments'],[state.tasks.filter(t=>!t.done&&t.kind==='Exam'&&t.date>=today()).length,'Upcoming exams']].map(([n,t])=>`<div class="dash-stat"><strong>${n}</strong><span>${t}</span></div>`).join('');
root.querySelectorAll('[data-subject]').forEach(el=>{const prev=el.value;el.innerHTML='<option value="">Choose subject</option>'+state.subjects.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');el.value=prev;el.disabled=!state.subjects.length;});
$('subject-list').innerHTML=state.subjects.map(s=>`<div class="dash-row"><strong>${esc(s.name)}</strong><p>${s.credits} credit hours</p>${action('subject',s.id)}</div>`).join('')||'<p class="dash-empty">Add your first subject to start planning classes and deadlines.</p>';
const classes=[...state.classes].sort((a,b)=>((a.day+6)%7-(b.day+6)%7)||a.start.localeCompare(b.start));
$('class-list').innerHTML=classes.map(r=>`<div class="dash-row"><span>${days[r.day]}</span>${cls(r)}${action('class',r.id)}</div>`).join('')||'<p class="dash-empty">No classes yet. Add a weekly slot for each lecture or lab.</p>';
$('today-date').textContent=new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});
$('today-list').innerHTML=classes.filter(r=>r.day===new Date().getDay()).map(r=>`<div class="dash-row">${cls(r)}</div>`).join('')||'<p>No classes scheduled for today.</p>';
const filter=$('task-filter').value;
$('task-list').innerHTML=[...state.tasks].filter(t=>filter==='all'||(filter==='done'?t.done:!t.done)).sort((a,b)=>a.date.localeCompare(b.date)).map(t=>{const delta=Math.round((Date.parse(t.date+'T12:00:00Z')-Date.parse(today()+'T12:00:00Z'))/86400000);const status=t.done?'Completed':delta<0?`${-delta} day(s) overdue`:delta===0?'Today':`In ${delta} day(s)`;return `<div class="dash-row ${!t.done&&delta<0?'overdue':''}"><strong>${esc(t.title)}</strong><p>${esc(subject(t.subject))} · ${t.kind}<br>${t.date} · ${status}</p><button type="button" data-toggle="${esc(t.id)}">${t.done?'Mark pending':'Mark completed'}</button>${action('task',t.id)}</div>`}).join('')||'<p class="dash-empty">No deadlines in this view.</p>';
for(const type of ['subject','class','task']){$(''+type+'-form').querySelector('[data-cancel]').hidden=!$(type+'-form').elements.id.value;}
}
function reset(type){const f=$(type+'-form');f.reset();f.elements.id.value='';$(type+'-submit').textContent={subject:'Add subject',class:'Add class',task:'Add deadline'}[type];render();}
$('semester-form').onsubmit=e=>{e.preventDefault();const f=e.currentTarget,n=copy();n.semester={name:f.elements.name.value.trim(),number:f.elements.number.value};commit(n,'Semester saved on this device.');};
for(const type of ['subject','class','task'])$(type+'-form').onsubmit=e=>{e.preventDefault();const f=e.currentTarget,v=Object.fromEntries(new FormData(f)),n=copy(),key={subject:'subjects',class:'classes',task:'tasks'}[type];let row={...v,id:v.id||uid()};
if(type==='subject'){row.name=row.name.trim();row.credits=Number(row.credits);}
if(type==='class'){row.day=Number(row.day);if(row.end<=row.start){say('End time must be later than start time.');return;}if(n.classes.some(c=>c.id!==row.id&&c.day===row.day&&c.start<row.end&&c.end>row.start)){say('This class overlaps another class. Choose a different time.');return;}}
if(type==='task'){row.title=row.title.trim();row.done=n.tasks.find(t=>t.id===row.id)?.done||false;}
const i=n[key].findIndex(r=>r.id===row.id);if(i<0)n[key].push(row);else n[key][i]=row;
if(commit(n,'Saved on this device.'))reset(type);};
root.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.cancel){reset(b.dataset.cancel);return;}if(b.dataset.toggle){const n=copy(),t=n.tasks.find(t=>t.id===b.dataset.toggle);if(t){t.done=!t.done;commit(n,'Deadline updated.');}return;}
const type=b.dataset.edit||b.dataset.delete;if(!type)return;const key={subject:'subjects',class:'classes',task:'tasks'}[type],row=state[key].find(r=>r.id===b.dataset.id);if(!row)return;
if(b.dataset.edit){const f=$(type+'-form');for(const [k,v]of Object.entries(row))if(f.elements.namedItem(k))f.elements.namedItem(k).value=v;$(type+'-submit').textContent='Save changes';f.querySelector('[data-cancel]').hidden=false;f.scrollIntoView({behavior:'smooth',block:'center'});f.querySelector('input:not([type=hidden]),select').focus();}
else{if(!confirm(type==='subject'?'Delete this subject and its linked classes and deadlines?':'Delete this entry?'))return;const n=copy();n[key]=n[key].filter(r=>r.id!==row.id);if(type==='subject'){n.classes=n.classes.filter(r=>r.subject!==row.id);n.tasks=n.tasks.filter(r=>r.subject!==row.id);}if(commit(n,'Entry deleted.'))reset(type);}});
$('task-filter').onchange=render;
$('export-data').onclick=()=>{try{const data=blocked?localStorage.getItem(key):JSON.stringify(state,null,2);if(!data){say('No saved data available.');return;}const url=URL.createObjectURL(new Blob([data],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='parhodesk-semester-'+today()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);say('Backup downloaded.');}catch(e){say('Backup could not be read: '+e.message);}};
$('import-data').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>2000000)throw Error('Backup is too large.');const n=validate(JSON.parse(await file.text()));if(!confirm('Replace the current dashboard with this backup?'))return;const wasBlocked=blocked;blocked=false;if(commit(n,'Backup restored.'))for(const t of ['subject','class','task'])reset(t);else blocked=wasBlocked;}catch(err){say('Import failed. Existing data was kept. '+err.message);}finally{e.target.value='';}};
$('clear-data').onclick=()=>{if(!confirm('Delete all semester details, subjects, classes and deadlines from this browser? Download a backup first.'))return;try{localStorage.removeItem(key);blocked=false;state=blank();for(const t of ['subject','class','task'])reset(t);say('Dashboard cleared.');}catch(e){say('Could not clear saved data.');}};
render();setInterval(()=>{if(!document.hidden&&!root.contains(document.activeElement))render();},60000);
})();
