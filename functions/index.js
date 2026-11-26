import { initializeApp } from 'firebase-admin/app';
import { getFirestore,FieldValue,Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { onCall,HttpsError } from 'firebase-functions/v2/https';
import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { createDictationService,PROJECT,BUCKET } from './service.js';
import { transcribeCase } from './gemini.js';
if(process.env.GCLOUD_PROJECT&&process.env.GCLOUD_PROJECT!==PROJECT)throw new Error('Unexpected Firebase project');
initializeApp({projectId:PROJECT,storageBucket:BUCKET});
const service=createDictationService({db:getFirestore(),auth:getAuth(),bucket:getStorage().bucket(BUCKET),now:()=>Date.now(),stamp:ms=>Timestamp.fromMillis(ms),serverTime:()=>FieldValue.serverTimestamp(),transcribe:transcribeCase});
const serviceAccount=`stroke-dictation-worker@${PROJECT}.iam.gserviceaccount.com`;
const callable={region:'asia-south1',serviceAccount,memory:'256MiB',maxInstances:2,concurrency:4,timeoutSeconds:60,cors:['https://code7.codestroke.in','https://drgigy.github.io']};
const wrap=method=>async request=>{try{return await service[method](request);}catch(error){const known=['unauthenticated','permission-denied','invalid-argument'];throw new HttpsError(known.includes(error.code)?error.code:'failed-precondition',error.code==='audio-expired'?'Audio expired. Record this dictation again.':'Unable to '+method+' dictation. Check access, case availability and form version.');}};
export const prepareStrokeDictation=onCall(callable,wrap('prepare'));
export const confirmStrokeDictation=onCall(callable,wrap('confirm'));
export const retryStrokeDictation=onCall(callable,wrap('retry'));
// Storage event location follows the existing bucket, not the database region.
export const queueStrokeDictationUpload=onObjectFinalized({region:'us-east1',bucket:BUCKET,serviceAccount,memory:'256MiB',maxInstances:2,concurrency:1,timeoutSeconds:120,retry:true},async event=>{
 if(event.data.bucket!==BUCKET)return;
 await service.queueAudio(event.data.name);
});
export const processStrokeDictation=onDocumentWritten({region:'asia-south1',document:'workspaces/stroke/dictationJobs/{jobId}',serviceAccount,memory:'512MiB',maxInstances:2,concurrency:1,timeoutSeconds:540,retry:true},async event=>{
 const after=event.data?.after.data(),before=event.data?.before.data();
 if(!after||after.status!=='queued'||before?.status==='queued'&&before?.retryEpoch===after.retryEpoch)return;
 await service.process(event.params.jobId);
});
