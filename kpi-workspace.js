import {strokeAdmissionSections,strokeAdmissionValues,strokeAdmissionFieldVisible,strokeAdmissionClinicalFacts} from './stroke-admission.js';
import {kpiParameterGuide,kpiSupportingGuide,kpiLaterFieldVisible} from './kpi-parameter-guide.js';
import { kpiCalculationProfile, kpiDefinitions } from './kpi-policy.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { isReviewPage } from './page-mode.js';
import { kpiSections, kpiFields, hospitalFields, kpiSource, kpiSchemaVersion } from './kpi-schema.js';
import { currentKpiValues, currentMonthlyValues, isKpiReportingCase, resolveKpiValues } from './kpi-data.js';
import { calculateKpis } from './kpi-calculations.js';
import { configureKpiStore, saveKpiEdit, saveKpiMonthly } from './kpi-store.js';
import { mountProtocolDictationControls, setProtocolDictationContext, protocolDictationBusy, onProtocolDictationChange, cancelProtocolDictation, parkProtocolDictation, restoreProtocolDictation } from './protocol-dictation.js';
import { protocolFormEditingBusy, configureProtocolFormEditing, onProtocolFormEditChange, parkProtocolFormEditing, restoreProtocolFormEditing } from './protocol-form-editor.js';
import { showProtocolCase as showArchive, hideProtocolViewer as hideArchive, toggleProtocolPages } from './protocol-viewer.js';

