import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { getAuth, browserLocalPersistence, setPersistence, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { getFirestore, collection, onSnapshot, doc, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';
import { isReviewPage } from './page-mode.js';
import { mountDeviceAccess } from './access.js';
import { configureProtocolDictation } from './protocol-dictation.js';
import { mountDashboardAccess } from './dashboard-access.js';
import { mountPwa } from './pwa.js';
import { configureKpiWorkspace, ingestKpiSnapshot, showProtocolCase, showKpiReport, hideProtocolViewer, kpiWorkspaceBusy } from './kpi-workspace.js';
import { currentKpiValues, currentMonthlyValues, isKpiReportingCase } from './kpi-data.js';
import { kpiFields } from './kpi-schema.js';
import { calculateKpis } from './kpi-calculations.js';

const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
configureKpiWorkspace({auth,db});
if(!isReviewPage)configureProtocolDictation({auth,db});
const $=id=>document.getElementById(id),shell=$('appShell'),screen=$('screen'),panel=$('reviewPanel'),scroller=$('mainScroll');
let pendingDraft=null,creating=false,accessDetails=null;
let documents=[],stopNotes,uid=null,generation=0,view='home',selectedId=null,query='',rangeMode='all',from='',to='',ivtOnly=false,evtOnly=false,analysisMode='',indicator=1;
const india=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'});
const dateKey=value=>{const d=new Date(value);if(!value||!Number.isFinite(d.getTime()))return '';const parts=india.formatToParts(d),part=type=>parts.find(x=>x.type===type).value;return `${part('year')}-${part('month')}-${part('day')}`;};
let month=dateKey(new Date()).slice(0,7);
const node=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;};
const button=(text,fn,className='review-action')=>{const el=node('button',className,text);el.type='button';el.addEventListener('click',fn);return el;};
const record=doc=>({id:doc.id,...currentKpiValues(doc),_data:doc});
const records=()=>documents.filter(d=>d.noteType==='code7'&&!d.deleted).map(record).sort((a,b)=>stamp(b._data)-stamp(a._data));
const stamp=d=>d.createdAt?.seconds?d.createdAt.seconds*1000:Date.parse(d.visitDate||'')||0;
const episodeDate=r=>dateKey(r.admissionTime||r.arrivalTime)||r._data.visitDate||'';
const fullName=r=>r.name||'Code 7 draft';
const meta=r=>[r.uhid?'UHID '+r.uhid:'',r.age?(/^\d+(?:\.\d+)?$/.test(r.age)?r.age+' years':r.age):'',episodeDate(r)].filter(Boolean).join(' · ');
const clock=value=>{const d=new Date(value);return value&&Number.isFinite(d.getTime())?new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(d):'—';};
const dateTime=value=>{const d=new Date(value);return value&&Number.isFinite(d.getTime())?new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(d):'Not recorded';};
const elapsed=(r,start,end)=>{if(!r[start]||!r[end])return null;const ms=new Date(r[end])-new Date(r[start]);return Number.isFinite(ms)&&ms>=0?ms/60000:null;};
const minutes=value=>value===null?'Pending':`${Number(value.toFixed(1))} min`;
const monthly=m=>currentMonthlyValues(documents.find(d=>d.id==='kpi-month-'+m)||{});
const report=m=>calculateKpis(records().filter(r=>isKpiReportingCase(r._data)&&episodeDate(r).slice(0,7)===m),monthly(m));
function message(text){let el=$('navigationMessage');if(!el){el=node('p','review-top-message');el.id='navigationMessage';el.setAttribute('role','status');shell.querySelector('.topbar').after(el);}el.textContent=text;}
function canNavigate(){if(kpiWorkspaceBusy()||creating){message('Finish saving or retry the pending change before leaving this view.');return false;}$('navigationMessage')?.remove();return true;}
function navigate(next){if(!canNavigate())return;view=next;selectedId=null;analysisMode='';query='';if(next==='dashboard')rangeMode='month';hideProtocolViewer();window.scrollTo(0,0);render();}
function openCase(id){if(!canNavigate())return;const r=records().find(r=>r.id===id);if(!r)return;selectedId=id;hideProtocolViewer();window.scrollTo(0,0);render();}
function title(text,sub=''){const head=node('div');head.append(node('h2','review-title',text));if(sub)head.append(node('p','review-intro',sub));return head;}
function empty(text){return node('div','review-empty',text);}
function filters(){
 const card=node('div','review-filter-card'),top=node('div','review-filters');
 for(const [mode,label]of [['month','This Month'],['custom','Custom Range'],['all','All']]){const b=button(label,()=>{rangeMode=mode;render();},rangeMode===mode?'active':'');b.setAttribute('aria-pressed',String(rangeMode===mode));top.append(b);}
 for(const [label,on,fn]of [['IVT cases',ivtOnly,()=>ivtOnly=!ivtOnly],['EVT cases',evtOnly,()=>evtOnly=!evtOnly]]){const b=button(label,()=>{fn();render();},on?'active':'');b.setAttribute('aria-pressed',String(on));top.append(b);}
 if(view==='dashboard')top.append(button('Print table',()=>window.print(),'dashboard-print-btn'));
 card.append(top);
 if(rangeMode==='custom'){
  const row=node('div','review-date-row');for(const [name,value]of [['From',from],['To',to]]){const label=node('label','',name),input=node('input');input.type='date';input.value=value;input.setAttribute('aria-label',name);input.addEventListener('change',()=>{if(name==='From')from=input.value;else to=input.value;render();});label.append(input);row.append(label);}card.append(row);
 }else card.append(node('p','cases-filter-summary',rangeMode==='month'?new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',month:'long',year:'numeric'}).format(new Date()):'Showing all recorded cases'));
 return card;
}
function filtered(){return records().filter(r=>{const date=episodeDate(r);return (!query||[r.name,r.uhid,r.id].some(v=>String(v||'').toLowerCase().includes(query.toLowerCase())))&&(!ivtOnly||r.ivtGiven==='Yes')&&(!evtOnly||r.evtGiven==='Yes')&&(rangeMode==='all'||rangeMode==='month'&&date.slice(0,7)===dateKey(new Date()).slice(0,7)||rangeMode==='custom'&&(!from||date>=from)&&(!to||date<=to));});}
function search(){const input=node('input','review-search');input.type='search';input.placeholder='Search patient name or UHID';input.setAttribute('aria-label','Search cases');input.value=query;input.addEventListener('input',()=>{query=input.value;const start=input.selectionStart;render();const next=screen.querySelector('.review-search');next.focus();next.setSelectionRange(start,start);});return input;}
function card(r){const b=button('',()=>openCase(r.id),'review-case-card'),head=node('div','card-head'),identity=node('div');identity.append(node('h3','',fullName(r)),node('p','',meta(r)));head.append(identity,node('span','tag grey',!isKpiReportingCase(r._data)?(r.includeInReporting==='No'?'Excluded from KPI':'KPI inclusion pending'):r.diagnosis||'Diagnosis pending'));b.append(head);const count=kpiFields.filter(f=>r[f.id]!==undefined&&r[f.id]!=='').length;b.append(node('p','',`${count} recorded KPI fields`));const progress=node('div','progress'),bar=node('i');bar.style.width=`${Math.min(100,count/kpiFields.length*100)}%`;progress.append(bar);b.append(progress);return b;}
async function createCase(){
 if(isReviewPage||!uid||!canNavigate())return;
 const author=uid;
 if(!pendingDraft||pendingDraft.uid!==author){const id='case_'+crypto.randomUUID().replaceAll('-','');pendingDraft={id,uid:author,data:{noteType:'code7',kpiWorkflowVersion:1,heading:'Code 7 draft',selectedMode:'Code 7',transcription:'',patientData:{name:'',age:'',uhid:''},visitDate:dateKey(new Date()),visitType:'OP',isDraft:true,everSaved:false,kind:'generated',createdBy:author,createdByName:accessDetails?.name||auth.currentUser?.email||'Approved user',createdAt:serverTimestamp(),updatedBy:author,updatedAt:serverTimestamp()}};}
 const operation=pendingDraft,current=generation;creating=true;render();
 try{
  const ref=doc(db,'workspaces','stroke','notes',operation.id);
  await runTransaction(db,async transaction=>{const snapshot=await transaction.get(ref);if(auth.currentUser?.uid!==author)throw new Error('access-changed');if(snapshot.exists()){const existing=snapshot.data();if(existing.createdBy!==author||existing.noteType!=='code7'||existing.deleted)throw new Error('draft-conflict');return;}transaction.set(ref,operation.data);});
  if(pendingDraft===operation)pendingDraft=null;
  if(uid!==author||current!==generation)return;
  if(!documents.some(d=>d.id===operation.id))documents.push({id:operation.id,...operation.data});
  selectedId=operation.id;view='cases';query='';window.scrollTo(0,0);
 }catch{if(uid===author&&current===generation)message('Could not confirm the new draft. Reconnect and choose Retry new Code 7.');}
 finally{creating=false;if(uid===author&&current===generation)render();}
}
function home(){
 if(!isReviewPage){const start=button(pendingDraft?'RETRY NEW CODE 7':'START NEW CODE 7',createCase,'primary-cta');start.dataset.startCode7='';start.disabled=creating;screen.append(start);}
 const all=records();
 if(all.length)screen.append(button(isReviewPage?'REVIEW LATEST CASE':'OPEN LATEST CASE',()=>openCase(all[0].id),'primary-cta'));
 screen.append(title('Recent cases'));for(const r of all.slice(0,8))screen.append(card(r));if(!all.length)screen.append(empty('No shared cases have been recorded yet.'));
}
function cases(){screen.append(title('Cases'),search(),filters());const list=filtered();for(const r of list)screen.append(card(r));if(!list.length)screen.append(empty('No cases match these filters.'));}
function dashboard(){
 screen.append(title('Dashboard','Shared case timings and treatment overview'),filters());const list=filtered();
 screen.append(node('p','review-intro',`${list.length} cases · All times Asia/Kolkata · Pending means a required time is not recorded.`));
 if(!list.length){screen.append(empty('No cases recorded for the selected period.'));return;}
 const wrap=node('div','table-wrap'),table=node('table','dashboard-case-table'),head=node('thead'),tr=node('tr');
 for(const label of ['#','Date','Name','UHID','Age','Arrival','D → Imaging','D → IVT','D → Device','D → Puncture','Puncture → Reperfusion','Final TICI'])tr.append(node('th','',label));head.append(tr);table.append(head);
 const body=node('tbody');list.forEach((r,index)=>{const row=node('tr');row.append(node('td','',String(list.length-index)),node('td','',episodeDate(r)));const name=node('td');name.append(button(fullName(r),()=>openCase(r.id),'table-case-button'));row.append(name);for(const value of [r.uhid||'—',r.age||'—',clock(r.arrivalTime),minutes(elapsed(r,'arrivalTime','firstSliceTime')),r.ivtGiven==='No'?'N/A':minutes(elapsed(r,'arrivalTime','ivtTime')),r.evtGiven==='No'?'N/A':minutes(elapsed(r,'arrivalTime','evtDeviceTime')),r.evtGiven==='No'?'N/A':minutes(elapsed(r,'arrivalTime','skinPunctureTime')),r.evtGiven==='No'?'N/A':minutes(elapsed(r,'skinPunctureTime','reperfusionTime')),r.finalTici||'—'])row.append(node('td','',value));body.append(row);});table.append(body);wrap.append(table);screen.append(wrap);
}
function monthControl(callback){const label=node('label','review-date-row','Reporting month'),input=node('input','review-month');input.type='month';input.value=month;input.setAttribute('aria-label','Analysis month');input.addEventListener('change',()=>{if(/^\d{4}-(0[1-9]|1[0-2])$/.test(input.value)){month=input.value;callback();}});label.append(input);return label;}
function analyses(){
 screen.append(title('Analysis','Review the KPI results or an individual patient timeline.'));
 if(!analysisMode){const options=node('div','review-analysis-options');for(const [mode,label,sub]of [['kpi','KPI Analysis','NABH / stroke pathway indicators and monthly trends'],['patient','Patient Analysis','Recorded events for one shared case']]){const b=button('',()=>{analysisMode=mode;render();},'review-analysis-option');b.append(node('span','',label),node('strong','',label),node('p','',sub));options.append(b);}screen.append(options);return;}
 screen.append(button('Back to analysis options',()=>{analysisMode='';render();}));
 if(analysisMode==='patient'){const select=node('select','review-select');select.setAttribute('aria-label','Patient for analysis');const blank=node('option','','Select a case');blank.value='';select.append(blank);for(const r of records()){const option=node('option','',fullName(r)+(r.uhid?' · '+r.uhid:''));option.value=r.id;select.append(option);}const detail=node('div');select.addEventListener('change',()=>{detail.replaceChildren();const r=records().find(r=>r.id===select.value);if(!r)return;detail.append(title(fullName(r),meta(r)),button('Review case',()=>openCase(r.id)));const events=kpiFields.filter(f=>f.type==='datetime'&&r[f.id]).map(f=>({label:f.label,time:r[f.id]})).sort((a,b)=>new Date(a.time)-new Date(b.time));if(!events.length)detail.append(empty('No event times recorded.'));else{const list=node('ul','review-timeline');for(const event of events){const li=node('li');li.append(node('strong','',event.label),node('span','',dateTime(event.time)));list.append(li);}detail.append(list);}});screen.append(select,detail);return;}
 screen.append(monthControl(render));const list=report(month),select=node('select','review-select');select.setAttribute('aria-label','KPI indicator');for(const r of list){const option=node('option','',`${r.no}. ${r.title}`);option.value=r.no;select.append(option);}select.value=indicator;select.addEventListener('change',()=>{indicator=Number(select.value);render();});screen.append(select);
 const result=list[indicator-1],box=node('article','review-analysis-card');box.append(node('span','tag grey',`KPI ${result.no} · ${result.status==='complete'?'Complete':result.status==='clarification'?'Definition needs clarification':result.status==='not-applicable'?'No eligible cases':'Pending data'}`),node('h2','',result.title),node('div','big-value',result.value==null?'Pending':`${Number(result.value.toFixed(2))}${result.unit==='%'?'%':result.unit?' '+result.unit:''}`),node('p','review-intro',`Numerator: ${result.numerator??'—'} · Denominator: ${result.denominator??'—'}`));if(result.note)box.append(node('p','review-intro',result.note));
 const trend=node('div','review-trend');trend.setAttribute('role','img');trend.setAttribute('aria-label','Six-month trend; incomplete or unresolved months have no numeric bar.');const points=[];for(let n=5;n>=0;n--){const [year,m]=month.split('-').map(Number),date=new Date(Date.UTC(year,m-1-n,1)),key=date.toISOString().slice(0,7);points.push({month:key,result:report(key)[indicator-1]});}const max=Math.max(1,...points.map(p=>p.result.value||0));for(const p of points){const item=node('div'),value=p.result.value,bar=node('i');bar.style.height=value==null?'2px':`${Math.max(2,value/max*120)}px`;if(value==null)bar.style.background='#dce0e9';item.append(node('strong','',value==null?'—':Number(value.toFixed(1)).toString()),bar,node('span','',p.month));trend.append(item);}box.append(node('h3','','Monthly trend'),trend);const nav=node('div','review-filters'),prev=button('Previous KPI',()=>{indicator--;render();}),next=button('Next KPI',()=>{indicator++;render();});prev.disabled=indicator===1;next.disabled=indicator===24;nav.append(prev,next);box.append(nav);screen.append(box);
}
function more(){screen.append(title('More'));const menu=node('div','review-more');menu.append(node('div','section-card',`Signed in as ${auth.currentUser?.email||'Approved user'}`),button('Settings',settings),button('Logout',()=>signOut(auth)));screen.append(menu);}
function settings(){const dialog=node('dialog','review-settings'),head=node('header');head.append(node('h2','','Settings'),button('Close',()=>dialog.close()));dialog.append(head,node('p','','Hospital timezone: Asia/Kolkata.'),node('p','','All approved users share the same cases. Review-page corrections save automatically; staff can dictate from the user page.'),node('p','','Reports use admission/arrival-month cohorts. Source-definition conflicts remain flagged until clarified.'));dialog.addEventListener('close',()=>dialog.remove(),{once:true});document.body.append(dialog);dialog.showModal();}
function fitReviewPanel(){if(!panel.hidden){const bottom=shell.querySelector('.bottom-nav').getBoundingClientRect().height;panel.style.height=Math.max(220,window.innerHeight-panel.getBoundingClientRect().top-bottom-12)+'px';}}
window.addEventListener('resize',fitReviewPanel);
function recoveryNotice(){
 const pending=document.querySelector('.kpi-recovery');let notice=$('recoveryNotice');
 if(!pending||!panel.hidden){notice?.remove();return;}
 if(!notice){notice=node('div','review-top-message');notice.id='recoveryNotice';notice.append(node('span','','Pending input is available after reconnecting. '),button('Recover pending input',()=>pending.click()));shell.querySelector('.topbar').after(notice);}
}
function render(){
 if(!uid)return;const reviewing=!!selectedId||view==='kpi';shell.classList.toggle('dashboard-wide',view==='dashboard');const installs=$('installControls');if(installs)installs.hidden=view!=='more'||!!selectedId;panel.classList.toggle('standalone-report',view==='kpi'&&!selectedId);screen.hidden=reviewing;panel.hidden=!reviewing;recoveryNotice();
 for(const b of shell.querySelectorAll('[data-view]')){b.classList.toggle('active',b.dataset.view===view);b.setAttribute('aria-current',b.dataset.view===view?'page':'false');}
 $('viewTitle').textContent=selectedId?(isReviewPage?'Case review':'Case dictation'):({home:'Home',cases:'Cases',dashboard:'Dashboard',kpi:'NABH KPI Analysis',analysis:'Analysis',more:'More'})[view];$('viewSubtitle').textContent=selectedId?'Shared patient record':isReviewPage?'Shared case review':'Shared case workspace';
 if(reviewing){if(selectedId){const r=records().find(r=>r.id===selectedId);if(!r){selectedId=null;hideProtocolViewer({reset:true});render();return;}showProtocolCase(scroller,r.id,{data:r._data});}else{showKpiReport(scroller,{month});}fitReviewPanel();return;}
 hideProtocolViewer();screen.replaceChildren();({home,cases,dashboard,analysis:analyses,more})[view]?.();
}
for(const b of shell.querySelectorAll('[data-view]'))b.addEventListener('click',()=>navigate(b.dataset.view));
window.addEventListener('kpi-report-month-changed',event=>{month=event.detail.month;});
window.addEventListener('kpi-case-recovered',event=>{selectedId=event.detail.caseId;view='cases';render();queueMicrotask(recoveryNotice);});
if(isReviewPage)$('loginForm').addEventListener('submit',async event=>{event.preventDefault();$('loginSubmit').disabled=true;$('loginError').textContent='';try{await signInWithEmailAndPassword(auth,$('loginEmail').value.trim(),$('loginPassword').value);$('loginPassword').value='';}catch{$('loginError').textContent='Unable to sign in. Check your email and password.';}finally{$('loginSubmit').disabled=false;}});
function locked(message=''){
 generation++;stopNotes?.();stopNotes=null;uid=null;documents=[];selectedId=null;creating=false;
 if(!auth.currentUser||/blocked|revoked/i.test(message))pendingDraft=null;
 hideProtocolViewer({reset:true,clearRecords:true,allowRecovery:/offline|reconnect|waiting|confirm|verif/i.test(message),discardPending:/blocked|revoked/i.test(message)});
 shell.hidden=true;shell.classList.remove('authenticated');$('loginScreen').hidden=false;$('loginScreen').classList.remove('hidden');const error=$('loginError')||$('deviceStatus');if(error)error.textContent=message;
 screen.replaceChildren();scroller.replaceChildren();$('recoveryNotice')?.remove();for(const d of document.querySelectorAll('dialog[open]'))d.close();
}
function granted(user,details){
 if(pendingDraft&&pendingDraft.uid!==user.uid)pendingDraft=null;
 accessDetails=details;uid=user.uid;const current=++generation;shell.hidden=false;shell.classList.add('authenticated');$('loginScreen').hidden=true;$('syncStatus').textContent='Connecting';view='home';selectedId=null;stopNotes?.();
 stopNotes=onSnapshot(collection(db,'workspaces','stroke','notes'),snapshot=>{if(current!==generation||!uid)return;ingestKpiSnapshot(snapshot);documents=snapshot.docs.map(d=>({id:d.id,...d.data()})).filter(d=>d.deleted!==true);$('syncStatus').textContent='Shared · live';render();},()=>{if(current!==generation)return;$('syncStatus').textContent='Sync unavailable';message('Shared cases could not be refreshed. Reconnect and verify access.');});
}
setPersistence(auth,browserLocalPersistence).catch(()=>{}).then(()=>{
 if(isReviewPage)mountDashboardAccess({auth,db,onLocked:locked,onAccess:granted});
 else mountDeviceAccess({auth,db,onAccess:(user,details)=>{if(user)granted(user,details);else locked(details?.accessLockReason||'');}});
});
mountPwa();
