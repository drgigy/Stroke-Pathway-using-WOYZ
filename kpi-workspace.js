import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { isReviewPage } from './page-mode.js';
import { kpiSections, kpiFields, hospitalFields } from './kpi-schema.js';
import { currentKpiValues, currentMonthlyValues } from './kpi-data.js';
import { calculateKpis } from './kpi-calculations.js';
import { configureKpiStore, saveKpiEdit, saveKpiMonthly } from './kpi-store.js';
import { mountProtocolDictationControls, setProtocolDictationContext, protocolDictationBusy, onProtocolDictationChange, cancelProtocolDictation, parkProtocolDictation, restoreProtocolDictation } from './protocol-dictation.js';
import { protocolFormEditingBusy } from './protocol-form-editor.js';
import { showProtocolCase as showArchive, hideProtocolViewer as hideArchive } from './protocol-viewer.js';

let standalone=false;
export const kpiWorkspaceBusy=()=>busy();
let configured=false, target=null, caseId=null, caseData={}, section=0, allData=new Map(), archive=false, active=false;
let root, rows=[], picker, statusNodes=[], saveBusy=false, failed=null, jobs=[], epoch=0, reportMonth='', localSaved=false;
const dirty=new Map();
let storeConfig, parked=null, recoveryButton=null, runningJob=null, runningTask=null,cohortReady=false;
const busy=()=>saveBusy||!!failed||jobs.length>0||dirty.size>0||protocolDictationBusy()||protocolFormEditingBusy();
const el=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
const validMonth=value=>/^\d{4}-(0[1-9]|1[0-2])$/.test(value);
const indianMonth=value=>{if(!value)return '';const date=new Date(value);if(!Number.isFinite(date.getTime()))return '';const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit'}).formatToParts(date);return p.find(x=>x.type==='year').value+'-'+p.find(x=>x.type==='month').value;};
function updateStatus(){for(const node of statusNodes){node.firstChild.textContent=failed?'Save failed':saveBusy||jobs.length?'Saving…':dirty.size?'Unsaved changes':localSaved?'Saved':'';node.lastChild.hidden=!failed;}if(root?.isConnected)for(const button of root.querySelectorAll('.kpi-section-foot button'))button.disabled=busy()||(button.textContent==='Previous section'?section===0:section===5);updateNavigation();}
export function configureKpiWorkspace(config){
 if(configured)return;configured=true;storeConfig=config;configureKpiStore(config);
 window.addEventListener('offline',parkOfflineInput);
 onAuthStateChanged(config.auth,user=>{if(parked&&parked.uid!==user?.uid)discardRecovery();});
 document.addEventListener('click',event=>{if(parked&&event.target.closest('.protocol-record-start,.kpi-field input,.kpi-field select,[data-start-code7]')){event.preventDefault();event.stopImmediatePropagation();return;}if(active&&busy()&&event.target.closest('.entry,.user-pill,[data-start-code7],#userHomeBtn,#mobileHomeBtn,#newNoteBtn,.date-nav,[data-admin-visit-type],[data-mobile-visit-type],[data-visit-type]')){event.preventDefault();event.stopImmediatePropagation();}},true);
 document.addEventListener('change',event=>{if(active&&busy()&&event.target.closest('.date-nav')){event.preventDefault();event.stopImmediatePropagation();}},true);
 window.addEventListener('beforeunload',event=>{if(active&&busy()){event.preventDefault();event.returnValue='';}});
 onProtocolDictationChange(()=>{if(active)updateNavigation();});
}
function discardRecovery(){parked?.voice?.active?.abort?.abort();parked=null;recoveryButton?.remove();recoveryButton=null;}
function parkOfflineInput(){
 if(parked||!active||archive||!busy()||!storeConfig.auth.currentUser)return;
 const pending=[...(runningJob?[runningJob]:[]),...(failed?[failed]:[]),...jobs];
 for(const [key,value]of dirty){if(pending.some(job=>job.key===key&&job.token===value))continue;const monthly=key.startsWith('monthly:'),id=key.replace(/^monthly:/,''),field=(monthly?hospitalFields:kpiFields).find(f=>f.id===id);if(!field)continue;pending.push({caseId,sectionId:kpiSections[section].id,month:reportMonth,fields:{[id]:field.type==='datetime'&&value?value+(value.length===16?':00':'')+'+05:30':value},key,token:value,monthly});}
 parked={uid:storeConfig.auth.currentUser.uid,caseId,section,month:reportMonth,jobs:pending,voice:parkProtocolDictation(),settling:runningTask};
 if(!recoveryButton){recoveryButton=el('button','kpi-recovery','Recover pending input');recoveryButton.type='button';recoveryButton.disabled=true;recoveryButton.addEventListener('click',recoverOfflineInput);document.querySelector('.main-topbar').parentElement.append(recoveryButton);}
}
async function recoverOfflineInput(){
 const recovery=parked;if(!cohortReady||!recovery||busy()||!navigator.onLine||!document.querySelector('#appShell.authenticated'))return;
 recoveryButton.disabled=true;await Promise.allSettled([recovery.settling,recovery.voice?.ready].filter(Boolean));
 if(parked!==recovery||storeConfig.auth.currentUser?.uid!==recovery.uid||!document.querySelector('#appShell.authenticated')){if(recoveryButton)recoveryButton.disabled=false;return;}
 const data=allData.get(recovery.caseId);
 if(!data||data.deleted){discardRecovery();return;}
 showProtocolCase(target||document.querySelector('#mainScroll'),recovery.caseId,{data});section=recovery.section;reportMonth=recovery.month;build();
 for(const job of recovery.jobs){dirty.set(job.key,job.token);jobs.push(job);}
 for(const [key,value]of dirty){const id=key.replace(/^monthly:/,''),control=root.querySelector('[data-kpi-field="'+id+'"]');if(control)control.value=value;}
 window.dispatchEvent(new CustomEvent('kpi-case-recovered',{detail:{caseId:recovery.caseId}}));
 const voice=recovery.voice;parked=null;recoveryButton.remove();recoveryButton=null;
 if(voice)restoreProtocolDictation(voice);flush();updateStatus();
}
export function ingestKpiSnapshot(snapshot){
 cohortReady=true;if(recoveryButton)recoveryButton.disabled=false;
 allData=new Map(snapshot.docs.filter(doc=>doc.data().deleted!==true).map(doc=>[doc.id,doc.data()]));
 if(active&&caseId&&!allData.has(caseId)){hideProtocolViewer({reset:true});target?.replaceChildren(el('p','kpi-empty-section','This case was removed from the shared workspace.'));return;}
 if(active&&caseId&&allData.has(caseId)){caseData=allData.get(caseId);if(!archive)refresh();}else if(active&&standalone)refresh();
}
function ensureToolbar(){
 if(rows.length)return;
 const topbar=document.querySelector('.main-topbar'),mobile=topbar.querySelector('.mobile-visit-row');
 for(const [parent,suffix] of [[topbar,mobile?'desktop':'primary'],...(mobile?[[mobile,'mobile']]:[])]){
  const row=el('div','protocol-heading-row protocol-heading-'+suffix+' kpi-heading');
  const nav=el('div','protocol-heading-nav'),prev=el('button','protocol-step-button','‹'),title=el('button','kpi-title'),next=el('button','protocol-step-button','›');
  for(const [button,label,delta]of [[prev,'Previous section',-1],[next,'Next section',1]]){button.type='button';button.setAttribute('aria-label',label);button.addEventListener('click',()=>changeSection(section+delta));}
  title.type='button';title.setAttribute('aria-label','Choose KPI section');title.addEventListener('click',()=>{picker.hidden=!picker.hidden;title.setAttribute('aria-expanded',String(!picker.hidden));});
  nav.append(prev,title,next);row.append(nav);
  if(!isReviewPage)mountProtocolDictationControls(row);
  const status=el('div','protocol-edit-status'),text=el('span'),retry=el('button','','Retry save');text.setAttribute('role','status');retry.type='button';retry.hidden=true;retry.addEventListener('click',()=>{if(failed){jobs.unshift(failed);failed=null;flush();}});status.append(text,retry);row.append(status);statusNodes.push(status);
  parent.append(row);rows.push({row,prev,title,next});
 }
 picker=el('nav','kpi-section-picker');picker.setAttribute('aria-label','KPI sections');picker.hidden=true;
 kpiSections.forEach((s,i)=>{const button=el('button','',`${i+1}. ${s.title}`);button.type='button';button.dataset.section=s.id;button.addEventListener('click',()=>changeSection(i));picker.append(button);});
 topbar.parentElement.classList.add('protocol-viewer-host');topbar.parentElement.append(picker);
 const position=()=>topbar.parentElement.style.setProperty('--protocol-top',topbar.getBoundingClientRect().height+'px');new ResizeObserver(position).observe(topbar);position();
 document.addEventListener('pointerdown',e=>{if(!picker.hidden&&!picker.contains(e.target)&&!e.target.closest('.kpi-title'))picker.hidden=true;});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')picker.hidden=true;});
}
function updateNavigation(){
 for(const {row,prev,title,next}of rows){row.hidden=!active||archive;title.textContent=['Patient','Assessment','IVT / EVT','Complications','Follow-up','KPIs'][section];title.title=kpiSections[section].title;title.setAttribute('aria-label','Choose section: '+kpiSections[section].title);title.disabled=busy()||standalone;prev.disabled=busy()||standalone||section===0;next.disabled=busy()||standalone||section===kpiSections.length-1;row.classList.toggle('protocol-dictation-active',protocolDictationBusy());}
 if(picker)for(const b of picker.children){b.disabled=busy();b.setAttribute('aria-current',b.dataset.section===kpiSections[section].id?'step':'false');}
}
function changeSection(index){if(standalone||busy()||index<0||index>=kpiSections.length)return;section=index;picker.hidden=true;build();}
function humanDate(value){if(!value)return 'Not recorded';const date=new Date(value);return Number.isFinite(date.getTime())?new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true}).format(date):value;}
function localDateTime(value){if(!value)return '';const d=new Date(value);if(!Number.isFinite(d.getTime()))return '';const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(d),v=key=>p.find(x=>x.type===key)?.value;return `${v('year')}-${v('month')}-${v('day')}T${v('hour')}:${v('minute')}:${v('second')}`;}
function visible(field,values){const conditions=field.showIf?Array.isArray(field.showIf)?field.showIf:[field.showIf]:[];return conditions.every(test=>test.values.includes(values[test.field]))&&(!field.showIfAny||field.showIfAny.some(test=>test.values.includes(values[test.field])));}
function fieldRow(field,monthly=false){
 const wrap=el('label','kpi-field');wrap.dataset.field=field.id;wrap.dataset.monthly=String(monthly);
 const label=el('span','kpi-field-label',field.label);wrap.append(label);
 let control;
 if(field.type==='choice'){control=el('select');for(const value of ['',...(field.choices||[])]){const option=el('option','',value||'Not recorded');option.value=value;control.append(option);}}
 else{control=el('input');control.type=field.type==='datetime'?'datetime-local':field.type==='date'?'date':field.type==='number'?'number':'text';if(control.type==='number'){control.min='0';control.step='1';}if(field.type==='datetime')control.step='1';if(field.id==='uhid')control.inputMode='text';}
 control.dataset.kpiField=field.id;control.autocomplete='off';control.setAttribute('aria-label',field.label);control.disabled=!isReviewPage;wrap.append(control);
 const read=el('span','kpi-read-value');read.hidden=isReviewPage;control.hidden=!isReviewPage;wrap.append(read);
 const key=(monthly?'monthly:':'')+field.id;
 control.addEventListener('input',()=>{dirty.set(key,control.value);localSaved=false;updateStatus();});
 const commit=()=>{
  let value=control.value;if(field.type==='datetime'&&value)value+=(value.length===16?':00':'')+'+05:30';
  // Capture the case and month now; retries never follow a later selection.
  const job={caseId,sectionId:kpiSections[section].id,month:reportMonth,fields:{[field.id]:value},key,token:control.value,monthly};
  dirty.set(key,control.value);if(failed?.key===key)failed=null;jobs=jobs.filter(pending=>pending.key!==key);jobs.push(job);localSaved=false;flush();
 };
 control.addEventListener('change',commit);
 control.addEventListener('blur',()=>{if(dirty.has(key)&&!(runningJob?.key===key&&runningJob.token===control.value)&&!jobs.some(job=>job.key===key&&job.token===control.value))commit();});
 return wrap;
}
async function flush(){
 if(saveBusy||failed||!jobs.length)return;saveBusy=true;const generation=epoch;updateStatus();
 while(jobs.length&&generation===epoch){const job=jobs.shift();try{
  runningJob=job;runningTask=job.monthly?saveKpiMonthly(job.month,job.fields,job.operation):saveKpiEdit(job.caseId,job.fields,job.sectionId,job.operation);
  const saved=await runningTask;job.operation={...(job.monthly?{month:job.month}:{caseId:job.caseId}),...saved};
  if(generation!==epoch)return;
  if(dirty.get(job.key)===job.token)dirty.delete(job.key);
  if(job.monthly){const id='kpi-month-'+job.month,data=allData.get(id)||{noteType:'kpi-monthly'};data.kpiMonthlyEntries={...data.kpiMonthlyEntries,[saved.id]:saved.entry};allData.set(id,data);}
  else{caseData={...caseData,kpiEntries:{...caseData.kpiEntries,[saved.id]:saved.entry}};allData.set(job.caseId,caseData);}
  localSaved=true;refresh();
 }catch(error){job.operation=error.operation;if(generation!==epoch)return;failed=job;break;}finally{if(runningJob===job){runningJob=null;runningTask=null;}}}
 if(generation===epoch){saveBusy=false;updateStatus();}
}
function setVoiceContext(){if(isReviewPage)return;const currentId=caseId;setProtocolDictationContext({kind:'kpi',caseId,pageNumber:section+1,sectionId:kpiSections[section].id,title:kpiSections[section].title,fieldDefinitions:section===5?kpiFields:kpiSections[section].fields,onSaved(id,entry){if(caseId!==currentId)return;caseData={...caseData,kpiEntries:{...caseData.kpiEntries,[id]:entry}};allData.set(caseId,caseData);refresh();}});}
function reviewSources(){
 const dialog=el('dialog','kpi-source-dialog'),head=el('header'),title=el('h2','','Source dictation'),close=el('button','','Close');close.type='button';close.addEventListener('click',()=>dialog.close());head.append(title,close);dialog.append(head);
 const entries=Object.values(caseData.kpiEntries||{}).filter(entry=>entry.kind==='dictation'&&(section===5||entry.sectionId===kpiSections[section].id)).sort((a,b)=>String(b.recordedAt||'').localeCompare(String(a.recordedAt||'')));
 if(!entries.length)dialog.append(el('p','','No source dictation saved for this section.'));
 for(const entry of entries){const article=el('article');article.append(el('h3','',kpiSections.find(s=>s.id===entry.sectionId)?.title||'KPI dictation'),el('p','',humanDate(entry.recordedAt)),el('pre','',entry.text||''));dialog.append(article);}
 dialog.addEventListener('close',()=>dialog.remove(),{once:true});document.body.append(dialog);dialog.showModal();
}
function build(){
 target.classList.remove('protocol-scroll');target.classList.add('kpi-scroll');target.scrollTop=0;target.scrollLeft=0;
 root=el('section','kpi-workspace');root.dataset.kpiSection=kpiSections[section].id;
 const head=el('header','kpi-section-head'),kicker=el('span','kpi-kicker',standalone?'SHARED REPORTING':`SECTION ${section+1} OF 6`),name=el('h1','',kpiSections[section].title),identity=el('p','kpi-case-identity');head.append(kicker,name,identity);if(isReviewPage&&!standalone){const review=el('button','kpi-source-button','Review dictation');review.type='button';review.addEventListener('click',reviewSources);head.append(review);}root.append(head);
 if(section!==5){
  const help=el('p','kpi-section-help',isReviewPage?'Correct a field here. Changes save to the shared case.':'Dictate the details you know. Unstated information stays pending.');root.append(help);
  const grid=el('div','kpi-fields');for(const field of kpiSections[section].fields)grid.append(fieldRow(field));root.append(grid);
  const empty=el('p','kpi-empty-section','Complete the relevant choices in earlier sections to show applicable fields.');root.append(empty);
 }else buildReport(root);
 if(caseData.protocolDictations&&Object.keys(caseData.protocolDictations).length){const old=el('button','kpi-archive-button','View previous protocol form');old.type='button';old.addEventListener('click',()=>{if(busy())return;archive=true;cancelProtocolDictation();updateNavigation();target.classList.remove('kpi-scroll');showArchive(target,caseId,{dictations:caseData.protocolDictations,readOnly:true});const back=el('button','kpi-archive-return','Return to KPI sections');back.type='button';back.addEventListener('click',()=>{if(busy())return;archive=false;hideArchive({reset:true});back.remove();build();});target.parentElement.append(back);});root.append(old);}
 const foot=el('footer','kpi-section-foot');for(const [label,index]of [['Previous section',section-1],['Next section',section+1]]){const b=el('button','',label);b.type='button';b.disabled=index<0||index>=6;b.addEventListener('click',()=>changeSection(index));foot.append(b);}foot.hidden=standalone;root.append(foot);
 target.replaceChildren(root);updateNavigation();setVoiceContext();refresh();
}
function refresh(){
 if(!root?.isConnected||archive||!active)return;
 const values=currentKpiValues(caseData),identity=[values.name,values.age?(/^\d+(?:\.\d+)?$/.test(values.age)?values.age+' years':values.age):'',values.uhid?'UHID '+values.uhid:''].filter(Boolean).join(' · ');
 root.querySelector('.kpi-case-identity').textContent=standalone?'All shared cases':identity||'New shared case';
 let shown=0;
 for(const wrap of root.querySelectorAll('.kpi-field')){
  const monthly=wrap.dataset.monthly==='true',defs=monthly?hospitalFields:kpiFields,field=defs.find(f=>f.id===wrap.dataset.field),control=wrap.querySelector('[data-kpi-field]'),read=wrap.querySelector('.kpi-read-value');
  const source=monthly?currentMonthlyValues(allData.get('kpi-month-'+reportMonth)||{}):values;
  wrap.hidden=!monthly&&!visible(field,values);if(!wrap.hidden)shown++;
  control.disabled=!isReviewPage||!!parked;
  const key=(monthly?'monthly:':'')+field.id,value=source[field.id]??'';
  if(!dirty.has(key)&&document.activeElement!==control)control.value=field.type==='datetime'?localDateTime(value):value;
  read.textContent=value===''?'Not recorded':field.type==='datetime'?humanDate(value):value;read.classList.toggle('kpi-pending',value==='');
 }
 let warnings=root.querySelector('.kpi-warnings');const uncertain=Object.values(caseData.kpiEntries||{}).filter(entry=>entry.sectionId===kpiSections[section].id&&entry.warnings?.length).flatMap(entry=>entry.warnings);if(uncertain.length){if(!warnings){warnings=el('details','kpi-warnings');root.querySelector('.kpi-section-head').after(warnings);}warnings.replaceChildren(el('summary','','Dictated details needing clarification'));const list=el('ul');for(const message of uncertain)list.append(el('li','',message));warnings.append(list);}else warnings?.remove();
 const empty=root.querySelector('.kpi-empty-section');if(empty)empty.hidden=shown>0;
 if(section===5)refreshReport();
 for(const b of root.querySelectorAll('.kpi-section-foot button'))b.disabled=busy()||(b.textContent==='Previous section'?section===0:section===5);
 updateNavigation();
}
function buildReport(parent){
 const controls=el('div','kpi-report-controls'),label=el('label','','Reporting month'),input=el('input');input.type='month';input.value=reportMonth;input.setAttribute('aria-label','Reporting month');input.addEventListener('change',()=>{if(busy()){input.value=reportMonth;return;}if(validMonth(input.value)){reportMonth=input.value;window.dispatchEvent(new CustomEvent('kpi-report-month-changed',{detail:{month:reportMonth}}));refresh();}});label.append(input);controls.append(label);
 const download=el('button','','Export CSV');download.type='button';download.addEventListener('click',exportReport);controls.append(download);parent.append(controls);
 parent.append(el('p','kpi-report-policy','Cases are grouped by admission/arrival month. Later outcomes update that original cohort. Missing eligibility remains pending. Conflicting definitions in the supplied NABH document are flagged for clarification.'));
 const summary=el('p','kpi-report-summary');parent.append(summary);
 const monthly=el('details','kpi-monthly');monthly.open=isReviewPage;monthly.append(el('summary','','Shared hospital monthly inputs'));const grid=el('div','kpi-fields');for(const f of hospitalFields)grid.append(fieldRow(f,true));monthly.append(grid);parent.append(monthly);
 parent.append(el('div','kpi-results'));
}
function reportData(){
 const records=[...allData.entries()].filter(([,d])=>d.noteType==='code7'&&!d.deleted).map(([id,d])=>({id,...currentKpiValues(d),_date:d.visitDate}));
 const recordsForMonth=records.filter(v=>(indianMonth(v.admissionTime||v.arrivalTime)||v._date?.slice(0,7))===reportMonth);
 const monthly=currentMonthlyValues(allData.get('kpi-month-'+reportMonth)||{});
 return {records:recordsForMonth,results:calculateKpis(recordsForMonth,monthly)};
}
function refreshReport(){
 const {records,results}=reportData(),summary=root.querySelector('.kpi-report-summary');summary.textContent=`${records.length} shared cases · ${results.filter(r=>r.status==='complete').length} complete indicators · ${results.filter(r=>r.status==='clarification').length} definitions need clarification`;
 const box=root.querySelector('.kpi-results');box.replaceChildren();
 for(const result of results){const card=el('article','kpi-result');card.dataset.kpiNumber=result.no;card.dataset.status=result.status;const top=el('div','kpi-result-head');top.append(el('span','kpi-number',String(result.no)),el('h2','',result.title));card.append(top);const labels={complete:'Complete',pending:'Pending data',clarification:'Definition needs clarification','not-applicable':'No eligible cases'};card.append(el('span','kpi-result-status',labels[result.status]||result.status));card.append(el('strong','kpi-result-value',result.value==null?'Awaiting data / definition':typeof result.value==='number'?`${Number(result.value.toFixed(2))}${result.unit==='%'?'%':result.unit?' '+result.unit:''}`:String(result.value)));card.append(el('p','kpi-counts',`Numerator: ${result.numerator??'—'} · Denominator: ${result.denominator??'—'}`));if(result.note)card.append(el('p','kpi-result-note',result.note));if(result.missing?.length){const details=el('details');details.append(el('summary','',`${result.missing.length} missing details`));const list=el('ul');for(const item of result.missing)list.append(el('li','',describeMissing(item,records)));details.append(list);card.append(details);}box.append(card);}
}
function describeMissing(value,records){
 const text=String(value),match=/^records\[(\d+)\]\.([A-Za-z0-9]+)(.*)$/.exec(text);
 if(match){const record=records[Number(match[1])]||{},label=kpiFields.find(f=>f.id===match[2])?.label||'Required information';return (record.name||record.uhid||'Unidentified case')+': '+label+(match[3]?' — check event order':'');}
 if(text.startsWith('monthlyInputs.'))return hospitalFields.find(f=>f.id===text.slice(14))?.label||'Monthly hospital input';
 return text;
}
function exportReport(){const {results}=reportData(),quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';const rows=[['KPI','Indicator','Result','Status','Numerator','Denominator','Missing','Definition note'],...results.map(r=>[r.no,r.title,r.value,r.status,r.numerator,r.denominator,(r.missing||[]).join('; '),r.note])];const blob=new Blob(['\uFEFF'+rows.map(r=>r.map(quote).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='stroke-kpi-'+reportMonth+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function showProtocolCase(container,id,options={}){
 ensureToolbar();if(caseId&&caseId!==id&&busy())return;standalone=false;
 if(archive&&caseId===id){active=true;document.querySelector('.kpi-archive-return')?.removeAttribute('hidden');showArchive(container,id,{dictations:options.data?.protocolDictations||caseData.protocolDictations,readOnly:true});return;}
 if(caseId!==id){archive=false;document.querySelector('.kpi-archive-return')?.remove();hideArchive();}
 const same=caseId===id&&target===container&&root?.isConnected;
 caseId=id;target=container;caseData=options.data||allData.get(id)||{};allData.set(id,caseData);active=true;
 if(!same){section=0;reportMonth=indianMonth(currentKpiValues(caseData).admissionTime||currentKpiValues(caseData).arrivalTime)||caseData.visitDate?.slice(0,7)||indianMonth(new Date().toISOString());build();}
 else{target.classList.add('kpi-scroll');refresh();}updateNavigation();updateStatus();
}
export function showKpiReport(container,{month}={}){
 if(busy())return;ensureToolbar();hideArchive();archive=false;caseId=null;caseData={};target=container;active=true;
 if(standalone&&root?.isConnected&&(!validMonth(month)||month===reportMonth)){refresh();updateNavigation();return;}
 standalone=true;localSaved=false;section=5;reportMonth=validMonth(month)?month:indianMonth(new Date().toISOString());build();updateStatus();
}
export function hideProtocolViewer({reset=false,clearRecords=false,allowRecovery=false,discardPending=false}={}){
 if(discardPending)discardRecovery();else if(reset&&clearRecords&&allowRecovery)parkOfflineInput();
 active=false;document.querySelector('.kpi-source-dialog')?.remove();hideArchive();const archiveReturn=document.querySelector('.kpi-archive-return');if(archiveReturn)archiveReturn.hidden=true;if(picker)picker.hidden=true;for(const {row}of rows)row.hidden=true;target?.classList.remove('kpi-scroll');
 if(reset){epoch++;cancelProtocolDictation();hideArchive({reset:true});document.querySelector('.kpi-archive-return')?.remove();if(clearRecords){allData.clear();cohortReady=false;}caseData={};caseId=null;root=null;dirty.clear();jobs=[];failed=null;saveBusy=false;localSaved=false;archive=false;standalone=false;}
}
