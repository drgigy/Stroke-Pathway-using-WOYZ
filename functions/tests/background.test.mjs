import test from 'node:test';
import assert from 'node:assert/strict';
import {createDictationService,audioPath,jobFromPath} from '../service.js';
import {validateCaseWideOutput,clinicalPages,protocolFieldSource as source,protocolFieldVersion as version} from '../shared/case-wide-dictation.js';
import {captureCaseBaseline,backgroundMergePlan} from '../shared/background-merge.js';
import {currentFieldValues} from '../shared/protocol-field-output.js';
import {transcribeCase} from '../gemini.js';
const time=seconds=>({seconds,nanoseconds:0,toMillis(){return seconds*1000;}});
const output=(name='Synthetic Patient')=>validateCaseWideOutput({text:'Synthetic dictated patient facts',pages:[{pageNumber:'1',fields:[{id:'name',value:name}]},{pageNumber:'6',fields:[{id:'reason_anticoagulation',value:'Yes'}]}],kpiFields:[{id:'name',value:name}],warnings:[]});
function apply(note,patch){for(const [path,value]of Object.entries(patch)){const keys=path.split('.');let cursor=note;for(const key of keys.slice(0,-1))cursor=cursor[key]||=( {} );cursor[keys.at(-1)]=value;}return note;}
function entry(fields,seconds,extra={}){return {text:'Synthetic facts',fields,pageNumber:1,fieldSource:source,fieldVersion:version,createdAt:time(seconds),...extra};}
function job(id,seconds,baseline){return {id,createdAt:time(seconds),recordedAt:new Date(seconds*1000).toISOString(),createdBy:'approved-user',baseline};}
test('cross-page contract rejects paper pages, mismatched IDs, duplicates and ambiguous KPI dates',()=>{
 assert.deepEqual(clinicalPages,[1,2,3,4,6,9]);assert.equal(output().pages[6].reason_anticoagulation,'Yes');
 for(const pages of [[{pageNumber:'5',fields:[]}],[{pageNumber:'2',fields:[{id:'reason_anticoagulation',value:'Yes'}]}],[{pageNumber:'1',fields:[]},{pageNumber:'1',fields:[]}],[{pageNumber:'6',fields:[{id:'reason_anticoagulation',value:'Probably'}]}]])assert.throws(()=>validateCaseWideOutput({text:'Synthetic',pages,kpiFields:[]}));
 assert.throws(()=>validateCaseWideOutput({text:'Synthetic',pages:[],kpiFields:[{id:'arrivalTime',value:'8am'}]}));
});
test('completion order does not determine clinical order; newer manual edits and clears survive',()=>{
 for(const order of [[0,1],[1,0]]){
  const note={};const baseline=captureCaseBaseline(note),jobs=[job('a',100,baseline),job('b',200,baseline)];
  for(const i of order)apply(note,backgroundMergePlan(note,jobs[i],output(i?'Later':'Earlier'),time(400+i)).patch);
  assert.equal(currentFieldValues(note.protocolDictations.page1,1).name.value,'Later');
 }
 const note={protocolDictations:{page1:{old:entry({name:'Old'},10)}}},baseline=captureCaseBaseline(note);
 note.protocolDictations.page1.manual=entry({name:''},150,{kind:'manual-edit'});
 const plan=backgroundMergePlan(note,job('recording',100,baseline),output(),time(200));
 assert(plan.skipped.some(v=>v.field==='name'));apply(note,plan.patch);assert.equal(currentFieldValues(note.protocolDictations.page1,1).name.value,'');
 const fresh=job('fresh',250,captureCaseBaseline(note));apply(note,backgroundMergePlan(note,fresh,output('Explicit correction'),time(300)).patch);
 assert.equal(currentFieldValues(note.protocolDictations.page1,1).name.value,'Explicit correction');
 assert.equal(note.protocolDictations.page6.recording.createdAt.seconds,200);assert.equal(note.protocolDictations.page6.recording.effectiveAt.seconds,100);
});
function fixture(){
 let clock=1000000,approved=true,disabled=false,transcriptions=0,failures=0,hold=null,customOutput=null;
 const docs=new Map([['workspaces/stroke/notes/patientA',{noteType:'code7'}],['workspaces/stroke/notes/patientB',{noteType:'code7'}],['runtimeSecrets/gemini',{enabled:true,key:'synthetic-not-a-real-key'}]]),files=new Map();
 const read=path=>path==='deviceApprovals/approved-user'?{status:approved?'approved':'blocked'}:docs.get(path);
 const db={doc:path=>({path,async get(){const data=read(path);return {exists:!!data,data:()=>data};},async update(patch){apply(docs.get(path),patch);}}),async runTransaction(fn){const changes=[];const tx={get:ref=>ref.get(),create:(ref,value)=>{if(docs.has(ref.path))throw Error('exists');changes.push(()=>docs.set(ref.path,value));},update:(ref,patch)=>changes.push(()=>apply(docs.get(ref.path),patch))};const result=await fn(tx);for(const change of changes)change();return result;}};
 const bucket={file:path=>({async getMetadata(){const value=files.get(path);if(!value)throw Error('not-found');return [value];},async download(){if(!files.has(path))throw Error('not-found');return [Buffer.from('synthetic')];},async exists(){return [files.has(path)];},async delete(){files.delete(path);}})};
 const service=createDictationService({db,auth:{getUser:async()=>({disabled})},bucket,now:()=>clock,stamp:ms=>time(ms/1000),serverTime:()=>time(clock/1000),transcribe:async()=>{transcriptions++;if(hold)await hold;if(failures-->0)throw Error('temporary');return customOutput||output();}});
 const request=(id='take1',caseId='patientA')=>({auth:{uid:'approved-user',token:{firebase:{sign_in_provider:'anonymous'}}},data:{id,caseId,source,version,recordedAt:'2026-11-26T07:00:00+05:30'}});
 const upload=async(id='take1')=>{const path=audioPath('approved-user',id);files.set(path,{size:'100',contentType:'audio/mp4',generation:'1',metadata:{jobId:id}});await service.queueAudio(path);};
 return {docs,files,service,request,upload,clock:()=>clock,advance:ms=>clock+=ms,revoke:()=>approved=false,disable:()=>disabled=true,fail:n=>failures=n,count:()=>transcriptions,hold:p=>hold=p,result:o=>customOutput=o};
}
test('reservation is idempotent and pins case; commit is atomic, duplicate delivery safe, audio removed',async()=>{
 const f=fixture();await f.service.prepare(f.request());await f.service.prepare(f.request());await assert.rejects(f.service.prepare(f.request('take1','patientB')));
 await f.upload();assert.equal(f.docs.get('workspaces/stroke/dictationJobs/take1').status,'queued');
 await f.service.process('take1');await f.service.process('take1');assert.equal(f.count(),1);assert.equal(f.files.size,0);
 const a=f.docs.get('workspaces/stroke/notes/patientA'),b=f.docs.get('workspaces/stroke/notes/patientB');
 assert(a.protocolDictations.page1.take1);assert(a.protocolDictations.page6.take1);assert(a.kpiEntries.take1);assert.equal(b.protocolDictations,undefined);
 assert.equal(f.docs.get('workspaces/stroke/dictationJobs/take1').status,'completed');
});
test('revoked access cannot reserve, upload or commit a result',async()=>{
 const f=fixture();await f.service.prepare(f.request());await f.upload();f.revoke();await f.service.process('take1');
 assert.equal(f.docs.get('workspaces/stroke/notes/patientA').protocolDictations,undefined);assert.equal(f.files.size,0);assert.equal(f.count(),0);
 await assert.rejects(f.service.prepare(f.request('take2')));
 const g=fixture();let release;g.hold(new Promise(resolve=>release=resolve));await g.service.prepare(g.request());await g.upload();const task=g.service.process('take1');
 while(g.count()===0)await new Promise(resolve=>setImmediate(resolve));g.disable();release();await task;assert.equal(g.docs.get('workspaces/stroke/notes/patientA').protocolDictations,undefined);
});
test('temporary worker failure retries without duplicating facts; terminal retry requires retained audio',async()=>{
 const f=fixture();await f.service.prepare(f.request());await f.upload();f.fail(1);await assert.rejects(f.service.process('take1'));await f.service.process('take1');assert.equal(f.count(),2);assert.equal(f.docs.get('workspaces/stroke/dictationJobs/take1').status,'completed');
 const g=fixture();await g.service.prepare(g.request());await g.upload();g.fail(3);await assert.rejects(g.service.process('take1'));await assert.rejects(g.service.process('take1'));await g.service.process('take1');assert.equal(g.docs.get('workspaces/stroke/dictationJobs/take1').status,'failed');assert.equal(g.files.size,1);await g.service.retry(g.request());await g.service.process('take1');assert.equal(g.docs.get('workspaces/stroke/dictationJobs/take1').status,'completed');
});
test('lease prevents duplicate concurrent model calls; expired lease recovers; deleted cases and orphan uploads are safe',async()=>{
 const f=fixture();await f.service.prepare(f.request());await f.upload();const j=f.docs.get('workspaces/stroke/dictationJobs/take1');j.status='processing';j.leaseUntil=time((f.clock()+5000)/1000);await assert.rejects(f.service.process('take1'));assert.equal(f.count(),0);f.advance(6000);await f.service.process('take1');assert.equal(f.count(),1);
 const g=fixture();await g.service.prepare(g.request());await g.upload();g.docs.delete('workspaces/stroke/notes/patientA');await g.service.process('take1');assert.equal(g.files.size,0);assert.equal(g.count(),0);
 g.files.set(audioPath('approved-user','orphan'),{});await g.service.queueAudio(audioPath('approved-user','orphan'));assert.equal(g.files.size,0);assert.equal(jobFromPath('users/anything/audio'),null);
});
test('Gemini request uses all clinical contracts; invalid or truncated output never saves',async()=>{
 const original=globalThis.fetch;let calls=0;
 try{
  globalThis.fetch=async(url,request)=>{calls++;const body=JSON.parse(request.body);assert(body.systemInstruction.parts[0].text.includes('PAPER'));assert.equal(body.generationConfig.temperature,0);return calls===1?{ok:false,status:503}:{ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({text:'Synthetic',pages:[{pageNumber:'1',fields:[{id:'name',value:'Test'}]}],kpiFields:[]})}]}}]})};};
  assert.equal((await transcribeCase({audio:Buffer.from('x'),mimeType:'audio/mp4',recordedAt:'2026-11-26T00:00:00Z',key:'fake'})).pages[1].name,'Test');assert.equal(calls,2);
  globalThis.fetch=async()=>({ok:true,json:async()=>({candidates:[{finishReason:'MAX_TOKENS'}]})});await assert.rejects(transcribeCase({audio:Buffer.from('x'),mimeType:'audio/mp4',key:'fake'}),{code:'invalid-output'});
 }finally{globalThis.fetch=original;}
});

