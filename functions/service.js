import { captureCaseBaseline, backgroundMergePlan } from './shared/background-merge.js';
import { protocolFieldSource, protocolFieldVersion } from './shared/case-wide-dictation.js';
export const PROJECT='minutes-woyz-3',BUCKET='minutes-woyz-3.firebasestorage.app',OWNER='C7uoRRiH1XdpJzLDZMCZHLsmpNv1';
export const MAX_BYTES=14*1024*1024;
const JOB='workspaces/stroke/dictationJobs/',CASE='workspaces/stroke/notes/';
const idOK=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(v);
export function failure(code){const error=new Error(code);error.code=code;return error;}
export function audioPath(uid,id){if(!idOK(uid)||!idOK(id))throw failure('invalid-argument');return `stroke-dictation/${uid}/${id}/audio`;}
export function jobFromPath(path){const m=/^stroke-dictation\/([A-Za-z0-9_-]{1,128})\/([A-Za-z0-9_-]{1,128})\/audio$/.exec(path||'');return m?{uid:m[1],id:m[2]}:null;}
export function createDictationService({db,auth,bucket,now,stamp,serverTime,transcribe}){
 const jobRef=id=>{if(!idOK(id))throw failure('invalid-argument');return db.doc(JOB+id);};
 async function userAccess(uid,provider,tx){
  const user=await auth.getUser(uid);if(user.disabled)throw failure('permission-denied');
  if(uid===OWNER&&user.customClaims?.admin===true)return;
  const read=ref=>tx?tx.get(ref):ref.get();
  const approval=await read(db.doc((provider==='password'?'dashboardApprovals/':'deviceApprovals/')+uid));
  if(approval.data()?.status!=='approved')throw failure('permission-denied');
 }
 async function prepare(request){
  const uid=request.auth?.uid,provider=request.auth?.token?.firebase?.sign_in_provider||'';
  if(!uid)throw failure('unauthenticated');
  const data=request.data||{};
  if(!idOK(data.id)||!idOK(data.caseId)||data.source!==protocolFieldSource||data.version!==protocolFieldVersion
   ||typeof data.recordedAt!=='string'||!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(data.recordedAt)||!Number.isFinite(Date.parse(data.recordedAt)))throw failure('invalid-argument');
  await userAccess(uid,provider);
  const ref=jobRef(data.id);
  await db.runTransaction(async tx=>{
   const [existing,note]=await Promise.all([tx.get(ref),tx.get(db.doc(CASE+data.caseId))]);
   await userAccess(uid,provider,tx);
   if(!note.exists||note.data().noteType!=='code7'||note.data().deleted)throw failure('case-unavailable');
   if(existing.exists){const job=existing.data();if(job.createdBy!==uid||job.caseId!==data.caseId||job.recordedAt!==data.recordedAt)throw failure('job-conflict');return;}
   tx.create(ref,{caseId:data.caseId,createdBy:uid,provider,recordedAt:data.recordedAt,createdAt:serverTime(),updatedAt:serverTime(),
    source:protocolFieldSource,version:protocolFieldVersion,status:'awaiting_upload',attempts:0,retryEpoch:0,
    baseline:captureCaseBaseline(note.data()),expiresAt:stamp(now()+30*86400000)});
  });
  return {id:data.id,path:audioPath(uid,data.id)};
 }
 async function queueAudio(path){
  const parsed=jobFromPath(path);if(!parsed)return {ignored:true};
  const ref=jobRef(parsed.id),snapshot=await ref.get();
  if(!snapshot.exists){await bucket.file(path).delete({ignoreNotFound:true});return {ignored:true};}
  const job=snapshot.data();if(job.createdBy!==parsed.uid)throw failure('permission-denied');
  if(['completed','no_speech','cancelled'].includes(job.status)){await bucket.file(path).delete({ignoreNotFound:true});return {status:job.status};}
  if(job.status!=='awaiting_upload')return {status:job.status};
  const [metadata]=await bucket.file(path).getMetadata();
  if(Number(metadata.size)<=0||Number(metadata.size)>MAX_BYTES||!['audio/mp4','audio/webm'].includes(metadata.contentType)
   ||metadata.metadata?.jobId!==parsed.id){await ref.update({status:'failed',errorCode:'invalid-audio',updatedAt:serverTime()});await bucket.file(path).delete({ignoreNotFound:true});return {status:'failed'};}
  try{await userAccess(job.createdBy,job.provider);}catch(error){if(error.code!=='permission-denied'&&error.code!=='auth/user-not-found')throw error;await ref.update({status:'cancelled',errorCode:'access-ended',updatedAt:serverTime()});await bucket.file(path).delete({ignoreNotFound:true});return {status:'cancelled'};}
  await db.runTransaction(async tx=>{const current=await tx.get(ref);if(current.exists&&current.data().status==='awaiting_upload')tx.update(ref,{status:'queued',audioBytes:Number(metadata.size),audioGeneration:metadata.generation,updatedAt:serverTime()});});
  return {status:'queued'};
 }
 async function confirm(request){
  const uid=request.auth?.uid;if(!uid)throw failure('unauthenticated');const ref=jobRef(request.data?.id),s=await ref.get();
  if(!s.exists||s.data().createdBy!==uid)throw failure('permission-denied');
  await userAccess(uid,s.data().provider);
  const path=audioPath(uid,request.data.id),[exists]=await bucket.file(path).exists();
  if(exists)await queueAudio(path);
  return {uploaded:exists||['queued','processing','completed','no_speech'].includes(s.data().status),status:(await ref.get()).data().status};
 }
 async function retry(request){
  const uid=request.auth?.uid;if(!uid)throw failure('unauthenticated');const ref=jobRef(request.data?.id),s=await ref.get();
  if(!s.exists||s.data().createdBy!==uid)throw failure('permission-denied');await userAccess(uid,s.data().provider);
  const [exists]=await bucket.file(audioPath(uid,request.data.id)).exists();if(!exists)throw failure('audio-expired');
  await db.runTransaction(async tx=>{const current=await tx.get(ref),job=current.data();if(job.status!=='failed')throw failure('job-not-failed');if((job.retryEpoch||0)>=3)throw failure('retry-limit');tx.update(ref,{status:'queued',attempts:0,retryEpoch:(job.retryEpoch||0)+1,errorCode:'',updatedAt:serverTime()});});
  return {status:'queued'};
 }
 async function process(id){
  const ref=jobRef(id);let claimed;
  await db.runTransaction(async tx=>{
   const s=await tx.get(ref);if(!s.exists)return;const job=s.data();
   if(['completed','no_speech'].includes(job.status)){claimed={...job,id,alreadyDone:true};return;}
   if(!['queued','processing'].includes(job.status))return;
   if(job.status==='processing'&&job.leaseUntil?.toMillis()>now())throw failure('lease-busy');
   if((job.attempts||0)>=3){tx.update(ref,{status:'failed',errorCode:'retry-limit',updatedAt:serverTime()});return;}
   claimed={...job,id,attempts:(job.attempts||0)+1,lease:crypto.randomUUID()};
   tx.update(ref,{status:'processing',attempts:claimed.attempts,lease:claimed.lease,leaseUntil:stamp(now()+600000),updatedAt:serverTime()});
  });
  if(!claimed)return;
  const path=audioPath(claimed.createdBy,id),file=bucket.file(path);
  if(claimed.alreadyDone){await file.delete({ignoreNotFound:true});return;}
  try{
   if(claimed.source!==protocolFieldSource||claimed.version!==protocolFieldVersion)throw failure('form-version-changed');
   await userAccess(claimed.createdBy,claimed.provider);
   const note=await db.doc(CASE+claimed.caseId).get();if(!note.exists||note.data().deleted||note.data().noteType!=='code7')throw failure('case-unavailable');
   const [metadata]=await file.getMetadata();if(Number(metadata.size)>MAX_BYTES||String(metadata.generation)!==String(claimed.audioGeneration))throw failure('invalid-audio');
   const secret=await db.doc('runtimeSecrets/gemini').get();if(!secret.data()?.enabled||!secret.data()?.key)throw failure('key-unavailable');
   const [audio]=await file.download();const output=await transcribe({audio,mimeType:metadata.contentType,recordedAt:claimed.recordedAt,key:secret.data().key});
   await userAccess(claimed.createdBy,claimed.provider);
   await db.runTransaction(async tx=>{
    const [current,note]=await Promise.all([tx.get(ref),tx.get(db.doc(CASE+claimed.caseId))]);
    await userAccess(claimed.createdBy,claimed.provider,tx);
    if(['completed','no_speech'].includes(current.data()?.status))return;
    if(current.data()?.lease!==claimed.lease)throw failure('lease-changed');
    if(!note.exists||note.data().deleted||note.data().noteType!=='code7')throw failure('case-unavailable');
    const plan=output.noSpeech?null:backgroundMergePlan(note.data(),claimed,output,serverTime());
    if(plan)tx.update(db.doc(CASE+claimed.caseId),plan.patch);
    tx.update(ref,{status:output.noSpeech?'no_speech':'completed',completedAt:serverTime(),updatedAt:serverTime(),skipped:plan?.skipped||[],warnings:plan?.warnings||[],leaseUntil:stamp(0),errorCode:''});
   });
   await file.delete({ignoreNotFound:true});
  }catch(error){
   const code=['permission-denied','auth/user-not-found','case-unavailable','invalid-audio','form-version-changed'].includes(error.code)?error.code
    :error.code==='key-unavailable'?'key-unavailable':error.code==='invalid-output'?'invalid-output':'processing-unavailable';
   const terminal=code!=='processing-unavailable'||claimed.attempts>=3;
   await db.runTransaction(async tx=>{const s=await tx.get(ref);if(['completed','no_speech'].includes(s.data()?.status)||s.data()?.lease!==claimed.lease)return;tx.update(ref,{status:terminal?'failed':'processing',errorCode:code,leaseUntil:stamp(0),updatedAt:serverTime()});});
   if(['permission-denied','auth/user-not-found','case-unavailable'].includes(code))await file.delete({ignoreNotFound:true});
   if(!terminal)throw failure('processing-unavailable');
  }
 }
 return {prepare,confirm,retry,queueAudio,process};
}
