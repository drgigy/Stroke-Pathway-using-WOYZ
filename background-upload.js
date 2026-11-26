import { backgroundConfig as settings } from './background-config.js';
import { protocolFieldSource,protocolFieldVersion } from './protocol-fields.js';
let options,accessUid=null,stopWatching=null,epoch=0,jobs=[],sdkPromise;
const listeners=new Set(),acknowledged=new Set();
export const backgroundEnabled=settings.enabled;
export function configureBackgroundUpload(value){options=value;}
export function onBackgroundChange(callback){listeners.add(callback);}
function changed(){for(const listener of listeners)listener();}
async function sdk(){return sdkPromise ||= Promise.all([
 import('https://www.gstatic.com/firebasejs/12.16.0/firebase-functions.js'),
 import('https://www.gstatic.com/firebasejs/12.16.0/firebase-storage.js'),
 import('https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js')
]).then(([fn,storage,firestore])=>({fn,storage,firestore,functions:fn.getFunctions(undefined,settings.region),bucket:storage.getStorage(undefined,'gs://'+settings.storageBucket)}));}
function guard(uid){if(!uid||accessUid!==uid||options?.auth.currentUser?.uid!==uid)throw new Error('access-changed');}
async function call(name,data,uid){guard(uid);const api=await sdk();guard(uid);const response=await api.fn.httpsCallable(api.functions,name)(data);guard(uid);return response.data;}
export function setBackgroundAccess(uid){
 if(!settings.enabled||uid===accessUid)return;
 accessUid=uid||null;const current=++epoch;stopWatching?.();stopWatching=null;jobs=[];acknowledged.clear();changed();
 if(!uid)return;
 sdk().then(api=>{if(current!==epoch)return;const f=api.firestore;
  stopWatching=f.onSnapshot(f.query(f.collection(options.db,'workspaces','stroke','dictationJobs'),f.where('createdBy','==',uid),f.orderBy('createdAt','desc'),f.limit(50)),snapshot=>{
   if(current!==epoch)return;jobs=snapshot.docs.map(doc=>({id:doc.id,...doc.data()}));changed();
  },()=>{if(current===epoch){jobs=[];changed();}});
 }).catch(()=>{});
}
export async function prepareBackgroundRecording(active){
 const result=await call('prepareStrokeDictation',{id:active.id,caseId:active.caseId,recordedAt:active.recordedAt,source:protocolFieldSource,version:protocolFieldVersion},active.uid);
 if(result.path!==`stroke-dictation/${active.uid}/${active.id}/audio`)throw new Error('invalid-upload-path');
 active.uploadPath=result.path;
}
export async function uploadBackgroundRecording(active,blob,progress){
 guard(active.uid);active.abort.signal.throwIfAborted();
 if(active.uploadAttempted){const check=await call('confirmStrokeDictation',{id:active.id},active.uid);if(check.uploaded){acknowledged.add(active.id);changed();return;}}
 const type=blob.type.split(';')[0];if(!blob.size||blob.size>14*1024*1024||!['audio/mp4','audio/webm'].includes(type))throw new Error('invalid-audio');
 const api=await sdk();guard(active.uid);active.abort.signal.throwIfAborted();
 active.uploadAttempted=true;
 const task=api.storage.uploadBytesResumable(api.storage.ref(api.bucket,active.uploadPath),blob,{contentType:type,customMetadata:{jobId:active.id}});
 const cancel=()=>task.cancel();active.abort.signal.addEventListener('abort',cancel,{once:true});
 try{await new Promise((resolve,reject)=>task.on('state_changed',snapshot=>progress(Math.round(100*snapshot.bytesTransferred/snapshot.totalBytes)),reject,resolve));guard(active.uid);acknowledged.add(active.id);changed();}
 finally{active.abort.signal.removeEventListener('abort',cancel);}
 // Storage finalization durably queues the worker. Confirmation is a redundant
 // nudge, never a requirement for releasing the recorder after upload succeeds.
 call('confirmStrokeDictation',{id:active.id},active.uid).catch(()=>{});
}
export function backgroundSummary(caseId){
 if(!settings.enabled||!accessUid)return {message:'',failedJobId:null};
 const entries=jobs.filter(job=>job.caseId===caseId),pending=entries.filter(job=>['queued','processing'].includes(job.status)||job.status==='awaiting_upload'&&acknowledged.has(job.id));
 const failed=entries.find(job=>job.status==='failed');
 return {message:pending.length?`${pending.length} uploaded recording${pending.length===1?'':'s'} processing. You can continue working.`:failed?'A recording needs a processing retry.':entries[0]?.status==='completed'?'Dictation saved.':'',failedJobId:failed?.id||null};
}
export async function retryBackgroundProcessing(id){await call('retryStrokeDictation',{id},accessUid);}