test('password and anonymous approval branches match the user page and cannot bypass a revoked password approval',async()=>{
 const f=fixture(),request=f.request();request.auth.token.firebase.sign_in_provider='password';await assert.rejects(f.service.prepare(request));
 f.docs.set('dashboardApprovals/approved-user',{status:'approved'});await f.service.prepare(request);
 f.docs.set('dashboardApprovals/approved-user',{status:'blocked'});await assert.rejects(f.service.prepare({...request,data:{...request.data,id:'other'}}));
});

test('silence is a terminal no-speech result, never writes case fields or offers processing retry',async()=>{
 const silent=validateCaseWideOutput({speechDetected:false,text:'',pages:[],kpiFields:[]});assert.equal(silent.noSpeech,true);
 assert.throws(()=>validateCaseWideOutput({speechDetected:false,text:'A dictated name',pages:[],kpiFields:[]}));
 assert.throws(()=>validateCaseWideOutput({speechDetected:false,text:'',pages:[{pageNumber:'1',fields:[]}],kpiFields:[]}));
 assert.equal(validateCaseWideOutput({speechDetected:true,text:'Yes',pages:[],kpiFields:[]}).text,'Yes');
 const f=fixture();f.result(silent);await f.service.prepare(f.request());await f.upload();await f.service.process('take1');await f.service.process('take1');
 assert.equal(f.count(),1);assert.equal(f.files.size,0);assert.equal(f.docs.get('workspaces/stroke/dictationJobs/take1').status,'no_speech');
 assert.deepEqual(f.docs.get('workspaces/stroke/notes/patientA'),{noteType:'code7'});assert.equal((await f.service.confirm(f.request())).uploaded,true);await assert.rejects(f.service.retry(f.request()));
});