const caseSections=kpiSections.filter(section=>section.id!=='kpiResults');
const reportFields=new Set(['includeInReporting',...kpiDefinitions.flatMap(item=>item.parameters).filter(id=>!id.startsWith('monthlyInputs.'))]);
for(let prior=-1;prior!==reportFields.size;){prior=reportFields.size;for(const field of kpiFields.filter(item=>reportFields.has(item.id)))for(const condition of [...(field.showIf?(Array.isArray(field.showIf)?field.showIf:[field.showIf]):[]),...(field.showIfAny||[])])if(condition.field!=='admitted')reportFields.add(condition.field);}
const parameterFields=[...new Map(caseSections.flatMap(item=>item.fields).filter(field=>reportFields.has(field.id)).map(field=>[field.id,field])).values()];
const fieldSection=id=>caseSections.find(item=>item.fields.some(field=>field.id===id))?.id||kpiSections[section].id;
let standalone=false, parameterHome=false, admission=false, caseTabs;
export const kpiWorkspaceBusy=()=>busy();
let configured=false, target=null, caseId=null, caseData={}, section=0, allData=new Map(), archive=false, active=false;
let root, rows=[], picker, statusNodes=[], saveBusy=false, failed=null, jobs=[], epoch=0, reportMonth='', localSaved=false;
const dirty=new Map();
let storeConfig, parked=null, recoveryButton=null, runningJob=null, runningTask=null,cohortReady=false;
const busy=()=>saveBusy||!!failed||jobs.length>0||dirty.size>0||protocolDictationBusy()||protocolFormEditingBusy();
const el=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
const validMonth=value=>/^\d{4}-(0[1-9]|1[0-2])$/.test(value);
const indianMonth=value=>{if(!value)return '';const date=new Date(value);if(!Number.isFinite(date.getTime()))return '';const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit'}).formatToParts(date);return p.find(x=>x.type==='year').value+'-'+p.find(x=>x.type==='month').value;};
function updateStatus(){for(const node of statusNodes){node.firstChild.textContent=failed?'Save failed':saveBusy||jobs.length?'Saving…':dirty.size?'Unsaved changes':localSaved?'Saved':'';node.lastChild.hidden=!failed;}const head=root?.querySelector('.kpi-case-head');if(head&&parameterHome&&!isReviewPage)head.hidden=!(failed||saveBusy||jobs.length||dirty.size||localSaved);if(root?.isConnected)for(const button of root.querySelectorAll('.kpi-section-foot button'))button.disabled=busy()||(button.textContent==='Previous section'?section===0:section>=caseSections.length-1);updateNavigation();window.dispatchEvent(new Event('case-workspace-state'));}
export function configureKpiWorkspace(config){
 if(configured)return;configured=true;storeConfig=config;configureKpiStore(config);configureProtocolFormEditing(config);
 window.addEventListener('offline',parkOfflineInput);
 onAuthStateChanged(config.auth,user=>{if(parked&&parked.uid!==user?.uid)discardRecovery();});
 document.addEventListener('click',event=>{if(parked&&event.target.closest('.protocol-record-start,.kpi-field input,.kpi-field select,[data-start-code7]')){event.preventDefault();event.stopImmediatePropagation();return;}if(active&&busy()&&event.target.closest('.entry,.user-pill,[data-start-code7],#userHomeBtn,#mobileHomeBtn,#newNoteBtn,.date-nav,[data-admin-visit-type],[data-mobile-visit-type],[data-visit-type]')){event.preventDefault();event.stopImmediatePropagation();}},true);
 document.addEventListener('change',event=>{if(active&&busy()&&event.target.closest('.date-nav')){event.preventDefault();event.stopImmediatePropagation();}},true);
 window.addEventListener('beforeunload',event=>{if(active&&busy()){event.preventDefault();event.returnValue='';}});
 onProtocolDictationChange(()=>{if(active)updateNavigation();});
 onProtocolFormEditChange(()=>{if(active)updateNavigation();window.dispatchEvent(new Event('case-workspace-state'));});
}
function discardRecovery(){parked?.voice?.active?.abort?.abort();parked=null;recoveryButton?.remove();recoveryButton=null;}
function parkOfflineInput(){
 if(parked||!active||!busy()||!storeConfig.auth.currentUser)return;
 const pending=[...(runningJob?[runningJob]:[]),...(failed?[failed]:[]),...jobs];
 for(const [key,value]of dirty){if(pending.some(job=>job.key===key&&job.token===value))continue;const monthly=key.startsWith('monthly:'),id=key.replace(/^monthly:/,''),field=(monthly?hospitalFields:kpiFields).find(f=>f.id===id);if(!field)continue;pending.push({caseId,sectionId:fieldSection(id),month:reportMonth,fields:{[id]:field.type==='datetime'&&value?value+(value.length===16?':00':'')+'+05:30':value},key,token:value,monthly});}
 parked={uid:storeConfig.auth.currentUser.uid,caseId,section,archive,parameterHome,admission,month:reportMonth,jobs:pending,editor:parkProtocolFormEditing(),voice:parkProtocolDictation(),settling:runningTask};
 if(!recoveryButton){recoveryButton=el('button','kpi-recovery','Recover pending input');recoveryButton.type='button';recoveryButton.disabled=true;recoveryButton.addEventListener('click',recoverOfflineInput);document.querySelector('.main-topbar').parentElement.append(recoveryButton);}
}
async function recoverOfflineInput(){
 const recovery=parked;if(!cohortReady||!recovery||busy()||!navigator.onLine||!document.querySelector('#appShell.authenticated'))return;
 recoveryButton.disabled=true;await Promise.allSettled([recovery.settling,recovery.editor?.settling,recovery.voice?.ready].filter(Boolean));
 if(parked!==recovery||storeConfig.auth.currentUser?.uid!==recovery.uid||!document.querySelector('#appShell.authenticated')){if(recoveryButton)recoveryButton.disabled=false;return;}
 const data=allData.get(recovery.caseId);
 if(!data||data.deleted){discardRecovery();return;}
 showProtocolCase(target||document.querySelector('#mainScroll'),recovery.caseId,{data});section=recovery.section;reportMonth=recovery.month;archive=recovery.archive;parameterHome=recovery.parameterHome;admission=!!recovery.admission;if(archive)showArchive(target,caseId,{...formOptions(caseData.protocolDictations),pageNumber:recovery.voice?.active?.pageNumber||recovery.editor?.jobs[0]?.pageNumber||1});else{hideArchive();build();}updateNavigation();
 for(const job of recovery.jobs){dirty.set(job.key,job.token);jobs.push(job);}
 for(const [key,value]of dirty){const id=key.replace(/^monthly:/,''),control=root.querySelector('[data-kpi-field="'+id+'"]');if(control)control.value=value;}
 window.dispatchEvent(new CustomEvent('kpi-case-recovered',{detail:{caseId:recovery.caseId}}));
 const voice=recovery.voice;parked=null;recoveryButton.remove();recoveryButton=null;
 if(voice)restoreProtocolDictation(voice);if(recovery.editor)restoreProtocolFormEditing(recovery.editor);flush();updateStatus();
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
 caseTabs=el('div','case-workspace-tabs');caseTabs.setAttribute('role','group');caseTabs.setAttribute('aria-label','Case workspace');
 const modes=el('div','case-mode-tabs');modes.setAttribute('role','tablist');modes.setAttribute('aria-label','Case content');caseTabs.append(modes);
 for(const [form,label]of [['admission','Stroke admission'],[true,isReviewPage?'Stroke Protocol Form':'Stroke pathway'],[false,isReviewPage?'Other Parameters':'KPI parameters']]){const button=el('button','',label);button.type='button';button.dataset.caseMode=form==='admission'?'admission':form?'form':'parameters';button.setAttribute('role','tab');button.setAttribute('aria-controls','mainScroll');button.addEventListener('click',()=>switchCaseMode(form));modes.append(button);}
 if(!isReviewPage){caseTabs.classList.add('case-workspace-tabs-user');const pages=el('button','case-pages-trigger','Pages');pages.type='button';pages.dataset.protocolPagesTrigger='';pages.setAttribute('aria-expanded','false');pages.addEventListener('click',()=>{if(busy())return;if(!archive)switchCaseMode(true);toggleProtocolPages();});caseTabs.append(pages);}
 topbar.before(caseTabs);
 for(const [parent,suffix] of [[topbar,mobile?'desktop':'primary'],...(mobile?[[mobile,'mobile']]:[])]){
  const row=el('div','protocol-heading-row protocol-heading-'+suffix+' kpi-heading');
  const nav=el('div','protocol-heading-nav'),prev=el('button','protocol-step-button','‹'),title=el('button','kpi-title'),next=el('button','protocol-step-button','›');
  for(const [button,label,delta]of [[prev,'Previous section',-1],[next,'Next section',1]]){button.type='button';button.setAttribute('aria-label',label);button.addEventListener('click',()=>changeSection(section+delta));}
  title.type='button';title.setAttribute('aria-label','Choose KPI section');title.addEventListener('click',()=>{picker.hidden=!picker.hidden;title.setAttribute('aria-expanded',String(!picker.hidden));});
  nav.append(prev,title,next);row.append(nav);
  if(!isReviewPage&&!document.getElementById('dictationTopbar'))mountProtocolDictationControls(row);
  const status=el('div','protocol-edit-status'),text=el('span'),retry=el('button','','Retry save');text.setAttribute('role','status');retry.type='button';retry.hidden=true;retry.addEventListener('click',()=>{if(failed){jobs.unshift(failed);failed=null;flush();}});status.append(text,retry);row.append(status);statusNodes.push(status);
  parent.append(row);rows.push({row,prev,title,next});
 }
 picker=el('nav','kpi-section-picker');picker.setAttribute('aria-label','KPI sections');picker.hidden=true;
 caseSections.forEach((s,i)=>{const button=el('button','',`${i+1}. ${s.title}`);button.type='button';button.dataset.section=s.id;button.addEventListener('click',()=>changeSection(i));picker.append(button);});
 topbar.parentElement.classList.add('protocol-viewer-host');topbar.parentElement.append(picker);
 const position=()=>{const anchor=topbar.hidden?caseTabs:topbar;topbar.parentElement.style.setProperty('--protocol-top',(anchor.getBoundingClientRect().bottom-topbar.parentElement.getBoundingClientRect().top)+'px');};new ResizeObserver(position).observe(topbar);new ResizeObserver(position).observe(caseTabs);position();
 document.addEventListener('pointerdown',e=>{if(!picker.hidden&&!picker.contains(e.target)&&!e.target.closest('.kpi-title'))picker.hidden=true;});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')picker.hidden=true;});
}
function updateNavigation(){
 const topbar=document.querySelector('.main-topbar');if(topbar)topbar.hidden=active&&!standalone&&((!isReviewPage&&archive)||(!archive&&parameterHome));
 if(caseTabs){caseTabs.hidden=!active||standalone;for(const button of caseTabs.querySelectorAll('[data-case-mode]')){const selected=button.dataset.caseMode===(archive?'form':admission?'admission':'parameters');button.setAttribute('aria-selected',String(selected));button.disabled=busy();}const pages=caseTabs.querySelector('[data-protocol-pages-trigger]');if(pages)pages.disabled=busy();}
 for(const {row,prev,title,next}of rows){row.hidden=!active||archive||parameterHome;const mic=row.querySelector('.protocol-dictation');if(mic)mic.hidden=standalone;title.textContent=parameterHome?'Other Parameters':['Patient','Assessment','IVT / EVT','Complications','Follow-up','KPIs'][section];title.title=kpiSections[section].title;title.setAttribute('aria-label','Choose section: '+kpiSections[section].title);title.disabled=busy()||standalone||parameterHome;prev.hidden=parameterHome;next.hidden=parameterHome;prev.disabled=busy()||standalone||section===0;next.disabled=busy()||standalone||section>=caseSections.length-1;row.classList.toggle('protocol-dictation-active',protocolDictationBusy()&&!document.getElementById('dictationTopbar'));}
 if(picker)for(const b of picker.children){b.disabled=busy();b.setAttribute('aria-current',b.dataset.section===kpiSections[section].id?'step':'false');}
}
function changeSection(index){if(standalone||busy()||index<0||index>=caseSections.length)return;parameterHome=false;section=index;picker.hidden=true;build();}
function humanDate(value){if(!value)return 'Not recorded';const date=new Date(value);return Number.isFinite(date.getTime())?new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true}).format(date):value;}
function localDateTime(value){if(!value)return '';const d=new Date(value);if(!Number.isFinite(d.getTime()))return '';const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(d),v=key=>p.find(x=>x.type===key)?.value;return `${v('year')}-${v('month')}-${v('day')}T${v('hour')}:${v('minute')}:${v('second')}`;}
function visible(field,values){if(parameterHome&&field.id==='admissionTime')return true;const conditions=field.showIf?Array.isArray(field.showIf)?field.showIf:[field.showIf]:[];return conditions.every(test=>test.values.includes(values[test.field]))&&(!field.showIfAny||field.showIfAny.some(test=>test.values.includes(values[test.field])));}
function fieldRow(field,monthly=false){
 const wrap=el('div','kpi-field');wrap.dataset.field=field.id;wrap.dataset.monthly=String(monthly);
 const label=el('span','kpi-field-label',field.label);wrap.append(label);
 let control;
 if(field.type==='choice'){control=el('select');for(const value of ['',...(field.choices||[])]){const option=el('option','',value||(field.choices.length===2&&field.choices.includes('Yes')?'Not yet known':'Not recorded'));option.value=value;control.append(option);}}
 else{control=el('input');control.type=field.type==='datetime'?'datetime-local':field.type==='date'?'date':field.type==='number'?'number':'text';if(control.type==='number'){control.min='0';control.step='1';}if(field.type==='datetime')control.step='1';if(field.id==='uhid')control.inputMode='text';}
 const editable=isReviewPage||(!monthly&&parameterHome&&!standalone),binary=field.type==='choice'&&field.choices.length===2&&field.choices.includes('Yes');
 control.dataset.kpiField=field.id;control.autocomplete='off';control.setAttribute('aria-label',field.label);control.disabled=!editable;wrap.append(control);
 if(binary&&editable){
  control.hidden=true;const choices=el('div','kpi-binary');choices.setAttribute('role','group');choices.setAttribute('aria-label',field.label);
  for(const [value,text]of [['Yes','Yes'],['No','No'],['','Not yet known']]){const choice=el('button','',text);choice.type='button';choice.dataset.kpiChoice=value;choice.addEventListener('click',()=>{if(control.disabled)return;control.value=value;control.dispatchEvent(new Event('input',{bubbles:true}));control.dispatchEvent(new Event('change',{bubbles:true}));});choices.append(choice);}wrap.append(choices);
 }
 if(field.type==='number'){control.step='1';if(field.max!==undefined)control.max=String(field.max);if(/mrs/i.test(field.id))control.max='6';}

 const read=el('span','kpi-read-value');read.hidden=editable;if(!binary)control.hidden=!editable;wrap.append(read);
 const key=(monthly?'monthly:':'')+field.id;
 control.addEventListener('input',()=>{dirty.set(key,control.value);localSaved=false;updateStatus();});
 const commit=()=>{
  let value=control.value;if(field.type==='datetime'&&value)value+=(value.length===16?':00':'')+'+05:30';
  // Capture the case and month now; retries never follow a later selection.
  const job={caseId,sectionId:fieldSection(field.id),month:reportMonth,fields:{[field.id]:value},key,token:control.value,monthly};
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
function formOptions(dictations){
 const currentId=caseId;
 return {dictations,readOnly:false,onSaved(takeId,entry){
  if(caseId!==currentId)return;const key='page'+entry.pageNumber;
  caseData={...caseData,protocolDictations:{...caseData.protocolDictations,[key]:{...caseData.protocolDictations?.[key],[takeId]:entry}}};
  if(entry.kpiFields)caseData.kpiEntries={...caseData.kpiEntries,[takeId]:{source:kpiSource,version:kpiSchemaVersion,kind:'dictation',sectionId:'protocolForm',referencePageNumber:entry.pageNumber,recordedAt:entry.recordedAt,createdAt:entry.createdAt,createdBy:entry.createdBy,text:entry.text,fields:entry.kpiFields,warnings:entry.warnings||[]}};
  allData.set(caseId,caseData);
 },...(!isReviewPage?{dictationContext:({caseId:id,pageNumber,title})=>({kind:'protocol-kpi',caseId:id,pageNumber,title})}:{})};
}
function switchCaseMode(form){
 if(!active||standalone||busy())return;cancelProtocolDictation();picker.hidden=true;admission=form==='admission';archive=form===true;
 if(archive){target.classList.remove('kpi-scroll');showArchive(target,caseId,formOptions(caseData.protocolDictations));}
 else{hideArchive();parameterHome=true;build();}updateNavigation();
}
function appendCaseFormHeader(){
 const head=el('header','kpi-section-head kpi-case-head');head.hidden=!isReviewPage;
 if(isReviewPage){const review=el('button','kpi-source-button','Review dictation');review.type='button';review.addEventListener('click',reviewSources);head.append(review);}
  const status=el('div','protocol-edit-status'),text=el('span'),retry=el('button','','Retry save');text.setAttribute('role','status');retry.type='button';retry.hidden=true;retry.addEventListener('click',()=>{if(failed){jobs.unshift(failed);failed=null;flush();}});status.append(text,retry);head.append(status);statusNodes=statusNodes.filter(node=>node.isConnected);statusNodes.push(status);
 root.append(head);
}
function buildAdmissionForm(){
 root.classList.add('stroke-admission-form');appendCaseFormHeader();
 root.append(el('h1','stroke-admission-title','Stroke admission and outcomes'));
 root.append(el('p','stroke-admission-summary','Matching Stroke Pathway details appear automatically. Complete or update the remaining information in this shared case.'));
 for(const group of strokeAdmissionSections){
  const block=el('section','stroke-admission-section');block.dataset.admissionSection=group.id;block.append(el('h2','',group.title));
  const grid=el('div','kpi-fields');for(const id of group.fields)grid.append(fieldRow(kpiFields.find(field=>field.id===id)));block.append(grid);root.append(block);
 }
 const facts=el('details','stroke-admission-facts');facts.append(el('summary','','Additional details from Stroke Pathway'),el('dl'));root.append(facts);
 root.append(el('p','stroke-admission-reporting-note','Confirm diagnosis and reporting inclusion. Blank findings and unfinished follow-up remain unknown; monthly hospital totals are recorded separately.'));
 target.replaceChildren(root);updateNavigation();setVoiceContext();refresh();
}
function buildParameterMenu(){
 root.classList.add('kpi-continuous','kpi-one-page');
 appendCaseFormHeader();
 const tools=el('div','kpi-guide-tools'),reused=el('p','kpi-reuse-summary');tools.append(reused);
 const toggle=el('button','kpi-show-captured','Show captured');toggle.type='button';toggle.setAttribute('aria-expanded','false');toggle.addEventListener('click',()=>{root.dataset.showCaptured=root.dataset.showCaptured==='true'?'false':'true';toggle.setAttribute('aria-expanded',root.dataset.showCaptured);toggle.textContent=root.dataset.showCaptured==='true'?'Hide captured':'Show captured';refresh();});tools.append(toggle);root.append(tools);
 const readiness=el('details','kpi-readiness');readiness.append(el('summary'),el('ul'));root.append(readiness);
 const list=el('div','kpi-guide');list.setAttribute('aria-label','KPI parameters');
 [...kpiParameterGuide,kpiSupportingGuide].forEach((group,index)=>{
  const block=el('details','kpi-parameter-group');block.dataset.guideGroup=group.id;
  const summary=el('summary'),number=el('span','kpi-guide-number',index<9?String(index+1):'+'),content=el('span','kpi-guide-content');content.append(el('strong','',group.title),el('span','kpi-guide-cue',group.cue),el('span','kpi-guide-state'));summary.append(number,content);block.append(summary);
  const grid=el('div','kpi-fields');
  for(const id of group.fields){const field=parameterFields.find(item=>item.id===id);if(field)grid.append(fieldRow(field));}
  if(group.id==='complications'&&isReviewPage&&currentKpiValues(caseData).pressureUlcerInitialStage){const row=fieldRow(kpiFields.find(field=>field.id==='pressureUlcerInitialStage'));row.dataset.storedOptional='true';grid.append(row);}
  if(group.monthly){const note=el('p','kpi-month-note','Hospital totals for '+reportMonth+' - quality team, once per month.');grid.append(note);for(const field of hospitalFields)grid.append(fieldRow(field,true));}
  block.append(grid);if(group.id==='supporting'){block.classList.add('kpi-supporting');readiness.append(block);}else list.append(block);
 });
 root.append(list);target.replaceChildren(root);updateNavigation();setVoiceContext();refresh();
}
function setVoiceContext(){if(isReviewPage||standalone)return;const currentId=caseId;setProtocolDictationContext({kind:'kpi',caseId,pageNumber:section+1,sectionId:parameterHome?'kpiResults':kpiSections[section].id,title:admission?'Stroke admission and outcomes':parameterHome?'KPI parameters':kpiSections[section].title,fieldDefinitions:parameterHome||section===5?kpiFields:kpiSections[section].fields,onSaved(id,entry){if(caseId!==currentId)return;caseData={...caseData,kpiEntries:{...caseData.kpiEntries,[id]:entry}};allData.set(caseId,caseData);refresh();}});}
function reviewSources(){
 const dialog=el('dialog','kpi-source-dialog'),head=el('header'),title=el('h2','','Source dictation'),close=el('button','','Close');close.type='button';close.addEventListener('click',()=>dialog.close());head.append(title,close);dialog.append(head);
 const entries=Object.values(caseData.kpiEntries||{}).filter(entry=>entry.kind==='dictation'&&(parameterHome||section===5||entry.sectionId==='protocolForm'||entry.sectionId===kpiSections[section].id)).sort((a,b)=>String(b.recordedAt||'').localeCompare(String(a.recordedAt||'')));
 if(!entries.length)dialog.append(el('p','','No source dictation saved for this section.'));
 for(const entry of entries){const article=el('article');article.append(el('h3','',kpiSections.find(s=>s.id===entry.sectionId)?.title||'KPI dictation'),el('p','',humanDate(entry.recordedAt)),el('pre','',entry.text||''));dialog.append(article);}
 dialog.addEventListener('close',()=>dialog.remove(),{once:true});document.body.append(dialog);dialog.showModal();
}
function build(){
 target.classList.remove('protocol-scroll');target.classList.add('kpi-scroll');target.scrollTop=0;target.scrollLeft=0;
 root=el('section','kpi-workspace');root.dataset.kpiSection=admission?'admission':parameterHome?'parameters':kpiSections[section].id;
 if(parameterHome&&!standalone){if(admission)buildAdmissionForm();else buildParameterMenu();return;}
 const head=el('header','kpi-section-head'),kicker=el('span','kpi-kicker',standalone?'SHARED REPORTING':`SECTION ${section+1} OF ${caseSections.length}`),name=el('h1','',kpiSections[section].title),identity=el('p','kpi-case-identity');if(standalone)head.append(kicker,name,identity);else{head.classList.add('kpi-case-head');head.hidden=!isReviewPage;}if(isReviewPage&&!standalone){const review=el('button','kpi-source-button','Review dictation');review.type='button';review.addEventListener('click',reviewSources);head.append(review);}root.append(head);
 if(section!==5){
  const grid=el('div','kpi-fields');for(const field of kpiSections[section].fields)grid.append(fieldRow(field));root.append(grid);
  const empty=el('p','kpi-empty-section','Complete the relevant choices in earlier sections to show applicable fields.');root.append(empty);
 }else buildReport(root);

 const foot=el('footer','kpi-section-foot');for(const [label,index]of [['Previous section',section-1],['Next section',section+1]]){const b=el('button','',label);b.type='button';b.disabled=index<0||index>=caseSections.length;b.addEventListener('click',()=>changeSection(index));foot.append(b);}foot.hidden=standalone;root.append(foot);
 target.replaceChildren(root);updateNavigation();setVoiceContext();refresh();
}
function refresh(){
 if(!root?.isConnected||archive||!active)return;
 const reuse=resolveKpiValues(caseData),values=admission?strokeAdmissionValues(caseData):currentKpiValues(caseData),identity=[values.name,values.age?(/^\d+(?:\.\d+)?$/.test(values.age)?values.age+' years':values.age):'',values.uhid?'UHID '+values.uhid:''].filter(Boolean).join(' · ');
 const identityNode=root.querySelector('.kpi-case-identity');if(identityNode)identityNode.textContent=standalone?'Cases marked for KPI reporting':identity||'New shared case';
 let shown=0;
 for(const wrap of root.querySelectorAll('.kpi-field')){
  const monthly=wrap.dataset.monthly==='true',defs=monthly?hospitalFields:kpiFields,field=defs.find(f=>f.id===wrap.dataset.field),control=wrap.querySelector('[data-kpi-field]'),read=wrap.querySelector('.kpi-read-value');
  const source=monthly?currentMonthlyValues(allData.get('kpi-month-'+reportMonth)||{}):values;
  wrap.hidden=!monthly&&((parameterHome&&!admission&&reuse.covered.has(field.id)&&root.dataset.showCaptured!=='true')||!(admission?strokeAdmissionFieldVisible(field,values):parameterHome?kpiLaterFieldVisible(field,values,{review:isReviewPage}):visible(field,values)));if(wrap.dataset.storedOptional==='true')wrap.hidden=root.dataset.showCaptured!=='true';if(!wrap.hidden)shown++;
  control.disabled=!(isReviewPage||(!monthly&&parameterHome&&!standalone))||!!parked;
  const key=(monthly?'monthly:':'')+field.id,value=source[field.id]??'';
  let note=wrap.querySelector('.kpi-field-reuse');const fact=parameterHome&&reuse.form[field.id],issue=parameterHome&&reuse.issues[field.id];
  if(fact||issue){if(!note){note=el('span','kpi-field-reuse');wrap.append(note);}note.textContent=issue?(issue+' Saved form value: '+(fact?.raw||'blank')):'Already captured in Stroke pathway.';}else note?.remove();
  if(!dirty.has(key)&&document.activeElement!==control)control.value=field.type==='datetime'?localDateTime(value):value;
  read.textContent=value===''?'Not recorded':field.type==='datetime'?humanDate(value):value;read.classList.toggle('kpi-pending',value==='');
  for(const choice of wrap.querySelectorAll('[data-kpi-choice]')){choice.setAttribute('aria-pressed',String(choice.dataset.kpiChoice===value));choice.disabled=control.disabled;}

 }
 let warnings=root.querySelector('.kpi-warnings');const uncertain=Object.values(caseData.kpiEntries||{}).filter(entry=>(parameterHome||entry.sectionId===kpiSections[section].id)&&entry.warnings?.length).flatMap(entry=>entry.warnings);if(uncertain.length){if(!warnings){warnings=el('details','kpi-warnings');root.querySelector('.kpi-section-head').after(warnings);}warnings.replaceChildren(el('summary','','Dictated details needing clarification'));const list=el('ul');for(const message of uncertain)list.append(el('li','',message));warnings.append(list);}else warnings?.remove();
 const empty=root.querySelector('.kpi-empty-section');if(empty)empty.hidden=shown>0;
 if(parameterHome&&!admission){
  const reusedCount=parameterFields.filter(field=>reuse.covered.has(field.id)).length;
  root.querySelector('.kpi-reuse-summary').textContent=`${reusedCount} reused from Stroke pathway.`;
  root.querySelector('.kpi-show-captured').hidden=reusedCount===0&&!root.querySelector('[data-stored-optional]');
  const monthly=currentMonthlyValues(allData.get('kpi-month-'+reportMonth)||{}),results=calculateKpis([values],monthly),pending=results.filter(item=>item.status==='pending'),resolved=results.filter(item=>['complete','not-applicable'].includes(item.status));
  for(const group of root.querySelectorAll('.kpi-parameter-group')){
   const relevant=[...group.querySelectorAll('.kpi-field')].filter(row=>!row.hidden),missing=relevant.filter(row=>{const id=row.dataset.field,source=row.dataset.monthly==='true'?monthly:values;return source[id]===undefined||source[id]==='';}).length;
   if(group.dataset.guideGroup==='supporting')group.hidden=!relevant.length;
   group.querySelector('.kpi-guide-state').textContent=missing?`${missing} not recorded`:relevant.length?'Recorded':'Already captured / not applicable';
  }
  const ready=root.querySelector('.kpi-readiness');ready.querySelector('summary').textContent=`24 KPI checks: ${resolved.length} resolved, ${pending.length} pending`;
  const list=ready.querySelector('ul');list.replaceChildren();
  if(values.includeInReporting!=='Yes')list.append(el('li','','Confirm inclusion in KPI reporting before this case enters the shared report.'));
  for(const item of pending){const labels=[...new Set(item.missing.map(id=>describeMissing(id,[values])))];list.append(el('li','',`KPI ${item.no}: ${labels.join('; ')}`));}
  if(!pending.length)list.append(el('li','','Applicable case data is complete for these checks. Indicators without an eligible case are not applicable; shared results use the reporting-month cohort.'));
 }
 if(admission){
  const facts=strokeAdmissionClinicalFacts(caseData),box=root.querySelector('.stroke-admission-facts');box.hidden=!facts.length;const list=box.querySelector('dl');list.replaceChildren();for(const fact of facts)list.append(el('dt','',fact.label),el('dd','',fact.value));
 }
 if(standalone&&section===5)refreshReport();
 for(const b of root.querySelectorAll('.kpi-section-foot button'))b.disabled=busy()||(b.textContent==='Previous section'?section===0:section>=caseSections.length-1);
 updateNavigation();
}
function buildReport(parent){
 const controls=el('div','kpi-report-controls'),label=el('label','','Reporting month'),input=el('input');input.type='month';input.value=reportMonth;input.setAttribute('aria-label','Reporting month');input.addEventListener('change',()=>{if(busy()){input.value=reportMonth;return;}if(validMonth(input.value)){reportMonth=input.value;window.dispatchEvent(new CustomEvent('kpi-report-month-changed',{detail:{month:reportMonth}}));refresh();}});label.append(input);controls.append(label);
 const download=el('button','','Export CSV');download.type='button';download.addEventListener('click',exportReport);controls.append(download);parent.append(controls);
 parent.append(el('p','kpi-report-policy','Reports use admission/arrival month and only cases marked for KPI reporting. Open Formula and parameters under an indicator to see its hospital reference definition and required data. Missing facts remain pending.'));
 const summary=el('p','kpi-report-summary');parent.append(summary);
 const monthly=el('details','kpi-monthly');monthly.open=isReviewPage;monthly.append(el('summary','','Shared hospital monthly inputs'));const grid=el('div','kpi-fields');for(const f of hospitalFields)grid.append(fieldRow(f,true));monthly.append(grid);parent.append(monthly);
 parent.append(el('div','kpi-results'));
}
function reportData(){
 const records=[...allData.entries()].filter(([,d])=>d.noteType==='code7'&&!d.deleted&&isKpiReportingCase(d)).map(([id,d])=>({id,...currentKpiValues(d),_date:d.visitDate}));
 const recordsForMonth=records.filter(v=>(indianMonth(v.admissionTime||v.arrivalTime)||v._date?.slice(0,7))===reportMonth);
 const monthly=currentMonthlyValues(allData.get('kpi-month-'+reportMonth)||{});
 return {records:recordsForMonth,results:calculateKpis(recordsForMonth,monthly)};
}
function refreshReport(){
 const {records,results}=reportData(),summary=root.querySelector('.kpi-report-summary');summary.textContent=`${records.length} included case${records.length===1?'':'s'} · ${results.filter(r=>r.status==='complete').length} complete · ${results.filter(r=>r.status==='not-applicable').length} without eligible cases · ${results.filter(r=>r.status==='pending').length} pending of 24 indicators`;
 const box=root.querySelector('.kpi-results');box.replaceChildren();
 for(const result of results){const card=el('article','kpi-result');card.dataset.kpiNumber=result.no;card.dataset.status=result.status;const top=el('div','kpi-result-head');top.append(el('span','kpi-number',String(result.no)),el('h2','',result.title));card.append(top);const labels={complete:'Complete',pending:'Pending data',clarification:'Definition needs clarification','not-applicable':'No eligible cases'};card.append(el('span','kpi-result-status',labels[result.status]||result.status));card.append(el('strong','kpi-result-value',result.value==null?'Awaiting data':typeof result.value==='number'?`${Number(result.value.toFixed(2))}${result.unit==='%'?'%':result.unit?' '+result.unit:''}`:String(result.value)));card.append(el('p','kpi-counts',`Numerator: ${result.numerator??'—'} · Denominator: ${result.denominator??'—'}`));const definition=el('details','kpi-definition');definition.append(el('summary','','Formula and parameters'),el('p','',result.formula),el('p','',kpiCalculationProfile.title),el('p','','Parameters depend on the applicable treatment/outcome and the stated fallbacks.'));const parameters=el('ul');for(const id of result.parameters){const key=id.replace('monthlyInputs.',''),field=[...kpiFields,...hospitalFields].find(f=>f.id===key);parameters.append(el('li','',field?.label||id));}definition.append(parameters);card.append(definition);if(result.note)definition.append(el('p','kpi-result-note',result.note));if(result.missing?.length){const details=el('details');details.append(el('summary','',`${result.missing.length} missing details`));const list=el('ul');for(const item of result.missing)list.append(el('li','',describeMissing(item,records)));details.append(list);card.append(details);}box.append(card);}
}
function describeMissing(value,records){
 const text=String(value),match=/^records\[(\d+)\]\.([A-Za-z0-9]+)(.*)$/.exec(text);
 if(match){const record=records[Number(match[1])]||{},label=kpiFields.find(f=>f.id===match[2])?.label||'Required information';return (record.name||record.uhid||'Unidentified case')+': '+label+(match[3]?' — check event order':'');}
 if(text.startsWith('monthlyInputs.'))return hospitalFields.find(f=>f.id===text.slice(14))?.label||'Monthly hospital input';
 return text;
}
function exportReport(){const {results}=reportData(),quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';const rows=[['KPI','Indicator','Result','Unit','Status','Numerator','Denominator','Calculation profile','Formula','Parameters','Missing','Definition note'],...results.map(r=>[r.no,r.title,r.value,r.unit,r.status,r.numerator,r.denominator,r.calculationProfile,r.formula,r.parameters.join('; '),(r.missing||[]).join('; '),r.note])];const blob=new Blob(['\uFEFF'+rows.map(r=>r.map(quote).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='stroke-kpi-'+reportMonth+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function showProtocolCase(container,id,options={}){
 ensureToolbar();if(caseId&&caseId!==id&&busy())return;
 const opening=!active||caseId!==id||standalone;standalone=false;
 caseId=id;target=container;caseData=options.data||allData.get(id)||{};allData.set(id,caseData);active=true;
 if(opening){admission=caseData.entryWorkflow==='stroke-admission';archive=!admission;parameterHome=admission;section=0;reportMonth=indianMonth(currentKpiValues(caseData).admissionTime||currentKpiValues(caseData).arrivalTime)||caseData.visitDate?.slice(0,7)||indianMonth(new Date().toISOString());}
 if(archive){target.classList.remove('kpi-scroll');updateNavigation();showArchive(target,id,formOptions(caseData.protocolDictations));return;}
 if(opening||!root?.isConnected)build();else{target.classList.add('kpi-scroll');refresh();}updateStatus();
}
export function showKpiReport(container,{month}={}){
 if(busy())return;ensureToolbar();if(!isReviewPage)cancelProtocolDictation();hideArchive();archive=false;caseId=null;caseData={};target=container;active=true;
 if(standalone&&root?.isConnected&&(!validMonth(month)||month===reportMonth)){refresh();updateNavigation();return;}
 standalone=true;parameterHome=false;admission=false;localSaved=false;section=5;reportMonth=validMonth(month)?month:indianMonth(new Date().toISOString());build();updateStatus();
}
export function hideProtocolViewer({reset=false,clearRecords=false,allowRecovery=false,discardPending=false}={}){
 if(discardPending)discardRecovery();else if(reset&&clearRecords&&allowRecovery)parkOfflineInput();
 active=false;if(caseTabs)caseTabs.hidden=true;document.querySelector('.kpi-source-dialog')?.remove();hideArchive();archive=false;if(picker)picker.hidden=true;for(const {row}of rows)row.hidden=true;target?.classList.remove('kpi-scroll');
 if(reset){epoch++;cancelProtocolDictation();hideArchive({reset:true});if(clearRecords){allData.clear();cohortReady=false;}caseData={};caseId=null;root=null;dirty.clear();jobs=[];failed=null;saveBusy=false;localSaved=false;archive=false;standalone=false;admission=false;}
}
