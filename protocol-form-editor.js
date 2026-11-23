import { doc, serverTimestamp, updateDoc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { isReviewPage } from './page-mode.js';
import { protocolFields, protocolFieldSource, protocolFieldVersion } from './protocol-fields.js';
let config, context, generation = 0, processing = false, failed = null, saved = false;
let queue = [], inFlight = null;
const drafts = new Map(), observers = new Set(), statusGroups = new Set();
export const protocolFormEditingBusy = () => processing || !!failed || queue.length > 0 || drafts.size > 0;
export const isProtocolFieldDirty = id => drafts.has(id);
export function onProtocolFormEditChange(fn) { observers.add(fn); }
export function configureProtocolFormEditing(options) {
  if (!isReviewPage || config) return;
  config = options;
  document.addEventListener('click', event => {
    if (protocolFormEditingBusy() && event.target.closest('.entry, .user-pill')) { event.preventDefault(); event.stopImmediatePropagation(); render(); }
  }, true);
  window.addEventListener('beforeunload', event => { if (protocolFormEditingBusy()) { event.preventDefault(); event.returnValue = ''; } });
}
export function cancelProtocolFormEditing() { ++generation; context = null; queue = []; drafts.clear(); processing = false; inFlight = null; failed = null; saved = false; render(); }
export function setProtocolFormEditContext(value) { context = value; }
export function mountProtocolFormEditStatus(parent) {
  if (!isReviewPage) return;
  const group = document.createElement('div'); group.className = 'protocol-edit-status';
  const status = document.createElement('span'); status.setAttribute('role','status'); status.setAttribute('aria-live','polite');
  const retry = document.createElement('button'); retry.type='button';retry.textContent='Retry save';retry.hidden=true;
  retry.addEventListener('click',()=>{if(failed){queue.unshift(failed);failed=null;flush();}});
  group.append(status,retry);parent.append(group);statusGroups.add(group);render();
}
function render() {
  for (const group of statusGroups) {
    group.querySelector('span').textContent = failed ? 'Save failed' : processing || queue.length ? 'Saving…' : drafts.size ? 'Unsaved changes' : saved ? 'Saved' : '';
    group.querySelector('button').hidden = !failed;
  }
  observers.forEach(fn=>fn());
}
function validField(id,value) {
  const field=protocolFields[context?.pageNumber-1]?.find(field=>field.id===id&&field.box);
  if(!field||typeof value!=='string'||value.length>12000)return false;
  if(value && ['binary','yesno','check'].includes(field.kind) && !['Yes','No'].includes(value))return false;
  if(value&&field.kind==='choice'&&!field.options.some(option=>option.value===value))return false;
  return true;
}
export function draftProtocolField(id,value) {
  if(!isReviewPage||!config?.auth.currentUser||!context||!validField(id,value))return;
  drafts.set(id,{value});saved=false;render();
}
export function saveProtocolField(id,value) {
  if(!isReviewPage||!config?.auth.currentUser||!context||!validField(id,value))return;
  let draft=drafts.get(id);if(!draft||draft.value!==value){draft={value};drafts.set(id,draft);}
  if(inFlight?.draft===draft||queue.some(operation=>operation.draft===draft))return;
  const operation={...context,uid:config.auth.currentUser.uid,field:id,value,draft,id:'edit_'+crypto.randomUUID().replaceAll('-',''),recordedAt:new Date().toISOString()};
  if(failed?.field===id)failed=null;
  queue.push(operation);saved=false;flush();
}
async function flush() {
  if(processing||failed||!queue.length)return;
  processing=true;const epoch=generation;render();
  while(queue.length&&epoch===generation){
    const operation=queue.shift();inFlight=operation;
    try {
      if(config.auth.currentUser?.uid!==operation.uid)throw new Error('access-changed');
      const entry={kind:'manual-edit',text:'Form field correction',fields:{[operation.field]:operation.value},pageNumber:operation.pageNumber,pageTitle:operation.title,fieldSource:protocolFieldSource,fieldVersion:protocolFieldVersion,createdBy:operation.uid,createdAt:serverTimestamp(),recordedAt:operation.recordedAt,reviewStatus:'unreviewed'};
      await updateDoc(doc(config.db,'workspaces','stroke','notes',operation.caseId),{[`protocolDictations.page${operation.pageNumber}.${operation.id}`]:entry,updatedBy:operation.uid,updatedAt:serverTimestamp()});
      if(epoch!==generation)return;
      if(drafts.get(operation.field)===operation.draft)drafts.delete(operation.field);
      inFlight=null;operation.onSaved?.(operation.id,entry);saved=true;
    }catch{if(epoch!==generation)return;inFlight=null;failed=operation;break;}
  }
  if(epoch===generation){processing=false;render();}
}
